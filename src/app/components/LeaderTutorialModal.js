"use client";
import React, { useState } from "react";
import { 
  X, BookOpen, Layers, Users, HelpCircle, CheckCircle2, 
  MessageSquare, Sparkles, ArrowRight, FileText, ChevronRight,
  Clock, Search, ShieldCheck, Trophy, Play, Compass, FileDown
} from "lucide-react";
import { formatTeamName } from "@/lib/teamUtils";

export default function LeaderTutorialModal({ 
  isOpen, 
  onClose, 
  onStartInteractiveTour,
  team,
  settings,
  mornStart = "04:00 AM",
  mornEnd = "11:00 AM",
  eveStart = "06:00 PM",
  eveEnd = "11:00 PM",
  isReportingWindow = true
}) {
  const [activeTab, setActiveTab] = useState("workflow");

  if (!isOpen) return null;

  const tourSections = [
    {
      id: "workflow",
      title: "Daily Reporting",
      icon: <FileText size={18} color="#38BDF8" />,
      badge: "Standard Protocol",
      heading: "The 7-Step Daily Reporting Procedure",
      description: "Follow this systematic daily routine to mark your team's completed readers, save to the database, and distribute tagged broadcasts across the community.",
      steps: [
        {
          num: "1",
          title: "Check Off Daily Readers",
          text: "Tap each member's card who confirmed completing their daily reading. Be sure to also check off both the Team Leader and Assistant Leader in the 'Team Leadership' card. If all active members finished, tap '✓ Select All'."
        },
        {
          num: "2",
          title: "Record Reflection Scripture",
          text: "In the Daily Reflection Scripture box, enter your team's scripture or devotional insight for today. The system saves this verse to your team records and embeds it automatically into your formatted daily report."
        },
        {
          num: "3",
          title: "Save Day to Live Database",
          text: "Click '💾 Save Updates' to securely write your attendance marks and scripture to the central cloud tracker. You can also use the Date Stepper to navigate back and review or backfill any past day at any time."
        },
        {
          num: "4",
          title: "Compile WhatsApp Report",
          text: "Click '📋 Generate WhatsApp Report'. The system instantly computes total committed, active percentages, eviction warnings, streaks, and your reflection scripture into a formatted broadcast."
        },
        {
          num: "5",
          title: "Copy to Clipboard",
          text: "Scroll to the preview box and tap 'Copy to Clipboard'. A confirmation toast verifies the formatted text is safely in your device clipboard."
        },
        {
          num: "6",
          title: "Smart Tag Members via @Mentions",
          text: "Open your Team WhatsApp Group and paste the report. In the numbered readers list, backspace each plain printed name and replace it with their WhatsApp '@mention' tag. Tagging ensures members receive direct notifications and keeps team momentum high!"
        },
        {
          num: "7",
          title: "Dual Group Broadcast",
          text: "After publishing in your Team WhatsApp Group, forward the finalized, tagged message to both: (1) The ECCFBRC Team Leaders' Group, and (2) The ECCFBRC General Reading Challenge Group."
        }
      ]
    },
    {
      id: "features",
      title: "Tools & Features",
      icon: <Sparkles size={18} color="#A78BFA" />,
      badge: "App Capabilities",
      heading: "Complete Dashboard Features & Tools",
      description: "Everything at your fingertips to manage attendance, motivate participants, and maintain flawless records.",
      points: [
        {
          title: "Instant Member Search & Completion Bar",
          text: "Type any name or WhatsApp number in the search bar to locate participants instantly. The live toolbar shows exact counts and the completed reading percentage for your team."
        },
        {
          title: "Roster Status Management (Left / Declined / Evicted)",
          text: "Under the 'Roster' tab, you can adjust a participant's status if they voluntarily left the group, declined the challenge, or were evicted. Adjusting their status immediately removes them from your required active attendance tally so your team's completion percentage remains accurate."
        },
        {
          title: "Quiz Hub & Round Milestone Checkpoints",
          text: "Each 10-day reading edition culminates in an official challenge quiz. You can copy the team quiz link using the header 'Quiz Link' button. Please note: The quiz link only becomes active after finishing a round when the Super Admin unlocks it."
        },
        {
          title: "Historical Day Stepper & Backfilling",
          text: "Use the Date Stepper (◀ Previous / Next ▶) to view past reading days. If a member reported late, you can update past records and click 'Save Updates' anytime — historical editing is never blocked by live reporting windows."
        },
        {
          title: "Install as Mobile App (PWA)",
          text: "Tap the 'Install App' button in the header to add the tracker to your smartphone home screen. It opens like a native mobile app with fast, fullscreen access."
        },
        {
          title: "Official Team PDF Report Export",
          text: "When a reading edition concludes, leaders can generate and download an official publication-quality PDF report summarizing their entire team's attendance and completion certificates."
        }
      ]
    },
    {
      id: "windows",
      title: "Reporting Windows",
      icon: <Clock size={18} color="#34D399" />,
      badge: "Accountability Rules",
      heading: "Understanding Live Reporting Windows",
      description: "Live daily reports are synchronized within designated morning and evening shifts to maintain structured reading discipline across all teams.",
      points: [
        {
          title: `Active Morning Window (${mornStart} – ${mornEnd} WAT)`,
          text: "The primary morning shift for members who complete early devotions before starting their workday or school duties."
        },
        {
          title: `Active Evening Window (${eveStart} – ${eveEnd} WAT)`,
          text: "The concluding evening shift to capture members completing their readings after daily obligations, prior to publishing the daily summary."
        },
        {
          title: "Why Reporting Windows Exist",
          text: "Designated windows create consistent daily spiritual habits, prevent all-day distraction, and ensure all 15+ teams submit their summaries at predictable, synchronized times."
        },
        {
          title: "Historical Days Exemption",
          text: "If you need to correct or backfill attendance for Day 1, Day 2, or any past day, the window restriction DOES NOT apply. You can edit and save past days 24 hours a day."
        }
      ]
    },
    {
      id: "whatsapp",
      title: "WhatsApp Guidelines",
      icon: <MessageSquare size={18} color="#FBBF24" />,
      badge: "Communication Etiquette",
      heading: "WhatsApp Engagement & Tagging Best Practices",
      description: "Elevate your team's engagement with professional communication and timely recognition.",
      points: [
        {
          title: "Why You Must Replace Names with @Mentions",
          text: "Many group members have notifications muted. When you backspace their printed name and type '@' to select their actual WhatsApp contact, their phone triggers a direct notification, honoring their commitment and motivating others."
        },
        {
          title: "Posting Sequence",
          text: "Always post in your Team Group first so your members see their progress celebrated. Then forward the tagged broadcast to the Team Leaders' Group and General Challenge Group."
        },
        {
          title: "Consistent Reflection Verse",
          text: "Include an inspiring reflection scripture with every daily broadcast. It keeps the focus on spiritual growth and gives members a scripture to meditate upon."
        }
      ]
    }
  ];

  const currentSection = tourSections.find(s => s.id === activeTourTab) || tourSections[0];

  return (
    <div className="tutorial-modal-backdrop" onClick={onClose}>
      <div 
        className="tutorial-modal-dialog" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '940px' }}
      >
        {/* Modal Header */}
        <div className="tutorial-header">
          <div className="tutorial-header-left">
            <div className="tutorial-header-icon">
              <BookOpen size={20} color="#38BDF8" />
            </div>
            <div>
              <h3 className="tutorial-header-title">
                {formatTeamName(team)} • Leader Guide & Handbook
              </h3>
              <p className="tutorial-header-subtitle">
                Comprehensive manual for daily reporting, roster management, and accountability rules.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="tutorial-close-btn"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Live Tour Promo Hero Card */}
        <div className="leader-tour-promo-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div className="leader-tour-promo-icon">
              <Compass size={22} color="#38BDF8" />
            </div>
            <div>
              <h4 style={{ margin: '0 0 0.15rem 0', fontSize: '0.98rem', fontWeight: 800, color: '#F9FAFB' }}>
                Interactive Dashboard Tour
              </h4>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#9CA3AF', lineHeight: '1.4' }}>
                Prefer a live walkthrough? Let the app point directly to each button and feature on your screen!
              </p>
            </div>
          </div>
          <button 
            onClick={() => {
              onClose();
              if (onStartInteractiveTour) onStartInteractiveTour();
            }} 
            className="btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.55rem 1.15rem',
              fontSize: '0.85rem',
              fontWeight: 700,
              background: '#0284C7',
              color: '#FFFFFF',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
          >
            <Play size={14} />
            <span>Start Interactive Tour</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="tutorial-body">
          {/* Navigation Tabs Sidebar / Top Bar */}
          <div className="tutorial-nav">
            <span className="tutorial-nav-label">
              Leader Guide
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

            {/* If section is reporting windows, show live status card */}
            {currentSection.id === "windows" && (
              <div style={{
                background: isReportingWindow ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)",
                border: `1px solid ${isReportingWindow ? "rgba(16, 185, 129, 0.3)" : "rgba(245, 158, 11, 0.3)"}`,
                borderRadius: "0.65rem",
                padding: "0.85rem 1.1rem",
                marginBottom: "1.25rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "0.75rem"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <Clock size={20} color={isReportingWindow ? "#34D399" : "#FBBF24"} />
                  <div>
                    <strong style={{ fontSize: "0.9rem", color: isReportingWindow ? "#34D399" : "#FBBF24", display: "block" }}>
                      Current Status: {isReportingWindow ? "Reporting Window is OPEN" : "Reporting Window is CLOSED"}
                    </strong>
                    <span style={{ fontSize: "0.78rem", color: "#9CA3AF" }}>
                      Morning: {mornStart} – {mornEnd} WAT &bull; Evening: {eveStart} – {eveEnd} WAT
                    </span>
                  </div>
                </div>
                <span style={{
                  fontSize: "0.76rem",
                  fontWeight: 700,
                  padding: "0.2rem 0.6rem",
                  borderRadius: "999px",
                  background: isReportingWindow ? "rgba(16, 185, 129, 0.2)" : "rgba(245, 158, 11, 0.2)",
                  color: isReportingWindow ? "#A7F3D0" : "#FDE68A"
                }}>
                  {isReportingWindow ? "Accepting Live Reports" : "Historical Backfill Only"}
                </span>
              </div>
            )}

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
            Tip: You can re-open this handbook anytime by clicking the &ldquo;Guide & Tour&rdquo; button in the header.
          </span>
          <button
            onClick={onClose}
            className="tutorial-footer-btn"
          >
            Got it, let&apos;s lead!
          </button>
        </div>
      </div>
    </div>
  );
}
