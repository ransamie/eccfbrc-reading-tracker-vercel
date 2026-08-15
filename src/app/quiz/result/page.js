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
  const roundDisplay = participant?.round || result.round || "Round 7";

  const handleDownloadScoreCard = async () => {
    setIsGeneratingImg(true);
    try {
      const canvas = document.createElement("canvas");
      // High-resolution square for crystal clear mobile and social display
      canvas.width = 1200;
      canvas.height = 1200;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // --- 1. Background Gradient ---
      const bgGrad = ctx.createLinearGradient(0, 0, 1200, 1200);
      bgGrad.addColorStop(0, "#080C16");
      bgGrad.addColorStop(0.4, "#0F172A");
      bgGrad.addColorStop(1, "#090D18");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1200, 1200);

      // Ambient Corner Glows
      const glowTop = ctx.createRadialGradient(600, 100, 20, 600, 100, 500);
      glowTop.addColorStop(0, "rgba(37, 99, 235, 0.18)");
      glowTop.addColorStop(1, "transparent");
      ctx.fillStyle = glowTop;
      ctx.fillRect(0, 0, 1200, 1200);

      const glowBottom = ctx.createRadialGradient(600, 950, 20, 600, 950, 450);
      glowBottom.addColorStop(0, isHighPass ? "rgba(16, 185, 129, 0.18)" : "rgba(245, 158, 11, 0.15)");
      glowBottom.addColorStop(1, "transparent");
      ctx.fillStyle = glowBottom;
      ctx.fillRect(0, 0, 1200, 1200);

      // --- 2. Outer Luxury Card Frame ---
      ctx.strokeStyle = "rgba(245, 158, 11, 0.3)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(40, 40, 1120, 1120, 36);
      ctx.stroke();

      // Inner Card Glass Surface
      ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
      ctx.beginPath();
      ctx.roundRect(55, 55, 1090, 1090, 28);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // --- 3. ECCF Logo ---
      const logoImg = new window.Image();
      logoImg.crossOrigin = "anonymous";
      logoImg.src = "/eccfbrclogo.png";
      await new Promise((resolve) => {
        logoImg.onload = resolve;
        logoImg.onerror = resolve;
      });

      if (logoImg.complete && logoImg.naturalWidth > 0) {
        // Logo Background Circle
        ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
        ctx.beginPath();
        ctx.arc(600, 140, 52, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = "rgba(245, 158, 11, 0.4)";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.save();
        ctx.beginPath();
        ctx.arc(600, 140, 46, 0, 2 * Math.PI);
        ctx.clip();
        ctx.drawImage(logoImg, 600 - 46, 140 - 46, 92, 92);
        ctx.restore();
      }

      // --- 4. Header Branding ---
      ctx.textAlign = "center";
      ctx.fillStyle = "#F59E0B";
      ctx.font = "bold 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.letterSpacing = "3px";
      ctx.fillText("ECCF BIBLE READING CHALLENGE", 600, 225);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "800 36px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.letterSpacing = "0px";
      ctx.fillText("Official Assessment Scorecard", 600, 275);

      // --- 5. Symmetrical Round & Team Badges ---
      // Round Pill
      ctx.fillStyle = "rgba(37, 99, 235, 0.18)";
      ctx.beginPath();
      ctx.roundRect(320, 305, 240, 42, 21);
      ctx.fill();
      ctx.strokeStyle = "rgba(59, 130, 246, 0.5)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = "#93C5FD";
      ctx.font = "bold 18px sans-serif";
      ctx.fillText(`📖 ${roundDisplay}`, 440, 332);

      // Team Pill
      ctx.fillStyle = "rgba(16, 185, 129, 0.18)";
      ctx.beginPath();
      ctx.roundRect(580, 305, 300, 42, 21);
      ctx.fill();
      ctx.strokeStyle = "rgba(16, 185, 129, 0.5)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = "#6EE7B7";
      ctx.font = "bold 18px sans-serif";
      ctx.fillText(`🛡️ ${teamDisplay}`, 730, 332);

      // --- 6. Participant Nameplate Card ---
      ctx.fillStyle = "rgba(30, 41, 59, 0.75)";
      ctx.beginPath();
      ctx.roundRect(160, 375, 880, 105, 20);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = "#94A3B8";
      ctx.font = "bold 14px sans-serif";
      ctx.letterSpacing = "2px";
      ctx.fillText("CERTIFIED PARTICIPANT", 600, 410);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 34px sans-serif";
      ctx.letterSpacing = "0px";
      ctx.fillText(candidateName, 600, 455);

      // --- 7. Precision Gauge Score Ring ---
      const centerX = 600;
      const centerY = 650;
      const radius = 115;

      // Track ring background
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 14;
      ctx.stroke();

      // Active progress arc
      const progressEndAngle = -Math.PI / 2 + (percentage / 100) * 2 * Math.PI;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, -Math.PI / 2, progressEndAngle);
      const ringGrad = ctx.createLinearGradient(centerX - radius, centerY - radius, centerX + radius, centerY + radius);
      if (isHighPass) {
        ringGrad.addColorStop(0, "#10B981");
        ringGrad.addColorStop(1, "#06B6D4");
      } else {
        ringGrad.addColorStop(0, "#3B82F6");
        ringGrad.addColorStop(1, "#8B5CF6");
      }
      ctx.strokeStyle = ringGrad;
      ctx.lineWidth = 14;
      ctx.lineCap = "round";
      ctx.stroke();

      // Score Center Digits
      ctx.fillStyle = isHighPass ? "#34D399" : "#60A5FA";
      ctx.font = "900 84px sans-serif";
      ctx.fillText(`${score}`, 565, 665);

      ctx.fillStyle = "#94A3B8";
      ctx.font = "bold 36px sans-serif";
      ctx.fillText(`/${totalQuestions}`, 665, 660);

      // Percentage label below gauge
      ctx.fillStyle = isHighPass ? "#6EE7B7" : "#93C5FD";
      ctx.font = "800 24px sans-serif";
      ctx.letterSpacing = "1.5px";
      ctx.fillText(`${percentage}% OVERALL ACCURACY`, 600, 810);

      // Performance Badge
      const perfTitle = percentage >= 90 ? "🏆 EXCEPTIONAL EXCELLENCE" : percentage >= 70 ? "✨ COMMENDED HIGH PASS" : percentage >= 50 ? "🌟 SUCCESSFUL COMPLETION" : "📖 SINCERE EFFORT";
      ctx.fillStyle = isHighPass ? "rgba(16, 185, 129, 0.15)" : "rgba(59, 130, 246, 0.15)";
      ctx.beginPath();
      ctx.roundRect(400, 835, 400, 36, 18);
      ctx.fill();
      ctx.strokeStyle = isHighPass ? "rgba(16, 185, 129, 0.4)" : "rgba(59, 130, 246, 0.4)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = isHighPass ? "#34D399" : "#93C5FD";
      ctx.font = "bold 15px sans-serif";
      ctx.fillText(perfTitle, 600, 859);

      // --- 8. Christian Integrity Badge ---
      ctx.fillStyle = "rgba(245, 158, 11, 0.12)";
      ctx.beginPath();
      ctx.roundRect(260, 900, 680, 52, 26);
      ctx.fill();
      ctx.strokeStyle = "rgba(245, 158, 11, 0.35)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = "#FCD34D";
      ctx.font = "bold 18px sans-serif";
      ctx.fillText("🛡️ Christian Integrity Certified Assessment", 600, 933);

      // --- 9. Footer Scripture & Metadata ---
      const nowStr = new Date().toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      ctx.fillStyle = "#64748B";
      ctx.font = "italic 17px sans-serif";
      ctx.fillText('"The Word of God is living and active." — Hebrews 4:12', 600, 1000);

      ctx.fillStyle = "#94A3B8";
      ctx.font = "600 15px sans-serif";
      ctx.fillText(`Official Record Verified on ${nowStr} • ECCF Reading Tracker`, 600, 1040);

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

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--background)',
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-sans)',
      padding: '3rem 1rem 6rem 1rem'
    }}>
      <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Score Summary Card */}
        <div style={{
          backgroundColor: 'var(--surface)',
          borderRadius: '1.25rem',
          border: '1px solid var(--border)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.35)',
          padding: '2.5rem 1.5rem',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          
          {/* ECCF Challenge Logo */}
          <div style={{
            width: '88px',
            height: '88px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: '2px solid rgba(245, 158, 11, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem auto',
            padding: '6px',
            boxShadow: '0 0 25px rgba(245, 158, 11, 0.2)'
          }}>
            <Image 
              src="/eccfbrclogo.png" 
              alt="ECCF Logo" 
              width={76} 
              height={76} 
              style={{ objectFit: 'contain', borderRadius: '50%' }}
              priority
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              color: '#93C5FD',
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '0.82rem',
              fontWeight: '700',
              border: '1px solid rgba(59, 130, 246, 0.3)'
            }}>
              📖 {roundDisplay}
            </span>
            <span style={{
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              color: '#6EE7B7',
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '0.82rem',
              fontWeight: '700',
              border: '1px solid rgba(16, 185, 129, 0.3)'
            }}>
              🛡️ {teamDisplay}
            </span>
          </div>

          <h1 style={{ fontSize: '1.85rem', fontWeight: '800', margin: '0 0 0.4rem 0' }}>
            Quiz Completed!
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '1.05rem' }}>
            Candidate: <strong style={{ color: '#FFFFFF', fontWeight: '800' }}>{candidateName}</strong>
          </p>

          {/* Big Score Display */}
          <div style={{ margin: '2rem 0' }}>
            <div style={{
              fontSize: '4.25rem',
              fontWeight: '900',
              lineHeight: '1',
              color: isHighPass ? '#34D399' : 'var(--accent-hover)',
              letterSpacing: '-1px'
            }}>
              {score} <span style={{ fontSize: '1.85rem', fontWeight: '500', color: 'var(--text-secondary)' }}>/ {totalQuestions}</span>
            </div>
            <div style={{
              fontSize: '0.95rem',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '1.5px',
              color: 'var(--text-secondary)',
              marginTop: '0.5rem'
            }}>
              Final Score ({percentage}%)
            </div>
          </div>

          {/* Submission Recorded Banner */}
          <div style={{ marginBottom: '1.75rem', display: 'flex', justifyContent: 'center' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              color: '#34D399',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              padding: '0.65rem 1.25rem',
              borderRadius: '0.6rem',
              fontSize: '0.92rem',
              fontWeight: '600'
            }}>
              <Check size={18} /> Submission Recorded Successfully
            </div>
          </div>

          {/* DOWNLOAD SCORECARD PNG & SHARE BUTTONS */}
          <div className="quiz-share-buttons" style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap',
            paddingTop: '1.25rem',
            borderTop: '1px solid var(--border-light)'
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
                padding: '0.85rem 1.5rem',
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '0.65rem',
                fontSize: '0.95rem',
                fontWeight: '700',
                cursor: isGeneratingImg ? 'not-allowed' : 'pointer',
                boxShadow: '0 6px 20px rgba(16, 185, 129, 0.35)',
                transition: 'all 0.2s ease',
                flex: '1 1 220px'
              }}
              onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <Download size={18} />
              <span>{isGeneratingImg ? "Generating PNG..." : "Download Score Card (PNG)"}</span>
            </button>

            <button
              type="button"
              onClick={handleShareToWhatsApp}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.85rem 1.35rem',
                backgroundColor: 'rgba(37, 99, 235, 0.15)',
                color: 'var(--accent-hover)',
                border: '1px solid rgba(37, 99, 235, 0.3)',
                borderRadius: '0.65rem',
                fontSize: '0.95rem',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                flex: '1 1 200px'
              }}
              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(37, 99, 235, 0.25)'; }}
              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'rgba(37, 99, 235, 0.15)'; }}
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
