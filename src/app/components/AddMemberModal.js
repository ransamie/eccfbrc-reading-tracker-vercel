"use client";
import React, { useState, useMemo } from "react";
import { 
  UserPlus, X, Phone, Users, Check, Copy, ExternalLink, 
  Sparkles, ShieldCheck, AlertCircle, ArrowRight, RefreshCw, 
  MessageSquare, UserCheck, Hash, Layers
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

export default function AddMemberModal({ isOpen, onClose, data, onSuccess, onOpenWhatsAppHub }) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [assignMode, setAssignMode] = useState("auto"); // "auto" | "manual"
  const [selectedTeam, setSelectedTeam] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successData, setSuccessData] = useState(null);
  const [copied, setCopied] = useState(false);

  // Parse valid teams and member counts
  const { allTeams, teamCounts, minCountTeams, predictedAutoTeam, nextSystemId } = useMemo(() => {
    if (!data) {
      return { allTeams: [], teamCounts: {}, minCountTeams: [], predictedAutoTeam: "", nextSystemId: "ECCFBRC-001" };
    }

    const trackerRows = data.trackerData || data.dfTracker || [];
    const credRows = data.credentialsData || data.dfCredentials || [];
    const validTeams = data.validTeams || [];

    // Collect all valid unique teams
    const teamsSet = new Set();
    validTeams.forEach(t => {
      if (t && String(t).toLowerCase() !== 'admin') teamsSet.add(String(t).trim());
    });
    credRows.forEach(c => {
      const t = c.Team_Name || c.Team;
      if (t && String(t).toLowerCase() !== 'admin') teamsSet.add(String(t).trim());
    });
    trackerRows.forEach(m => {
      const t = m.Team_Name || m.Team;
      if (t && String(t).toLowerCase() !== 'admin') teamsSet.add(String(t).trim());
    });

    const teamsList = Array.from(teamsSet).sort((a, b) => 
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );

    // Count members per team
    const counts = {};
    teamsList.forEach(t => { counts[t] = 0; });

    trackerRows.forEach(m => {
      const mTeam = normalizeTeamName(m.Team_Name || m.Team);
      for (const t of teamsList) {
        if (normalizeTeamName(t) === mTeam) {
          counts[t] = (counts[t] || 0) + 1;
          break;
        }
      }
    });

    // Find teams with lowest member count
    let minVal = Infinity;
    teamsList.forEach(t => {
      if (counts[t] < minVal) minVal = counts[t];
    });

    const minTeams = teamsList.filter(t => counts[t] === minVal);
    const autoPick = minTeams.length > 0 ? minTeams[0] : (teamsList[0] || "Team 01");

    // Predict next sequential System_ID
    let prefix = "ECCFBRC";
    let maxSeq = 0;
    const idRegex = /^([A-Za-z0-9_-]+)-(\d+)$/;
    trackerRows.forEach(r => {
      const sid = String(r.System_ID || '').trim();
      const match = sid.match(idRegex);
      if (match) {
        prefix = match[1];
        const num = parseInt(match[2], 10);
        if (num > maxSeq) maxSeq = num;
      }
    });
    if (maxSeq === 0) maxSeq = trackerRows.length;
    const nextSeqNum = maxSeq + 1;
    const padLen = Math.max(3, String(nextSeqNum).length);
    const predictedId = `${prefix}-${String(nextSeqNum).padStart(padLen, '0')}`;

    return {
      allTeams: teamsList,
      teamCounts: counts,
      minCountTeams: minTeams,
      predictedAutoTeam: autoPick,
      nextSystemId: predictedId
    };
  }, [data]);

  // Clean phone and detect duplicates
  const phoneClean = useMemo(() => normalizePhone(phone), [phone]);
  const isPhoneValid = phoneClean.length >= 10 && phoneClean.length <= 15;

  const duplicateMember = useMemo(() => {
    if (!phoneClean || !data) return null;
    const trackerRows = data.trackerData || data.dfTracker || [];
    const found = trackerRows.find(m => normalizePhone(m.WhatsApp_Number || m.Phone_Number) === phoneClean);
    if (!found) return null;
    return {
      name: found.Member_Name || found.Name || "Unknown Member",
      team: formatTeamName(found.Team_Name || found.Team || "Unassigned"),
      id: found.System_ID || ""
    };
  }, [phoneClean, data]);

  const targetTeam = assignMode === "auto" ? predictedAutoTeam : (selectedTeam || allTeams[0] || "");

  const handleCopyMessage = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const resetForm = () => {
    setFullName("");
    setPhone("");
    setAssignMode("auto");
    setSelectedTeam(allTeams[0] || "");
    setErrorMessage("");
    setSuccessData(null);
    setCopied(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    const cleanName = fullName.trim();
    if (!cleanName || cleanName.length < 2) {
      setErrorMessage("Please enter the participant's full name (at least 2 characters).");
      return;
    }

    if (!isPhoneValid) {
      setErrorMessage("Please enter a valid WhatsApp phone number (minimum 10 digits).");
      return;
    }

    if (duplicateMember) {
      setErrorMessage(`This WhatsApp number is already registered under ${duplicateMember.name} in ${duplicateMember.team}.`);
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "admin_add_member",
          payload: {
            fullName: cleanName,
            phone: phoneClean,
            team: assignMode === "auto" ? "auto" : targetTeam
          }
        })
      });

      const resJson = await res.json();
      if (!res.ok || !resJson.success) {
        throw new Error(resJson.message || "Failed to add member. Please try again.");
      }

      // Success! Update data in parent
      setSuccessData(resJson);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error("Add member error:", err);
      setErrorMessage(err.message || "Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop-responsive" onClick={handleClose}>
      <div 
        className="modal-dialog-responsive" 
        style={{ maxWidth: successData ? "780px" : "640px" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Pinned Header */}
        <div className="modal-header-responsive">
          <div className="modal-header-top-row">
            <div className="modal-header-title-wrap">
              <div 
                className="modal-header-icon-box"
                style={{ background: successData ? "rgba(16, 185, 129, 0.15)" : "rgba(5, 150, 105, 0.15)" }}
              >
                {successData ? (
                  <Check size={20} color="#10B981" />
                ) : (
                  <UserPlus size={20} color="#10B981" />
                )}
              </div>
              <div>
                <h3 className="modal-header-title">
                  {successData ? "Participant Added Successfully!" : "Add New Member to Challenge"}
                </h3>
                <p className="modal-header-subtitle">
                  {successData 
                    ? `Assigned to ${successData.assignedTeam} & Leader WhatsApp message updated`
                    : "Register participant manually with auto-assignment and WhatsApp sync."
                  }
                </p>
              </div>
            </div>

            <button onClick={handleClose} className="modal-close-button" aria-label="Close">
              <X size={20} />
            </button>
          </div>
        </div>

        {!successData ? (
          /* Registration Form */
          <form onSubmit={handleSubmit} className="modal-form-layout">
            {/* Scrollable Body */}
            <div className="modal-body-responsive">
              {errorMessage && (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  background: "rgba(239, 68, 68, 0.12)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  color: "#FCA5A5",
                  padding: "0.75rem 1rem",
                  borderRadius: "0.5rem",
                  marginBottom: "1rem",
                  fontSize: "0.86rem"
                }}>
                  <AlertCircle size={18} style={{ flexShrink: 0 }} />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {/* Full Name */}
                <div>
                  <label className="label" style={{ fontWeight: "700", display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.35rem" }}>
                    <UserCheck size={16} color="var(--primary)" />
                    <span>Participant Full Name</span>
                    <span style={{ color: "#EF4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sister Miracle Imaru"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="input-field"
                    style={{ width: "100%", fontSize: "0.95rem" }}
                    autoFocus
                  />
                </div>

                {/* WhatsApp Phone Number */}
                <div>
                  <label className="label" style={{ fontWeight: "700", display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.35rem" }}>
                    <Phone size={16} color="#22C55E" />
                    <span>WhatsApp Phone Number</span>
                    <span style={{ color: "#EF4444" }}>*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 08012345678 or +234 801 234 5678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="input-field"
                    style={{ width: "100%", fontSize: "0.95rem" }}
                  />

                  {/* Live Phone Helper Feedback */}
                  <div style={{ marginTop: "0.3rem", fontSize: "0.8rem" }}>
                    {duplicateMember ? (
                      <span style={{ color: "#EF4444", display: "inline-flex", alignItems: "center", gap: "0.35rem", fontWeight: "600" }}>
                        <AlertCircle size={14} />
                        Already registered: {duplicateMember.name} ({duplicateMember.team}) - {duplicateMember.id}
                      </span>
                    ) : isPhoneValid ? (
                      <span style={{ color: "#10B981", display: "inline-flex", alignItems: "center", gap: "0.35rem", fontWeight: "600" }}>
                        <Check size={14} />
                        Cleaned for WhatsApp: +{phoneClean} (wa.me/{phoneClean})
                      </span>
                    ) : phone.trim().length > 0 ? (
                      <span style={{ color: "var(--text-secondary)" }}>
                        Entering number... normalizes to international format (234...)
                      </span>
                    ) : (
                      <span style={{ color: "var(--text-secondary)" }}>
                        Accepts Nigerian formats (080..., 234...) and international numbers.
                      </span>
                    )}
                  </div>
                </div>

                {/* Team Assignment Method */}
                <div>
                  <label className="label" style={{ fontWeight: "700", display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.4rem" }}>
                    <Users size={16} color="#60A5FA" />
                    <span>Team Assignment</span>
                  </label>

                  <div className="add-member-assign-grid">
                    {/* Auto-assign card */}
                    <div
                      onClick={() => setAssignMode("auto")}
                      className={`add-member-assign-card ${assignMode === "auto" ? "active-auto" : ""}`}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontWeight: "700", fontSize: "0.88rem", color: assignMode === "auto" ? "#10B981" : "var(--text-primary)" }}>
                          Auto-Assign (Recommended)
                        </span>
                        {assignMode === "auto" && <Check size={16} color="#10B981" />}
                      </div>
                      <span style={{ fontSize: "0.76rem", color: "var(--text-secondary)", lineHeight: 1.35 }}>
                        Balances roster evenly into team with fewest participants.
                      </span>
                      {predictedAutoTeam && (
                        <div style={{ marginTop: "0.2rem", fontSize: "0.78rem", color: "#34D399", fontWeight: "700" }}>
                          🎯 Target: {formatTeamName(predictedAutoTeam)} ({teamCounts[predictedAutoTeam] || 0} members)
                        </div>
                      )}
                    </div>

                    {/* Manual selection card */}
                    <div
                      onClick={() => {
                        setAssignMode("manual");
                        if (!selectedTeam && allTeams.length) setSelectedTeam(allTeams[0]);
                      }}
                      className={`add-member-assign-card ${assignMode === "manual" ? "active-manual" : ""}`}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontWeight: "700", fontSize: "0.88rem", color: assignMode === "manual" ? "#60A5FA" : "var(--text-primary)" }}>
                          Specific Team Selection
                        </span>
                        {assignMode === "manual" && <Check size={16} color="#60A5FA" />}
                      </div>
                      <span style={{ fontSize: "0.76rem", color: "var(--text-secondary)", lineHeight: 1.35 }}>
                        Explicitly choose which team to place this member into.
                      </span>
                    </div>
                  </div>

                  {/* Team dropdown if manual mode */}
                  {assignMode === "manual" && (
                    <div style={{ marginTop: "0.45rem" }}>
                      <select
                        value={selectedTeam}
                        onChange={(e) => setSelectedTeam(e.target.value)}
                        className="input-field"
                        style={{ width: "100%", fontSize: "0.9rem", padding: "0.5rem 0.75rem" }}
                      >
                        {allTeams.map(t => {
                          const count = teamCounts[t] || 0;
                          const isMin = minCountTeams.includes(t);
                          return (
                            <option key={t} value={t}>
                              {formatTeamName(t)} ({count} members {isMin ? "• lowest" : ""})
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}
                </div>

                {/* Assignment Summary Box */}
                <div className="add-member-summary-box">
                  <div className="summary-item">
                    <span className="summary-label">Assigned Team:</span>
                    <strong className="summary-val">{formatTeamName(targetTeam)}</strong>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Projected System ID:</span>
                    <strong className="summary-val highlight">{nextSystemId}</strong>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Initial Status:</span>
                    <span className="summary-badge">Active</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pinned Form Footer */}
            <div className="modal-footer-responsive">
              <button
                type="button"
                onClick={handleClose}
                className="btn-secondary add-member-cancel-btn"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !fullName.trim() || !isPhoneValid || duplicateMember}
                className="btn-primary add-member-submit-btn"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  background: "#059669",
                  color: "white",
                  fontWeight: "700"
                }}
              >
                {submitting ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Adding & Assigning...</span>
                  </>
                ) : (
                  <>
                    <UserPlus size={16} />
                    <span>+ Register Participant</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* Success State with Updated Team Leader WhatsApp Message */
          <div className="modal-form-layout">
            {/* Scrollable Body */}
            <div className="modal-body-responsive">
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {/* Member Confirmation Card */}
                <div style={{
                  background: "rgba(16, 185, 129, 0.08)",
                  border: "1px solid rgba(16, 185, 129, 0.25)",
                  borderRadius: "0.75rem",
                  padding: "0.85rem 1rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem"
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.4rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                      <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: "#10B981", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
                        <Check size={15} />
                      </div>
                      <span style={{ fontWeight: "800", fontSize: "1rem", color: "#34D399" }}>
                        {successData.member.name}
                      </span>
                    </div>
                    <span style={{
                      background: "rgba(56, 189, 248, 0.15)",
                      color: "#38BDF8",
                      padding: "0.15rem 0.55rem",
                      borderRadius: "0.4rem",
                      fontWeight: "700",
                      fontSize: "0.8rem"
                    }}>
                      {successData.member.systemId}
                    </span>
                  </div>

                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                    gap: "0.5rem",
                    fontSize: "0.84rem"
                  }}>
                    <div>
                      <span style={{ color: "var(--text-secondary)" }}>Assigned Team: </span>
                      <strong style={{ color: "var(--text-primary)" }}>{successData.assignedTeam}</strong>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-secondary)" }}>WhatsApp: </span>
                      <a
                        href={`https://wa.me/${successData.member.phone}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "#34D399", textDecoration: "none", fontWeight: "700" }}
                      >
                        +{successData.member.phone} ↗
                      </a>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-secondary)" }}>Team Total: </span>
                      <strong style={{ color: "var(--text-primary)" }}>{successData.totalTeamMembers} members</strong>
                    </div>
                  </div>
                </div>

                {/* Updated Team Leader WhatsApp Message Section */}
                <div style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "0.75rem",
                  padding: "0.95rem 1rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.65rem"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.4rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <MessageSquare size={17} color="#22C55E" />
                      <span style={{ fontWeight: "800", fontSize: "0.92rem" }}>
                        Updated Leader WhatsApp Message
                      </span>
                    </div>

                    {successData.leaderInfo?.leaderName && (
                      <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                        Leader: <strong style={{ color: "var(--text-primary)" }}>{successData.leaderInfo.leaderName}</strong>
                        {successData.leaderInfo.leaderPhone ? ` (${successData.leaderInfo.leaderPhone})` : ""}
                      </span>
                    )}
                  </div>

                  <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                    Message is dynamically updated with the participant&apos;s link. Send or copy to the Team Leader:
                  </p>

                  {/* Message preview box */}
                  <div style={{
                    background: "rgba(0, 0, 0, 0.45)",
                    border: "1px solid var(--border-light)",
                    borderRadius: "0.5rem",
                    padding: "0.75rem",
                    maxHeight: "140px",
                    overflowY: "auto",
                    whiteSpace: "pre-wrap",
                    fontFamily: "monospace",
                    fontSize: "0.76rem",
                    lineHeight: "1.45",
                    color: "#E2E8F0"
                  }}>
                    {successData.updatedMessage}
                  </div>

                  {/* Quick actions for leader message */}
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => handleCopyMessage(successData.updatedMessage)}
                      className="btn-secondary"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.4rem",
                        fontSize: "0.8rem",
                        padding: "0.4rem 0.75rem",
                        background: copied ? "rgba(16, 185, 129, 0.15)" : undefined,
                        color: copied ? "#10B981" : undefined
                      }}
                    >
                      {copied ? <Check size={13} /> : <Copy size={13} />}
                      <span>{copied ? "Copied Message!" : "Copy Leader Message"}</span>
                    </button>

                    {successData.leaderInfo?.leaderPhone ? (
                      <a
                        href={`https://wa.me/${successData.leaderInfo.leaderPhone}?text=${encodeURIComponent(successData.updatedMessage)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.4rem",
                          fontSize: "0.8rem",
                          padding: "0.4rem 0.75rem",
                          background: "#22C55E",
                          color: "white",
                          textDecoration: "none"
                        }}
                      >
                        <ExternalLink size={13} />
                        <span>Send on WhatsApp</span>
                      </a>
                    ) : null}

                    {onOpenWhatsAppHub && (
                      <button
                        type="button"
                        onClick={() => {
                          handleClose();
                          onOpenWhatsAppHub(successData.assignedTeam);
                        }}
                        className="btn-secondary"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.4rem",
                          fontSize: "0.8rem",
                          padding: "0.4rem 0.75rem"
                        }}
                        title="Open in full Team Leader WhatsApp Hub"
                      >
                        <Layers size={13} />
                        <span>WhatsApp Hub</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Pinned Success Footer */}
            <div className="modal-footer-responsive" style={{ justifyContent: "space-between" }}>
              <button
                type="button"
                onClick={resetForm}
                className="btn-secondary"
                style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.84rem", padding: "0.55rem 0.95rem" }}
              >
                <UserPlus size={14} />
                <span>Add Another Member</span>
              </button>

              <button
                type="button"
                onClick={handleClose}
                className="btn-primary"
                style={{ minWidth: "90px", padding: "0.55rem 1.25rem", fontSize: "0.88rem" }}
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
