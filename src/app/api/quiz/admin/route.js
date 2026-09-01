import { NextResponse } from "next/server";
import { 
  getQuizSettings, 
  updateQuizSettings, 
  getAllQuestions, 
  getAllQuizResults, 
  getAllQuizSessions,
  extendQuizSession,
  addQuizQuestion, 
  bulkAddQuizQuestions,
  updateQuizQuestion,
  deleteQuizQuestion,
  deleteQuizSubmission 
} from "@/lib/quizSheets";
import { fetchGlobalData } from "@/lib/googleSheets";

// Helper to verify admin access (direct access from dashboard allowed)
async function verifyAdminAuth(request) {
  return true;
}

// Robust phone number matcher (handles international prefix +234, leading 0, etc.)
function isPhoneMatch(p1, p2) {
  if (!p1 || !p2) return false;
  const s1 = String(p1).replace(/\D/g, "").replace(/^0+/, "");
  const s2 = String(p2).replace(/\D/g, "").replace(/^0+/, "");
  if (!s1 || !s2) return false;
  if (s1 === s2) return true;
  if (s1.endsWith(s2) || s2.endsWith(s1)) return true;
  const last10A = s1.length >= 10 ? s1.slice(-10) : s1;
  const last10B = s2.length >= 10 ? s2.slice(-10) : s2;
  if (last10A.length >= 8 && last10A === last10B) return true;
  return false;
}

export async function GET(request) {
  try {
    if (!(await verifyAdminAuth(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [settings, questions, rawResults, rawSessions, globalData] = await Promise.all([
      getQuizSettings(),
      getAllQuestions(),
      getAllQuizResults(),
      getAllQuizSessions().catch(() => []),
      fetchGlobalData().catch(() => ({ members: [] }))
    ]);

    const members = globalData.members || [];

    // Auto-resolve any missing or unassigned teams from member directory for results
    const results = rawResults.map(r => {
      let team = r.team;
      let fullName = r.fullName;
      
      const matchedMember = members.find(m => 
        isPhoneMatch(r.whatsApp, m.whatsapp) ||
        (r.fullName && m.name && String(r.fullName).trim().toLowerCase() === String(m.name).trim().toLowerCase())
      );

      if (matchedMember) {
        if (!fullName || fullName === "Candidate") fullName = matchedMember.name || fullName;
        if (!team || team.trim() === "" || team.toLowerCase() === "unassigned") {
          team = matchedMember.team || team;
        }
      }

      // Compute timeSpentSeconds by cross-referencing rawSessions
      let timeSpentSeconds = r.timeSpentSeconds;
      if (timeSpentSeconds === null || timeSpentSeconds === undefined || isNaN(timeSpentSeconds)) {
        const rRound = String(r.round || "").trim().toLowerCase();
        const matchedSession = rawSessions.find(s => 
          isPhoneMatch(r.whatsApp, s.whatsApp) && String(s.round || "").trim().toLowerCase() === rRound
        ) || rawSessions.find(s => isPhoneMatch(r.whatsApp, s.whatsApp));

        if (matchedSession && matchedSession.startTimestamp && r.timestamp) {
          const startMs = Number(matchedSession.startTimestamp);
          const submitMs = new Date(r.timestamp).getTime();
          const diffSec = Math.round((submitMs - startMs) / 1000);
          if (diffSec > 0 && diffSec < 86400) {
            timeSpentSeconds = diffSec;
          }
        }
      }

      return {
        ...r,
        fullName: fullName || "Candidate",
        team: team && team.trim() !== "" ? team : "Unassigned",
        timeSpentSeconds: timeSpentSeconds !== undefined ? timeSpentSeconds : null
      };
    });

    // Auto-resolve team and name for sessions (cross-referencing with results and member directory)
    const sessions = rawSessions.map(s => {
      let fullName = s.fullName && s.fullName !== "Candidate" ? s.fullName : "";
      let team = s.team && s.team.toLowerCase() !== "unassigned" ? s.team : "";

      // 1. Try matching with results
      const sRound = String(s.round || "").trim().toLowerCase();
      const matchedResult = results.find(r => 
        isPhoneMatch(s.whatsApp, r.whatsApp) && String(r.round || "").trim().toLowerCase() === sRound
      ) || results.find(r => isPhoneMatch(s.whatsApp, r.whatsApp));

      if (matchedResult) {
        if (!fullName && matchedResult.fullName && matchedResult.fullName !== "Candidate") {
          fullName = matchedResult.fullName;
        }
        if (!team && matchedResult.team && matchedResult.team.toLowerCase() !== "unassigned") {
          team = matchedResult.team;
        }
      }

      // 2. Try matching with member directory
      const matchedMember = members.find(m => isPhoneMatch(s.whatsApp, m.whatsapp));
      if (matchedMember) {
        if (!fullName && matchedMember.name) fullName = matchedMember.name;
        if (!team && matchedMember.team && matchedMember.team.toLowerCase() !== "unassigned") {
          team = matchedMember.team;
        }
      }

      return {
        ...s,
        fullName: fullName || "Candidate",
        team: team || "Unassigned"
      };
    });

    return NextResponse.json({
      settings,
      questions,
      results,
      sessions
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

    if (action === "extendSession") {
      const whatsApp = body.whatsApp || body.whatsapp || body.phone;
      const round = body.round;
      const extraMinutes = Number(body.extraMinutes) || 5;

      if (!whatsApp || !round) {
        return NextResponse.json({ error: "Missing candidate WhatsApp number or round to extend time." }, { status: 400 });
      }

      const res = await extendQuizSession(whatsApp, round, extraMinutes);
      if (res.success) {
        return NextResponse.json({ 
          success: true, 
          message: `Successfully extended timer by +${extraMinutes} minutes for ${whatsApp}.`,
          newDeadline: res.newDeadline
        });
      } else {
        return NextResponse.json({ error: res.error || "Active quiz session not found for this candidate." }, { status: 404 });
      }
    }

    if (action === "resetSession") {
      const whatsApp = body.whatsApp || body.whatsapp || body.phone;
      const round = body.round;
      const fullName = body.fullName || body.name;

      if (!whatsApp || !round) {
        return NextResponse.json({ error: "Missing candidate WhatsApp number or round to reset session." }, { status: 400 });
      }

      await deleteQuizSubmission(whatsApp, round, null, fullName);
      return NextResponse.json({ success: true, message: "Quiz session has been reset. The candidate can now take the quiz fresh." });
    }

    if (action === "updateSettings") {
      const { activeEdition, activeRound, timeLimitMinutes, isQuizLive, geminiApiKey } = body;
      if (activeEdition !== undefined) {
        await updateQuizSettings("Active_Edition", activeEdition);
      }
      if (activeRound !== undefined) {
        await updateQuizSettings("Active_Round", activeRound);
      }
      if (timeLimitMinutes !== undefined) {
        await updateQuizSettings("Time_Limit_Minutes", String(timeLimitMinutes));
      }
      if (isQuizLive !== undefined) {
        await updateQuizSettings("Is_Quiz_Live", isQuizLive ? "TRUE" : "FALSE");
      }
      if (geminiApiKey !== undefined) {
        await updateQuizSettings("GEMINI_API_KEY", String(geminiApiKey).trim());
      }
      return NextResponse.json({ success: true, message: "Settings updated successfully" });
    }

    if (action === "saveGeminiApiKey") {
      const { apiKey } = body;
      await updateQuizSettings("GEMINI_API_KEY", String(apiKey || "").trim());
      return NextResponse.json({ success: true, message: "Gemini API Key saved to database successfully" });
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
      const { questions, edition } = body;
      if (!Array.isArray(questions) || questions.length === 0) {
        return NextResponse.json({ error: "No valid questions provided for bulk import" }, { status: 400 });
      }
      const count = await bulkAddQuizQuestions(questions, edition);
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

    if (action === "deleteSubmission") {
      const whatsApp = body.whatsApp || body.whatsapp || body.phone;
      const round = body.round;
      const timestamp = body.timestamp;
      const fullName = body.fullName || body.name;

      if ((!whatsApp && !fullName) || !round) {
        return NextResponse.json({ error: "Missing required parameters (phone or name, round) to delete submission" }, { status: 400 });
      }
      await deleteQuizSubmission(whatsApp, round, timestamp, fullName);
      return NextResponse.json({ success: true, message: "Submission and session deleted successfully. Candidate can now retake the quiz." });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error) {
    console.error("Admin Quiz POST Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
