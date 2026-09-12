"use client";
import React, { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { 
  X, UploadCloud, RefreshCw, CheckCircle2, AlertCircle, 
  Sparkles, ArrowRight, Check, FileSpreadsheet
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

const PHONE_KEYWORDS = ["phone", "whatsapp", "mobile", "contact", "tel", "number"];
const FIRST_NAME_KEYWORDS = ["first name", "firstname", "first_name", "given name", "first"];
const SURNAME_KEYWORDS = ["surname", "last name", "lastname", "last_name", "family name"];
const OTHER_NAME_KEYWORDS = ["other names", "other name", "othernames", "middle name", "middlename", "other"];
const SINGLE_NAME_KEYWORDS = ["full name", "fullname", "member name", "participant name", "name"];

export default function SyncNamesModal({ isOpen, onClose, onSuccess }) {
  const [fileName, setFileName] = useState("");
  const [rawHeaders, setRawHeaders] = useState([]);
  const [rawRows, setRawRows] = useState([]);
  const [nameMode, setNameMode] = useState("separate");
  const [selectedFirstNameCol, setSelectedFirstNameCol] = useState("");
  const [selectedSurnameCol, setSelectedSurnameCol] = useState("");
  const [selectedOtherNameCol, setSelectedOtherNameCol] = useState("");
  const [selectedSingleNameCol, setSelectedSingleNameCol] = useState("");
  const [selectedPhoneCol, setSelectedPhoneCol] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setSyncResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

        if (!data || data.length < 2) {
          alert("Uploaded sheet is empty or missing data rows.");
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

        for (const h of headers) {
          const hl = h.toLowerCase().trim();
          if (!detectedPhone && PHONE_KEYWORDS.some(kw => hl.includes(kw))) detectedPhone = h;
          if (!detectedFirst && FIRST_NAME_KEYWORDS.some(kw => hl.includes(kw))) detectedFirst = h;
          if (!detectedSurname && SURNAME_KEYWORDS.some(kw => hl.includes(kw))) detectedSurname = h;
          if (!detectedOther && OTHER_NAME_KEYWORDS.some(kw => hl.includes(kw))) detectedOther = h;
          if (!detectedSingleName && SINGLE_NAME_KEYWORDS.some(kw => hl.includes(kw))) detectedSingleName = h;
        }

        setSelectedPhoneCol(detectedPhone || headers[1] || headers[0]);

        if (detectedFirst && detectedSurname) {
          setNameMode("separate");
          setSelectedFirstNameCol(detectedFirst);
          setSelectedSurnameCol(detectedSurname);
          setSelectedOtherNameCol(detectedOther || "");
          setSelectedSingleNameCol(detectedSingleName || headers[0]);
        } else {
          setNameMode("single");
          setSelectedSingleNameCol(detectedSingleName || headers[0]);
          setSelectedFirstNameCol(detectedFirst || headers[0]);
          setSelectedSurnameCol(detectedSurname || headers[0]);
          setSelectedOtherNameCol(detectedOther || "");
        }
      } catch (err) {
        console.error("Spreadsheet parsing error:", err);
        alert("Failed to parse file: " + err.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  const parsedUpdates = useMemo(() => {
    if (!rawRows.length || !selectedPhoneCol) return [];
    const seen = new Set();
    const updates = [];

    rawRows.forEach(r => {
      const pRaw = r[selectedPhoneCol];
      const pClean = normalizePhone(pRaw);
      if (!pClean || seen.has(pClean)) return;
      seen.add(pClean);

      let fullName = "";
      if (nameMode === "separate") {
        const fn = selectedFirstNameCol ? String(r[selectedFirstNameCol] || "").trim() : "";
        const on = selectedOtherNameCol ? String(r[selectedOtherNameCol] || "").trim() : "";
        const sn = selectedSurnameCol ? String(r[selectedSurnameCol] || "").trim() : "";
        fullName = [fn, on, sn].filter(Boolean).join(" ");
      } else {
        fullName = selectedSingleNameCol ? String(r[selectedSingleNameCol] || "").trim() : "";
      }

      if (fullName) {
        updates.push({ phone: pClean, fullName });
      }
    });

    return updates;
  }, [rawRows, selectedPhoneCol, nameMode, selectedFirstNameCol, selectedSurnameCol, selectedOtherNameCol, selectedSingleNameCol]);

  const handleExecuteSync = async () => {
    if (!parsedUpdates.length) {
      alert("No valid member names found to sync.");
      return;
    }

    if (!window.confirm(`Sync and update full names for ${parsedUpdates.length} members in the live Google Sheets Tracker?`)) {
      return;
    }

    setSyncing(true);
    setSyncResult(null);

    try {
      const res = await fetch("/api/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "admin_sync_member_names",
          payload: {
            memberUpdates: parsedUpdates
          }
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || "Failed to sync names");
      }

      setSyncResult({
        success: true,
        message: `Successfully updated ${data.updatedCount} member full names in Google Sheets!`
      });

      if (onSuccess) onSuccess();
    } catch (err) {
      console.error("Sync error:", err);
      setSyncResult({
        success: false,
        message: err.message
      });
    } finally {
      setSyncing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop-responsive">
      <div className="modal-dialog-responsive" style={{ maxWidth: "680px" }}>
        {/* Header */}
        <div className="modal-header-responsive">
          <div className="modal-header-top-row">
            <div className="modal-header-title-wrap">
              <div className="modal-header-icon-box" style={{ background: "rgba(56, 189, 248, 0.18)" }}>
                <FileSpreadsheet size={18} color="#38BDF8" />
              </div>
              <h3 className="modal-header-title">
                Sync Member Full Names
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
            Match by phone number and update live member names across Google Sheets Tracker_Data
          </p>
        </div>

        {/* Content */}
        <div style={{ padding: "1.5rem", overflowY: "auto" }}>
          {/* File Upload Area */}
          <div style={{
            border: "2px dashed var(--border)",
            borderRadius: "0.75rem",
            padding: "1.75rem 1.5rem",
            textAlign: "center",
            background: "rgba(255, 255, 255, 0.02)",
            marginBottom: "1.25rem"
          }}>
            <UploadCloud size={32} color="#38BDF8" style={{ margin: "0 auto 0.5rem auto", display: "block" }} />
            <h4 style={{ margin: "0 0 0.25rem 0", fontSize: "0.95rem", color: "#F9FAFB" }}>
              {fileName ? `Loaded: ${fileName}` : "Upload Original Registration Spreadsheet"}
            </h4>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
              Excel (.xlsx, .xls) or CSV file with participant names and phone numbers
            </p>
            <input 
              type="file" 
              id="sync-names-input"
              accept=".xlsx, .xls, .csv" 
              onChange={handleFileUpload} 
              style={{ display: "none" }}
            />
            <label 
              htmlFor="sync-names-input"
              className="btn-primary"
              style={{ display: "inline-block", cursor: "pointer", padding: "0.5rem 1.25rem", fontSize: "0.85rem" }}
            >
              Browse Spreadsheet
            </label>
          </div>

          {rawRows.length > 0 && (
            <div style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid var(--border-light)",
              borderRadius: "0.65rem",
              padding: "1.25rem",
              marginBottom: "1.25rem"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem", flexWrap: "wrap", gap: "0.5rem" }}>
                <span style={{ fontSize: "0.88rem", fontWeight: "700", color: "#E0F2FE" }}>
                  Name Columns Mapping
                </span>
                <div style={{ display: "inline-flex", background: "rgba(0, 0, 0, 0.3)", borderRadius: "0.45rem", padding: "0.2rem", border: "1px solid var(--border-light)" }}>
                  <button
                    type="button"
                    onClick={() => setNameMode("separate")}
                    style={{
                      padding: "0.25rem 0.65rem",
                      borderRadius: "0.35rem",
                      fontSize: "0.75rem",
                      fontWeight: "600",
                      cursor: "pointer",
                      border: "none",
                      background: nameMode === "separate" ? "#0284C7" : "transparent",
                      color: nameMode === "separate" ? "#FFFFFF" : "var(--text-secondary)"
                    }}
                  >
                    Separate (First + Surname)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNameMode("single")}
                    style={{
                      padding: "0.25rem 0.65rem",
                      borderRadius: "0.35rem",
                      fontSize: "0.75rem",
                      fontWeight: "600",
                      cursor: "pointer",
                      border: "none",
                      background: nameMode === "single" ? "#0284C7" : "transparent",
                      color: nameMode === "single" ? "#FFFFFF" : "var(--text-secondary)"
                    }}
                  >
                    Single Column
                  </button>
                </div>
              </div>

              {nameMode === "separate" ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.75rem", marginBottom: "0.85rem" }}>
                  <div>
                    <label className="label" style={{ fontSize: "0.8rem" }}>First Name Column: *</label>
                    <select 
                      className="input-field" 
                      value={selectedFirstNameCol} 
                      onChange={e => setSelectedFirstNameCol(e.target.value)}
                    >
                      <option value="">-- Select --</option>
                      {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label" style={{ fontSize: "0.8rem" }}>Surname Column: *</label>
                    <select 
                      className="input-field" 
                      value={selectedSurnameCol} 
                      onChange={e => setSelectedSurnameCol(e.target.value)}
                    >
                      <option value="">-- Select --</option>
                      {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label" style={{ fontSize: "0.8rem" }}>Other Names (Optional):</label>
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
                  <label className="label" style={{ fontSize: "0.8rem" }}>Full Name Column: *</label>
                  <select 
                    className="input-field" 
                    value={selectedSingleNameCol} 
                    onChange={e => setSelectedSingleNameCol(e.target.value)}
                  >
                    {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="label" style={{ fontSize: "0.8rem" }}>Match Phone / WhatsApp Column: *</label>
                <select 
                  className="input-field" 
                  value={selectedPhoneCol} 
                  onChange={e => setSelectedPhoneCol(e.target.value)}
                >
                  {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              {parsedUpdates.length > 0 && (
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
                    Ready to match <strong style={{ color: "#38BDF8" }}>{parsedUpdates.length} members</strong>. Row 1 Sample: <strong>"{parsedUpdates[0].fullName}"</strong> (<span style={{ fontFamily: "monospace", color: "#A7F3D0" }}>{parsedUpdates[0].phone}</span>)
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Sync Result Alert */}
          {syncResult && (
            <div style={{
              padding: "0.85rem 1rem",
              borderRadius: "0.5rem",
              marginBottom: "1.25rem",
              background: syncResult.success ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)",
              border: syncResult.success ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(239, 68, 68, 0.3)",
              display: "flex",
              alignItems: "center",
              gap: "0.65rem"
            }}>
              {syncResult.success ? <CheckCircle2 size={18} color="#10B981" /> : <AlertCircle size={18} color="#EF4444" />}
              <span style={{ fontSize: "0.85rem", color: syncResult.success ? "#A7F3D0" : "#FCA5A5", fontWeight: "600" }}>
                {syncResult.message}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "1rem 1.5rem",
          borderTop: "1px solid var(--border-light)",
          display: "flex",
          justifyContent: "flex-end",
          gap: "0.75rem",
          background: "rgba(255, 255, 255, 0.02)"
        }}>
          <button
            onClick={onClose}
            disabled={syncing}
            className="btn-secondary"
            style={{ padding: "0.5rem 1.25rem", fontSize: "0.88rem" }}
          >
            Cancel
          </button>

          <button
            onClick={handleExecuteSync}
            disabled={syncing || !parsedUpdates.length}
            className="btn-primary"
            style={{
              padding: "0.5rem 1.5rem",
              fontSize: "0.88rem",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.45rem",
              background: "#0284C7",
              color: "#FFFFFF",
              fontWeight: "700",
              cursor: (syncing || !parsedUpdates.length) ? "not-allowed" : "pointer",
              opacity: (syncing || !parsedUpdates.length) ? 0.6 : 1
            }}
          >
            {syncing ? (
              <>
                <RefreshCw size={15} className="spin" />
                <span>Updating Google Sheets...</span>
              </>
            ) : (
              <>
                <Check size={15} />
                <span>Sync {parsedUpdates.length} Full Names</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
