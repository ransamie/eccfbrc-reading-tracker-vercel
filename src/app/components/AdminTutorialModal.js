"use client";
import React, { useState } from "react";
import { 
  X, BookOpen, Layers, Users, Sliders, BarChart3, 
  HelpCircle, ShieldCheck, CheckCircle2, AlertTriangle, 
  MessageSquare, KeyRound, Sparkles, ArrowRight, FileText, ChevronRight
} from "lucide-react";

export default function AdminTutorialModal({ isOpen, onClose }) {
  const [activeTourTab, setActiveTourTab] = useState("wizard");

  if (!isOpen) return null;

  const tourSections = [
    {
      id: "wizard",
      title: "Start a New Edition",
      icon: <Layers size={18} color="#38BDF8" />,
      badge: "Core Feature",
      heading: "How to Launch a New Bible Reading Edition",
      description: "A step-by-step wizard that guides you through setting up an edition from an Excel/CSV contacts file, grouping members, assigning leaders, generating 4-digit PINs, and updating the live database.",
      steps: [
        {
          num: "1",
          title: "Edition Configuration & Mode",
          text: "Enter your Edition Name (e.g. \"September - December 2026 Edition\"), start date, duration (e.g. 30 days), and shift windows. Choose whether to Start Fresh (archives current challenge to Google Sheets archives) or Append to current roster."
        },
        {
          num: "2",
          title: "Upload & Auto-Grouping",
          text: "Drag and drop your spreadsheet (.xlsx or .csv). The system auto-cleans phone numbers (handles +234, strips extra zeros, preserves names) and distributes members into your chosen number of teams evenly."
        },
        {
          num: "3",
          title: "Designate Leaders & Auto-Generate PINs",
          text: "For every team, pick the Team Leader and optional Assistant Leader. Every team automatically receives a fresh, random 4-digit PIN for leader login."
        },
        {
          num: "4",
          title: "Pre-Flight Checklist",
          text: "The system runs an automatic audit. If dates, team leaders, or rosters are missing, it flags them in red so you can fix them before going live."
        },
        {
          num: "5",
          title: "Launch & WhatsApp Hub",
          text: "Click \"Launch & Sync to Live Tracker\" to write to Google Sheets. Then copy pre-formatted WhatsApp onboarding messages to send to each team leader with their members clickable links."
        }
      ]
    },
    {
      id: "leaders",
      title: "Leaders Tab",
      icon: <Users size={18} color="#A78BFA" />,
      badge: "Daily Operations",
      heading: "Managing Daily Team Leader Progress",
      description: "The primary control center during an active challenge. Used to review who has completed their daily reading, generate WhatsApp daily reports, and monitor accountability.",
      points: [
        {
          title: "Daily Checklists",
          text: "Click each leader tile to toggle whether they read for the day. Use \"Select All\" / \"Deselect All\" for rapid updates."
        },
        {
          title: "Strict Reporting Windows",
          text: "To maintain discipline, leader reporting is only open during designated shift hours (default: 04:00 AM - 11:00 AM and 06:00 PM - 11:00 PM West Africa Time). Outside these hours, leaders cannot modify reports."
        },
        {
          title: "Generate WhatsApp Report",
          text: "Calculates total Assigned, Committed, Left, and Evicted members. Formats a complete WhatsApp post with reflections and tags of who is up-to-date vs behind."
        },
        {
          title: "Eviction Watchlist",
          text: "Members who miss more than the threshold (default: 5 days) are automatically tagged in the Eviction section of the daily report."
        }
      ]
    },
    {
      id: "roster",
      title: "Roster Tab",
      icon: <FileText size={18} color="#34D399" />,
      badge: "Member Lifecycle",
      heading: "Managing Member Status & Attrition",
      description: "Keep your membership roster accurate so team statistics and leader reports reflect real participation.",
      points: [
        {
          title: "Active",
          text: "Currently participating in the daily reading."
        },
        {
          title: "Left",
          text: "The participant has voluntarily left the WhatsApp group chat."
        },
        {
          title: "Declined",
          text: "The person is still in the group but explicitly notified leadership they cannot participate this round."
        },
        {
          title: "Evicted",
          text: "Automatically flagged when a member misses too many days. They are excluded from active daily counts."
        }
      ]
    },
    {
      id: "analytics",
      title: "Analytics Tab",
      icon: <BarChart3 size={18} color="#FBBF24" />,
      badge: "Insights",
      heading: "Club-Wide Engagement & Data Viewer",
      description: "High-level metrics and raw tracking inspection without needing to open Google Sheets manually.",
      points: [
        {
          title: "Participation Curve",
          text: "Interactive line chart mapping total daily readers day-by-day to spot retention drop-offs early."
        },
        {
          title: "Global Metrics",
          text: "Live counters for Total Assigned, Currently Committed, Declined, and Evicted across all teams."
        },
        {
          title: "Raw Sheet Viewer (Ag-Grid)",
          text: "Directly view and search through the live Google Sheet database within the app."
        }
      ]
    },
    {
      id: "settings",
      title: "Settings Tab",
      icon: <Sliders size={18} color="#F87171" />,
      badge: "Policies",
      heading: "Global System Rules & Team PIN Management",
      description: "Configure policies that govern the entire reading club and control leader credentials.",
      points: [
        {
          title: "Shift Window Hours",
          text: "Change Morning and Evening reporting hours. Changes apply to all team leader accounts immediately."
        },
        {
          title: "Eviction Threshold",
          text: "Adjust the maximum missed days before eviction takes effect (default is 5 days)."
        },
        {
          title: "Team PIN Directory",
          text: "View and reset individual 4-digit PINs for team leaders if someone forgets their login."
        },
        {
          title: "Edition Switcher & Archives",
          text: "Switch the system to view historical completed challenges or browse archived editions."
        }
      ]
    },
    {
      id: "whatsapp",
      title: "WhatsApp Hub",
      icon: <MessageSquare size={18} color="#4ADE80" />,
      badge: "Communication",
      heading: "Automated WhatsApp Onboarding & Broadcasts",
      description: "Eliminates repetitive manual copy-pasting when setting up team leaders and introducing members.",
      points: [
        {
          title: "Leader Instruction Message",
          text: "Pre-crafted message reminding the leader to create the sub-team group and add their assistant."
        },
        {
          title: "Member DM Invitation Script",
          text: "A friendly, polite invitation script pre-filled with the Leader Name, Team Name, and Edition that leaders can send to members."
        },
        {
          title: "Direct WhatsApp Links (wa.me)",
          text: "Every member\'s phone number is formatted into a clickable direct link so leaders simply tap to open DMs."
        },
        {
          title: "One-Click Chat Launcher",
          text: "Super Admins can click \"Send to Leader via WhatsApp\" to instantly open WhatsApp Web or App with the pre-filled message."
        }
      ]
    }
  ];

  const currentSection = tourSections.find(s => s.id === activeTourTab) || tourSections[0];

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 99999,
      backgroundColor: "rgba(10, 15, 29, 0.82)",
      backdropFilter: "blur(6px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "1rem"
    }}>
      <div style={{
        background: "#111827",
        border: "1px solid rgba(255, 255, 255, 0.12)",
        borderRadius: "1rem",
        width: "100%",
        maxWidth: "920px",
        maxHeight: "90vh",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
        overflow: "hidden",
        color: "#F9FAFB"
      }}>
        {/* Modal Header */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1.25rem 1.5rem",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          background: "linear-gradient(90deg, rgba(37, 99, 235, 0.15) 0%, rgba(17, 24, 39, 0) 100%)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{
              width: "36px",
              height: "36px",
              borderRadius: "0.5rem",
              background: "rgba(56, 189, 248, 0.15)",
              border: "1px solid rgba(56, 189, 248, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <BookOpen size={20} color="#38BDF8" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: "700" }}>Super Admin Guide & System Tour</h3>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "#9CA3AF" }}>Everything you need to know to run the ECCF Bible Reading Tracker</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "0.5rem",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#9CA3AF",
              cursor: "pointer"
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body: Sidebar Tabs + Content Area */}
        <div style={{
          display: "flex",
          flex: 1,
          minHeight: 0,
          overflow: "hidden"
        }}>
          {/* Navigation Tabs Sidebar */}
          <div style={{
            width: "240px",
            borderRight: "1px solid rgba(255, 255, 255, 0.08)",
            background: "rgba(15, 23, 42, 0.6)",
            padding: "0.85rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.4rem",
            overflowY: "auto"
          }}>
            <span style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "1px", color: "#6B7280", fontWeight: "800", padding: "0.4rem 0.6rem" }}>
              Sections Tour
            </span>
            {tourSections.map(sec => (
              <button
                key={sec.id}
                onClick={() => setActiveTourTab(sec.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.65rem 0.75rem",
                  borderRadius: "0.5rem",
                  border: activeTourTab === sec.id ? "1px solid rgba(56, 189, 248, 0.4)" : "1px solid transparent",
                  background: activeTourTab === sec.id ? "rgba(56, 189, 248, 0.12)" : "transparent",
                  color: activeTourTab === sec.id ? "#F9FAFB" : "#9CA3AF",
                  fontWeight: activeTourTab === sec.id ? "600" : "500",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s ease"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  {sec.icon}
                  <span>{sec.title}</span>
                </div>
                {activeTourTab === sec.id && <ChevronRight size={14} color="#38BDF8" />}
              </button>
            ))}
          </div>

          {/* Active Section Content */}
          <div style={{
            flex: 1,
            padding: "1.5rem 1.75rem",
            overflowY: "auto"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <span style={{
                background: "rgba(56, 189, 248, 0.15)",
                color: "#38BDF8",
                border: "1px solid rgba(56, 189, 248, 0.3)",
                fontSize: "0.72rem",
                fontWeight: "700",
                padding: "0.2rem 0.55rem",
                borderRadius: "9999px",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}>
                {currentSection.badge}
              </span>
            </div>

            <h2 style={{ fontSize: "1.35rem", fontWeight: "800", color: "#F9FAFB", marginBottom: "0.5rem" }}>
              {currentSection.heading}
            </h2>
            <p style={{ fontSize: "0.9rem", color: "#9CA3AF", lineHeight: 1.6, marginBottom: "1.5rem" }}>
              {currentSection.description}
            </p>

            {/* If section has structured steps */}
            {currentSection.steps && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                {currentSection.steps.map(step => (
                  <div key={step.num} style={{
                    display: "flex",
                    gap: "1rem",
                    padding: "0.9rem",
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                    borderRadius: "0.65rem"
                  }}>
                    <div style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      background: "rgba(56, 189, 248, 0.2)",
                      color: "#38BDF8",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: "800",
                      fontSize: "0.85rem",
                      flexShrink: 0
                    }}>
                      {step.num}
                    </div>
                    <div>
                      <h4 style={{ margin: "0 0 0.25rem 0", fontSize: "0.92rem", fontWeight: "700", color: "#E0F2FE" }}>
                        {step.title}
                      </h4>
                      <p style={{ margin: 0, fontSize: "0.84rem", color: "#9CA3AF", lineHeight: 1.5 }}>
                        {step.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* If section has bullet points */}
            {currentSection.points && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "0.85rem" }}>
                {currentSection.points.map((pt, idx) => (
                  <div key={idx} style={{
                    padding: "0.9rem",
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                    borderRadius: "0.65rem",
                    display: "flex",
                    gap: "0.85rem",
                    alignItems: "flex-start"
                  }}>
                    <div style={{
                      marginTop: "2px",
                      width: "20px",
                      height: "20px",
                      borderRadius: "50%",
                      background: "rgba(16, 185, 129, 0.15)",
                      color: "#10B981",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0
                    }}>
                      <CheckCircle2 size={14} />
                    </div>
                    <div>
                      <h4 style={{ margin: "0 0 0.2rem 0", fontSize: "0.92rem", fontWeight: "700", color: "#F3F4F6" }}>
                        {pt.title}
                      </h4>
                      <p style={{ margin: 0, fontSize: "0.84rem", color: "#9CA3AF", lineHeight: 1.5 }}>
                        {pt.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1rem 1.5rem",
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          background: "rgba(15, 23, 42, 0.5)"
        }}>
          <span style={{ fontSize: "0.8rem", color: "#6B7280" }}>
            Tip: You can re-open this guide anytime by clicking the Guide button in the header.
          </span>
          <button
            onClick={onClose}
            style={{
              background: "#2563EB",
              color: "white",
              border: "none",
              padding: "0.55rem 1.25rem",
              borderRadius: "0.5rem",
              fontSize: "0.85rem",
              fontWeight: "600",
              cursor: "pointer",
              boxShadow: "0 4px 6px -1px rgba(37, 99, 235, 0.3)"
            }}
          >
            Got it, let&apos;s build!
          </button>
        </div>
      </div>
    </div>
  );
}
