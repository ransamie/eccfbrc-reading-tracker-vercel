import { NextResponse } from "next/server";
import { 
  getQuizSettings, 
  getAllQuizResults, 
  getAllQuizSessions 
} from "@/lib/quizSheets";
import { fetchGlobalData } from "@/lib/googleSheets";

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

function normalizeTeam(t) {
  return String(t || '')
    .replace(/[^\x00-\x7F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/^team\s+/i, '');
}

function isTeamMatch(teamA, teamB) {
  if (!teamA || !teamB) return false;
  const nA = normalizeTeam(teamA);
  const nB = normalizeTeam(teamB);
  if (!nA || !nB) return false;
  return nA === nB || nA.includes(nB) || nB.includes(nA);
}

function isPhoneMatch(p1, p2) {
  if (!p1 || !p2) return false;
  const s1 = String(p1).replace(/\D/g, "").replace(/^0+/, "");
  const s2 = String(p2).replace(/\D/g, "").replace(/^0+/, "");
  if (!s1 || !s2) return false;
  if (s1 === s2) return true;
  if (s1.endsWith(s2) || s2.endsWith(s1)) return true;
  const last8A = s1.length >= 8 ? s1.slice(-8) : s1;
  const last8B = s2.length >= 8 ? s2.slice(-8) : s2;
  return last8A.length >= 8 && last8A === last8B;
}

function cleanNameString(n) {
  return String(n || "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\b(sis|bro|sister|brother)\b/gi, "")
    .replace(/\b\d+_\b/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function isNameMatch(n1, n2) {
  if (!n1 || !n2) return false;
  const s1 = cleanNameString(n1);
  const s2 = cleanNameString(n2);
  if (!s1 || !s2) return false;
  if (s1 === s2) return true;
  if (s1.includes(s2) || s2.includes(s1)) return true;

  const words1 = s1.split(/\s+/).filter(w => w.length > 2);
  const words2 = s2.split(/\s+/).filter(w => w.length > 2);
  if (words1.length === 0 || words2.length === 0) return false;

  const [shorter, longer] = words1.length <= words2.length ? [words1, words2] : [words2, words1];
  if (shorter.every(w => longer.includes(w))) return true;

  const matchingWords = words1.filter(w => words2.includes(w));
  if (matchingWords.length >= 2) return true;

  return false;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const teamParam = searchParams.get('team');

    if (!teamParam) {
      return NextResponse.json({ error: 'Team name is required' }, { status: 400 });
    }

    const normTargetTeam = normalizeTeam(teamParam);

    const [settings, rawResults, rawSessions, globalData] = await Promise.all([
      getQuizSettings().catch(() => ({})),
      getAllQuizResults().catch(() => []),
      getAllQuizSessions().catch(() => []),
      fetchGlobalData().catch(() => ({ members: [], trackerData: [] }))
    ]);

    // Gather team members from trackerData and directory
    const teamTrackerMembers = (globalData.trackerData || []).filter(m => 
      isTeamMatch(m.Team_Name || m.Team, teamParam)
    );
    const teamDirectoryMembers = (globalData.members || []).filter(m => 
      isTeamMatch(m.team, teamParam)
    );

    // Filter results for this team
    const teamResults = rawResults.filter(r => {
      // 1. Direct team name match
      if (isTeamMatch(r.team, teamParam)) return true;

      // 2. Phone match against team members
      const phoneMatched = teamTrackerMembers.some(m => 
        isPhoneMatch(r.whatsApp, m.WhatsApp_Number || m.Whatsapp_Number || m.Phone)
      ) || teamDirectoryMembers.some(m => isPhoneMatch(r.whatsApp, m.whatsapp));
      if (phoneMatched) return true;

      // 3. Name match against team members
      const nameMatched = teamTrackerMembers.some(m => 
        isNameMatch(r.fullName, m.Member_Name || m.Name)
      ) || teamDirectoryMembers.some(m => isNameMatch(r.fullName, m.name));
      if (nameMatched) return true;

      return false;
    });

    // Enrich results with resolved names, computed time, percentage
    const enrichedResults = teamResults.map(r => {
      let fullName = r.fullName;
      if (!fullName || fullName === "Candidate") {
        const found = teamTrackerMembers.find(m => 
          isPhoneMatch(r.whatsApp, m.WhatsApp_Number || m.Whatsapp_Number || m.Phone)
        ) || teamDirectoryMembers.find(m => isPhoneMatch(r.whatsApp, m.whatsapp));
        if (found) {
          fullName = found.Member_Name || found.Name || found.name || fullName;
        }
      }

      // Compute time spent if missing
      let timeSpentSeconds = r.timeSpentSeconds;
      if (timeSpentSeconds === null || timeSpentSeconds === undefined || isNaN(timeSpentSeconds)) {
        const rRound = String(r.round || "").trim().toLowerCase();
        const rEdition = String(r.edition || "New Testament (3 chapters daily)").trim().toLowerCase();

        const matchedSession = rawSessions.find(s => 
          isPhoneMatch(r.whatsApp, s.whatsApp) && 
          String(s.round || "").trim().toLowerCase() === rRound &&
          String(s.edition || "New Testament (3 chapters daily)").trim().toLowerCase() === rEdition
        );

        if (matchedSession && matchedSession.startTimestamp && r.timestamp) {
          const startMs = Number(matchedSession.startTimestamp);
          const submitMs = new Date(r.timestamp).getTime();
          const diffSec = Math.round((submitMs - startMs) / 1000);
          if (diffSec > 0 && diffSec < 86400) {
            timeSpentSeconds = diffSec;
          }
        }
      }

      const score = Number(r.score) || 0;
      const totalQuestions = Number(r.totalQuestions) || 0;
      const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;

      return {
        ...r,
        fullName: fullName || "Candidate",
        team: teamParam,
        score,
        totalQuestions,
        percentage,
        timeSpentSeconds: timeSpentSeconds !== undefined ? timeSpentSeconds : null,
        timestamp: r.timestamp || new Date().toISOString()
      };
    });

    // Sort by timestamp desc (newest first)
    enrichedResults.sort((a, b) => {
      const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return tb - ta;
    });

    // Extract available rounds
    const roundsSet = new Set();
    if (settings.Active_Round) roundsSet.add(settings.Active_Round);
    enrichedResults.forEach(r => {
      if (r.round) roundsSet.add(r.round);
    });
    const availableRounds = Array.from(roundsSet).sort();

    return NextResponse.json({
      success: true,
      team: teamParam,
      settings: {
        isLive: String(settings.Is_Quiz_Live).toUpperCase() === "TRUE",
        activeRound: settings.Active_Round || "Round 1",
        activeEdition: settings.Active_Edition || "New Testament (3 chapters daily)",
        timeLimitMinutes: settings.Time_Limit_Minutes || "15"
      },
      results: enrichedResults,
      availableRounds
    });
  } catch (error) {
    console.error("Team Quiz API Error:", error);
    return NextResponse.json({ error: "Failed to fetch team quiz data" }, { status: 500 });
  }
}
