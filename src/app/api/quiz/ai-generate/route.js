import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { fetchGlobalData } from "@/lib/googleSheets";
import { getQuizSettings, updateQuizSettings } from "@/lib/quizSheets";

// Helper to verify admin auth
async function verifyAdminAuth(request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) return false;
    const data = await fetchGlobalData();
    const adminPin = data.settings?.ADMIN_PIN || process.env.ADMIN_PIN || "0000";
    return authHeader === adminPin;
  } catch (error) {
    return false;
  }
}

// Current available Gemini models with automatic fallback
const CANDIDATE_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-3.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-3.1-pro",
  "gemini-2.5-pro",
  "gemini-flash-latest",
  "gemini-pro-latest"
];

export async function POST(request) {
  try {
    if (!(await verifyAdminAuth(request))) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const body = await request.json();
    const { 
      round = "Round 1", 
      scripture = "", 
      questionCount = 10, 
      difficulty = "Balanced", 
      customInstructions = "",
      apiKey = ""
    } = body;

    if (!scripture.trim()) {
      return NextResponse.json({ error: "Please provide the scripture/reading passage for this round (e.g., Colossians 3 - Hebrews 6)." }, { status: 400 });
    }

    // Determine API Key: request body > Quiz_Settings.GEMINI_API_KEY > process.env.GEMINI_API_KEY > Global_Settings.GEMINI_API_KEY
    const [quizSettings, globalData] = await Promise.all([
      getQuizSettings(),
      fetchGlobalData()
    ]);

    const activeApiKey = apiKey.trim() || quizSettings.GEMINI_API_KEY || process.env.GEMINI_API_KEY || globalData.settings?.GEMINI_API_KEY;

    // Auto-save the key to Quiz_Settings if provided in request body and not already saved
    if (apiKey.trim() && apiKey.trim() !== quizSettings.GEMINI_API_KEY) {
      try {
        await updateQuizSettings("GEMINI_API_KEY", apiKey.trim());
      } catch (saveErr) {
        console.warn("Failed to auto-persist Gemini API key to Google Sheets:", saveErr.message);
      }
    }

    if (!activeApiKey) {
      return NextResponse.json({ 
        error: "Missing Gemini API Key. Please enter your Google Gemini API Key in the generator settings to save it across all devices." 
      }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(activeApiKey);
    const count = Math.max(1, Math.min(parseInt(questionCount, 10) || 10, 30));

    const prompt = `You are a biblical scholar and Christian educator creating high-quality, biblically accurate multiple-choice quiz questions for the ECCF Bible Reading Challenge.

Generate exactly ${count} multiple choice questions strictly based on the following scripture passage:
Scripture Passage: "${scripture}"
Assigned Round: "${round}"
Difficulty Level: "${difficulty}"
${customInstructions ? `Additional Admin Instructions: "${customInstructions}"` : ""}

CRITICAL RULES:
1. Each question must be strictly rooted in the provided scripture passage ("${scripture}").
2. Each question MUST have exactly 4 distinct options (option1, option2, option3, option4).
3. Exactly ONE option must be the unequivocally correct answer based on the Bible.
4. The "correctAnswer" field MUST exactly match the character string of the correct option.
5. Spread the questions across the chapters in "${scripture}" rather than focusing only on the first chapter.
6. Return ONLY a valid JSON array of question objects without extra conversation or formatting.

JSON Schema format:
[
  {
    "question": "What does the scripture say...?",
    "option1": "Option A text",
    "option2": "Option B text",
    "option3": "Option C text",
    "option4": "Option D text",
    "correctAnswer": "Option A text"
  }
]`;

    let generatedText = "";
    let lastError = null;
    let successfulModel = "";

    // Iterate through active candidate models until one succeeds
    for (const modelName of CANDIDATE_MODELS) {
      try {
        const model = genAI.getGenerativeModel({ 
          model: modelName,
          generationConfig: {
            temperature: 0.2,
            topP: 0.8,
            responseMimeType: "application/json"
          }
        });
        const result = await model.generateContent(prompt);
        generatedText = result.response.text();
        if (generatedText && generatedText.trim().length > 0) {
          successfulModel = modelName;
          break;
        }
      } catch (err) {
        lastError = err;
        console.warn(`Attempt with ${modelName} (with JSON mimeType) failed:`, err.message);

        // Retry without responseMimeType if older/restricted model
        try {
          const fallbackModel = genAI.getGenerativeModel({ model: modelName });
          const result = await fallbackModel.generateContent(prompt);
          generatedText = result.response.text();
          if (generatedText && generatedText.trim().length > 0) {
            successfulModel = modelName;
            break;
          }
        } catch (innerErr) {
          lastError = innerErr;
          console.warn(`Attempt with ${modelName} fallback failed:`, innerErr.message);
        }
      }
    }

    if (!generatedText) {
      throw new Error(lastError?.message || "All available Gemini models failed to generate content. Please check your API key or try again.");
    }

    // Clean JSON response (strip ```json ... ``` code blocks if present)
    let cleanJson = generatedText.trim();
    if (cleanJson.startsWith("```json")) {
      cleanJson = cleanJson.replace(/^```json\s*/, "").replace(/```\s*$/, "").trim();
    } else if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson.replace(/^```\s*/, "").replace(/```\s*$/, "").trim();
    }

    let parsedQuestions = [];
    try {
      parsedQuestions = JSON.parse(cleanJson);
    } catch (parseErr) {
      console.error("JSON parse failed on AI response:", cleanJson);
      return NextResponse.json({ error: "AI response formatting error. Please try generating again." }, { status: 500 });
    }

    if (!Array.isArray(parsedQuestions) || parsedQuestions.length === 0) {
      return NextResponse.json({ error: "No questions generated. Please check your scripture range and try again." }, { status: 500 });
    }

    // Sanitize and format questions
    const formattedQuestions = parsedQuestions.map((q, idx) => {
      const opt1 = String(q.option1 || q.options?.[0] || "").trim();
      const opt2 = String(q.option2 || q.options?.[1] || "").trim();
      const opt3 = String(q.option3 || q.options?.[2] || "").trim();
      const opt4 = String(q.option4 || q.options?.[3] || "").trim();
      let correct = String(q.correctAnswer || q.answer || opt1).trim();

      // Ensure correct answer matches one of the options
      const match = [opt1, opt2, opt3, opt4].find(o => o.toLowerCase() === correct.toLowerCase());
      if (match) {
        correct = match;
      } else {
        correct = opt1;
      }

      return {
        id: `ai_${Date.now()}_${idx + 1}`,
        round: round,
        question: String(q.question || "").trim(),
        option1: opt1,
        option2: opt2,
        option3: opt3,
        option4: opt4,
        correctAnswer: correct
      };
    }).filter(q => q.question && q.option1 && q.option2);

    return NextResponse.json({
      success: true,
      round,
      scripture,
      modelUsed: successfulModel,
      count: formattedQuestions.length,
      questions: formattedQuestions
    });

  } catch (error) {
    console.error("AI Generation Error:", error);
    return NextResponse.json({ 
      error: error.message || "Failed to generate questions with AI." 
    }, { status: 500 });
  }
}
