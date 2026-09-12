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
    <div className="tutorial-modal-backdrop" onClick={onClose}>
      <div className="tutorial-modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="tutorial-header">
          <div className="tutorial-header-left">
            <div className="tutorial-header-icon">
              <BookOpen size={20} color="#38BDF8" />
            </div>
            <div>
              <h3 className="tutorial-header-title">Super Admin Guide & System Tour</h3>
              <p className="tutorial-header-subtitle">Everything you need to know to run the ECCF Bible Reading Tracker</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="tutorial-close-btn"
            title="Close Guide"
            aria-label="Close Guide"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body: Sidebar Tabs (Desktop) / Horizontal Scrollable Tabs (Mobile) + Content Area */}
        <div className="tutorial-body">
          {/* Navigation Tabs */}
          <div className="tutorial-nav">
            <span className="tutorial-nav-label">
              Sections Tour
            </span>
            {tourSections.map(sec => (
              <button
                key={sec.id}
                onClick={() => setActiveTourTab(sec.id)}
                className={`tutorial-nav-btn ${activeTourTab === sec.id ? 'active' : ''}`}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  {sec.icon}
                  <span>{sec.title}</span>
                </div>
                {activeTourTab === sec.id && <ChevronRight size={14} color="#38BDF8" className="tutorial-nav-chevron" />}
              </button>
            ))}
          </div>

          {/* Active Section Content */}
          <div className="tutorial-content">
            <span className="tutorial-badge">
              {currentSection.badge}
            </span>

            <h2 className="tutorial-heading">
              {currentSection.heading}
            </h2>
            <p className="tutorial-description">
              {currentSection.description}
            </p>

            {/* If section has structured steps */}
            {currentSection.steps && (
              <div>
                {currentSection.steps.map(step => (
                  <div key={step.num} className="tutorial-step-card">
                    <div className="tutorial-step-num">
                      {step.num}
                    </div>
                    <div>
                      <h4 className="tutorial-step-title">
                        {step.title}
                      </h4>
                      <p className="tutorial-step-text">
                        {step.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* If section has bullet points */}
            {currentSection.points && (
              <div>
                {currentSection.points.map((pt, idx) => (
                  <div key={idx} className="tutorial-point-card">
                    <div className="tutorial-point-icon">
                      <CheckCircle2 size={14} />
                    </div>
                    <div>
                      <h4 className="tutorial-point-title">
                        {pt.title}
                      </h4>
                      <p className="tutorial-point-text">
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
        <div className="tutorial-footer">
          <span className="tutorial-footer-tip">
            Tip: You can re-open this guide anytime by clicking the Guide button in the header.
          </span>
          <button
            onClick={onClose}
            className="tutorial-footer-btn"
          >
            Got it, let&apos;s build!
          </button>
        </div>
      </div>
    </div>
  );
}
