"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Clock, AlertTriangle, ShieldCheck, CheckCircle2, ChevronRight, WifiOff, Users, ArrowLeft, HelpCircle } from "lucide-react";

export default function QuizTakePage() {
  const router = useRouter();
  
  // State
  const [hasStarted, setHasStarted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [deadline, setDeadline] = useState(null);
  const [timeLeftStr, setTimeLeftStr] = useState("--:--");
  const [timeExpired, setTimeExpired] = useState(false);
  
  // Participant Info
  const [participant, setParticipant] = useState({ fullName: "", whatsapp: "", team: "", round: "" });

  const timerRef = useRef(null);

  // 1. Initialization and Offline Support
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOffline(!navigator.onLine);

    // Verify if quiz is live
    fetch(`/api/quiz/init?t=${Date.now()}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (!data.isLive) {
          localStorage.removeItem("quiz_in_progress");
          localStorage.removeItem("quiz_pending_start");
          router.push("/quiz");
        }
      })
      .catch((err) => {
        console.error("Status check failed", err);
      });

    try {
      const savedState = localStorage.getItem("quiz_in_progress");
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        setHasStarted(true);
        setQuestions(parsedState.questions || []);
        setAnswers(parsedState.answers || {});
        setParticipant(parsedState.participant || {});
        setDeadline(parsedState.deadline);
      } else {
        const pendingQuizInfo = localStorage.getItem("quiz_pending_start");
        if (pendingQuizInfo) {
          const info = JSON.parse(pendingQuizInfo);
          setParticipant({
            fullName: info.fullName || "",
            whatsapp: info.whatsapp || "",
            team: info.team || "",
            round: info.round || "Round 1"
          });
        }
      }
    } catch (e) {
      console.error("Failed to parse local storage", e);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [router]);

  // 2. Persist Answers
  useEffect(() => {
    if (hasStarted && deadline && questions.length > 0) {
      const stateToSave = {
        deadline,
        answers,
        questions,
        participant
      };
      localStorage.setItem("quiz_in_progress", JSON.stringify(stateToSave));
    }
  }, [answers, hasStarted, deadline, questions, participant]);

  // 3. Unstoppable Timer Logic
  const calculateTimeLeft = useCallback(() => {
    if (!deadline) return;
    
    const now = Date.now();
    const diff = deadline - now;
    
    if (diff <= 0) {
      setTimeLeftStr("00:00");
      setTimeExpired(true);
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    setTimeLeftStr(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
  }, [deadline]);

  useEffect(() => {
    if (hasStarted && deadline && !timeExpired) {
      calculateTimeLeft();
      timerRef.current = setInterval(calculateTimeLeft, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [hasStarted, deadline, timeExpired, calculateTimeLeft]);

  // 4. Auto-submit when time expires
  useEffect(() => {
    if (timeExpired && !isSubmitting) {
      handleFinalSubmit();
    }
  }, [timeExpired, isSubmitting]);

  const startQuiz = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/quiz/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          whatsapp: participant.whatsapp, 
          fullName: participant.fullName,
          team: participant.team
        })
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to initialize quiz.");
      }
      
      const data = await res.json();
      
      setQuestions(data.questions || []);
      setParticipant(p => ({ ...p, round: data.round }));
      setDeadline(data.deadlineTimestamp);
      setHasStarted(true);
      
      localStorage.removeItem("quiz_pending_start");
      
    } catch (error) {
      alert(error.message || "Failed to connect. Please check your internet and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOptionSelect = (questionId, optionValue) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: optionValue
    }));
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);
    
    const payload = {
      participant,
      answers,
      submittedAt: Date.now() 
    };

    try {
      const res = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Submission failed");
      }
      
      const resultData = await res.json();
      
      localStorage.removeItem("quiz_in_progress");
      sessionStorage.setItem("quiz_result_data", JSON.stringify(resultData));
      
      router.push("/quiz/result");
      
    } catch (error) {
      alert(`Submission failed: ${error.message}. We have saved your answers locally. Please ensure you have internet connection and try submitting again.`);
      setIsSubmitting(false);
    }
  };

  const answeredCount = Object.keys(answers).length;
  const progressPercent = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;
  
  const diff = deadline ? deadline - Date.now() : 0;
  const isWarning = diff > 0 && diff < 60000; 

  // --- SCREEN 1: INTEGRITY CHECK GATE ---
  if (!hasStarted) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem 1rem',
        background: 'radial-gradient(ellipse at top, #1e293b 0%, #0f172a 100%)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-sans)'
      }}>
        <div style={{
          maxWidth: '560px',
          width: '100%',
          backgroundColor: 'rgba(17, 24, 39, 0.75)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '1.25rem',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden'
        }}>
          {/* Header Banner */}
          <div style={{
            background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #3b82f6 100%)',
            padding: '2.25rem 2rem',
            textAlign: 'center',
            color: '#fff',
            position: 'relative'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem auto',
              border: '1px solid rgba(255, 255, 255, 0.25)'
            }}>
              <ShieldCheck size={36} color="#ffffff" />
            </div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: '800', margin: 0, letterSpacing: '-0.5px' }}>
              Christian Integrity Check
            </h1>
            <p style={{ margin: '0.4rem 0 0 0', opacity: 0.9, fontSize: '0.95rem' }}>
              ECCF Bible Reading Challenge Tracker
            </p>
          </div>

          <div style={{ padding: '2rem' }}>
            {/* Disclaimer Callout Box */}
            <div style={{
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '0.85rem',
              padding: '1.25rem',
              marginBottom: '1.5rem',
              display: 'flex',
              gap: '1rem',
              alignItems: 'flex-start'
            }}>
              <AlertTriangle size={24} style={{ color: '#F59E0B', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <h4 style={{ margin: '0 0 0.4rem 0', color: '#FCD34D', fontSize: '1rem', fontWeight: '700' }}>
                  Walk in Truth & Dignity
                </h4>
                <p style={{ margin: 0, color: '#E2E8F0', fontSize: '0.92rem', lineHeight: '1.55' }}>
                  As children of God, please complete this quiz sincerely 
                  <strong style={{ color: '#FCD34D', fontWeight: '700' }}> without using Bibles, notes, or AI assistants</strong>. 
                  Let our honesty reflect His light!
                </p>
              </div>
            </div>

            {/* Participant info badge */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.75rem',
              background: 'var(--surface-secondary)',
              padding: '1rem',
              borderRadius: '0.75rem',
              marginBottom: '1.5rem',
              border: '1px solid var(--border-light)'
            }}>
              <div style={{ flex: '1 1 auto' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, display: 'block' }}>Candidate</span>
                <span style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)' }}>{participant.fullName || "Member"}</span>
              </div>
              {participant.team && (
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, display: 'block' }}>Team</span>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    background: 'var(--accent-light)',
                    color: 'var(--accent-hover)',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '0.4rem',
                    fontSize: '0.85rem',
                    fontWeight: '700'
                  }}>
                    <Users size={13} /> {participant.team}
                  </span>
                </div>
              )}
            </div>

            {/* Rule points */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '2rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Clock size={18} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                <span>The timer begins immediately and <strong style={{ color: 'var(--text-primary)' }}>cannot be paused</strong>.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <WifiOff size={18} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                <span>Answers save automatically if your mobile network drops.</span>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                onClick={startQuiz}
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '0.95rem',
                  background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '0.65rem',
                  fontSize: '1.05rem',
                  fontWeight: '700',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 8px 20px rgba(37, 99, 235, 0.4)',
                  transition: 'all 0.2s ease',
                  opacity: isSubmitting ? 0.7 : 1
                }}
              >
                {isSubmitting ? "Connecting to Quiz..." : "I Agree, Start Quiz"}
                {!isSubmitting && <ChevronRight size={20} />}
              </button>

              <button
                onClick={() => router.push("/quiz")}
                style={{
                  width: '100%',
                  padding: '0.65rem',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  border: '1px solid transparent',
                  borderRadius: '0.5rem',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; }}
                onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
              >
                ← Back to Details
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- SCREEN 2: ACTIVE QUIZ WORKSPACE ---
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--background)',
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-sans)',
      paddingBottom: '6rem'
    }}>
      
      {/* Sticky HUD Bar */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backgroundColor: isWarning ? 'rgba(127, 29, 29, 0.95)' : 'rgba(17, 24, 39, 0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: `1px solid ${isWarning ? '#EF4444' : 'var(--border)'}`,
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35)',
        transition: 'background-color 0.3s ease, border-color 0.3s ease'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0.85rem 1rem' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  background: isWarning ? 'rgba(255, 255, 255, 0.2)' : 'var(--accent-light)',
                  color: isWarning ? '#fff' : 'var(--accent-hover)',
                  padding: '0.15rem 0.55rem',
                  borderRadius: '0.35rem'
                }}>
                  {participant.round || "Quiz Round"}
                </span>

                {participant.team && (
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    background: isWarning ? 'rgba(0, 0, 0, 0.3)' : 'rgba(16, 185, 129, 0.15)',
                    color: isWarning ? '#FCA5A5' : 'var(--success)',
                    padding: '0.15rem 0.55rem',
                    borderRadius: '0.35rem'
                  }}>
                    Team {participant.team}
                  </span>
                )}
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#fff' }}>
                {participant.fullName}
              </div>
            </div>

            {/* Live Digital Timer Display */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              borderRadius: '0.65rem',
              backgroundColor: isWarning ? 'rgba(239, 68, 68, 0.25)' : 'var(--surface-secondary)',
              border: `1.5px solid ${isWarning ? '#EF4444' : 'var(--border)'}`,
              color: isWarning ? '#F87171' : 'var(--text-primary)',
              fontFamily: 'monospace',
              fontSize: '1.35rem',
              fontWeight: '800',
              letterSpacing: '2px',
              boxShadow: isWarning ? '0 0 15px rgba(239, 68, 68, 0.4)' : 'none'
            }}>
              <Clock size={20} style={{ animation: isWarning ? 'spin 2s linear infinite' : 'none' }} />
              <span>{timeLeftStr}</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div style={{
            width: '100%',
            height: '6px',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            borderRadius: '999px',
            overflow: 'hidden',
            marginBottom: '0.4rem'
          }}>
            <div style={{
              width: `${progressPercent}%`,
              height: '100%',
              background: isWarning ? '#EF4444' : 'linear-gradient(90deg, #2563EB 0%, #3B82F6 100%)',
              transition: 'width 0.3s ease',
              borderRadius: '999px'
            }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <span>{answeredCount} of {questions.length} Questions Answered ({progressPercent}%)</span>
            {isOffline && (
              <span style={{ color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
                <WifiOff size={13} /> Offline (Answers Saving Locally)
              </span>
            )}
          </div>

        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem' }}>
        
        {questions.length === 0 ? (
          <div style={{
            backgroundColor: 'var(--surface)',
            borderRadius: '1rem',
            padding: '3rem 1.5rem',
            textAlign: 'center',
            border: '1px solid var(--border-light)',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.25)'
          }}>
            <HelpCircle size={48} style={{ color: 'var(--accent)', margin: '0 auto 1rem auto', opacity: 0.8 }} />
            <h2 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '0.5rem' }}>No Questions Published Yet</h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '420px', margin: '0 auto 1.5rem auto', lineHeight: '1.6' }}>
              Questions for <strong>{participant.round || "this round"}</strong> have not been released by the super admin. Please check back shortly!
            </p>
            <button
              onClick={() => router.push("/")}
              style={{
                background: 'var(--surface-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-light)',
                padding: '0.7rem 1.5rem',
                borderRadius: '0.5rem',
                fontSize: '0.95rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Return to Reading Tracker
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            {questions.map((q, index) => (
              <div 
                key={q.id}
                style={{
                  backgroundColor: 'var(--surface)',
                  borderRadius: '1rem',
                  border: '1px solid var(--border)',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
                  overflow: 'hidden',
                  transition: 'border-color 0.2s ease'
                }}
              >
                {/* Question Header */}
                <div style={{
                  padding: '1.25rem 1.5rem',
                  borderBottom: '1px solid var(--border-light)',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  display: 'flex',
                  gap: '0.85rem',
                  alignItems: 'flex-start'
                }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--accent-light)',
                    color: 'var(--accent-hover)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '800',
                    fontSize: '0.95rem',
                    flexShrink: 0
                  }}>
                    {index + 1}
                  </div>
                  <h3 style={{
                    fontSize: '1.08rem',
                    fontWeight: '600',
                    lineHeight: '1.5',
                    margin: 0,
                    color: 'var(--text-primary)'
                  }}>
                    {q.question}
                  </h3>
                </div>

                {/* Options List */}
                <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {q.options.map((opt, optIndex) => {
                    const isSelected = answers[q.id] === opt;
                    const optionLetter = String.fromCharCode(65 + optIndex); // A, B, C, D

                    return (
                      <div
                        key={optIndex}
                        onClick={() => !timeExpired && handleOptionSelect(q.id, opt)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '1rem',
                          padding: '0.9rem 1.1rem',
                          borderRadius: '0.75rem',
                          cursor: timeExpired ? 'not-allowed' : 'pointer',
                          backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.16)' : 'var(--surface-secondary)',
                          border: `1.5px solid ${isSelected ? 'var(--accent)' : 'transparent'}`,
                          boxShadow: isSelected ? '0 0 0 1px var(--accent)' : 'none',
                          transition: 'all 0.15s ease',
                          userSelect: 'none'
                        }}
                      >
                        {/* Option Letter Tag */}
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          backgroundColor: isSelected ? 'var(--accent)' : 'rgba(255, 255, 255, 0.06)',
                          color: isSelected ? '#fff' : 'var(--text-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.85rem',
                          fontWeight: '700',
                          flexShrink: 0,
                          transition: 'all 0.15s ease'
                        }}>
                          {optionLetter}
                        </div>

                        <span style={{
                          fontSize: '0.98rem',
                          color: isSelected ? '#fff' : 'var(--text-primary)',
                          fontWeight: isSelected ? '600' : '400',
                          flex: 1,
                          lineHeight: '1.4'
                        }}>
                          {opt}
                        </span>

                        {/* Radio Dot indicator */}
                        <div style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                          backgroundColor: 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {isSelected && (
                            <div style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: 'var(--accent)'
                            }} />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Submission Section */}
            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              {timeExpired ? (
                <div style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid var(--error)',
                  borderRadius: '0.75rem',
                  padding: '1.25rem',
                  color: '#F87171'
                }}>
                  <h4 style={{ margin: '0 0 0.25rem 0', fontWeight: '700' }}>Time Expired!</h4>
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>Your quiz answers are being automatically submitted.</p>
                </div>
              ) : (
                <button
                  onClick={handleFinalSubmit}
                  disabled={isSubmitting}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.75rem',
                    padding: '1.1rem 3rem',
                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '0.85rem',
                    fontSize: '1.15rem',
                    fontWeight: '800',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    boxShadow: '0 12px 30px rgba(16, 185, 129, 0.4)',
                    transition: 'all 0.2s ease',
                    minWidth: '280px',
                    opacity: isSubmitting ? 0.7 : 1
                  }}
                  onMouseOver={(e) => { if (!isSubmitting) e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <CheckCircle2 size={24} />
                  <span>{isSubmitting ? "Submitting..." : "Submit Quiz"}</span>
                </button>
              )}
            </div>

          </div>
        )}

      </main>
    </div>
  );
}
