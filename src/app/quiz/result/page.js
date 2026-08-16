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
  const editionDisplay = participant?.edition || result.edition || "New Testament (3 chapters daily)";
  const roundDisplay = participant?.round || result.round || "Round 7";

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

      // --- 1. Top Right Edition Text ---
      const editionText = (editionDisplay || "JUN – AUG NT EDITION").toUpperCase();
      ctx.save();
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#000000";
      ctx.font = "800 46px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif";
      ctx.letterSpacing = "0.5px";
      ctx.fillText(editionText, 2030, 152);
      ctx.restore();

      // --- 2. Round Tag in Dark Navy Pill (Center at x: 1418, y: 546) ---
      const roundText = (roundDisplay || "ROUND 7").toUpperCase();
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "800 42px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.letterSpacing = "1px";
      ctx.fillText(roundText, 1418, 552);
      ctx.restore();

      // --- 3. Team Name (Centered between golden lines at x: 1080, y: 662) ---
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#192852";
      ctx.font = "800 58px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillText(teamDisplay, 1080, 665);
      ctx.restore();

      // --- 4. Participant's Full Name (Inside Purple Box at x: 1080, y: 835) ---
      const nameUpper = (candidateName || "PARTICIPANT").toUpperCase();
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#FFFFFF";
      ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 4;
      ctx.shadowOffsetY = 4;

      let nameFontSize = 96;
      ctx.font = `800 ${nameFontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif`;
      let nameWidth = ctx.measureText(nameUpper).width;
      const maxBoxWidth = 840; // Max allowed width inside purple box
      if (nameWidth > maxBoxWidth) {
        nameFontSize = Math.floor(nameFontSize * (maxBoxWidth / nameWidth));
        ctx.font = `800 ${nameFontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif`;
      }
      ctx.fillText(nameUpper, 1080, 840);
      ctx.restore();

      // --- 5. Big Score Digits in Purple Circle (Centered around x: 1080, y: 1320) ---
      ctx.save();
      ctx.fillStyle = "#FFFFFF";
      ctx.shadowColor = "rgba(0, 0, 0, 0.65)";
      ctx.shadowBlur = 16;
      ctx.shadowOffsetX = 6;
      ctx.shadowOffsetY = 6;

      const scoreStr = String(score);
      const denomStr = `/${totalQuestions}`;

      // Measure font widths
      ctx.font = "900 340px 'Arial Black', Impact, -apple-system, BlinkMacSystemFont, sans-serif";
      const scoreWidth = ctx.measureText(scoreStr).width;

      ctx.font = "900 160px 'Arial Black', Impact, -apple-system, BlinkMacSystemFont, sans-serif";
      const denomWidth = ctx.measureText(denomStr).width;

      const totalScoreGroupWidth = scoreWidth + denomWidth + 24;
      const startX = 1080 - (totalScoreGroupWidth / 2);

      // Draw score number
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.font = "900 340px 'Arial Black', Impact, -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillText(scoreStr, startX, 1420);

      // Draw denominator
      ctx.font = "900 160px 'Arial Black', Impact, -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillText(denomStr, startX + scoreWidth + 24, 1385);
      ctx.restore();

      // --- 6. Performance Rating below circle (Centered at x: 1080, y: 1765) ---
      let perfTitle = "SINCERE EFFORT";
      if (percentage === 100) perfTitle = "PERFECT SCORE";
      else if (percentage >= 90) perfTitle = "EXCEPTIONAL EXCELLENCE";
      else if (percentage >= 70) perfTitle = "COMMENDED HIGH PASS";
      else if (percentage >= 50) perfTitle = "SUCCESSFUL COMPLETION";

      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#192852";
      ctx.font = "900 80px 'Arial Black', Impact, -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.letterSpacing = "2px";
      ctx.fillText(perfTitle, 1080, 1765);
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
    const text = `🏆 *ECCF Bible Reading Challenge*\n📖 *${roundDisplay}* • *${teamDisplay}*\n👤 *Participant:* ${candidateName}\n🎯 *Score:* ${score} / ${totalQuestions} (${percentage}%)\n\n_I just completed the Bible Reading Quiz in Christian integrity!_ ✝️✨`;
    const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(shareUrl, "_blank");
  };

  // Performance Rating Title for on-screen display
  const perfTitle = percentage === 100 
    ? "PERFECT SCORE" 
    : percentage >= 90 
    ? "EXCEPTIONAL EXCELLENCE" 
    : percentage >= 70 
    ? "COMMENDED HIGH PASS" 
    : percentage >= 50 
    ? "SUCCESSFUL COMPLETION" 
    : "SINCERE EFFORT";

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--background)',
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-sans)',
      padding: '2.5rem 1rem 6rem 1rem'
    }}>
      <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* On-Screen Canva Scorecard Card */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '1.5rem',
          border: '1px solid var(--border)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.4)',
          padding: '1.75rem 1.25rem 2rem 1.25rem',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          color: '#192852'
        }}>
          
          {/* Top Bar: Logo Branding (Left) & Edition (Right) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', padding: '0 0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', textAlign: 'left' }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '0.6rem',
                overflow: 'hidden',
                backgroundColor: '#0F172A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                flexShrink: 0
              }}>
                <Image 
                  src="/eccfbrclogo.png" 
                  alt="ECCF Logo" 
                  width={46} 
                  height={46} 
                  style={{ objectFit: 'contain' }}
                  priority
                />
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#000000', lineHeight: 1.15 }}>ECCF BIBLE</span>
                <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#000000', lineHeight: 1.15 }}>READING CLUB</span>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#000000', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {editionDisplay || "JUN – AUG NT EDITION"}
              </span>
            </div>
          </div>

          {/* Section: BIBLE QUIZ SCORE + Navy Round Pill */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
            <h2 style={{
              fontSize: '1.35rem',
              fontWeight: 900,
              color: '#192852',
              margin: 0,
              fontFamily: "'Arial Black', Impact, sans-serif",
              letterSpacing: '0.5px'
            }}>
              BIBLE QUIZ SCORE
            </h2>
            <span style={{
              backgroundColor: '#192852',
              color: '#FFFFFF',
              padding: '0.25rem 0.75rem',
              borderRadius: '0.45rem',
              fontSize: '0.78rem',
              fontWeight: 800,
              letterSpacing: '0.5px',
              textTransform: 'uppercase'
            }}>
              {roundDisplay || "ROUND 7"}
            </span>
          </div>

          {/* Golden Dividers with Team Name */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.85rem', marginBottom: '1.25rem' }}>
            <div style={{ height: '3px', width: '70px', backgroundColor: '#D4AF37', borderRadius: '2px' }}></div>
            <span style={{ fontSize: '0.98rem', fontWeight: 800, color: '#192852' }}>
              {teamDisplay}
            </span>
            <div style={{ height: '3px', width: '70px', backgroundColor: '#D4AF37', borderRadius: '2px' }}></div>
          </div>

          {/* Purple Nameplate Box */}
          <div style={{
            maxWidth: '480px',
            margin: '0 auto 1.5rem auto',
            background: 'linear-gradient(135deg, #8C52FF 0%, #7C3AED 100%)',
            border: '2px solid #FFFFFF',
            borderRadius: '0.85rem',
            padding: '0.75rem 1.5rem',
            boxShadow: '0 8px 25px rgba(140, 82, 255, 0.4)'
          }}>
            <span style={{
              fontSize: '1.45rem',
              fontWeight: 900,
              color: '#FFFFFF',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              textShadow: '0 2px 8px rgba(0,0,0,0.4)',
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {candidateName}
            </span>
          </div>

          {/* Big Purple Score Badge with Confetti / Glow */}
          <div style={{ position: 'relative', width: '190px', height: '190px', margin: '0 auto 1.25rem auto' }}>
            {/* Background Confetti Image if available */}
            <div style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #8C52FF 0%, #6D28D9 100%)',
              border: '3px solid #FFFFFF',
              boxShadow: '0 12px 35px rgba(140, 82, 255, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <div style={{ color: '#FFFFFF', display: 'flex', alignItems: 'baseline', textShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                <span style={{ fontSize: '4.75rem', fontWeight: 900, fontFamily: "'Arial Black', Impact, sans-serif", lineHeight: 1 }}>
                  {score}
                </span>
                <span style={{ fontSize: '2.1rem', fontWeight: 900, fontFamily: "'Arial Black', Impact, sans-serif", opacity: 0.95, marginLeft: '3px' }}>
                  /{totalQuestions}
                </span>
              </div>
            </div>
          </div>

          {/* Performance Title */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: 900,
              color: '#192852',
              margin: '0 0 0.25rem 0',
              fontFamily: "'Arial Black', Impact, sans-serif",
              letterSpacing: '1px'
            }}>
              {perfTitle}
            </h3>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#6B7280' }}>
              Overall Accuracy: {percentage}%
            </span>
          </div>

          {/* Bottom Scripture Quote */}
          <div style={{
            maxWidth: '520px',
            margin: '0 auto 1.5rem auto',
            paddingTop: '1rem',
            borderTop: '1px solid rgba(0, 0, 0, 0.08)'
          }}>
            <p style={{
              fontSize: '0.88rem',
              fontStyle: 'italic',
              fontWeight: 500,
              color: '#1F2937',
              margin: '0 0 0.25rem 0',
              lineHeight: 1.4
            }}>
              “Be diligent to present yourself approved to God, a worker who does not need to be ashamed.”
            </p>
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#192852', fontStyle: 'italic' }}>
              — 2 Timothy 2:15
            </span>
          </div>

          {/* Submission Recorded Pill */}
          <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              color: '#059669',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              padding: '0.5rem 1rem',
              borderRadius: '9999px',
              fontSize: '0.85rem',
              fontWeight: '700'
            }}>
              <Check size={16} /> Submission Verified & Recorded Live
            </div>
          </div>

          {/* Action Buttons: Download Canva High-Res Scorecard + WhatsApp Share */}
          <div className="quiz-share-buttons" style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap',
            paddingTop: '1.25rem',
            borderTop: '1px solid rgba(0,0,0,0.08)'
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
                padding: '0.9rem 1.5rem',
                background: 'linear-gradient(135deg, #8C52FF 0%, #7C3AED 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '0.75rem',
                fontSize: '0.95rem',
                fontWeight: '800',
                cursor: isGeneratingImg ? 'not-allowed' : 'pointer',
                boxShadow: '0 6px 20px rgba(140, 82, 255, 0.35)',
                transition: 'all 0.2s ease',
                flex: '1 1 230px'
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
                padding: '0.9rem 1.35rem',
                backgroundColor: 'rgba(37, 99, 235, 0.12)',
                color: '#2563EB',
                border: '1px solid rgba(37, 99, 235, 0.3)',
                borderRadius: '0.75rem',
                fontSize: '0.95rem',
                fontWeight: '800',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                flex: '1 1 200px'
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
