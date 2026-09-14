"use client";
import React, { useState, useEffect, useRef } from "react";
import { 
  X, Play
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
  isReportingWindow = true,
  initialTab = "workflow"
}) {
  const [activeTourTab, setActiveTourTab] = useState(initialTab || "workflow");
  const prevOpenRef = useRef(false);

  useEffect(() => {
    // Only set active tab when modal transitions from closed to open
    if (isOpen && !prevOpenRef.current) {
      setActiveTourTab(initialTab || "workflow");
    }
    prevOpenRef.current = isOpen;
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const tourSections = [
    {
      id: "workflow",
      tabLabel: "Daily Workflow",
      category: "Standard Protocol",
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
          text: "Open your specific Team WhatsApp Group (e.g. For Team Goodness, Team Goodness's group; for Team Endurance, Team Endurance's group; for Team Praise, Team Praise's group). Paste the report. In the numbered readers list, backspace each plain printed name and replace it with their WhatsApp '@mention' tag so they get directly notified and motivated!"
        },
        {
          num: "7",
          title: "Send to Team Group & General Challenge Group",
          text: "Send the finalized, tagged report to both: (1) Your specific Team WhatsApp Group chat (e.g., Team Goodness's group for Team Goodness, Team Endurance's group for Team Endurance, Team Praise's group for Team Praise), and (2) The ECCFBRC General Reading Challenge Group."
        }
      ]
    },
    {
      id: "features",
      tabLabel: "Features & Tools",
      category: "App Capabilities",
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
      tabLabel: "Reporting Windows",
      category: "Accountability Rules",
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
      tabLabel: "WhatsApp Guidelines",
      category: "Communication Etiquette",
      heading: "WhatsApp Engagement & Tagging Best Practices",
      description: "Elevate your team's engagement with professional communication and timely recognition.",
      points: [
        {
          title: "Why You Must Replace Names with @Mentions",
          text: "Many group members have notifications muted. When you backspace their printed name and type '@' to select their actual WhatsApp contact, their phone triggers a direct notification, honoring their commitment and motivating others."
        },
        {
          title: "Posting Sequence",
          text: "Send the tagged report directly to your specific Team Group chat first (e.g., Team Goodness, Team Endurance, Team Praise, etc.) to celebrate your members' dedication. Then forward the same finalized report to the General Reading Challenge Group."
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
    <div className="guide-modal-backdrop" onClick={onClose}>
      <div 
        className="guide-modal-dialog" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Minimal Header */}
        <div className="guide-header">
          <div className="guide-header-title-block">
            <h3 className="guide-header-title">
              {team ? `${formatTeamName(team)} • ` : ""}Leader Guide
            </h3>
            <p className="guide-header-sub">
              Standard operations, daily workflow & rules
            </p>
          </div>

          <div className="guide-header-actions">
            {onStartInteractiveTour && (
              <button 
                onClick={() => {
                  onClose();
                  onStartInteractiveTour();
                }} 
                className="guide-tour-link-btn"
                title="Start step-by-step interactive walkthrough on the dashboard"
              >
                <Play size={12} fill="currentColor" />
                <span>Interactive Tour</span>
              </button>
            )}
            <button 
              onClick={onClose} 
              className="guide-close-btn"
              aria-label="Close guide"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Clean Borderless Horizontal Tabs */}
        <div className="guide-tabs-bar">
          {tourSections.map(sec => (
            <button
              key={sec.id}
              onClick={() => setActiveTourTab(sec.id)}
              className={`guide-tab-btn ${activeTourTab === sec.id ? 'active' : ''}`}
            >
              {sec.tabLabel}
            </button>
          ))}
        </div>

        {/* Guide Body Content */}
        <div className="guide-body">
          <span className="guide-category-label">
            {currentSection.category}
          </span>

          <h2 className="guide-section-heading">
            {currentSection.heading}
          </h2>
          <p className="guide-section-desc">
            {currentSection.description}
          </p>

          {/* Reporting Windows Status Line */}
          {currentSection.id === "windows" && (
            <div className="guide-status-bar">
              <span className={`guide-status-dot ${isReportingWindow ? 'open' : 'closed'}`} />
              <div className="guide-status-info">
                <span className="guide-status-title">
                  {isReportingWindow ? "Reporting Window is Currently OPEN" : "Reporting Window is Currently CLOSED"}
                </span>
                <span className="guide-status-shifts">
                  Morning: {mornStart} – {mornEnd} WAT &bull; Evening: {eveStart} – {eveEnd} WAT
                </span>
              </div>
            </div>
          )}

          {/* Structured Steps List (Clean Typography, No Heavy Box Cards) */}
          {currentSection.steps && (
            <div className="guide-steps-list">
              {currentSection.steps.map(step => (
                <div key={step.num} className="guide-step-row">
                  <span className="guide-step-num">{step.num.padStart(2, '0')}</span>
                  <div className="guide-step-body">
                    <h4 className="guide-step-title">{step.title}</h4>
                    <p className="guide-step-text">{step.text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Bullet Points List (Clean Typography, No Heavy Box Cards) */}
          {currentSection.points && (
            <div className="guide-points-list">
              {currentSection.points.map((pt, idx) => (
                <div key={idx} className="guide-point-row">
                  <span className="guide-point-bullet">•</span>
                  <div className="guide-point-body">
                    <h4 className="guide-point-title">{pt.title}</h4>
                    <p className="guide-point-text">{pt.text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Minimal Footer */}
        <div className="guide-footer">
          <span className="guide-footer-tip">
            Re-open anytime via <strong>Guide & Tour</strong> in the top header.
          </span>
          <button
            onClick={onClose}
            className="guide-footer-btn"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
