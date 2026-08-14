"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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

  const { score, totalQuestions, evaluatedAnswers, participant } = result;
  const percentage = Math.round((score / totalQuestions) * 100);
  const isHighPass = percentage >= 70;

  const candidateName = participant?.fullName || result.fullName || "Candidate";
  const rawTeam = participant?.team || result.team || "Divine";
  const teamDisplay = rawTeam.toLowerCase().startsWith("team ") ? rawTeam : (rawTeam.toLowerCase() === "unassigned" ? "Team Unassigned" : `Team ${rawTeam}`);
  const roundDisplay = participant?.round || result.round || "Round 7";

  const handleDownloadScoreCard = () => {
    setIsGeneratingImg(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1080;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // 1. Background Gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1080);
      bgGrad.addColorStop(0, "#0F172A");
      bgGrad.addColorStop(0.5, "#172554");
      bgGrad.addColorStop(1, "#090D16");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1080, 1080);

      // Decorative Glows
      const glow1 = ctx.createRadialGradient(200, 150, 20, 200, 150, 450);
      glow1.addColorStop(0, "rgba(59, 130, 246, 0.25)");
      glow1.addColorStop(1, "transparent");
      ctx.fillStyle = glow1;
      ctx.fillRect(0, 0, 1080, 1080);

      const glow2 = ctx.createRadialGradient(880, 900, 20, 880, 900, 450);
      glow2.addColorStop(0, isHighPass ? "rgba(16, 185, 129, 0.25)" : "rgba(245, 158, 11, 0.25)");
      glow2.addColorStop(1, "transparent");
      ctx.fillStyle = glow2;
      ctx.fillRect(0, 0, 1080, 1080);

      // 2. Outer Card Frame
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(50, 50, 980, 980, 36);
      ctx.stroke();

      // Inner Card Surface
      ctx.fillStyle = "rgba(17, 24, 39, 0.85)";
      ctx.beginPath();
      ctx.roundRect(70, 70, 940, 940, 30);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // 3. Header Branding
      ctx.textAlign = "center";
      ctx.fillStyle = "#F59E0B";
      ctx.font = "bold 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillText("ECCF BIBLE READING CHALLENGE", 540, 140);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "800 42px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillText("Official Assessment Scorecard", 540, 195);

      // 4. Pill Badges
      // Round Pill
      ctx.fillStyle = "rgba(59, 130, 246, 0.2)";
      ctx.beginPath();
      ctx.roundRect(280, 230, 220, 44, 22);
      ctx.fill();
      ctx.strokeStyle = "#3B82F6";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = "#93C5FD";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText(roundDisplay, 390, 260);

      // Team Pill
      ctx.fillStyle = "rgba(16, 185, 129, 0.2)";
      ctx.beginPath();
      ctx.roundRect(520, 230, 280, 44, 22);
      ctx.fill();
      ctx.strokeStyle = "#10B981";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = "#6EE7B7";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText(teamDisplay, 660, 260);

      // 5. Candidate Name Card
      ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
      ctx.beginPath();
      ctx.roundRect(140, 310, 800, 100, 20);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.stroke();

      ctx.fillStyle = "#9CA3AF";
      ctx.font = "bold 16px sans-serif";
      ctx.fillText("PARTICIPANT", 540, 345);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 34px sans-serif";
      ctx.fillText(candidateName, 540, 388);

      // 6. Central Score Ring Display
      ctx.fillStyle = isHighPass ? "rgba(16, 185, 129, 0.15)" : "rgba(37, 99, 235, 0.15)";
      ctx.beginPath();
      ctx.arc(540, 570, 130, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = isHighPass ? "#10B981" : "#3B82F6";
      ctx.lineWidth = 6;
      ctx.stroke();

      // Score Text
      ctx.fillStyle = isHighPass ? "#34D399" : "#60A5FA";
      ctx.font = "900 96px sans-serif";
      ctx.fillText(`${score}`, 505, 595);

      ctx.fillStyle = "#9CA3AF";
      ctx.font = "bold 44px sans-serif";
      ctx.fillText(`/${totalQuestions}`, 605, 590);

      ctx.fillStyle = isHighPass ? "#6EE7B7" : "#93C5FD";
      ctx.font = "800 28px sans-serif";
      ctx.fillText(`${percentage}% OVERALL ACCURACY`, 540, 740);

      // 7. Integrity Badge
      ctx.fillStyle = "rgba(245, 158, 11, 0.15)";
      ctx.beginPath();
      ctx.roundRect(240, 780, 600, 50, 25);
      ctx.fill();
      ctx.strokeStyle = "rgba(245, 158, 11, 0.4)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = "#FCD34D";
      ctx.font = "bold 19px sans-serif";
      ctx.fillText("🛡️ Christian Integrity Certified Assessment", 540, 812);

      // 8. Footer Scripture & Date
      const nowStr = new Date().toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      ctx.fillStyle = "#6B7280";
      ctx.font = "italic 18px sans-serif";
      ctx.fillText('"The Word of God is living and active." — Hebrews 4:12', 540, 890);

      ctx.fillStyle = "#9CA3AF";
      ctx.font = "600 16px sans-serif";
      ctx.fillText(`Completed on ${nowStr} • ECCF Reading Tracker`, 540, 930);

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
          {/* Trophy Badge */}
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: isHighPass ? 'rgba(16, 185, 129, 0.15)' : 'var(--accent-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem auto',
            border: `1.5px solid ${isHighPass ? 'var(--success)' : 'var(--accent)'}`
          }}>
            <Trophy size={42} color={isHighPass ? "#10B981" : "#3B82F6"} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              color: '#93C5FD',
              padding: '0.2rem 0.6rem',
              borderRadius: '9999px',
              fontSize: '0.78rem',
              fontWeight: '700'
            }}>
              {roundDisplay}
            </span>
            <span style={{
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              color: '#6EE7B7',
              padding: '0.2rem 0.6rem',
              borderRadius: '9999px',
              fontSize: '0.78rem',
              fontWeight: '700'
            }}>
              {teamDisplay}
            </span>
          </div>

          <h1 style={{ fontSize: '1.85rem', fontWeight: '800', margin: '0 0 0.4rem 0' }}>
            Quiz Completed!
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.95rem' }}>
            Candidate: <strong style={{ color: 'var(--text-primary)' }}>{candidateName}</strong>
          </p>

          {/* Big Score Display */}
          <div style={{ margin: '2rem 0' }}>
            <div style={{
              fontSize: '4rem',
              fontWeight: '900',
              lineHeight: '1',
              color: isHighPass ? '#34D399' : 'var(--accent-hover)',
              letterSpacing: '-1px'
            }}>
              {score} <span style={{ fontSize: '1.75rem', fontWeight: '500', color: 'var(--text-secondary)' }}>/ {totalQuestions}</span>
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
          <div style={{
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
                transition: 'all 0.2s ease'
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
                gap: '0.5rem',
                padding: '0.85rem 1.35rem',
                backgroundColor: 'rgba(37, 99, 235, 0.15)',
                color: 'var(--accent-hover)',
                border: '1px solid rgba(37, 99, 235, 0.3)',
                borderRadius: '0.65rem',
                fontSize: '0.95rem',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
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
