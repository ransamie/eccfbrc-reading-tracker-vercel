"use client";
import React, { useState, useMemo, useEffect } from "react";
import { 
  X, MessageSquare, Copy, Check, ExternalLink, Search, 
  Users, KeyRound, Phone, ShieldCheck, Download
} from "lucide-react";
import { formatTeamName } from "@/lib/teamUtils";

function normalizePhone(raw) {
  if (raw === null || raw === undefined) return "";
  let text = String(raw).trim();
  if (["none", "nan", "n/a", ""].includes(text.toLowerCase())) return "";
  text = text.replace(/^[+=@]+/, "").trim();
  if (text.endsWith(".0")) {
    text = text.slice(0, -2);
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

const normalizeTeamName = (name) => String(name || '').replace(/[^\x00-\x7F]/g, "").replace(/\s+/g, " ").trim().toLowerCase();

export default function LeaderWhatsAppModal({ isOpen, onClose, data, initialTeam = "" }) {
  const [searchQuery, setSearchQuery] = useState(initialTeam || "");
  const [copyFeedback, setCopyFeedback] = useState({});

  useEffect(() => {
    if (initialTeam) {
      setSearchQuery(initialTeam);
    }
  }, [initialTeam, isOpen]);

  const handleCopy = (key, text) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(prev => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setCopyFeedback(prev => ({ ...prev, [key]: false }));
    }, 2500);
  };

  const teamsData = useMemo(() => {
    if (!data) return [];

    const trackerRows = data.trackerData || data.dfTracker || [];
    const leadersRows = data.leadersData || data.dfLeaders || [];
    const credentialsRows = data.credentialsData || data.dfCredentials || [];
    const validTeams = data.validTeams || [];
    const settings = data.settings || {};

    const editionTitle = settings.Challenge_Edition || settings.Challenge_Name || "ECCF Bible Reading Challenge";

    // Map leaders by team
    const leadersMap = new Map();
    leadersRows.forEach(ld => {
      const rawTeam = ld.Team || ld.Team_Name || ld.team || "";
      const tKey = normalizeTeamName(rawTeam);
      if (!tKey) return;

      const role = String(ld.Role || "").trim().toLowerCase();
      const isAssistant = role.includes("asst") || role.includes("assistant");
      const name = String(ld["Team Leader"] || ld.leaderName || ld.Member_Name || ld.Name || "").trim();
      const phone = String(ld.Leader_Phone || ld["Leader Phone"] || ld.Phone_Number || ld.Phone || "").trim();
      const status = String(ld.Status || "Active").trim();
      const asstNameFromCol = String(ld.Assistant || ld.assistantName || "").trim();
      const asstPhoneFromCol = String(ld.Assistant_Phone || ld["Assistant Phone"] || "").trim();

      const existing = leadersMap.get(tKey) || {
        rawTeam,
        leaderName: "",
        leaderPhone: "",
        leaderStatus: "Active",
        assistantName: "",
        assistantPhone: "",
        assistantStatus: ""
      };

      if (isAssistant) {
        // This row represents the Assistant Leader
        existing.assistantName = name || existing.assistantName;
        existing.assistantPhone = phone || existing.assistantPhone;
        existing.assistantStatus = status || existing.assistantStatus;
      } else {
        // This row represents the Team Leader
        existing.leaderName = name || existing.leaderName;
        existing.leaderPhone = phone || existing.leaderPhone;
        existing.leaderStatus = status || existing.leaderStatus;
        if (asstNameFromCol) existing.assistantName = asstNameFromCol;
        if (asstPhoneFromCol) existing.assistantPhone = asstPhoneFromCol;
      }

      leadersMap.set(tKey, existing);
    });

    // Map creds by team
    const credsMap = new Map();
    credentialsRows.forEach(cr => {
      const rawTeam = cr.Team_Name || cr.Team || "";
      const tKey = normalizeTeamName(rawTeam);
      if (tKey) {
        credsMap.set(tKey, {
          rawTeam,
          pin: cr.PIN || "1234"
        });
      }
    });

    // Seed all known teams
    const allKnownTeams = new Map();

    // From validTeams
    validTeams.forEach(t => {
      if (t && String(t).toLowerCase() !== 'admin') {
        allKnownTeams.set(normalizeTeamName(t), String(t).trim());
      }
    });

    // From credentialsRows
    credentialsRows.forEach(cr => {
      const rawTeam = cr.Team_Name || cr.Team;
      if (rawTeam && String(rawTeam).toLowerCase() !== 'admin') {
        const k = normalizeTeamName(rawTeam);
        if (!allKnownTeams.has(k)) allKnownTeams.set(k, String(rawTeam).trim());
      }
    });

    // From leadersRows
    leadersRows.forEach(ld => {
      const rawTeam = ld.Team || ld.Team_Name || ld.team;
      if (rawTeam && String(rawTeam).toLowerCase() !== 'admin') {
        const k = normalizeTeamName(rawTeam);
        if (!allKnownTeams.has(k)) allKnownTeams.set(k, String(rawTeam).trim());
      }
    });

    // From trackerRows
    trackerRows.forEach(m => {
      const rawTeam = m.Team_Name || m.Team;
      if (rawTeam && String(rawTeam).toLowerCase() !== 'admin') {
        const k = normalizeTeamName(rawTeam);
        if (!allKnownTeams.has(k)) allKnownTeams.set(k, String(rawTeam).trim());
      }
    });

    // Group members by team
    const teamMembersMap = new Map();
    trackerRows.forEach(m => {
      const rawTeam = m.Team_Name || m.Team || "Unassigned";
      const tKey = normalizeTeamName(rawTeam);
      if (!teamMembersMap.has(tKey)) {
        teamMembersMap.set(tKey, []);
      }
      const pClean = normalizePhone(m.WhatsApp_Number || m.Phone_Number || m.Phone);
      teamMembersMap.get(tKey).push({
        name: m.Member_Name || m.Name || "Participant",
        phoneClean: pClean,
        phoneRaw: m.WhatsApp_Number || m.Phone_Number || "",
        status: m.Status || "Active",
        systemId: m.System_ID || ""
      });
    });

    const result = [];
    allKnownTeams.forEach((displayTeamName, tKey) => {
      const leaderInfo = leadersMap.get(tKey) || {
        leaderName: "",
        leaderPhone: "",
        assistantName: "",
        assistantPhone: ""
      };
      const pin = credsMap.get(tKey)?.pin || "1234";
      const members = teamMembersMap.get(tKey) || [];

      const leaderPhoneClean = normalizePhone(leaderInfo.leaderPhone);
      const assistantPhoneClean = normalizePhone(leaderInfo.assistantPhone);

      const leaderWaLink = leaderPhoneClean ? `https://wa.me/${leaderPhoneClean}` : "https://wa.me/";
      const assistantWaLink = assistantPhoneClean ? `https://wa.me/${assistantPhoneClean}` : "https://wa.me/";

      const leaderDisplay = leaderInfo.leaderName || "[TEAM LEADER'S NAME]";
      const assistantText = leaderInfo.assistantName 
        ? `${leaderInfo.assistantName} [${assistantWaLink}]`
        : "[ASSISTANT NAME] [https://wa.me/]";

      const membersList = members.length > 0
        ? members.map((m, idx) => {
            const memberName = (m.name || "").trim();
            const namePrefix = memberName && memberName.toLowerCase() !== "participant" ? `${memberName} - ` : "";
            return `${idx + 1}. ${namePrefix}https://wa.me/${m.phoneClean}`;
          }).join("\n")
        : "No members assigned yet.";

      const formattedTeam = formatTeamName(displayTeamName);
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const dashboardLink = `${baseUrl}/?team=${encodeURIComponent(formattedTeam)}&pin=${pin}`;

      const messageText = 
        `Good Morning Dear ECCFBRC Team Leader. I believe you\'ve already created your Group chat, and have added your Assistant, if not please do that as soon as possible.\n\n` +
        `*Your Team Dashboard Access:*\n` +
        `🔗 *Direct Dashboard Link*: ${dashboardLink}\n` +
        `🔑 *Team Login PIN*: ${pin}\n` +
        `(Tap the link above to directly access and record reading updates for your team)\n\n` +
        `Please move on to send each of your members this message;\n\n` +
        `-----------------------------------------------------------\n` +
        `Hello!\n\n` +
        `I am ${leaderDisplay}, your Team Leader for ${formattedTeam} in the ECCF Bible Reading Challenge (${editionTitle}).\n\n` +
        `I am reaching out to welcome you and to request your permission to add you to our team\'s group chat for mutual follow-up and accountability.\n\n` +
        `If you are happy to proceed, you can join the group directly using the invite link below:\n\n` +
        `[LINK TO TEAM GROUP CHAT]\n\n` +
        `I look forward to welcoming you to the team!\n` +
        `-----------------------------------------------------------\n` +
        `Ensure to replace the brackets with your actual details.\n\n` +
        `-----------------------------------------------------------\n` +
        `*${formattedTeam}*\n` +
        `*Team Leader*: ${leaderDisplay} [${leaderWaLink}]\n` +
        `*Assistant*: ${assistantText}\n` +
        `*Team Dashboard Link*: ${dashboardLink}\n` +
        `*Team Login PIN*: ${pin}\n\n` +
        `*Members:*\n` +
        `${membersList}\n\n` +
        `Click their links to access their DMs and paste the edited message in each of them.\n` +
        `If you have any question, please feel free to ask.`;

      result.push({
        teamName: formattedTeam,
        leaderName: leaderInfo.leaderName,
        leaderPhone: leaderInfo.leaderPhone,
        leaderPhoneClean,
        leaderWaLink,
        assistantName: leaderInfo.assistantName,
        assistantPhone: leaderInfo.assistantPhone,
        assistantPhoneClean,
        pin,
        dashboardLink,
        membersCount: members.length,
        members: members,
        messageText
      });
    });

    // Sort teams naturally
    result.sort((a, b) => a.teamName.localeCompare(b.teamName, undefined, { numeric: true, sensitivity: 'base' }));

    return result;
  }, [data]);

  const filteredTeams = useMemo(() => {
    if (!searchQuery.trim()) return teamsData;
    const q = searchQuery.toLowerCase().trim();
    return teamsData.filter(t => 
      t.teamName.toLowerCase().includes(q) ||
      t.leaderName.toLowerCase().includes(q) ||
      t.assistantName.toLowerCase().includes(q)
    );
  }, [teamsData, searchQuery]);

  const copyAllPinsDirectory = () => {
    if (!teamsData.length) return;
    const lines = teamsData.map(t => 
      `${t.teamName}: Leader: ${t.leaderName || 'N/A'} | PIN: ${t.pin} | Members: ${t.membersCount}`
    );
    handleCopy("all_pins", lines.join("\n"));
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop-responsive">
      <div className="modal-dialog-responsive">
        {/* Modal Header */}
        <div className="modal-header-responsive">
          <div className="modal-header-top-row">
            <div className="modal-header-title-wrap">
              <div className="modal-header-icon-box">
                <MessageSquare size={18} color="#22C55E" />
              </div>
              <h3 className="modal-header-title">
                Team Leader WhatsApp Messages
              </h3>
            </div>

            <button
              onClick={onClose}
              className="modal-close-button"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>

          <p className="modal-header-subtitle">
            {teamsData.length} teams in active challenge &middot; Includes copy-ready message, PIN, and member DM links
          </p>

          <div className="modal-header-actions">
            <button
              onClick={copyAllPinsDirectory}
              className="btn-secondary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.4rem",
                fontSize: "0.82rem",
                padding: "0.5rem 1rem",
                width: "100%"
              }}
            >
              {copyFeedback["all_pins"] ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
              <span>{copyFeedback["all_pins"] ? "Copied All PINs!" : "Copy All Leader PINs Directory"}</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid var(--border-light)", background: "rgba(0, 0, 0, 0.2)" }}>
          <div style={{ position: "relative" }}>
            <Search size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
            <input
              type="text"
              className="input-field"
              placeholder="Search by team or leader name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ paddingLeft: "2.35rem", height: "38px", fontSize: "0.88rem", margin: 0, width: "100%" }}
            />
          </div>
        </div>

        {/* Content List */}
        <div style={{
          padding: "1rem",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "1rem"
        }}>
          {filteredTeams.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-secondary)" }}>
              <p style={{ margin: 0, fontSize: "0.95rem" }}>No matching teams found.</p>
            </div>
          ) : (
            filteredTeams.map((team, idx) => {
              const isCopied = copyFeedback[`team_${idx}`];
              const waUrl = team.leaderPhoneClean
                ? `https://wa.me/${team.leaderPhoneClean}?text=${encodeURIComponent(team.messageText)}`
                : null;

              return (
                <div key={team.teamName} className="team-card-responsive">
                  {/* Team Card Header */}
                  <div className="team-card-header-responsive">
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                        <h4 style={{ margin: 0, fontSize: "1.05rem", fontWeight: "800", color: "#F9FAFB" }}>
                          {team.teamName}
                        </h4>
                        <span style={{ fontSize: "0.76rem", background: "rgba(56, 189, 248, 0.15)", color: "#38BDF8", padding: "0.15rem 0.5rem", borderRadius: "9999px" }}>
                          {team.membersCount} Members
                        </span>
                      </div>
                      <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: "0.25rem", display: "flex", flexWrap: "wrap", gap: "0.3rem 0.6rem" }}>
                        <span>Leader: <strong style={{ color: "var(--text-primary)" }}>{team.leaderName || "Not Designated"}</strong>{team.leaderPhone ? ` (${team.leaderPhone})` : ""}</span>
                        {team.assistantName && <span>&bull; Asst: <strong style={{ color: "var(--text-primary)" }}>{team.assistantName}</strong>{team.assistantPhone ? ` (${team.assistantPhone})` : ""}</span>}
                        <span>&bull; PIN: <strong style={{ fontFamily: "monospace", color: "#38BDF8" }}>{team.pin}</strong></span>
                      </div>
                    </div>

                    <div className="team-card-btn-group-responsive">
                      <button
                        onClick={() => handleCopy(`team_${idx}`, team.messageText)}
                        className="btn-secondary"
                        style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.82rem", padding: "0.45rem 0.85rem" }}
                      >
                        {isCopied ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
                        <span>{isCopied ? "Copied!" : "Copy Full Message"}</span>
                      </button>

                      {waUrl && (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-primary"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.35rem",
                            fontSize: "0.82rem",
                            padding: "0.45rem 0.85rem",
                            background: "#15803D",
                            color: "white"
                          }}
                        >
                          <ExternalLink size={14} />
                          <span>Send via WhatsApp</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Message Preview Box */}
                  <div className="message-preview-box-responsive">
                    {team.messageText}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: "0.85rem 1rem",
          borderTop: "1px solid var(--border-light)",
          display: "flex",
          justifyContent: "flex-end",
          background: "rgba(255, 255, 255, 0.02)"
        }}>
          <button
            onClick={onClose}
            className="btn-secondary"
            style={{ padding: "0.5rem 1.25rem", fontSize: "0.88rem" }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
