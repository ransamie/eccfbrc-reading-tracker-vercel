import { NextResponse } from "next/server";
import { 
  getQuizSettings, 
  updateQuizSettings, 
  getAllQuestions, 
  getAllQuizResults, 
  addQuizQuestion, 
  bulkAddQuizQuestions,
  updateQuizQuestion,
  deleteQuizQuestion 
} from "@/lib/quizSheets";
import { fetchGlobalData } from "@/lib/googleSheets";

// Helper to verify if request is from an authenticated admin
async function verifyAdminAuth(request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) return false;

    // Fetch master PIN from Google Sheets or environment
    const data = await fetchGlobalData();
    const adminPin = data.settings?.ADMIN_PIN || process.env.ADMIN_PIN || "0000";

    return authHeader === adminPin;
  } catch (error) {
    console.error("Auth verification failed:", error);
    return false;
  }
}

export async function GET(request) {
  try {
    if (!(await verifyAdminAuth(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [settings, questions, results] = await Promise.all([
      getQuizSettings(),
      getAllQuestions(),
      getAllQuizResults()
    ]);

    return NextResponse.json({
      settings,
      questions,
      results
    }, { status: 200 });

  } catch (error) {
    console.error("Admin Quiz GET Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    if (!(await verifyAdminAuth(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === "updateSettings") {
      const { activeRound, timeLimitMinutes, isQuizLive } = body;
      if (activeRound !== undefined) {
        await updateQuizSettings("Active_Round", activeRound);
      }
      if (timeLimitMinutes !== undefined) {
        await updateQuizSettings("Time_Limit_Minutes", String(timeLimitMinutes));
      }
      if (isQuizLive !== undefined) {
        await updateQuizSettings("Is_Quiz_Live", isQuizLive ? "TRUE" : "FALSE");
      }
      return NextResponse.json({ success: true, message: "Settings updated successfully" });
    }

    if (action === "addQuestion") {
      const { question } = body;
      if (!question || !question.round || !question.question || !question.correctAnswer) {
        return NextResponse.json({ error: "Missing required question parameters" }, { status: 400 });
      }
      const newId = await addQuizQuestion(question);
      return NextResponse.json({ success: true, id: newId, message: "Question added successfully" });
    }

    if (action === "bulkAddQuestions") {
      const { questions } = body;
      if (!Array.isArray(questions) || questions.length === 0) {
        return NextResponse.json({ error: "No valid questions provided for bulk import" }, { status: 400 });
      }
      const count = await bulkAddQuizQuestions(questions);
      return NextResponse.json({ success: true, count, message: `Successfully imported ${count} questions` });
    }

    if (action === "updateQuestion") {
      const { id, question } = body;
      if (!id || !question || !question.round || !question.question || !question.correctAnswer) {
        return NextResponse.json({ error: "Missing required question parameters for update" }, { status: 400 });
      }
      const updated = await updateQuizQuestion(id, question);
      if (updated) {
        return NextResponse.json({ success: true, message: "Question updated successfully" });
      } else {
        return NextResponse.json({ error: "Question not found" }, { status: 404 });
      }
    }

    if (action === "deleteQuestion") {
      const { id } = body;
      if (!id) {
        return NextResponse.json({ error: "Missing question ID for deletion" }, { status: 400 });
      }
      const deleted = await deleteQuizQuestion(id);
      if (deleted) {
        return NextResponse.json({ success: true, message: "Question deleted successfully" });
      } else {
        return NextResponse.json({ error: "Question not found" }, { status: 404 });
      }
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error) {
    console.error("Admin Quiz POST Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
