"use client";
import React, { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import { 
  Layers, Play, UploadCloud, CheckCircle2, AlertCircle, AlertTriangle, 
  RefreshCw, FileDown, Copy, Check, MessageSquare, KeyRound, 
  Users, ChevronRight, ChevronLeft, Calendar, Clock, ShieldCheck, 
  Sliders, ArrowRight, ExternalLink, Sparkles, UserPlus, Info, Trash2,
  Plus, Minus, Lock
} from "lucide-react";

function normalizePhone(raw) {
  if (raw === null || raw === undefined) return "";
  let text = String(raw).trim();
  if (["none", "nan", "n/a", ""].includes(text.toLowerCase())) return "";
  if (text.endsWith(".0")) {
    const cand = text.slice(0, -2);
    if (/^[+\d\s\-().]+$/.test(cand)) text = cand;
  }
  let digits = text.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 11 && digits.startsWith("0")) {
    digits = "234" + digits.slice(1);
  } else if (digits.length === 10 && ["7", "8", "9"].includes(digits[0])) {
    digits = "234" + digits;
  }
  return digits;
}

function generate4DigitPin() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

const PHONE_KEYWORDS = ["phone", "whatsapp", "mobile", "contact", "tel", "number"];
const FIRST_NAME_KEYWORDS = ["first name", "firstname", "first_name", "given name", "first"];
const SURNAME_KEYWORDS = ["surname", "last name", "lastname", "last_name", "family name"];
const OTHER_NAME_KEYWORDS = ["other names", "other name", "othernames", "middle name", "middlename", "other"];
const SINGLE_NAME_KEYWORDS = ["full name", "fullname", "member name", "participant name", "name"];

export default function NewRoundWizard({ onComplete, currentEditionInfo }) {
  const [step, setStep] = useState(1);
  const [maxUnlockedStep, setMaxUnlockedStep] = useState(1);
  const [copyFeedback, setCopyFeedback] = useState({});

  const advanceToStep = (nextStep) => {
    setMaxUnlockedStep(prev => Math.max(prev, nextStep));
    setStep(nextStep);
  };

  const goToStep = (targetStep) => {
    if (targetStep <= maxUnlockedStep) {
      setStep(targetStep);
    }
  };

  // STEP 1: Settings
  const [settings, setSettings] = useState({
    challengeName: currentEditionInfo?.name || "ECCF Bible Reading Challenge Tracker",
    challengeEdition: currentEditionInfo?.edition || "",
    startDate: new Date().toISOString().split("T")[0],
    totalDays: currentEditionInfo?.totalDays || 30,
    mornStart: "04:00 AM",
    mornEnd: "11:00 AM",
    eveStart: "06:00 PM",
    eveEnd: "11:00 PM",
    mode: "fresh"
  });

  // STEP 2: Upload & Grouping
  const [fileName, setFileName] = useState("");
  const [rawHeaders, setRawHeaders] = useState([]);
  const [rawRows, setRawRows] = useState([]);
  const [nameFormatMode, setNameFormatMode] = useState("separate"); // "separate" | "single"
  const [selectedFirstNameCol, setSelectedFirstNameCol] = useState("");
  const [selectedSurnameCol, setSelectedSurnameCol] = useState("");
  const [selectedOtherNameCol, setSelectedOtherNameCol] = useState("");
  const [selectedNameCol, setSelectedNameCol] = useState("");
  const [selectedPhoneCol, setSelectedPhoneCol] = useState("");
  const [selectedStatusCol, setSelectedStatusCol] = useState("");
  const [numTeams, setNumTeams] = useState(10);
  const [teamNamePrefix, setTeamNamePrefix] = useState("Team");
  const [roundPrefix, setRoundPrefix] = useState("");
  const [groupedTeams, setGroupedTeams] = useState([]);
  const [previewTeamIdx, setPreviewTeamIdx] = useState(0);

  // STEP 5: Launch state
  const [launching, setLaunching] = useState(false);
  const [launchResult, setLaunchResult] = useState(null);

  useEffect(() => {
    const d = new Date();
    const m = d.toLocaleString("default", { month: "short" }).toUpperCase();
    const y = d.getFullYear();
    setRoundPrefix(`${m}${y}BRC`);
  }, []);

  const handleCopyText = (key, text) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(prev => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setCopyFeedback(prev => ({ ...prev, [key]: false }));
    }, 2500);
  };

  // -------------------------------------------------------------
  // File Upload & Parsing (XLSX)
  // -------------------------------------------------------------
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

        if (!data || data.length < 2) {
          alert("The uploaded spreadsheet appears to be empty or missing data rows.");
          return;
        }

        const headers = data[0].map(h => String(h || "").trim()).filter(Boolean);
        const rows = data.slice(1).map(r => {
          const rowObj = {};
          headers.forEach((h, i) => {
            rowObj[h] = r[i] !== undefined ? r[i] : "";
          });
          return rowObj;
        });

        setRawHeaders(headers);
        setRawRows(rows);

        let detectedPhone = "";
        let detectedFirst = "";
        let detectedSurname = "";
        let detectedOther = "";
        let detectedSingleName = "";
        let detectedStatus = "";

        for (const h of headers) {
          const hl = h.toLowerCase().trim();
          if (!detectedPhone && PHONE_KEYWORDS.some(kw => hl.includes(kw))) detectedPhone = h;
          if (!detectedFirst && FIRST_NAME_KEYWORDS.some(kw => hl.includes(kw))) detectedFirst = h;
          if (!detectedSurname && SURNAME_KEYWORDS.some(kw => hl.includes(kw))) detectedSurname = h;
          if (!detectedOther && OTHER_NAME_KEYWORDS.some(kw => hl.includes(kw))) detectedOther = h;
          if (!detectedSingleName && SINGLE_NAME_KEYWORDS.some(kw => hl.includes(kw))) detectedSingleName = h;
          if (!detectedStatus && hl.includes("status")) detectedStatus = h;
        }

        setSelectedPhoneCol(detectedPhone || headers[1] || headers[0]);
        setSelectedStatusCol(detectedStatus);

        if (detectedFirst && detectedSurname) {
          setNameFormatMode("separate");
          setSelectedFirstNameCol(detectedFirst);
          setSelectedSurnameCol(detectedSurname);
          setSelectedOtherNameCol(detectedOther || "");
          setSelectedNameCol(detectedSingleName || headers[0]);
        } else {
          setNameFormatMode("single");
          setSelectedNameCol(detectedSingleName || headers[0]);
          setSelectedFirstNameCol(detectedFirst || headers[0]);
          setSelectedSurnameCol(detectedSurname || headers[0]);
          setSelectedOtherNameCol(detectedOther || "");
        }
      } catch (err) {
        console.error("Spreadsheet parsing error:", err);
        alert("Failed to parse spreadsheet file: " + err.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  // -------------------------------------------------------------
  // Grouping Engine
  // -------------------------------------------------------------
  const cleanValidMembers = useMemo(() => {
    if (!rawRows.length || !selectedPhoneCol) return [];
    const seen = new Set();
    const valid = [];

    rawRows.forEach(r => {
      const phoneRaw = r[selectedPhoneCol];
      const phoneClean = normalizePhone(phoneRaw);
      if (!phoneClean || seen.has(phoneClean)) return;
      seen.add(phoneClean);

      let nameVal = "";
      if (nameFormatMode === "separate") {
        const fn = selectedFirstNameCol ? String(r[selectedFirstNameCol] || "").trim() : "";
        const on = selectedOtherNameCol ? String(r[selectedOtherNameCol] || "").trim() : "";
        const sn = selectedSurnameCol ? String(r[selectedSurnameCol] || "").trim() : "";
        nameVal = [fn, on, sn].filter(Boolean).join(" ");
      } else {
        nameVal = selectedNameCol ? String(r[selectedNameCol] || "").trim() : "";
      }

      valid.push({
        name: nameVal || "Participant",
        phoneRaw: String(phoneRaw || ""),
        phoneClean,
        waLink: `https://wa.me/${phoneClean}`,
        status: selectedStatusCol ? String(r[selectedStatusCol] || "Active").trim() : "Active",
        originalRow: r
      });
    });

    return valid;
  }, [rawRows, selectedPhoneCol, nameFormatMode, selectedNameCol, selectedFirstNameCol, selectedSurnameCol, selectedOtherNameCol, selectedStatusCol]);

  const executeGrouping = () => {
    if (!cleanValidMembers.length) return;
    const n = Math.max(1, parseInt(numTeams) || 1);
    const prefix = (roundPrefix || "ECCFBRC").trim().toUpperCase();

    const shuffled = [...cleanValidMembers].sort(() => Math.random() - 0.5);

    const padLen = String(n).length;
    const prefixTeam = (teamNamePrefix || "Team").trim();
    const teams = [];
    for (let t = 1; t <= n; t++) {
      const teamLabel = `${prefixTeam} ${String(t).padStart(padLen > 1 ? padLen : 2, "0")}`;
      teams.push({
        teamNumber: t,
        teamName: teamLabel,
        pin: generate4DigitPin(),
        leaderName: "",
        leaderPhone: "",
        leaderWaLink: "",
        assistantName: "",
        assistantPhone: "",
        assistantWaLink: "",
        members: []
      });
    }

    shuffled.forEach((m, idx) => {
      const targetTeam = teams[idx % n];
      const seqNum = String(idx + 1).padStart(3, "0");
      targetTeam.members.push({
        ...m,
        assignedTeam: targetTeam.teamName,
        systemId: `${prefix}-${seqNum}`
      });
    });

    // Team leader & assistant names/phones are left empty for manual entry

    setGroupedTeams(teams);
    setPreviewTeamIdx(0);
  };

  useEffect(() => {
    if (cleanValidMembers.length > 0) {
      executeGrouping();
    }
  }, [cleanValidMembers, numTeams, teamNamePrefix]);

  const updateTeamName = (teamIdx, newName) => {
    setGroupedTeams(prev => {
      const updated = [...prev];
      const t = { ...updated[teamIdx], teamName: newName };
      t.members = t.members.map(m => ({ ...m, assignedTeam: newName }));
      updated[teamIdx] = t;
      return updated;
    });
  };

  const updateTeamLeader = (teamIdx, field, val) => {
    setGroupedTeams(prev => {
      const updated = [...prev];
      const t = { ...updated[teamIdx] };
      t[field] = val;
      if (field === "leaderPhone") {
        const c = normalizePhone(val);
        t.leaderWaLink = c ? `https://wa.me/${c}` : "";
      }
      if (field === "assistantPhone") {
        const c = normalizePhone(val);
        t.assistantWaLink = c ? `https://wa.me/${c}` : "";
      }
      updated[teamIdx] = t;
      return updated;
    });
  };

  const regeneratePin = (teamIdx) => {
    setGroupedTeams(prev => {
      const updated = [...prev];
      updated[teamIdx] = { ...updated[teamIdx], pin: generate4DigitPin() };
      return updated;
    });
  };

  const regenerateAllPins = () => {
    setGroupedTeams(prev => prev.map(t => ({ ...t, pin: generate4DigitPin() })));
  };

  // -------------------------------------------------------------
  // WhatsApp Message Generator (Matches exact user specification)
  // -------------------------------------------------------------
  const generateLeaderWhatsAppMessage = (team) => {
    const leaderName = team.leaderName || "[TEAM LEADER'S NAME]";
    const teamName = team.teamName;
    const edition = settings.challengeEdition || settings.challengeName || "ECCF Bible Reading Challenge";
    const assistantText = team.assistantName 
      ? `${team.assistantName} [${team.assistantWaLink || "https://wa.me/"}]` 
      : "[ASSISTANT NAME] [https://wa.me/]";

    const membersList = team.members.map((m, idx) => `${idx + 1}. https://wa.me/${m.phoneClean}`).join("\n");

    return `Good Morning Dear ECCFBRC Team Leader. I believe you\'ve already created your Group chat, and have added your Assistant, if not please do that as soon as possible, and then move on to send each of your members this message;\n\n` +
      `-----------------------------------------------------------\n` +
      `Hello!\n\n` +
      `I am ${leaderName}, your Team Leader for ${teamName} in the ECCF Bible Reading Challenge (${edition}).\n\n` +
      `I am reaching out to welcome you and to request your permission to add you to our team\'s group chat for mutual follow-up and accountability.\n\n` +
      `If you are happy to proceed, you can join the group directly using the invite link below:\n\n` +
      `[LINK TO TEAM GROUP CHAT]\n\n` +
      `I look forward to welcoming you to the team!\n` +
      `-----------------------------------------------------------\n` +
      `Ensure to replace the brackets with your actual details.\n\n` +
      `-----------------------------------------------------------\n` +
      `*${teamName}*\n` +
      `*Team Leader*: ${leaderName} [${team.leaderWaLink || "https://wa.me/"}]\n` +
      `*Assistant*: ${assistantText}\n` +
      `*Team Login PIN*: ${team.pin}\n\n` +
      `*Members:*\n` +
      `${membersList}\n\n` +
      `Click their links to access their DMs and paste the edited message in each of them.\n` +
      `If you have any question, please feel free to ask.`;
  };

  // -------------------------------------------------------------
  // Step 4: Pre-Flight Checklist Audit
  // -------------------------------------------------------------
  const readinessCheck = useMemo(() => {
    const checks = [
      {
        id: "settings_name",
        label: "Challenge & Edition Title",
        ok: Boolean(settings.challengeName.trim() && settings.challengeEdition.trim()),
        detail: settings.challengeEdition ? `"${settings.challengeEdition}"` : "Edition name is empty",
        stepTarget: 1
      },
      {
        id: "settings_timeline",
        label: "Start Date & Duration",
        ok: Boolean(settings.startDate && parseInt(settings.totalDays) > 0),
        detail: `Starts ${settings.startDate}, ${settings.totalDays} Days duration`,
        stepTarget: 1
      },
      {
        id: "roster_count",
        label: "Participant Allocation",
        ok: cleanValidMembers.length > 0 && groupedTeams.length > 0,
        detail: cleanValidMembers.length > 0 ? `${cleanValidMembers.length} members distributed into ${groupedTeams.length} teams` : "No spreadsheet uploaded",
        stepTarget: 2
      },
      {
        id: "teams_named",
        label: "Team Names Configured",
        ok: groupedTeams.length > 0 && groupedTeams.every(t => t.teamName && t.teamName.trim()),
        detail: groupedTeams.length > 0 && groupedTeams.every(t => t.teamName && t.teamName.trim())
          ? `All ${groupedTeams.length} teams have configured names`
          : "Some teams have empty team names",
        stepTarget: 3
      },
      {
        id: "leaders_assigned",
        label: "Team Leaders Designated",
        ok: groupedTeams.length > 0 && groupedTeams.every(t => t.leaderName && t.leaderName.trim()),
        detail: groupedTeams.length > 0 && groupedTeams.every(t => t.leaderName && t.leaderName.trim())
          ? `All ${groupedTeams.length} teams have designated leaders`
          : `${groupedTeams.filter(t => !t.leaderName || !t.leaderName.trim()).length} of ${groupedTeams.length} teams need leader details`,
        stepTarget: 3
      },
      {
        id: "pins_generated",
        label: "Unique 4-Digit Leader PINs",
        ok: groupedTeams.length > 0 && groupedTeams.every(t => /^\d{4}$/.test(t.pin)),
        detail: "All teams have fresh 4-digit PINs assigned",
        stepTarget: 3
      }
    ];

    const isAllOk = checks.every(c => c.ok);
    return { checks, isAllOk };
  }, [settings, cleanValidMembers, groupedTeams]);

  // -------------------------------------------------------------
  // Step 5: Launch & Database Sync
  // -------------------------------------------------------------
  const handleLaunchRound = async () => {
    if (!readinessCheck.isAllOk) {
      alert("Please resolve the highlighted items on the checklist before launching.");
      return;
    }

    const confirmMsg = settings.mode === "fresh"
      ? `Are you sure you want to Launch "${settings.challengeEdition}"?\n\nThis will ARCHIVE the current active challenge in Google Sheets and reset the live tracker for the new round.`
      : `Are you sure you want to append ${cleanValidMembers.length} members across ${groupedTeams.length} teams to the active challenge?`;

    if (!window.confirm(confirmMsg)) return;

    setLaunching(true);

    try {
      const allMembersPayload = [];
      groupedTeams.forEach(t => {
        t.members.forEach(m => {
          allMembersPayload.push({
            Team_Name: t.teamName,
            Member_Name: m.name,
            WhatsApp_Number: m.phoneClean,
            System_ID: m.systemId,
            Status: "Active"
          });
        });
      });

      const credentialsPayload = groupedTeams.map(t => ({
        Team_Name: t.teamName,
        PIN: t.pin,
        Current_Reflection: ""
      }));

      const leadersTrackerPayload = groupedTeams.map(t => ({
        "Team Leader": t.leaderName,
        Status: "Active",
        Team: t.teamName,
        Assistant: t.assistantName || "",
        Assistant_Status: t.assistantName ? "Active" : "",
        Leader_Phone: normalizePhone(t.leaderPhone),
        Assistant_Phone: normalizePhone(t.assistantPhone)
      }));

      const payload = {
        action: "admin_launch_new_round",
        payload: {
          mode: settings.mode,
          settings: {
            Challenge_Name: settings.challengeName,
            Challenge_Edition: settings.challengeEdition,
            Start_Date: settings.startDate,
            Total_Days: String(settings.totalDays),
            Morning_Window_Start: settings.mornStart,
            Morning_Window_End: settings.mornEnd,
            Evening_Window_Start: settings.eveStart,
            Evening_Window_End: settings.eveEnd,
            Current_Round: "1",
            Status: "Active",
            Is_Completed: "FALSE"
          },
          members: allMembersPayload,
          credentials: credentialsPayload,
          leaders: leadersTrackerPayload
        }
      };

      const res = await fetch("/api/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || "Failed to launch new round");
      }

      setLaunchResult({
        success: true,
        message: `Successfully launched "${settings.challengeEdition}" with ${allMembersPayload.length} participants across ${groupedTeams.length} teams!`
      });
      advanceToStep(5);
      // Do not auto-close here: keep user on Step 5 so they can copy WhatsApp messages and download Excel.
    } catch (err) {
      console.error("Error launching round:", err);
      alert("Error launching round: " + err.message);
    } finally {
      setLaunching(false);
    }
  };

  const handleDownloadExcel = () => {
    if (!groupedTeams.length) return;

    const wb = XLSX.utils.book_new();

    const teamsRows = [];
    groupedTeams.forEach(t => {
      t.members.forEach(m => {
        teamsRows.push({
          "Team": t.teamName,
          "System_ID": m.systemId,
          "Member Name": m.name,
          "Phone Number": m.phoneRaw,
          "Cleaned Phone": m.phoneClean,
          "WhatsApp Link": m.waLink,
          "Status": m.status,
          "Team Leader": t.leaderName,
          "Assistant Leader": t.assistantName || "N/A"
        });
      });
    });
    const ws1 = XLSX.utils.json_to_sheet(teamsRows);
    XLSX.utils.book_append_sheet(wb, ws1, "Sorted_Teams");

    const leaderRows = groupedTeams.map(t => ({
      "Team": t.teamName,
      "Team Leader": t.leaderName,
      "Leader Phone": t.leaderPhone,
      "Leader WhatsApp": t.leaderWaLink,
      "Assistant Leader": t.assistantName || "N/A",
      "Assistant Phone": t.assistantPhone || "N/A",
      "Login PIN": t.pin,
      "Member Count": t.members.length
    }));
    const ws2 = XLSX.utils.json_to_sheet(leaderRows);
    XLSX.utils.book_append_sheet(wb, ws2, "Team_Leaders_Directory");

    const safeSlug = (settings.challengeEdition || "ECCFBRC_Teams").replace(/[^a-zA-Z0-9]/g, "_");
    XLSX.writeFile(wb, `${safeSlug}_Roster.xlsx`);
  };

  const copyLeaderDirectoryText = () => {
    let text = `*ECCF BIBLE READING CLUB - TEAM LEADERS & PINS DIRECTORY*\n`;
    text += `*Edition*: ${settings.challengeEdition || settings.challengeName}\n`;
    text += `*Start Date*: ${settings.startDate} (${settings.totalDays} Days)\n\n`;

    groupedTeams.forEach(t => {
      text += `-----------------------------------------\n`;
      text += `*${t.teamName}*\n`;
      text += `Leader: ${t.leaderName} (${t.leaderWaLink || t.leaderPhone})\n`;
      if (t.assistantName) text += `Assistant: ${t.assistantName} (${t.assistantWaLink || t.assistantPhone})\n`;
      text += `Login PIN: *${t.pin}* | Members: ${t.members.length}\n`;
    });

    handleCopyText("all_leaders_dir", text);
  };

  // -------------------------------------------------------------
  // RENDER WIZARD STEPS
  // -------------------------------------------------------------
  return (
    <div style={{ padding: "0.5rem" }}>
      {/* Wizard Header & Stepper Bar */}
      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--border-light)",
        borderRadius: "0.75rem",
        padding: "1.25rem 1.5rem",
        marginBottom: "1.5rem"
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
              <span style={{
                background: "rgba(37, 99, 235, 0.15)",
                color: "#60A5FA",
                fontSize: "0.7rem",
                fontWeight: "700",
                padding: "0.2rem 0.5rem",
                borderRadius: "9999px",
                textTransform: "uppercase"
              }}>
                Step-by-Step Launch Wizard
              </span>
            </div>
            <h2 style={{ fontSize: "1.4rem", fontWeight: "800", margin: 0, color: "#F9FAFB" }}>
              Start a New Bible Reading Round
            </h2>
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            {groupedTeams.length > 0 && (
              <button 
                onClick={handleDownloadExcel}
                className="btn-secondary"
                style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.82rem", padding: "0.45rem 0.85rem" }}
              >
                <FileDown size={14} />
                <span>Export Excel</span>
              </button>
            )}
          </div>
        </div>

        {/* Stepper Navigator */}
        <div className="wizard-stepper-bar no-scrollbar" style={{ paddingBottom: "0.5rem" }}>
          {[
            { s: 1, label: "1. Round Details", icon: <Sliders size={14} /> },
            { s: 2, label: "2. Upload & Group", icon: <UploadCloud size={14} /> },
            { s: 3, label: "3. Leaders & PINs", icon: <KeyRound size={14} /> },
            { s: 4, label: "4. Readiness Audit", icon: <ShieldCheck size={14} /> },
            { s: 5, label: "5. Launch & WhatsApp", icon: <MessageSquare size={14} /> }
          ].map(st => {
            const isUnlocked = st.s <= maxUnlockedStep;
            const isActive = step === st.s;
            const isDone = isUnlocked && step > st.s;
            return (
              <button
                key={st.s}
                disabled={!isUnlocked}
                onClick={() => goToStep(st.s)}
                title={!isUnlocked ? "Complete previous steps to unlock" : undefined}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.45rem",
                  padding: "0.5rem 0.85rem",
                  borderRadius: "0.5rem",
                  border: isActive 
                    ? "1px solid #3B82F6" 
                    : isUnlocked 
                      ? "1px solid var(--border-light)" 
                      : "1px dashed rgba(255, 255, 255, 0.08)",
                  background: isActive 
                    ? "rgba(37, 99, 235, 0.2)" 
                    : isDone 
                      ? "rgba(16, 185, 129, 0.1)" 
                      : isUnlocked 
                        ? "rgba(255, 255, 255, 0.02)" 
                        : "transparent",
                  color: isActive 
                    ? "#93C5FD" 
                    : isDone 
                      ? "#34D399" 
                      : isUnlocked 
                        ? "var(--text-secondary)" 
                        : "rgba(156, 163, 175, 0.35)",
                  fontSize: "0.82rem",
                  fontWeight: isActive ? "700" : "500",
                  cursor: isUnlocked ? "pointer" : "not-allowed",
                  whiteSpace: "nowrap",
                  opacity: isUnlocked ? 1 : 0.45,
                  transition: "all 0.2s ease"
                }}
              >
                {!isUnlocked ? (
                  <Lock size={12} style={{ opacity: 0.6 }} />
                ) : isDone ? (
                  <Check size={14} color="#10B981" />
                ) : (
                  st.icon
                )}
                <span>{st.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* STEP 1: ROUND CONFIGURATION & MODE */}
      {step === 1 && (
        <div className="card" style={{ padding: "1.5rem" }}>
          <h3 style={{ fontSize: "1.15rem", fontWeight: "700", marginBottom: "0.4rem" }}>
            Step 1: Round Configuration & Mode Selection
          </h3>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
            Specify the name, dates, duration, and whether you are initiating a fresh round or appending to existing records.
          </p>

          <div style={{ marginBottom: "1.5rem" }}>
            <label className="label" style={{ fontWeight: "700", marginBottom: "0.5rem", display: "block" }}>
              Round Launch Mode:
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem" }}>
              <div 
                onClick={() => setSettings(s => ({ ...s, mode: "fresh" }))}
                style={{
                  padding: "1rem",
                  borderRadius: "0.65rem",
                  border: settings.mode === "fresh" ? "2px solid #3B82F6" : "1px solid var(--border-light)",
                  background: settings.mode === "fresh" ? "rgba(37, 99, 235, 0.12)" : "rgba(255, 255, 255, 0.02)",
                  cursor: "pointer"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.35rem" }}>
                  <span style={{ fontWeight: "700", fontSize: "0.95rem", color: settings.mode === "fresh" ? "#93C5FD" : "#F9FAFB", display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
                    <RefreshCw size={15} color="#3B82F6" /> <span>Start Fresh Round (Recommended)</span>
                  </span>
                  {settings.mode === "fresh" && <CheckCircle2 size={16} color="#3B82F6" />}
                </div>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.4 }}>
                  Safely archives the currently active challenge in Google Sheets, then clears the live tracker sheets for a clean new start.
                </p>
              </div>

              <div 
                onClick={() => setSettings(s => ({ ...s, mode: "append" }))}
                style={{
                  padding: "1rem",
                  borderRadius: "0.65rem",
                  border: settings.mode === "append" ? "2px solid #10B981" : "1px solid var(--border-light)",
                  background: settings.mode === "append" ? "rgba(16, 185, 129, 0.12)" : "rgba(255, 255, 255, 0.02)",
                  cursor: "pointer"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.35rem" }}>
                  <span style={{ fontWeight: "700", fontSize: "0.95rem", color: settings.mode === "append" ? "#6EE7B7" : "#F9FAFB", display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
                    <UserPlus size={15} color="#10B981" /> <span>Append to Active Roster</span>
                  </span>
                  {settings.mode === "append" && <CheckCircle2 size={16} color="#10B981" />}
                </div>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.4 }}>
                  Retains all current challenge data and appends the new teams and members directly to the active database.
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.25rem", marginBottom: "1.25rem" }}>
            <div>
              <label className="label">Challenge Main Title:</label>
              <input 
                type="text" 
                className="input-field" 
                value={settings.challengeName}
                onChange={e => setSettings({ ...settings, challengeName: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Challenge Edition / Round Name:</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="e.g. June - August New Testament 2026 Edition"
                value={settings.challengeEdition}
                onChange={e => setSettings({ ...settings, challengeEdition: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.25rem", marginBottom: "1.5rem" }}>
            <div>
              <label className="label">Start Date:</label>
              <input 
                type="date" 
                className="input-field" 
                value={settings.startDate}
                onChange={e => setSettings({ ...settings, startDate: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Total Duration (Days):</label>
              <input 
                type="number" 
                className="input-field" 
                value={settings.totalDays}
                onChange={e => setSettings({ ...settings, totalDays: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button 
              onClick={() => advanceToStep(2)}
              className="btn-primary"
              style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem", padding: "0.6rem 1.25rem" }}
            >
              <span>Next: Upload & Group Members</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: SPREADSHEET UPLOAD & GROUPING */}
      {step === 2 && (
        <div className="card" style={{ padding: "1.5rem" }}>
          <h3 style={{ fontSize: "1.15rem", fontWeight: "700", marginBottom: "0.4rem" }}>
            Step 2: Upload Participant Spreadsheet & Configure Grouping
          </h3>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
            Upload your registration spreadsheet (.xlsx or .csv). The system will automatically sanitize phone numbers, eliminate duplicates, and distribute participants across teams.
          </p>

          <div style={{
            border: "2px dashed var(--border)",
            borderRadius: "0.75rem",
            padding: "2rem 1.5rem",
            textAlign: "center",
            background: "rgba(255, 255, 255, 0.02)",
            marginBottom: "1.5rem"
          }}>
            <UploadCloud size={36} color="#38BDF8" style={{ margin: "0 auto 0.75rem auto", display: "block" }} />
            <h4 style={{ margin: "0 0 0.25rem 0", fontSize: "1rem", color: "#F9FAFB" }}>
              {fileName ? `Loaded: ${fileName}` : "Drag and drop your spreadsheet here"}
            </h4>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
              Supports Microsoft Excel (.xlsx, .xls) and Comma-Separated Values (.csv)
            </p>
            <input 
              type="file" 
              id="wizard-file-input"
              accept=".xlsx, .xls, .csv" 
              onChange={handleFileUpload} 
              style={{ display: "none" }}
            />
            <label 
              htmlFor="wizard-file-input"
              className="btn-primary"
              style={{ display: "inline-block", cursor: "pointer", padding: "0.55rem 1.25rem" }}
            >
              Browse Files
            </label>
          </div>

          {rawRows.length > 0 && (
            <>
              <div style={{
                background: "rgba(255, 255, 255, 0.03)",
                padding: "1rem",
                borderRadius: "0.65rem",
                border: "1px solid var(--border-light)",
                marginBottom: "1.5rem"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
                  <h4 style={{ fontSize: "0.92rem", fontWeight: "700", margin: 0, color: "#E0F2FE" }}>
                    Column Mapping & Name Combination
                  </h4>

                  {/* Mode Toggle */}
                  <div style={{ display: "inline-flex", background: "rgba(0, 0, 0, 0.3)", borderRadius: "0.45rem", padding: "0.2rem", border: "1px solid var(--border-light)" }}>
                    <button
                      type="button"
                      onClick={() => setNameFormatMode("separate")}
                      style={{
                        padding: "0.3rem 0.75rem",
                        borderRadius: "0.35rem",
                        fontSize: "0.78rem",
                        fontWeight: "600",
                        cursor: "pointer",
                        border: "none",
                        background: nameFormatMode === "separate" ? "#0284C7" : "transparent",
                        color: nameFormatMode === "separate" ? "#FFFFFF" : "var(--text-secondary)",
                        transition: "all 0.15s ease"
                      }}
                    >
                      Separate Columns (First Name + Surname)
                    </button>
                    <button
                      type="button"
                      onClick={() => setNameFormatMode("single")}
                      style={{
                        padding: "0.3rem 0.75rem",
                        borderRadius: "0.35rem",
                        fontSize: "0.78rem",
                        fontWeight: "600",
                        cursor: "pointer",
                        border: "none",
                        background: nameFormatMode === "single" ? "#0284C7" : "transparent",
                        color: nameFormatMode === "single" ? "#FFFFFF" : "var(--text-secondary)",
                        transition: "all 0.15s ease"
                      }}
                    >
                      Single Full Name Column
                    </button>
                  </div>
                </div>

                {nameFormatMode === "separate" ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.85rem", marginBottom: "0.85rem" }}>
                    <div>
                      <label className="label">First Name Column: *</label>
                      <select 
                        className="input-field" 
                        value={selectedFirstNameCol} 
                        onChange={e => setSelectedFirstNameCol(e.target.value)}
                      >
                        <option value="">-- Select Column --</option>
                        {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label">Surname / Last Name: *</label>
                      <select 
                        className="input-field" 
                        value={selectedSurnameCol} 
                        onChange={e => setSelectedSurnameCol(e.target.value)}
                      >
                        <option value="">-- Select Column --</option>
                        {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label">Other / Middle Names (Optional):</label>
                      <select 
                        className="input-field" 
                        value={selectedOtherNameCol} 
                        onChange={e => setSelectedOtherNameCol(e.target.value)}
                      >
                        <option value="">-- None --</option>
                        {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div style={{ marginBottom: "0.85rem" }}>
                    <label className="label">Single Participant Full Name Column: *</label>
                    <select 
                      className="input-field" 
                      value={selectedNameCol} 
                      onChange={e => setSelectedNameCol(e.target.value)}
                    >
                      {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.85rem" }}>
                  <div>
                    <label className="label">Phone / WhatsApp Column: *</label>
                    <select 
                      className="input-field" 
                      value={selectedPhoneCol} 
                      onChange={e => setSelectedPhoneCol(e.target.value)}
                    >
                      {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Status Column (Optional):</label>
                    <select 
                      className="input-field" 
                      value={selectedStatusCol} 
                      onChange={e => setSelectedStatusCol(e.target.value)}
                    >
                      <option value="">-- None (Default: Active) --</option>
                      {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                </div>

                {/* Live Sample Preview */}
                {cleanValidMembers.length > 0 && (
                  <div style={{
                    marginTop: "0.85rem",
                    padding: "0.6rem 0.85rem",
                    background: "rgba(56, 189, 248, 0.08)",
                    border: "1px solid rgba(56, 189, 248, 0.25)",
                    borderRadius: "0.45rem",
                    fontSize: "0.82rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem"
                  }}>
                    <Sparkles size={14} color="#38BDF8" />
                    <span>
                      <strong style={{ color: "#38BDF8" }}>Participant #1 Live Preview:</strong> "{cleanValidMembers[0].name}" &middot; Phone: <span style={{ fontFamily: "monospace", color: "#A7F3D0" }}>{cleanValidMembers[0].phoneClean}</span>
                    </span>
                  </div>
                )}
              </div>

              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "1.25rem",
                marginBottom: "1.5rem"
              }}>
                <div>
                  <label className="label">Number of Teams to Create:</label>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <button 
                      type="button" 
                      className="btn-stepper" 
                      title="Decrease teams"
                      onClick={() => setNumTeams(n => Math.max(1, parseInt(n) - 1))}
                    >
                      <Minus size={15} />
                    </button>
                    <input 
                      type="number" 
                      min="1"
                      className="input-field" 
                      style={{ textAlign: "center", fontWeight: "700", height: "38px", margin: 0 }}
                      value={numTeams}
                      onChange={e => setNumTeams(Math.max(1, parseInt(e.target.value) || 1))}
                    />
                    <button 
                      type="button" 
                      className="btn-stepper" 
                      title="Increase teams"
                      onClick={() => setNumTeams(n => parseInt(n) + 1)}
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                  <span style={{ fontSize: "0.78rem", color: "#60A5FA", marginTop: "0.35rem", display: "block" }}>
                    ≈ {cleanValidMembers.length > 0 && numTeams > 0 ? Math.floor(cleanValidMembers.length / numTeams) : 0} to {cleanValidMembers.length > 0 && numTeams > 0 ? Math.ceil(cleanValidMembers.length / numTeams) : 0} members/team
                  </span>
                </div>

                <div>
                  <label className="label">Team Name Prefix / Template:</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    style={{ height: "38px", margin: 0 }}
                    value={teamNamePrefix}
                    placeholder="e.g. Team or Group"
                    onChange={e => setTeamNamePrefix(e.target.value)}
                  />
                  <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "0.35rem", display: "block" }}>
                    Generates: {teamNamePrefix || "Team"} 01, {teamNamePrefix || "Team"} 02...
                  </span>
                </div>

                <div>
                  <label className="label">Round System ID Prefix:</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    style={{ height: "38px", margin: 0 }}
                    value={roundPrefix}
                    placeholder="e.g. SEP2026BRC"
                    onChange={e => setRoundPrefix(e.target.value.toUpperCase())}
                  />
                  <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "0.35rem", display: "block" }}>
                    Example ID: {roundPrefix || "BRC"}-001
                  </span>
                </div>
              </div>

              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.75rem 1rem",
                background: "rgba(56, 189, 248, 0.1)",
                border: "1px solid rgba(56, 189, 248, 0.25)",
                borderRadius: "0.5rem",
                marginBottom: "1.5rem",
                flexWrap: "wrap",
                gap: "0.75rem"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <CheckCircle2 size={18} color="#38BDF8" />
                  <span style={{ fontSize: "0.88rem", color: "#F0F9FF" }}>
                    <strong>{cleanValidMembers.length}</strong> unique valid contacts ready to group into <strong>{numTeams}</strong> teams.
                  </span>
                </div>

                <button 
                  onClick={executeGrouping}
                  className="btn-reshuffle"
                >
                  <RefreshCw size={13} />
                  <span>Re-shuffle</span>
                </button>
              </div>

              {groupedTeams.length > 0 && (
                <div style={{ marginBottom: "1.5rem" }}>
                  <h4 style={{ fontSize: "0.95rem", fontWeight: "700", marginBottom: "0.75rem" }}>
                    Generated Teams Overview ({groupedTeams.length} Teams)
                  </h4>
                  <div className="wizard-team-pills no-scrollbar" style={{ marginBottom: "1rem" }}>
                    {groupedTeams.map((t, idx) => (
                      <button
                        key={t.teamName + idx}
                        onClick={() => setPreviewTeamIdx(idx)}
                        style={{
                          padding: "0.45rem 0.85rem",
                          borderRadius: "0.5rem",
                          border: previewTeamIdx === idx ? "1px solid #38BDF8" : "1px solid var(--border-light)",
                          background: previewTeamIdx === idx ? "rgba(56, 189, 248, 0.18)" : "var(--surface-secondary)",
                          color: previewTeamIdx === idx ? "#38BDF8" : "var(--text-secondary)",
                          fontSize: "0.82rem",
                          fontWeight: previewTeamIdx === idx ? "700" : "500",
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                          transition: "all 0.15s ease"
                        }}
                      >
                        {t.teamName} ({t.members.length})
                      </button>
                    ))}
                  </div>

                  {groupedTeams[previewTeamIdx] && (
                    <div style={{
                      background: "rgba(255, 255, 255, 0.02)",
                      border: "1px solid var(--border-light)",
                      borderRadius: "0.5rem",
                      padding: "1rem"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                        <span style={{ fontWeight: "700", color: "#F9FAFB", fontSize: "0.9rem" }}>
                          {groupedTeams[previewTeamIdx].teamName} &middot; {groupedTeams[previewTeamIdx].members.length} Members &middot; PIN: <strong>{groupedTeams[previewTeamIdx].pin}</strong>
                        </span>
                      </div>
                      <div style={{ maxHeight: "220px", overflowY: "auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem" }}>
                        {groupedTeams[previewTeamIdx].members.map((m, mIdx) => (
                          <div key={m.systemId} style={{
                            padding: "0.4rem 0.6rem",
                            background: "rgba(255, 255, 255, 0.02)",
                            borderRadius: "0.35rem",
                            fontSize: "0.78rem",
                            display: "flex",
                            justifyContent: "space-between"
                          }}>
                            <span>{mIdx + 1}. {m.name}</span>
                            <span style={{ color: "var(--text-secondary)" }}>{m.phoneClean}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1rem" }}>
            <button onClick={() => goToStep(1)} className="btn-secondary">
              <ChevronLeft size={16} />
              <span>Back to Details</span>
            </button>
            <button 
              onClick={() => advanceToStep(3)} 
              disabled={groupedTeams.length === 0}
              className="btn-primary"
              style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}
            >
              <span>Next: Designate Leaders & PINs</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: LEADERS, ASSISTANTS & 4-DIGIT PINS */}
      {step === 3 && (
        <div className="card" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.75rem" }}>
            <div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: "700", marginBottom: "0.4rem" }}>
                Step 3: Assign Team Names, Leaders & Generated PINs
              </h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: 0 }}>
                Configure individual team names, designate Leaders and Assistant Leaders, and review the generated 4-digit team login PINs.
              </p>
            </div>
            <button 
              onClick={regenerateAllPins}
              className="btn-secondary"
              style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem", padding: "0.4rem 0.8rem" }}
            >
              <RefreshCw size={13} />
              <span>Regenerate All PINs</span>
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxHeight: "500px", overflowY: "auto", paddingRight: "0.5rem", marginBottom: "1.5rem" }}>
            {groupedTeams.map((team, idx) => (
              <div key={idx} style={{
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid var(--border-light)",
                borderRadius: "0.65rem",
                padding: "1rem"
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem", marginBottom: "0.85rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flex: "1 1 280px" }}>
                    <label style={{ fontSize: "0.82rem", fontWeight: "700", color: "#93C5FD", whiteSpace: "nowrap" }}>
                      Team Name:
                    </label>
                    <input 
                      type="text" 
                      value={team.teamName} 
                      onChange={e => updateTeamName(idx, e.target.value)}
                      className="input-field" 
                      style={{ margin: 0, padding: "0.4rem 0.75rem", fontSize: "0.9rem", fontWeight: "700", color: "#F9FAFB", maxWidth: "240px", height: "36px" }}
                      placeholder={`Team ${String(idx + 1).padStart(2, '0')}`}
                    />
                    <span style={{ fontSize: "0.78rem", background: "rgba(255, 255, 255, 0.08)", padding: "0.2rem 0.6rem", borderRadius: "9999px", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                      {team.members.length} members
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Team Login PIN:</span>
                    <span style={{
                      fontFamily: "monospace",
                      fontWeight: "800",
                      fontSize: "1.05rem",
                      background: "rgba(56, 189, 248, 0.15)",
                      color: "#38BDF8",
                      border: "1px solid rgba(56, 189, 248, 0.3)",
                      padding: "0.2rem 0.65rem",
                      borderRadius: "0.35rem",
                      letterSpacing: "2px"
                    }}>
                      {team.pin}
                    </span>
                    <button 
                      type="button"
                      onClick={() => regeneratePin(idx)}
                      title="Regenerate this team's PIN"
                      className="btn-stepper"
                      style={{ width: "32px", height: "32px", minWidth: "32px" }}
                    >
                      <RefreshCw size={13} />
                    </button>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
                  <div>
                    <label className="label" style={{ fontSize: "0.78rem", fontWeight: "600", marginBottom: "0.35rem" }}>
                      Team Leader Full Name & WhatsApp Phone:
                    </label>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <input 
                        type="text" 
                        placeholder="Full Name (First & Surname)"
                        className="input-field" 
                        style={{ fontSize: "0.82rem", margin: 0, flex: "1 1 55%", height: "36px" }}
                        value={team.leaderName}
                        onChange={e => updateTeamLeader(idx, "leaderName", e.target.value)}
                      />
                      <input 
                        type="text" 
                        placeholder="WhatsApp (e.g. 080...)"
                        className="input-field" 
                        style={{ fontSize: "0.82rem", margin: 0, flex: "1 1 45%", height: "36px" }}
                        value={team.leaderPhone}
                        onChange={e => updateTeamLeader(idx, "leaderPhone", e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label" style={{ fontSize: "0.78rem", fontWeight: "600", marginBottom: "0.35rem" }}>
                      Assistant Leader Full Name & Phone (Optional):
                    </label>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <input 
                        type="text" 
                        placeholder="Full Name (Optional)"
                        className="input-field" 
                        style={{ fontSize: "0.82rem", margin: 0, flex: "1 1 55%", height: "36px" }}
                        value={team.assistantName}
                        onChange={e => updateTeamLeader(idx, "assistantName", e.target.value)}
                      />
                      <input 
                        type="text" 
                        placeholder="WhatsApp (Optional)"
                        className="input-field" 
                        style={{ fontSize: "0.82rem", margin: 0, flex: "1 1 45%", height: "36px" }}
                        value={team.assistantPhone}
                        onChange={e => updateTeamLeader(idx, "assistantPhone", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <button onClick={() => goToStep(2)} className="btn-secondary">
              <ChevronLeft size={16} />
              <span>Back to Upload & Grouping</span>
            </button>
            <button onClick={() => advanceToStep(4)} className="btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
              <span>Next: Readiness Audit</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: PRE-FLIGHT READINESS SCORECARD */}
      {step === 4 && (
        <div className="card" style={{ padding: "1.5rem" }}>
          <h3 style={{ fontSize: "1.15rem", fontWeight: "700", marginBottom: "0.4rem" }}>
            Step 4: Pre-Flight Readiness Audit
          </h3>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
            Review system requirements before committing data. The audit verifies that all required parameters, rosters, and credentials are in order.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
            {readinessCheck.checks.map(c => (
              <div key={c.id} style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.9rem 1.1rem",
                borderRadius: "0.5rem",
                border: c.ok ? "1px solid rgba(16, 185, 129, 0.25)" : "1px solid rgba(239, 68, 68, 0.3)",
                background: c.ok ? "rgba(16, 185, 129, 0.05)" : "rgba(239, 68, 68, 0.06)"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  {c.ok ? <CheckCircle2 size={20} color="#10B981" /> : <AlertTriangle size={20} color="#EF4444" />}
                  <div>
                    <h4 style={{ margin: "0 0 0.15rem 0", fontSize: "0.92rem", fontWeight: "700", color: "#F9FAFB" }}>
                      {c.label}
                    </h4>
                    <span style={{ fontSize: "0.8rem", color: c.ok ? "#34D399" : "#F87171" }}>
                      {c.detail}
                    </span>
                  </div>
                </div>

                {!c.ok && (
                  <button 
                    onClick={() => goToStep(c.stepTarget)}
                    className="btn-secondary" 
                    style={{ fontSize: "0.75rem", padding: "0.3rem 0.6rem" }}
                  >
                    Fix in Step {c.stepTarget}
                  </button>
                )}
              </div>
            ))}
          </div>

          {readinessCheck.isAllOk ? (
            <div style={{
              padding: "1rem",
              borderRadius: "0.65rem",
              background: "rgba(16, 185, 129, 0.12)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              display: "flex",
              alignItems: "center",
              gap: "0.85rem",
              marginBottom: "1.5rem"
            }}>
              <CheckCircle2 size={24} color="#10B981" />
              <div>
                <h4 style={{ margin: "0 0 0.2rem 0", color: "#6EE7B7", fontSize: "0.95rem", fontWeight: "700" }}>
                  All Systems Verified & Ready for Launch!
                </h4>
                <p style={{ margin: 0, fontSize: "0.82rem", color: "#D1FAE5" }}>
                  {settings.mode === "fresh" 
                    ? "Clicking Launch will create a permanent archive of the current challenge in Google Sheets, then write your new teams, rosters, and PINs to live tracking."
                    : "Clicking Launch will append your new teams, rosters, and PINs to the live Google Sheets database."}
                </p>
              </div>
            </div>
          ) : (
            <div style={{
              padding: "1rem",
              borderRadius: "0.65rem",
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              display: "flex",
              alignItems: "center",
              gap: "0.85rem",
              marginBottom: "1.5rem"
            }}>
              <AlertCircle size={24} color="#EF4444" />
              <div>
                <h4 style={{ margin: "0 0 0.2rem 0", color: "#FCA5A5", fontSize: "0.95rem", fontWeight: "700" }}>
                  Action Required Before Launch
                </h4>
                <p style={{ margin: 0, fontSize: "0.82rem", color: "#FEE2E2" }}>
                  Please resolve the highlighted red warnings above before launching the round.
                </p>
              </div>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <button onClick={() => goToStep(3)} className="btn-secondary">
              <ChevronLeft size={16} />
              <span>Back to Leaders</span>
            </button>
            <button 
              onClick={handleLaunchRound}
              disabled={!readinessCheck.isAllOk || launching}
              className="btn-primary"
              style={{
                background: readinessCheck.isAllOk ? "#10B981" : "var(--surface-secondary)",
                color: "white",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.65rem 1.4rem",
                fontSize: "0.95rem",
                fontWeight: "700",
                boxShadow: readinessCheck.isAllOk ? "0 4px 12px rgba(16, 185, 129, 0.35)" : "none"
              }}
            >
              {launching ? (
                <>
                  <RefreshCw size={16} className="spin" />
                  <span>Launching & Updating Google Sheets...</span>
                </>
              ) : (
                <>
                  <Play size={16} />
                  <span>Launch New Round & Sync Live</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: LAUNCH COMPLETE & WHATSAPP ONBOARDING HUB */}
      {step === 5 && (
        <div className="card" style={{ padding: "1.5rem" }}>
          <div style={{
            padding: "1.25rem 1.5rem",
            background: "rgba(16, 185, 129, 0.15)",
            border: "1px solid rgba(16, 185, 129, 0.35)",
            borderRadius: "0.75rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "1.5rem"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
              <div style={{
                width: "42px",
                height: "42px",
                borderRadius: "50%",
                background: "rgba(16, 185, 129, 0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <Check size={24} color="#10B981" />
              </div>
              <div>
                <h3 style={{ margin: "0 0 0.25rem 0", fontSize: "1.15rem", fontWeight: "800", color: "#F9FAFB" }}>
                  {settings.challengeEdition || "New Edition"} is Live!
                </h3>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "#A7F3D0" }}>
                  Google Sheets has been updated. Team leaders can now log in using their newly assigned 4-digit PINs.
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <button 
                onClick={handleDownloadExcel}
                className="btn-primary"
                style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", padding: "0.5rem 1rem" }}
              >
                <FileDown size={15} />
                <span>Download Excel Roster</span>
              </button>
              <button 
                onClick={copyLeaderDirectoryText}
                className="btn-secondary"
                style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", padding: "0.5rem 1rem" }}
              >
                {copyFeedback["all_leaders_dir"] ? <Check size={15} color="#10B981" /> : <Copy size={15} />}
                <span>{copyFeedback["all_leaders_dir"] ? "Copied Directory!" : "Copy PIN Directory"}</span>
              </button>
              <button 
                onClick={() => {
                  if (onComplete) onComplete();
                }}
                className="btn-primary"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.45rem",
                  fontSize: "0.85rem",
                  padding: "0.5rem 1.1rem",
                  background: "#10B981",
                  color: "#FFFFFF",
                  fontWeight: "700"
                }}
              >
                <CheckCircle2 size={16} />
                <span>Open Dashboard</span>
              </button>
            </div>
          </div>

          <div>
            <div style={{ marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <MessageSquare size={18} color="#4ADE80" />
                <h3 style={{ fontSize: "1.15rem", fontWeight: "800", margin: 0 }}>
                  Team Leader WhatsApp Onboarding Messages
                </h3>
              </div>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                Copy and send each tailored message directly to the respective team leader via WhatsApp. Each message includes instructions, the copy-ready member DM script, and direct clickable wa.me links for all their assigned members.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {groupedTeams.map((team, tIdx) => {
                const fullMsg = generateLeaderWhatsAppMessage(team);
                const isCopied = copyFeedback[`team_msg_${tIdx}`];
                const leaderPhoneClean = normalizePhone(team.leaderPhone);
                const waChatUrl = leaderPhoneClean ? `https://wa.me/${leaderPhoneClean}?text=${encodeURIComponent(fullMsg)}` : null;

                return (
                  <div key={team.teamName} style={{
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid var(--border-light)",
                    borderRadius: "0.75rem",
                    padding: "1.25rem"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                          <h4 style={{ margin: 0, fontSize: "1.05rem", fontWeight: "800", color: "#F9FAFB" }}>
                            {team.teamName}
                          </h4>
                          <span style={{ fontSize: "0.78rem", background: "rgba(56, 189, 248, 0.15)", color: "#38BDF8", padding: "0.15rem 0.5rem", borderRadius: "9999px" }}>
                            {team.members.length} Members
                          </span>
                        </div>
                        <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                          Leader: <strong>{team.leaderName || "Not Assigned"}</strong> &middot; PIN: <strong style={{ fontFamily: "monospace", color: "#38BDF8" }}>{team.pin}</strong>
                        </span>
                      </div>

                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          onClick={() => handleCopyText(`team_msg_${tIdx}`, fullMsg)}
                          className="btn-secondary"
                          style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.82rem", padding: "0.45rem 0.85rem" }}
                        >
                          {isCopied ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
                          <span>{isCopied ? "Copied!" : "Copy Full Message"}</span>
                        </button>

                        {waChatUrl && (
                          <a
                            href={waChatUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-primary"
                            style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.82rem", padding: "0.45rem 0.85rem", background: "#15803D", color: "white" }}
                          >
                            <ExternalLink size={14} />
                            <span>Send via WhatsApp</span>
                          </a>
                        )}
                      </div>
                    </div>

                    <div style={{
                      background: "rgba(10, 15, 29, 0.8)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: "0.5rem",
                      padding: "1rem",
                      fontFamily: "monospace",
                      fontSize: "0.8rem",
                      lineHeight: "1.5",
                      whiteSpace: "pre-wrap",
                      maxHeight: "260px",
                      overflowY: "auto",
                      color: "#E2E8F0"
                    }}>
                      {fullMsg}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: "2rem", display: "flex", justifyContent: "center" }}>
              <button 
                onClick={() => {
                  if (onComplete) onComplete();
                }}
                className="btn-primary"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.55rem",
                  fontSize: "0.95rem",
                  padding: "0.75rem 2.2rem",
                  background: "#10B981",
                  color: "#FFFFFF",
                  fontWeight: "700",
                  borderRadius: "0.6rem",
                  boxShadow: "0 4px 14px rgba(16, 185, 129, 0.4)"
                }}
              >
                <CheckCircle2 size={18} />
                <span>Finish Onboarding & Return to Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
