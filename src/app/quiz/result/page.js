"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Award, ChevronLeft, Check, X, BookOpen, Trophy, Download, Share2, ArrowLeft, ShieldCheck, Sparkles } from "lucide-react";

export default function QuizResultPage() {
  const router = useRouter();
  const [result, setResult] = useState(null);
  const [isGeneratingImg, setIsGeneratingImg] = useState(false);

  useEffect(() => {
    try {
      const data = sessionStorage.getItem("quiz_result_data");
      if (data) {
        setResult(JSON.parse(data));
      } else {
        router.push("/quiz");
      }
    } catch (e) {
      console.error(e);
      router.push("/quiz");
    }
  }, [router]);

  if (!result) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--background)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-sans)'
      }}>
        <div className="spinner"></div>
      </div>
    );
  }

  const { score = 0, totalQuestions = 10, evaluatedAnswers = [], participant } = result;
  const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
  const isHighPass = percentage >= 70;

  // Resolve candidate details with comprehensive fallbacks
  let candidateName = participant?.fullName || result.fullName;
  if (!candidateName || candidateName.trim().toLowerCase() === "candidate" || candidateName.trim() === "") {
    if (typeof window !== "undefined") {
      const currentPart = sessionStorage.getItem("quiz_current_participant");
      if (currentPart) {
        try {
          const parsed = JSON.parse(currentPart);
          if (parsed.fullName) candidateName = parsed.fullName;
        } catch (err) {}
      }
      if (!candidateName) {
        candidateName = localStorage.getItem("quiz_saved_participant_name") || "ECCF Member";
      }
    }
  }

  let rawTeam = participant?.team || result.team;
  if (!rawTeam || rawTeam.trim().toLowerCase() === "unassigned" || rawTeam.trim() === "") {
    if (typeof window !== "undefined") {
      rawTeam = localStorage.getItem("quiz_saved_participant_team") || "Divine";
    }
  }
  const teamDisplay = rawTeam && rawTeam.toLowerCase().startsWith("team ") ? rawTeam : (rawTeam && rawTeam.toLowerCase() === "unassigned" ? "Team Unassigned" : `Team ${rawTeam || 'Divine'}`);

  // Helper: map full schedule title to concise edition tag from Canva sample
  const getEditionTag = (rawEdition) => {
    if (!rawEdition) return "JUN – AUG NT EDITION";
    const lower = rawEdition.toLowerCase();
    if (lower.includes("new testament") || lower.includes("nt")) {
      return "JUN – AUG NT EDITION";
    }
    if (lower.includes("entire bible") || lower.includes("whole bible")) {
      return "ENTIRE BIBLE EDITION";
    }
    return rawEdition.toUpperCase();
  };

  const getCleanTeam = (teamStr) => {
    if (!teamStr) return "Team Divine";
    let clean = teamStr.trim().replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
    if (!clean.toLowerCase().startsWith("team ")) {
      clean = `Team ${clean}`;
    }
    return clean;
  };

  const editionDisplay = participant?.edition || result.edition || "New Testament (3 chapters daily)";
  const roundDisplay = participant?.round || result.round || "Round 7";
  const editionTag = getEditionTag(editionDisplay);
  const cleanTeam = getCleanTeam(teamDisplay);
  const nameUpper = (candidateName || "PARTICIPANT").toUpperCase();
  const roundUpper = (roundDisplay || "ROUND 7").toUpperCase();

  // Performance Rating Title
  const perfTitle = percentage === 100 
    ? "PERFECT SCORE" 
    : percentage >= 90 
    ? "EXCEPTIONAL EXCELLENCE" 
    : percentage >= 70 
    ? "COMMENDED HIGH PASS" 
    : percentage >= 50 
    ? "SUCCESSFUL COMPLETION" 
    : "SINCERE EFFORT";

  // Dynamic font sizing for SVG rendering to guarantee 100% fit inside rectangles
  const nameLen = Math.max(nameUpper.length, 1);
  const nameFontSize = Math.min(96, Math.max(28, Math.floor(800 / (nameLen * 0.58))));

  const teamLen = Math.max(cleanTeam.length, 1);
  const teamFontSize = Math.min(52, Math.max(22, Math.floor(480 / (teamLen * 0.62))));

  const roundLen = Math.max(roundUpper.length, 1);
  const roundFontSize = Math.min(38, Math.max(18, Math.floor(200 / (roundLen * 0.65))));

  const editionLen = Math.max(editionTag.length, 1);
  const editionFontSize = Math.min(48, Math.max(22, Math.floor(560 / (editionLen * 0.65))));

  const perfLen = Math.max(perfTitle.length, 1);
  const perfFontSize = Math.min(76, Math.max(30, Math.floor(820 / (perfLen * 0.68))));

  const handleDownloadScoreCard = async () => {
    setIsGeneratingImg(true);
    try {
      const canvas = document.createElement("canvas");
      // Ultra-HD 2160x2160 to match exact Canva template resolution
      canvas.width = 2160;
      canvas.height = 2160;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // 1. Load Canva Clean Template Image
      const templateImg = new window.Image();
      templateImg.crossOrigin = "anonymous";
      templateImg.src = "/score-card-template.png";
      await new Promise((resolve, reject) => {
        templateImg.onload = resolve;
        templateImg.onerror = () => reject(new Error("Failed to load scorecard template"));
      });

      // Draw background template
      ctx.drawImage(templateImg, 0, 0, 2160, 2160);

      // --- 1. Top Right Edition Text (Right-aligned at x: 2030, y: 135, max width: 560px) ---
      ctx.save();
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#000000";
      let cEditionSize = 48;
      ctx.font = `800 ${cEditionSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
      while (ctx.measureText(editionTag).width > 560 && cEditionSize > 20) {
        cEditionSize -= 2;
        ctx.font = `800 ${cEditionSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
      }
      ctx.letterSpacing = "0.5px";
      ctx.fillText(editionTag, 2030, 135);
      ctx.restore();

      // --- 2. Round Tag in Dark Navy Pill (Center at x: 1418, y: 526, max width: 200px) ---
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#FFFFFF";
      let cRoundSize = 38;
      ctx.font = `800 ${cRoundSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
      while (ctx.measureText(roundUpper).width > 200 && cRoundSize > 18) {
        cRoundSize -= 1;
        ctx.font = `800 ${cRoundSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
      }
      ctx.letterSpacing = "1px";
      ctx.fillText(roundUpper, 1418, 508);
      ctx.restore();

      // --- 3. Team Name (Centered between golden lines at x: 1080, y: 658, max width: 460px) ---
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#192852";
      let cTeamSize = 52;
      ctx.font = `800 ${cTeamSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
      while (ctx.measureText(cleanTeam).width > 460 && cTeamSize > 20) {
        cTeamSize -= 2;
        ctx.font = `800 ${cTeamSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
      }
      ctx.fillText(cleanTeam, 1080, 658);
      ctx.restore();

      // --- 4. Participant's Full Name (Inside Purple Box at x: 1080, y: 814, max width: 820px) ---
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#FFFFFF";
      ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 4;
      ctx.shadowOffsetY = 4;
      let cNameSize = 96;
      ctx.font = `800 ${cNameSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
      while (ctx.measureText(nameUpper).width > 820 && cNameSize > 24) {
        cNameSize -= 2;
        ctx.font = `800 ${cNameSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
      }
      ctx.fillText(nameUpper, 1080, 814);
      ctx.restore();

      // --- 5. Big Score Digits in Purple Circle ---
      // Circle visual center is at (1080, 1300). We use textBaseline="middle" and
      // measureText metrics to get the TRUE visual height of each glyph so the
      // combined score+denominator group is pixel-perfectly centered regardless of
      // whether the score is a single digit (5) or double digit (12).
      ctx.save();
      ctx.fillStyle = "#FFFFFF";
      ctx.shadowColor = "rgba(0, 0, 0, 0.65)";
      ctx.shadowBlur = 14;
      ctx.shadowOffsetX = 6;
      ctx.shadowOffsetY = 6;
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";

      const CIRCLE_CX = 1080; // horizontal center of purple circle
      const CIRCLE_CY = 1300; // vertical center of purple circle

      const scoreStr = String(score);
      const denomStr = `/${totalQuestions}`;

      // Measure score width
      ctx.font = "900 290px 'Arial Black', Impact, -apple-system, BlinkMacSystemFont, sans-serif";
      const scoreMetrics = ctx.measureText(scoreStr);
      const scoreWidth = scoreMetrics.width;
      // True visual half-height of the score glyph
      const scoreHalfH = (scoreMetrics.actualBoundingBoxAscent + scoreMetrics.actualBoundingBoxDescent) / 2;

      // Measure denom width
      ctx.font = "900 110px 'Arial Black', Impact, -apple-system, BlinkMacSystemFont, sans-serif";
      const denomMetrics = ctx.measureText(denomStr);
      const denomWidth = denomMetrics.width;
      // True visual half-height of the denom glyph
      const denomHalfH = (denomMetrics.actualBoundingBoxAscent + denomMetrics.actualBoundingBoxDescent) / 2;

      // Gap between score and denom
      const GAP = 10;
      const totalGroupWidth = scoreWidth + GAP + denomWidth;

      // Left edge so the whole group is horizontally centered on CIRCLE_CX
      const startX = CIRCLE_CX - totalGroupWidth / 2;

      // Draw score — its vertical midpoint sits at CIRCLE_CY
      ctx.font = "900 290px 'Arial Black', Impact, -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillText(scoreStr, startX, CIRCLE_CY);

      // Draw denom — align its baseline to the score's baseline for a natural look.
      // Score baseline = CIRCLE_CY + scoreHalfH (since textBaseline=middle).
      // Denom middle = baseline - denomHalfH.
      const denomMidY = CIRCLE_CY + scoreHalfH - denomHalfH;
      ctx.font = "900 110px 'Arial Black', Impact, -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillText(denomStr, startX + scoreWidth + GAP, denomMidY);

      ctx.restore();

      // --- 6. Performance Rating below circle (Centered at x: 1080, y: 1754, max width: 820px) ---
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#192852";
      let cPerfSize = 76;
      ctx.font = `900 ${cPerfSize}px 'Arial Black', Impact, -apple-system, BlinkMacSystemFont, sans-serif`;
      while (ctx.measureText(perfTitle).width > 820 && cPerfSize > 26) {
        cPerfSize -= 2;
        ctx.font = `900 ${cPerfSize}px 'Arial Black', Impact, -apple-system, BlinkMacSystemFont, sans-serif`;
      }
      ctx.letterSpacing = "2px";
      ctx.fillText(perfTitle, 1080, 1754);
      ctx.restore();

      // Trigger Instant Download
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `ECCF_Scorecard_${candidateName.replace(/\s+/g, '_')}_${roundDisplay}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Scorecard generation error:", err);
      alert("Failed to generate scorecard image. Please take a screenshot of this page.");
    } finally {
      setIsGeneratingImg(false);
    }
  };

  const handleShareToWhatsApp = () => {
    const text = `🏆 *ECCF Bible Reading Challenge*\n📖 *${roundDisplay}* • *${cleanTeam}*\n👤 *Participant:* ${candidateName}\n🎯 *Score:* ${score} / ${totalQuestions} (${percentage}%)\n\n_I just completed the Bible Reading Quiz in Christian integrity!_ ✝️✨`;
    const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(shareUrl, "_blank");
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--background)',
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-sans)',
      padding: '2rem 1rem 6rem 1rem'
    }}>
      <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* TRUE RESPONSIVE 1:1 CANVA SCORECARD CONTAINER */}
        <div style={{
          width: '100%',
          maxWidth: '560px',
          margin: '0 auto',
          position: 'relative',
          borderRadius: '1.5rem',
          overflow: 'hidden',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.45)',
          backgroundColor: '#FFFFFF'
        }}>
          
          {/* Square aspect ratio wrapper */}
          <div style={{ position: 'relative', width: '100%', paddingBottom: '100%' }}>
            
            {/* Background Canva Template Image */}
            <img 
              src="/score-card-template.png" 
              alt="ECCF Bible Quiz Scorecard"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                display: 'block'
              }}
            />

            {/* Precision Scalable Vector Overlay (2160x2160 Coordinates) */}
            <svg 
              viewBox="0 0 2160 2160" 
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none'
              }}
            >
              <defs>
                <filter id="nameTextShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="5" dy="5" stdDeviation="4" floodColor="rgba(0, 0, 0, 0.45)" />
                </filter>
                <filter id="scoreTextShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="6" dy="6" stdDeviation="6" floodColor="rgba(0, 0, 0, 0.65)" />
                </filter>
              </defs>

              {/* 1. Top Right Edition (Safe Max Width 560px) */}
              <text 
                x="2030" 
                y="135" 
                textAnchor="end" 
                dominantBaseline="central" 
                fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
                fontSize={editionFontSize} 
                fontWeight="800" 
                letterSpacing="0.5px" 
                fill="#000000"
                textLength={editionLen > 24 ? "560" : undefined}
                lengthAdjust={editionLen > 24 ? "spacingAndGlyphs" : undefined}
              >
                {editionTag}
              </text>

              {/* 2. Round Tag in Navy Pill (Safe Max Width 200px) */}
              <text 
                x="1418" 
                y="508" 
                textAnchor="middle" 
                dominantBaseline="middle" 
                fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
                fontSize={roundFontSize} 
                fontWeight="800" 
                letterSpacing="1px" 
                fill="#FFFFFF"
                textLength={roundLen > 10 ? "200" : undefined}
                lengthAdjust={roundLen > 10 ? "spacingAndGlyphs" : undefined}
              >
                {roundUpper}
              </text>

              {/* 3. Team Name (Safe Max Width 460px between Golden Lines) */}
              <text 
                x="1080" 
                y="658" 
                textAnchor="middle" 
                dominantBaseline="central" 
                fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
                fontSize={teamFontSize} 
                fontWeight="800" 
                fill="#192852"
                textLength={teamLen > 14 ? "460" : undefined}
                lengthAdjust={teamLen > 14 ? "spacingAndGlyphs" : undefined}
              >
                {cleanTeam}
              </text>

              {/* 4. Participant Full Name (Safe Max Width 820px inside Purple Box) */}
              <text 
                x="1080" 
                y="814" 
                textAnchor="middle" 
                dominantBaseline="central" 
                fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
                fontSize={nameFontSize} 
                fontWeight="800" 
                letterSpacing="1.5px" 
                fill="#FFFFFF" 
                filter="url(#nameTextShadow)"
                textLength={nameLen > 18 ? "820" : undefined}
                lengthAdjust={nameLen > 18 ? "spacingAndGlyphs" : undefined}
              >
                {nameUpper}
              </text>

              {/* 5. Big Score Digits inside Purple Circle — pixel-perfect centered for any score */}
              {/* Single text with textAnchor=middle + dominantBaseline=central so SVG auto-centers
                  the full "score/total" unit around the circle's exact center (1080, 1300). */}
              <text
                x="1080"
                y="1300"
                textAnchor="middle"
                dominantBaseline="central"
                fontFamily="'Arial Black', Impact, -apple-system, BlinkMacSystemFont, sans-serif"
                fontWeight="900"
                fill="#FFFFFF"
                filter="url(#scoreTextShadow)"
              >
                <tspan fontSize="290" dy="0">{score}</tspan><tspan fontSize="110" dy="0" baselineShift="-80">/{totalQuestions}</tspan>
              </text>

              {/* 6. Performance Rating (Safe Max Width 820px) */}
              <text 
                x="1080" 
                y="1754" 
                textAnchor="middle" 
                dominantBaseline="central" 
                fontFamily="'Arial Black', Impact, -apple-system, BlinkMacSystemFont, sans-serif" 
                fontSize={perfFontSize} 
                fontWeight="900" 
                letterSpacing="2px" 
                fill="#192852"
                textLength={perfLen > 22 ? "820" : undefined}
                lengthAdjust={perfLen > 22 ? "spacingAndGlyphs" : undefined}
              >
                {perfTitle}
              </text>
            </svg>
          </div>
        </div>

        {/* Verification Pill + Action Buttons */}
        <div style={{
          backgroundColor: 'var(--surface)',
          borderRadius: '1rem',
          border: '1px solid var(--border)',
          padding: '1.25rem',
          textAlign: 'center',
          maxWidth: '560px',
          margin: '0 auto',
          width: '100%'
        }}>
          <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              color: '#10B981',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              padding: '0.45rem 0.9rem',
              borderRadius: '9999px',
              fontSize: '0.85rem',
              fontWeight: '700'
            }}>
              <Check size={16} /> Submission Verified & Recorded Live
            </div>
          </div>

          <div className="quiz-share-buttons" style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap'
          }}>
            <button
              type="button"
              disabled={isGeneratingImg}
              onClick={handleDownloadScoreCard}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.85rem 1.35rem',
                background: 'linear-gradient(135deg, #8C52FF 0%, #7C3AED 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '0.75rem',
                fontSize: '0.92rem',
                fontWeight: '800',
                cursor: isGeneratingImg ? 'not-allowed' : 'pointer',
                boxShadow: '0 6px 20px rgba(140, 82, 255, 0.35)',
                transition: 'all 0.2s ease',
                flex: '1 1 220px'
              }}
              onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <Download size={18} />
              <span>{isGeneratingImg ? "Generating Ultra-HD PNG..." : "Download Official Scorecard (PNG)"}</span>
            </button>

            <button
              type="button"
              onClick={handleShareToWhatsApp}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.85rem 1.25rem',
                backgroundColor: 'rgba(37, 99, 235, 0.12)',
                color: '#2563EB',
                border: '1px solid rgba(37, 99, 235, 0.3)',
                borderRadius: '0.75rem',
                fontSize: '0.92rem',
                fontWeight: '800',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                flex: '1 1 180px'
              }}
              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(37, 99, 235, 0.2)'; }}
              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'rgba(37, 99, 235, 0.12)'; }}
            >
              <Share2 size={18} />
              <span>Share to Team Chat</span>
            </button>
          </div>
        </div>


        {/* Answers Review */}
        <div style={{
          backgroundColor: 'var(--surface)',
          borderRadius: '1.25rem',
          border: '1px solid var(--border)',
          boxShadow: '0 15px 40px rgba(0, 0, 0, 0.25)',
          padding: '2rem 1.5rem'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            borderBottom: '1px solid var(--border-light)',
            paddingBottom: '1rem',
            marginBottom: '1.5rem'
          }}>
            <BookOpen size={22} style={{ color: 'var(--accent)' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0 }}>Review Your Answers</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {evaluatedAnswers && evaluatedAnswers.map((ans, idx) => (
              <div 
                key={ans.questionId || idx}
                style={{
                  backgroundColor: 'var(--surface-secondary)',
                  borderRadius: '0.85rem',
                  padding: '1.25rem',
                  border: '1px solid var(--border-light)'
                }}
              >
                <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1rem', alignItems: 'flex-start' }}>
                  <span style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    flexShrink: 0,
                    marginTop: '2px'
                  }}>
                    {idx + 1}
                  </span>
                  <h3 style={{ fontSize: '1rem', fontWeight: '600', margin: 0, color: 'var(--text-primary)', lineHeight: '1.45' }}>
                    {ans.questionText || ans.question}
                  </h3>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
                  
                  {/* Participant's Answer */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.85rem 1rem',
                    borderRadius: '0.6rem',
                    backgroundColor: ans.isCorrect ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                    border: `1px solid ${ans.isCorrect ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`
                  }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: ans.isCorrect ? '#10B981' : '#EF4444',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {ans.isCorrect ? <Check size={14} /> : <X size={14} />}
                    </div>
                    <div>
                      <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)', display: 'block' }}>Your Choice</span>
                      <span style={{ fontSize: '0.92rem', fontWeight: '600', color: ans.isCorrect ? '#34D399' : '#FCA5A5' }}>
                        {ans.userAnswer || ans.selectedAnswer || "(No Answer)"}
                      </span>
                    </div>
                  </div>

                  {/* Correct Answer if incorrect */}
                  {!ans.isCorrect && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.85rem 1rem',
                      borderRadius: '0.6rem',
                      backgroundColor: 'rgba(16, 185, 129, 0.08)',
                      border: '1px solid rgba(16, 185, 129, 0.25)'
                    }}>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(16, 185, 129, 0.2)',
                        color: '#10B981',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <Check size={14} />
                      </div>
                      <div>
                        <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)', display: 'block' }}>Correct Answer</span>
                        <span style={{ fontSize: '0.92rem', fontWeight: '600', color: '#34D399' }}>
                          {ans.correctAnswer}
                        </span>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
