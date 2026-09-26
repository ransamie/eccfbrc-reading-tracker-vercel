"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { 
  ChevronRight, ChevronLeft, X, Compass, 
  HelpCircle
} from "lucide-react";

export default function AdminTourSpotlight({ 
  isOpen, 
  onClose, 
  activeTab, 
  setActiveTab, 
  onOpenFullGuide,
  onEnsureTabReady,
  settings 
}) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0, arrowPlacement: 'bottom' });
  const tooltipRef = useRef(null);
  const timersRef = useRef([]);

  const tourSteps = [
    {
      id: "step-header-actions",
      tab: null,
      selector: '[data-tour="admin-header-actions"]',
      badge: "Step 1 of 10 • Command Center",
      title: "1. Quick Utilities & Quiz Hub",
      description: "Access essential administrative utilities at any moment: launch this Interactive Tour, open the comprehensive Super Admin Handbook, jump to the Quiz Control Hub, refresh live database records, or install the app as a PWA.",
      preferredPlacement: "bottom"
    },
    {
      id: "step-edition-bar",
      tab: null,
      selector: '[data-tour="admin-edition-bar"]',
      badge: "Step 2 of 10 • Global Governance",
      title: "2. Active Edition & Master Switch",
      description: "Switch seamlessly between the current live reading challenge and archived past editions. Use the 'Leader Reporting: ON/OFF' master toggle to pause leader submissions between rounds or during administrative reviews.",
      preferredPlacement: "bottom"
    },
    {
      id: "step-tabs-bar",
      tab: null,
      selector: '[data-tour="admin-tabs-bar"]',
      badge: "Step 3 of 10 • Modular Navigation",
      title: "3. Modular Administration Tabs",
      description: "Quickly navigate across the 6 core operational modules: Launch Wizard, Overview & Analytics, Leader Reports, Member Roster, Global Settings, and Activity Audit Logs.",
      preferredPlacement: "bottom"
    },
    {
      id: "step-wizard",
      tab: "wizard",
      selector: '[data-tour="admin-wizard-container"]',
      badge: "Step 4 of 10 • Edition Launch",
      title: "4. 5-Step Launch & Auto-Grouping Wizard",
      description: "Launch a new reading challenge with ease: define edition dates, upload member contact sheets (automatically cleaned with +234 phone codes), auto-group members into balanced teams, designate leaders, and generate 4-digit PINs.",
      preferredPlacement: "bottom"
    },
    {
      id: "step-analytics-kpis",
      tab: "analytics",
      selector: '[data-tour="admin-analytics-kpis"]',
      badge: "Step 5 of 10 • Real-Time Metrics",
      title: "5. High-Level Metrics & Daily Pulse",
      description: "Monitor club-wide participation in real time: view Total Assigned, Active Committed Readers, Voluntary Dropouts, and Evictions. The live reading meter displays today's exact percentage completion.",
      preferredPlacement: "bottom"
    },
    {
      id: "step-analytics-charts",
      tab: "analytics",
      selector: '[data-tour="admin-analytics-charts"]',
      badge: "Step 6 of 10 • Health & Retention Trends",
      title: "6. Leaderboard, Health Check & Trend Curves",
      description: "Inspect reader retention day-by-day to identify attendance trends early. Review the live team leaderboard and Team Health Check tables, and export them as high-resolution PNG images for sharing.",
      preferredPlacement: "top"
    },
    {
      id: "step-leaders",
      tab: "leaders",
      selector: '[data-tour="admin-leaders-controls"]',
      badge: "Step 7 of 10 • Daily Operations",
      title: "7. Mark Leaders & Generate Reports",
      description: "Record daily reading check-offs for Team Leaders and Assistants. Use the Date Stepper to backfill past records anytime, record daily devotional scriptures, and compile official formatted WhatsApp broadcasts.",
      preferredPlacement: "bottom"
    },
    {
      id: "step-roster",
      tab: "roster",
      selector: '[data-tour="admin-roster-controls"]',
      badge: "Step 8 of 10 • Membership Management",
      title: "8. Member Roster & Excel Name Sync",
      description: "Search across all teams, adjust member participation statuses (Active, Left, Declined, Evicted), manually add new members, and use 'Sync Full Names from Excel' to automatically update participant names in Google Sheets.",
      preferredPlacement: "bottom"
    },
    {
      id: "step-settings",
      tab: "settings",
      selector: '[data-tour="admin-settings-controls"]',
      badge: "Step 9 of 10 • System Configuration",
      title: "9. Shift Windows, PINs & WhatsApp Messages",
      description: "Configure strict morning and evening shift hours to enforce disciplined reporting. Look up or reset team PINs, and copy customized WhatsApp onboarding scripts with direct wa.me member links.",
      preferredPlacement: "bottom"
    },
    {
      id: "step-logs",
      tab: "logs",
      selector: '[data-tour="admin-logs-controls"]',
      badge: "Step 10 of 10 • Security & Audit",
      title: "10. Activity History & Team Last-Seen Tracker",
      description: "Audit chronological system activity across all leader and admin logins with device detection. Switch to 'Team Last Seen' to spot inactive teams needing follow-up, or inspect full activity logs with date and role filters.",
      preferredPlacement: "bottom"
    }
  ];

  const currentStep = tourSteps[currentStepIndex];
  const onEnsureTabReadyRef = useRef(onEnsureTabReady);

  useEffect(() => {
    onEnsureTabReadyRef.current = onEnsureTabReady;
  });

  const clearTimers = () => {
    timersRef.current.forEach(t => clearTimeout(t));
    timersRef.current = [];
  };

  // Synchronize dashboard tab ONLY when the tour step changes
  useEffect(() => {
    if (!isOpen || !currentStep) return;
    if (currentStep.tab && activeTab !== currentStep.tab) {
      setActiveTab(currentStep.tab);
      if (onEnsureTabReadyRef.current) {
        try {
          onEnsureTabReadyRef.current(currentStep.tab);
        } catch (e) {
          console.error("Tour error triggering tab ready:", e);
        }
      }
    }
  }, [isOpen, currentStepIndex]);

  // Update target rect & calculate tooltip position
  const updatePosition = useCallback(() => {
    if (!isOpen || !currentStep) return;

    let element = document.querySelector(currentStep.selector);

    if (!element) {
      setTargetRect(null);
      const tooltipWidth = Math.min(380, window.innerWidth - 32);
      const actualHeight = tooltipRef.current?.offsetHeight || 280;
      setTooltipPos({
        top: Math.max(20, (window.innerHeight - actualHeight) / 2),
        left: Math.max(16, (window.innerWidth - tooltipWidth) / 2),
        arrowPlacement: 'none'
      });
      return;
    }

    const blockAlignment = currentStep.preferredPlacement === 'top' ? 'end' : 'start';
    element.scrollIntoView({ behavior: 'smooth', block: blockAlignment, inline: 'nearest' });

    const measureAndPosition = () => {
      const el = document.querySelector(currentStep.selector) || element;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        bottom: rect.bottom,
        right: rect.right
      });

      const cardEl = tooltipRef.current;
      const actualHeight = cardEl && cardEl.offsetHeight > 0 ? cardEl.offsetHeight : 310;
      const tooltipWidth = Math.min(380, window.innerWidth - 32);
      const gap = 20;
      const padding = 14;

      let placement = currentStep.preferredPlacement || 'bottom';

      const roomBelow = window.innerHeight - rect.bottom;
      const roomAbove = rect.top;

      if (placement === 'top') {
        if (roomAbove < actualHeight + gap && roomBelow > roomAbove) {
          placement = 'bottom';
        }
      } else if (placement === 'bottom') {
        if (roomBelow < actualHeight + gap && roomAbove > roomBelow) {
          placement = 'top';
        }
      }

      let top = 0;
      if (placement === 'bottom') {
        top = rect.bottom + gap;
      } else {
        top = rect.top - actualHeight - gap;
      }

      // Clamp top within visible viewport
      top = Math.max(padding, Math.min(window.innerHeight - actualHeight - padding, top));

      // Align horizontally with target center, clamped to screen margins
      const targetCenterX = rect.left + rect.width / 2;
      let left = targetCenterX - tooltipWidth / 2;
      left = Math.max(padding, Math.min(window.innerWidth - tooltipWidth - padding, left));

      setTooltipPos(prev => {
        if (prev.top === top && prev.left === left && prev.arrowPlacement === placement) {
          return prev;
        }
        return { top, left, arrowPlacement: placement };
      });
    };

    measureAndPosition();
    clearTimers();
    const t1 = setTimeout(measureAndPosition, 80);
    const t2 = setTimeout(measureAndPosition, 250);
    timersRef.current.push(t1, t2);
  }, [isOpen, currentStep]);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
    }
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      clearTimers();
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
        {targetRect && tooltipPos.arrowPlacement !== 'none' && (
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
              <span>Open Super Admin Handbook & Guidelines</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
