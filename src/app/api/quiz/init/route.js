import { NextResponse } from "next/server";
import { 
  getQuizSettings, 
  checkExistingResult, 
  getOrCreateSession, 
  getQuestionsForRound 
} from "@/lib/quizSheets";

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET() {
  try {
    const settings = await getQuizSettings();
    const isLive = String(settings.Is_Quiz_Live).toUpperCase() === "TRUE";
    return NextResponse.json({
      isLive,
      activeRound: settings.Active_Round || "Round 1",
      timeLimitMinutes: settings.Time_Limit_Minutes || "15"
    }, { status: 200 });
  } catch (error) {
    console.error("Quiz Status GET Error:", error);
    return NextResponse.json({ isLive: false, error: "Failed to fetch status" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { whatsapp, fullName } = await req.json();

    if (!whatsapp || !fullName) {
      return NextResponse.json({ error: "Missing WhatsApp number or Full Name" }, { status: 400 });
    }

    // 1. Fetch active settings and check if live
    const settings = await getQuizSettings();
    const isLive = String(settings.Is_Quiz_Live).toUpperCase() === "TRUE";

    if (!isLive) {
      return NextResponse.json(
        { error: "The Bible Reading Quiz is not active yet. Coming soon!" },
        { status: 403 }
      );
    }

    // 2. Normalize WhatsApp number: strip non-numeric characters and leading zeros
    const normalizedWhatsApp = whatsapp.replace(/\D/g, "").replace(/^0+/, "");
    const activeRound = settings.Active_Round || "Round 1";
    const timeLimitMinutes = parseInt(settings.Time_Limit_Minutes || "15", 10);

    // 3. Check if user already submitted a response for this round
    const hasAlreadySubmitted = await checkExistingResult(normalizedWhatsApp, activeRound);
    if (hasAlreadySubmitted) {
      return NextResponse.json(
        { error: "You have already submitted a response for this round." },
        { status: 400 }
      );
    }

    // 4. Retrieve or lock in a session deadline
    const session = await getOrCreateSession(normalizedWhatsApp, activeRound, timeLimitMinutes);

    // 5. Fetch questions and strip answers to prevent client payload inspection
    const rawQuestions = await getQuestionsForRound(activeRound);
    const securedQuestions = rawQuestions.map((q) => {
      const { correctAnswer, ...clientQuestion } = q;
      return clientQuestion;
    });

    return NextResponse.json({
      round: activeRound,
      questions: securedQuestions,
      deadlineTimestamp: session.absoluteDeadline
    }, { status: 200 });

  } catch (error) {
    console.error("Quiz Init Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
