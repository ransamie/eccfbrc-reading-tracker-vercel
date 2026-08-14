import { NextResponse } from "next/server";
import { getSession, getQuestionsForRound, saveQuizResult } from "@/lib/quizSheets";

export async function POST(req) {
  try {
    const body = await req.json();
    const { participant, answers } = body;
    
    if (!participant || !participant.whatsapp || !participant.round) {
      return NextResponse.json({ error: "Missing participant information" }, { status: 400 });
    }

    const receiptTime = Date.now();
    const normalizedWhatsApp = participant.whatsapp.replace(/\D/g, "").replace(/^0+/, "");

    // 1. Validate Time Deadline Server-Side
    const session = await getSession(normalizedWhatsApp, participant.round);

    if (!session) {
      return NextResponse.json({ error: "No active quiz session found for this participant." }, { status: 403 });
    }

    // Allow a 30-second buffer for network latency during submission
    const BUFFER_MS = 30 * 1000;
    
    if (receiptTime > (session.absoluteDeadline + BUFFER_MS)) {
      return NextResponse.json({ 
        error: "Submission rejected: Time limit exceeded by server clock.",
        rejected: true 
      }, { status: 403 });
    }

    // 2. Fetch Correct Answers and Compute Score
    const questions = await getQuestionsForRound(participant.round);

    if (!questions || questions.length === 0) {
      return NextResponse.json({ error: "No questions found for this round." }, { status: 404 });
    }

    let score = 0;
    const evaluatedAnswers = questions.map(q => {
      const userAnswer = answers[q.id] || "No Answer";
      const isCorrect = String(userAnswer).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase();
      if (isCorrect) score++;
      
      return {
        questionId: q.id,
        questionText: q.question,
        userAnswer,
        correctAnswer: q.correctAnswer,
        isCorrect
      };
    });

    // 3. Save to Google Sheets Database
    const finalResult = {
      fullName: participant.fullName,
      whatsApp: normalizedWhatsApp,
      team: participant.team || "Unassigned",
      round: participant.round,
      score,
      totalQuestions: questions.length,
      timestamp: new Date(receiptTime).toISOString(),
      details: JSON.stringify(evaluatedAnswers)
    };

    await saveQuizResult(finalResult);

    // 4. Return result to client for the Result Screen
    return NextResponse.json({
      success: true,
      score,
      totalQuestions: questions.length,
      evaluatedAnswers
    }, { status: 200 });

  } catch (error) {
    console.error("Quiz Submit Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
