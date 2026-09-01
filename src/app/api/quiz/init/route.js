import { NextResponse } from "next/server";
import { 
  getQuizSettings, 
  checkExistingResult, 
  getOrCreateSession, 
  getQuestionsForRound 
} from "@/lib/quizSheets";

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const targetRound = searchParams.get("round");
    const targetEdition = searchParams.get("edition");
    const isPreview = searchParams.get("preview") === "true";
    const checkPhone = searchParams.get("whatsapp");

    const settings = await getQuizSettings();
    const isLive = String(settings.Is_Quiz_Live).toUpperCase() === "TRUE";
    const activeEdition = targetEdition || settings.Active_Edition || "New Testament (3 chapters daily)";
    const activeRound = targetRound || settings.Active_Round || "Round 1";
    const timeLimitMinutes = settings.Time_Limit_Minutes || "15";

    let questions = [];
    if (isPreview || targetRound) {
      questions = await getQuestionsForRound(activeRound, activeEdition);
    }

    let activeSession = null;
    if (checkPhone) {
      const normPhone = checkPhone.replace(/\D/g, "").replace(/^0+/, "");
      const session = await getSession(normPhone, activeRound);
      if (session) {
        activeSession = {
          deadlineTimestamp: session.absoluteDeadline,
          startTimestamp: session.startTimestamp
        };
      }
    }

    return NextResponse.json({
      isLive,
      activeEdition,
      activeRound,
      timeLimitMinutes,
      questions,
      activeSession
    }, { status: 200 });
  } catch (error) {
    console.error("Quiz Status GET Error:", error);
    return NextResponse.json({ isLive: false, error: "Failed to fetch status" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { whatsapp, fullName, team } = await req.json();

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
    const activeEdition = settings.Active_Edition || "New Testament (3 chapters daily)";
    const activeRound = settings.Active_Round || "Round 1";
    const timeLimitMinutes = parseInt(settings.Time_Limit_Minutes || "15", 10);

    // 3. Check if user already submitted a response for this round & edition
    const hasAlreadySubmitted = await checkExistingResult(normalizedWhatsApp, activeRound, activeEdition);
    if (hasAlreadySubmitted) {
      return NextResponse.json(
        { error: `You have already submitted a response for ${activeRound} (${activeEdition}).` },
        { status: 400 }
      );
    }

    // 4. Retrieve or lock in a session deadline
    const session = await getOrCreateSession(
      normalizedWhatsApp, 
      activeRound, 
      timeLimitMinutes,
      fullName,
      team || "Unassigned",
      activeEdition
    );

    // 5. Fetch questions and strip answers to prevent client payload inspection
    const rawQuestions = await getQuestionsForRound(activeRound, activeEdition);
    const securedQuestions = rawQuestions.map((q) => {
      const { correctAnswer, ...clientQuestion } = q;
      return clientQuestion;
    });

    return NextResponse.json({
      edition: activeEdition,
      round: activeRound,
      questions: securedQuestions,
      deadlineTimestamp: session.absoluteDeadline,
      startTimestamp: session.startTimestamp
    }, { status: 200 });

  } catch (error) {
    console.error("Quiz Init Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
