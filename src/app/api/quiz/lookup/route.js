import { NextResponse } from "next/server";
import { getQuizSettings, getResultByWhatsApp } from "@/lib/quizSheets";

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const whatsapp = searchParams.get("whatsapp");
    const round = searchParams.get("round");   // optional override
    const edition = searchParams.get("edition"); // optional override

    if (!whatsapp) {
      return NextResponse.json({ error: "WhatsApp number is required" }, { status: 400 });
    }

    const normalizedWhatsApp = whatsapp.replace(/\D/g, "").replace(/^0+/, "");

    if (normalizedWhatsApp.length < 8) {
      return NextResponse.json({ error: "Please enter a valid WhatsApp number (minimum 8 digits)." }, { status: 400 });
    }

    // Resolve the active round/edition from settings if not explicitly passed
    const settings = await getQuizSettings();
    const activeRound = round || settings.Active_Round || "Round 1";
    const activeEdition = edition || settings.Active_Edition || "New Testament (3 chapters daily)";

    const result = await getResultByWhatsApp(normalizedWhatsApp, activeRound, activeEdition);

    if (!result) {
      return NextResponse.json(
        { error: `No submission found for that WhatsApp number in ${activeRound}. Please check your number and try again.` },
        { status: 404 }
      );
    }

    return NextResponse.json({ found: true, result }, { status: 200 });

  } catch (error) {
    console.error("Quiz Lookup Error:", error);
    return NextResponse.json({ error: "Failed to look up result. Please try again." }, { status: 500 });
  }
}
