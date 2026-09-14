"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { 
  ChevronRight, ChevronLeft, X, Sparkles, Compass, 
  CheckCircle2, BookOpen, Clock, Users, Trophy, ExternalLink, HelpCircle
} from "lucide-react";

export default function LeaderTourSpotlight({ 
  isOpen, 
  onClose, 
  activeTab, 
  setActiveTab, 
  onOpenFullGuide,
  settings,
  isReportingWindow,
  mornStart = "04:00 AM",
  mornEnd = "11:00 AM",
  eveStart = "06:00 PM",
  eveEnd = "11:00 PM"
}) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0, arrowPlacement: 'bottom' });
  const tooltipRef = useRef(null);

  const tourSteps = [
    {
      id: "step-readers",
      tab: "report",
      selector: '[data-tour="member-tiles"]',
      badge: "Step 1 of 8 • Daily Workflow",
      title: "1. Tick Completed Readers",
      description: "Tap each member's card who completed their reading for the day. Both Team Leaders and Assistants are also ticked under Team Leadership. Tap 'Select All' if the entire team finished!",
      preferredPlacement: "bottom"
    },
    {
      id: "step-reflection",
      tab: "report",
      selector: '[data-tour="reflection-box"]',
      badge: "Step 2 of 8 • Daily Workflow",
      title: "2. Add Reflection Scripture",
      description: "Enter your team's devotional verse or meditation for today. The app saves this scripture to your team records and embeds it automatically into your formatted daily WhatsApp report.",
      preferredPlacement: "top"
    },
    {
      id: "step-save",
      tab: "report",
      selector: '[data-tour="save-btn"]',
      badge: "Step 3 of 8 • Daily Workflow",
      title: "3. Commit Day to Cloud",
      description: "Always click 'Save Updates' to write your attendance marks and scripture to the cloud database. Past days can also be selected using the Date Stepper and backfilled at any time.",
      preferredPlacement: "top"
    },
    {
      id: "step-report",
      tab: "report",
      selector: '[data-tour="report-btn"]',
      badge: "Step 4 of 8 • Daily Workflow",
      title: "4. Generate WhatsApp Report",
      description: "Tap 'Generate WhatsApp Report' to instantly compile a formatted daily broadcast featuring participation percentages, eviction notices, and your saved reflection verse.",
      preferredPlacement: "top"
    },
    {
      id: "step-copy-tag",
      tab: "report",
      selector: '[data-tour="report-btn"]',
      badge: "Step 5 of 8 • WhatsApp Protocol",
      title: "5. Copy, Tag & Broadcast",
      description: "Copy your report and paste it into your specific Team WhatsApp Group (e.g. Team Goodness, Team Endurance, Team Praise). In the readers list, replace each printed name with their WhatsApp '@mention' tag so they get directly notified. Send the finalized post to both: 1) Your specific Team Group, and 2) The General Reading Group!",
      preferredPlacement: "top"
    },
    {
      id: "feature-search",
      tab: "report",
      selector: '[data-tour="search-bar"]',
      badge: "Feature Spotlight • Search",
      title: "Instant Search & Completion Meter",
      description: "Quickly filter team members by name or WhatsApp number. The toolbar displays live completion percentages and participant tallies that update as you type.",
      preferredPlacement: "bottom"
    },
    {
      id: "feature-roster",
      tab: "roster",
      selector: '[data-tour="roster-tab"]',
      badge: "Feature Spotlight • Roster",
      title: "Manage Member Roster Status",
      description: "Switch to the Roster tab to update any member who left the group or declined the challenge. Adjusting their status immediately removes them from your required active tally so your team's completion percentage stays accurate!",
      preferredPlacement: "bottom"
    },
    {
      id: "feature-quiz",
      tab: "report",
      selector: '[data-tour="quiz-link"]',
      badge: "Feature Spotlight • Quiz",
      title: "Quiz Hub & Milestone Rounds",
      description: "Use this button to copy your team's direct quiz link. Important: The quiz is milestone-based and activates only after completing each 10-day round once enabled by the Super Admin.",
      preferredPlacement: "bottom"
    },
    {
      id: "feature-windows",
      tab: "report",
      selector: '[data-tour="reporting-windows"]',
      badge: "Accountability Feature • Schedule",
      title: "Synchronized Reporting Windows",
      description: `Live daily reporting is open during: Morning (${mornStart} – ${mornEnd}) and Evening (${eveStart} – ${eveEnd} WAT). This ensures prompt, disciplined updates while preventing off-hour reporting errors. Past days can be backfilled anytime!`,
      preferredPlacement: "bottom"
    }
  ];

  const currentStep = tourSteps[currentStepIndex];

  // Update target rect & calculate tooltip position
  const updatePosition = useCallback(() => {
    if (!isOpen || !currentStep) return;

    // Switch tab if step requires a different tab
    if (currentStep.tab && activeTab !== currentStep.tab) {
      setActiveTab(currentStep.tab);
      // Give React time to render new tab content
      setTimeout(updatePosition, 180);
      return;
    }

    const element = document.querySelector(currentStep.selector);
    if (!element) {
      // If element not found in DOM, fallback gracefully
      setTargetRect(null);
      return;
    }

    // Smoothly scroll element into center view
    element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });

    // Measure bounding rect
    const rect = element.getBoundingClientRect();
    setTargetRect({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      bottom: rect.bottom,
      right: rect.right
    });

    // Compute tooltip position
    const tooltipWidth = Math.min(380, window.innerWidth - 32);
    const tooltipHeight = 240; // Approximate
    const gap = 16;
    const padding = 16;

    let placement = currentStep.preferredPlacement || 'bottom';
    let top = 0;
    let left = 0;

    // Check vertical room
    const roomBelow = window.innerHeight - rect.bottom;
    const roomAbove = rect.top;

    if (placement === 'bottom' && roomBelow < tooltipHeight + gap && roomAbove > tooltipHeight + gap) {
      placement = 'top';
    } else if (placement === 'top' && roomAbove < tooltipHeight + gap && roomBelow > tooltipHeight + gap) {
      placement = 'bottom';
    }

    if (placement === 'bottom') {
      top = rect.bottom + gap;
    } else {
      top = rect.top - tooltipHeight - gap;
    }

    // Clamp top within viewport
    top = Math.max(padding, Math.min(window.innerHeight - tooltipHeight - padding, top));

    // Align horizontally with target center, clamped to screen margins
    const targetCenterX = rect.left + rect.width / 2;
    left = targetCenterX - tooltipWidth / 2;
    left = Math.max(padding, Math.min(window.innerWidth - tooltipWidth - padding, left));

    setTooltipPos({ top, left, arrowPlacement: placement });
  }, [isOpen, currentStep, activeTab, setActiveTab]);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
    }
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, currentStepIndex, updatePosition]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  if (!isOpen || !currentStep) return null;

  const handleNext = () => {
    if (currentStepIndex < tourSteps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  return (
    <div className="tour-spotlight-root">
      {/* Darkened Backdrop & Glowing Cutout */}
      {targetRect && (
        <div 
          className="tour-spotlight-ring"
          style={{
            top: `${Math.max(0, targetRect.top - 6)}px`,
            left: `${Math.max(0, targetRect.left - 6)}px`,
            width: `${targetRect.width + 12}px`,
            height: `${targetRect.height + 12}px`
          }}
        />
      )}

      {/* Fallback backdrop if target rect is not ready yet */}
      {!targetRect && (
        <div className="tour-spotlight-fallback-backdrop" onClick={onClose} />
      )}

      {/* Floating Tour Tooltip Card */}
      <div 
        ref={tooltipRef}
        className="tour-card"
        style={{
          top: `${tooltipPos.top}px`,
          left: `${tooltipPos.left}px`,
          maxWidth: '380px',
          width: 'calc(100vw - 32px)'
        }}
      >
        {/* Pointer Arrow */}
        {targetRect && (
          <div 
            className={`tour-arrow tour-arrow-${tooltipPos.arrowPlacement}`}
            style={{
              left: `${Math.min(
                Math.max(24, (targetRect.left + targetRect.width / 2) - tooltipPos.left),
                Math.min(380, window.innerWidth - 32) - 24
              )}px`
            }}
          />
        )}

        {/* Card Header */}
        <div className="tour-card-header">
          <div className="tour-card-badge-wrap">
            <span className="tour-card-badge">
              <Compass size={13} />
              <span>{currentStep.badge}</span>
            </span>
          </div>
          <button 
            onClick={onClose} 
            className="tour-card-close-btn"
            aria-label="Close Tour"
          >
            <X size={16} />
          </button>
        </div>

        {/* Card Body */}
        <div className="tour-card-body">
          <h3 className="tour-card-title">{currentStep.title}</h3>
          <p className="tour-card-desc">{currentStep.description}</p>
        </div>

        {/* Card Footer */}
        <div className="tour-card-footer">
          {/* Progress dots */}
          <div className="tour-dots">
            {tourSteps.map((_, idx) => (
              <span 
                key={idx} 
                onClick={() => setCurrentStepIndex(idx)}
                className={`tour-dot ${idx === currentStepIndex ? 'active' : ''}`}
                title={`Jump to step ${idx + 1}`}
              />
            ))}
          </div>

          <div className="tour-actions">
            {currentStepIndex > 0 && (
              <button 
                onClick={handlePrev} 
                className="tour-btn tour-btn-secondary"
              >
                <ChevronLeft size={16} />
                <span>Back</span>
              </button>
            )}

            <button 
              onClick={handleNext} 
              className="tour-btn tour-btn-primary"
            >
              <span>{currentStepIndex === tourSteps.length - 1 ? 'Finish Tour' : 'Next'}</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Quick Link to Full Manual */}
        {onOpenFullGuide && (
          <div className="tour-card-handbook-link">
            <button 
              onClick={() => {
                onClose();
                onOpenFullGuide();
              }}
              className="tour-handbook-btn"
            >
              <HelpCircle size={13} />
              <span>Open Complete Handbook & Guidelines</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
