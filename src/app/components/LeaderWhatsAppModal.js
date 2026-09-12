"use client";
import React, { useState, useMemo } from "react";
import { 
  X, MessageSquare, Copy, Check, ExternalLink, Search, 
  Users, KeyRound, Phone, ShieldCheck, Download
} from "lucide-react";

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

export default function LeaderWhatsAppModal({ isOpen, onClose, data }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [copyFeedback, setCopyFeedback] = useState({});

  const handleCopy = (key, text) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(prev => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setCopyFeedback(prev => ({ ...prev, [key]: false }));
    }, 2500);
  };

  const teamsData = useMemo(() => {
    if (!data || !data.dfTracker) return [];

    const dfTracker = data.dfTracker || [];
    const dfLeaders = data.dfLeaders || [];
    const dfCredentials = data.dfCredentials || [];
    const settings = data.settings || {};

    const editionTitle = settings.Challenge_Edition || settings.Challenge_Name || "ECCF Bible Reading Challenge";

    // Map leaders by team
    const leadersMap = new Map();
    dfLeaders.forEach(ld => {
      const tKey = normalizeTeamName(ld.Team || ld.Team_Name || ld.team);
      if (tKey) {
        leadersMap.set(tKey, {
          leaderName: ld["Team Leader"] || ld.leaderName || "",
          leaderPhone: ld.Leader_Phone || ld["Leader Phone"] || "",
          leaderStatus: ld.Status || "Active",
          assistantName: ld.Assistant || ld.assistantName || "",
          assistantPhone: ld.Assistant_Phone || ld["Assistant Phone"] || "",
          assistantStatus: ld.Assistant_Status || ""
        });
      }
    });

    // Map creds by team
    const credsMap = new Map();
    dfCredentials.forEach(cr => {
      const tKey = normalizeTeamName(cr.Team_Name || cr.Team);
      if (tKey) {
        credsMap.set(tKey, cr.PIN || "1234");
      }
    });

    // Group members by team
    const teamsGrouped = new Map();
    dfTracker.forEach(m => {
      const rawTeam = m.Team_Name || m.Team || "Unassigned";
      const tKey = normalizeTeamName(rawTeam);
      if (!teamsGrouped.has(tKey)) {
        teamsGrouped.set(tKey, {
          teamName: rawTeam,
          members: []
        });
      }
      const pClean = normalizePhone(m.WhatsApp_Number || m.Phone_Number || m.Phone);
      teamsGrouped.get(tKey).members.push({
        name: m.Member_Name || m.Name || "Participant",
        phoneClean: pClean,
        phoneRaw: m.WhatsApp_Number || "",
        status: m.Status || "Active",
        systemId: m.System_ID || ""
      });
    });

    const result = [];
    teamsGrouped.forEach((group, tKey) => {
      const leaderInfo = leadersMap.get(tKey) || {
        leaderName: "",
        leaderPhone: "",
        assistantName: "",
        assistantPhone: ""
      };
      const pin = credsMap.get(tKey) || "1234";

      const leaderPhoneClean = normalizePhone(leaderInfo.leaderPhone);
      const assistantPhoneClean = normalizePhone(leaderInfo.assistantPhone);

      const leaderWaLink = leaderPhoneClean ? `https://wa.me/${leaderPhoneClean}` : "https://wa.me/";
      const assistantWaLink = assistantPhoneClean ? `https://wa.me/${assistantPhoneClean}` : "https://wa.me/";

      const leaderDisplay = leaderInfo.leaderName || "[TEAM LEADER'S NAME]";
      const assistantText = leaderInfo.assistantName 
        ? `${leaderInfo.assistantName} [${assistantWaLink}]`
        : "[ASSISTANT NAME] [https://wa.me/]";

      const membersList = group.members
        .map((m, idx) => `${idx + 1}. https://wa.me/${m.phoneClean}`)
        .join("\n");

      const messageText = 
        `Good Morning Dear ECCFBRC Team Leader. I believe you\'ve already created your Group chat, and have added your Assistant, if not please do that as soon as possible, and then move on to send each of your members this message;\n\n` +
        `-----------------------------------------------------------\n` +
        `Hello!\n\n` +
        `I am ${leaderDisplay}, your Team Leader for ${group.teamName} in the ECCF Bible Reading Challenge (${editionTitle}).\n\n` +
        `I am reaching out to welcome you and to request your permission to add you to our team\'s group chat for mutual follow-up and accountability.\n\n` +
        `If you are happy to proceed, you can join the group directly using the invite link below:\n\n` +
        `[LINK TO TEAM GROUP CHAT]\n\n` +
        `I look forward to welcoming you to the team!\n` +
        `-----------------------------------------------------------\n` +
        `Ensure to replace the brackets with your actual details.\n\n` +
        `-----------------------------------------------------------\n` +
        `*${group.teamName}*\n` +
        `*Team Leader*: ${leaderDisplay} [${leaderWaLink}]\n` +
        `*Assistant*: ${assistantText}\n` +
        `*Team Login PIN*: ${pin}\n\n` +
        `*Members:*\n` +
        `${membersList}\n\n` +
        `Click their links to access their DMs and paste the edited message in each of them.\n` +
        `If you have any question, please feel free to ask.`;

      result.push({
        teamName: group.teamName,
        leaderName: leaderInfo.leaderName,
        leaderPhone: leaderInfo.leaderPhone,
        leaderPhoneClean,
        leaderWaLink,
        assistantName: leaderInfo.assistantName,
        assistantPhone: leaderInfo.assistantPhone,
        assistantPhoneClean,
        pin,
        membersCount: group.members.length,
        members: group.members,
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
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.78)",
      backdropFilter: "blur(6px)",
      zIndex: 9999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "1rem"
    }}>
      <div style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "0.85rem",
        maxWidth: "920px",
        width: "100%",
        maxHeight: "92vh",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.75)",
        overflow: "hidden"
      }}>
        {/* Modal Header */}
        <div style={{
          padding: "1.25rem 1.5rem",
          borderBottom: "1px solid var(--border-light)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "rgba(255, 255, 255, 0.02)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{
              width: "36px",
              height: "36px",
              borderRadius: "0.5rem",
              background: "rgba(34, 197, 94, 0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <MessageSquare size={20} color="#22C55E" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: "800", color: "#F9FAFB" }}>
                Team Leader WhatsApp Onboarding Messages
              </h3>
              <p style={{ margin: "0.15rem 0 0 0", fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                {teamsData.length} teams in active challenge &middot; Includes copy-ready message, PIN, and member DM links
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <button
              onClick={copyAllPinsDirectory}
              className="btn-secondary"
              style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.8rem", padding: "0.45rem 0.85rem" }}
            >
              {copyFeedback["all_pins"] ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
              <span>{copyFeedback["all_pins"] ? "Copied PINs!" : "Copy PIN Directory"}</span>
            </button>

            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-secondary)",
                cursor: "pointer",
                padding: "0.35rem",
                borderRadius: "0.35rem"
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div style={{ padding: "0.85rem 1.5rem", borderBottom: "1px solid var(--border-light)", background: "rgba(0, 0, 0, 0.2)" }}>
          <div style={{ position: "relative" }}>
            <Search size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
            <input
              type="text"
              className="input-field"
              placeholder="Search by team name or leader name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ paddingLeft: "2.35rem", height: "38px", fontSize: "0.88rem", margin: 0 }}
            />
          </div>
        </div>

        {/* Content List */}
        <div style={{
          padding: "1.5rem",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem"
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
                <div key={team.teamName} style={{
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid var(--border-light)",
                  borderRadius: "0.75rem",
                  padding: "1.25rem"
                }}>
                  {/* Team Card Header */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.85rem", flexWrap: "wrap", gap: "0.5rem" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                        <h4 style={{ margin: 0, fontSize: "1.05rem", fontWeight: "800", color: "#F9FAFB" }}>
                          {team.teamName}
                        </h4>
                        <span style={{ fontSize: "0.76rem", background: "rgba(56, 189, 248, 0.15)", color: "#38BDF8", padding: "0.15rem 0.5rem", borderRadius: "9999px" }}>
                          {team.membersCount} Members
                        </span>
                      </div>
                      <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                        Leader: <strong style={{ color: "var(--text-primary)" }}>{team.leaderName || "Not Designated"}</strong>
                        {team.leaderPhone ? ` (${team.leaderPhone})` : ""}
                        &middot; PIN: <strong style={{ fontFamily: "monospace", color: "#38BDF8" }}>{team.pin}</strong>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "0.5rem" }}>
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
                  <div style={{
                    background: "rgba(10, 15, 29, 0.8)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "0.5rem",
                    padding: "1rem",
                    fontFamily: "monospace",
                    fontSize: "0.8rem",
                    lineHeight: "1.5",
                    whiteSpace: "pre-wrap",
                    maxHeight: "220px",
                    overflowY: "auto",
                    color: "#E2E8F0"
                  }}>
                    {team.messageText}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: "1rem 1.5rem",
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
