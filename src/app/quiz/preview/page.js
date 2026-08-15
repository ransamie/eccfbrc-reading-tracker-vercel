"use client";

import React, { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  ChevronRight, 
  ArrowLeft, 
  HelpCircle, 
  RotateCcw, 
  Eye, 
  Sparkles, 
  BookOpen, 
  Trophy, 
  Check, 
  X,
  AlertTriangle,
  ExternalLink
} from "lucide-react";

function QuizPreviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRoundParam = searchParams.get("round") || "Round 1";

  // Navigation / Phase states: 'entry' | 'integrity' | 'quiz' | 'result'
  const [phase, setPhase] = useState("entry");

  // Settings & Available Rounds
  const [availableRounds, setAvailableRounds] = useState(["Round 1", "Round 2", "Round 3", "Round 4", "Round 5", "Round 6", "Round 7", "Round 8", "Round 9", "Round 10"]);
  const [selectedRound, setSelectedRound] = useState(initialRoundParam);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(15);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  // Participant Form Simulation
  const [participant, setParticipant] = useState({
    fullName: "Admin Previewer",
    whatsapp: "08012345678",
    team: "1",
    round: initialRoundParam
  });

  // Questions and User Answers
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [deadline, setDeadline] = useState(null);
  const [timeLeftStr, setTimeLeftStr] = useState("--:--");
  const [timeExpired, setTimeExpired] = useState(false);

  // Result Evaluation (Calculated purely client-side in preview)
  const [previewResult, setPreviewResult] = useState(null);

  const timerRef = useRef(null);

  // Load questions and settings for preview
  const loadRoundData = useCallback(async (targetRound) => {
    setLoading(true);
    try {
      // 1. Fetch questions for selected round
      const res = await fetch(`/api/quiz/init?round=${encodeURIComponent(targetRound)}&preview=true&t=${Date.now()}`);
      const data = await res.json();

      if (data.questions && data.questions.length > 0) {
        setQuestions(data.questions);
      } else {
        // Fallback demo questions if round is empty
        setQuestions([
          {
            id: "demo_1",
            round: targetRound,
            question: "Sample Question 1: Who led the children of Israel across the Red Sea?",
            options: ["Aaron", "Moses", "Joshua", "Caleb"],
            correctAnswer: "Moses"
          },
          {
            id: "demo_2",
            round: targetRound,
            question: "Sample Question 2: How many days and nights did rain fall during Noah's flood?",
            options: ["30 days", "50 days", "40 days", "70 days"],
            correctAnswer: "40 days"
          },
          {
            id: "demo_3",
            round: targetRound,
            question: "Sample Question 3: Which apostle was known as the 'beloved disciple'?",
            options: ["John", "Peter", "James", "Andrew"],
            correctAnswer: "John"
          }
        ]);
      }

      if (data.timeLimitMinutes) {
        setTimeLimitMinutes(parseInt(data.timeLimitMinutes, 10) || 15);
      }
    } catch (e) {
      console.error("Preview data load failed:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Fetch valid teams
    fetch("/api/data?type=valid_teams")
      .then(res => res.json())
      .then(data => {
        if (data.validTeams && Array.isArray(data.validTeams)) {
          setTeams(data.validTeams);
          if (data.validTeams.length > 0) {
            setParticipant(p => ({ ...p, team: data.validTeams[0] }));
          }
        }
      })
      .catch(console.error);

    loadRoundData(selectedRound);
  }, [loadRoundData, selectedRound]);

  // Handle Round Switcher in Preview Banner
  const handleSwitchRound = (newRound) => {
    setSelectedRound(newRound);
    setParticipant(p => ({ ...p, round: newRound }));
    setAnswers({});
    setPreviewResult(null);
    setPhase("entry");
    loadRoundData(newRound);
  };

  // Timer Calculation
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
    if (phase === "quiz" && deadline && !timeExpired) {
      calculateTimeLeft();
      timerRef.current = setInterval(calculateTimeLeft, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, deadline, timeExpired, calculateTimeLeft]);

  // Start Taking Quiz
  const handleStartTakingQuiz = () => {
    const durationMs = (timeLimitMinutes || 15) * 60 * 1000;
    setDeadline(Date.now() + durationMs);
    setTimeExpired(false);
    setPhase("quiz");
  };

  // Select Option
  const handleOptionSelect = (qId, optionVal) => {
    setAnswers(prev => ({
      ...prev,
      [qId]: optionVal
    }));
  };

  // Client-Side Final Submit Simulation
  const handlePreviewSubmit = () => {
    if (timerRef.current) clearInterval(timerRef.current);

    let score = 0;
    const evaluatedAnswers = questions.map((q, idx) => {
      const selected = answers[q.id] || null;
      const isCorrect = selected && q.correctAnswer && String(selected).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase();
      if (isCorrect) score += 1;

      return {
        id: q.id,
        index: idx + 1,
        question: q.question,
        selectedAnswer: selected,
        correctAnswer: q.correctAnswer,
        isCorrect,
        options: q.options || [q.option1, q.option2, q.option3, q.option4].filter(Boolean)
      };
    });

    const resultPayload = {
      fullName: participant.fullName,
      whatsapp: participant.whatsapp,
      team: participant.team,
      round: selectedRound,
      score,
      totalQuestions: questions.length,
      evaluatedAnswers,
      timestamp: new Date().toISOString()
    };

    setPreviewResult(resultPayload);
    setPhase("result");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const answeredCount = Object.keys(answers).length;
  const progressPercent = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;
  const diff = deadline ? deadline - Date.now() : 0;
  const isWarning = diff > 0 && diff < 60000;

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--background)',
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-sans)',
      position: 'relative'
    }}>
      
      {/* 1. TOP FIXED ADMIN PREVIEW BANNER */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        width: '100%',
        zIndex: 150,
        background: 'linear-gradient(90deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)',
        borderBottom: '1px solid rgba(129, 140, 248, 0.35)',
        padding: '0.65rem 1rem',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            backgroundColor: '#4338CA',
            color: '#EEF2FF',
            padding: '0.25rem 0.6rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: '800',
            letterSpacing: '0.5px',
            textTransform: 'uppercase'
          }}>
            <Eye size={13} /> Admin Preview Mode
          </span>
          <span style={{ fontSize: '0.85rem', color: '#C7D2FE' }}>
            Testing as Participant • <strong>Zero scores saved to live database</strong>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Round Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#A5B4FC', fontWeight: '600' }}>Round:</span>
            <select
              value={selectedRound}
              onChange={(e) => handleSwitchRound(e.target.value)}
              style={{
                padding: '0.35rem 0.75rem',
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(165, 180, 252, 0.3)',
                borderRadius: '0.4rem',
                color: '#fff',
                fontSize: '0.85rem',
                fontWeight: '700',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {availableRounds.map(r => (
                <option key={r} value={r} style={{ backgroundColor: '#1e1b4b', color: '#fff' }}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <a
            href="/admin/quiz"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.35rem 0.85rem',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '0.4rem',
              color: '#fff',
              fontSize: '0.82rem',
              fontWeight: '700',
              textDecoration: 'none',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'; }}
            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'; }}
          >
            <ArrowLeft size={14} /> Exit Preview
          </a>
        </div>
      </div>

      {/* 2. PHASE 1: PARTICIPANT ENTRY SIMULATION */}
      {phase === "entry" && (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '5.5rem 1rem 2.5rem 1rem',
          background: 'radial-gradient(ellipse at top, #1e293b 0%, #0f172a 100%)'
        }}>
          <div style={{
            maxWidth: '480px',
            width: '100%',
            backgroundColor: 'rgba(17, 24, 39, 0.75)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: '1.25rem',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5)',
            padding: '2.5rem 2rem'
          }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '16px',
                backgroundColor: '#000',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem auto',
                padding: '6px'
              }}>
                <img src="/eccfbrclogo.png" alt="ECCF Logo" style={{ maxWidth: '44px', maxHeight: '44px', objectFit: 'contain' }} />
              </div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: '0 0 0.4rem 0' }}>
                Bible Reading Challenge
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                Weekly Knowledge Assessment • <strong style={{ color: 'var(--accent-hover)' }}>{selectedRound}</strong>
              </p>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); setPhase("integrity"); }} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={participant.fullName}
                  onChange={(e) => setParticipant({ ...participant, fullName: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    backgroundColor: 'var(--surface-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: '0.65rem',
                    color: 'var(--text-primary)',
                    fontSize: '0.95rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  WhatsApp Number
                </label>
                <input
                  type="tel"
                  required
                  value={participant.whatsapp}
                  onChange={(e) => setParticipant({ ...participant, whatsapp: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    backgroundColor: 'var(--surface-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: '0.65rem',
                    color: 'var(--text-primary)',
                    fontSize: '0.95rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Your Assigned Team
                </label>
                <select
                  value={participant.team}
                  onChange={(e) => setParticipant({ ...participant, team: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    backgroundColor: 'var(--surface-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: '0.65rem',
                    color: 'var(--text-primary)',
                    fontSize: '0.95rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    cursor: 'pointer'
                  }}
                >
                  {teams.length > 0 ? (
                    teams.map((t) => (
                      <option key={t} value={t}>Team {t}</option>
                    ))
                  ) : (
                    <option value="1">Team 1</option>
                  )}
                </select>
              </div>

              <div style={{
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                border: '1px solid rgba(37, 99, 235, 0.25)',
                borderRadius: '0.65rem',
                padding: '0.85rem 1rem',
                fontSize: '0.85rem',
                color: 'var(--accent-hover)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginTop: '0.5rem'
              }}>
                <Clock size={16} />
                <span>Quiz Time Limit: <strong>{timeLimitMinutes} Minutes</strong> (Unstoppable Timer)</span>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.9rem',
                  background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '0.65rem',
                  fontSize: '1.05rem',
                  fontWeight: '700',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 8px 25px rgba(37, 99, 235, 0.35)',
                  marginTop: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                <span>{loading ? "Loading Questions..." : "Proceed to Integrity Check"}</span>
                <ChevronRight size={18} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 3. PHASE 2: CHRISTIAN INTEGRITY CHECK GATE */}
      {phase === "integrity" && (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '5.5rem 1rem 2.5rem 1rem',
          background: 'radial-gradient(ellipse at top, #1e293b 0%, #0f172a 100%)'
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
              color: '#fff'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
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
              <div style={{
                backgroundColor: 'rgba(37, 99, 235, 0.08)',
                border: '1px solid rgba(37, 99, 235, 0.2)',
                borderRadius: '0.75rem',
                padding: '1.25rem',
                marginBottom: '1.75rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Participant:</span>
                  <strong>{participant.fullName}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Team & Round:</span>
                  <strong>Team {participant.team} • {selectedRound}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Questions Count:</span>
                  <strong>{questions.length} Questions ({timeLimitMinutes} Mins)</strong>
                </div>
              </div>

              {/* Integrity Rules */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '2rem' }}>
                {[
                  "No looking up scriptures during the active countdown timer.",
                  "No consulting group chats, outside notes, or other individuals.",
                  "Timer cannot be paused once started.",
                  "Upon time expiry, your answers are automatically submitted."
                ].map((rule, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                      color: '#34D399',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '2px',
                      fontSize: '0.75rem',
                      fontWeight: '800'
                    }}>
                      ✓
                    </div>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                      {rule}
                    </span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleStartTakingQuiz}
                style={{
                  width: '100%',
                  padding: '1rem',
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '0.75rem',
                  fontSize: '1.1rem',
                  fontWeight: '800',
                  cursor: 'pointer',
                  boxShadow: '0 8px 25px rgba(16, 185, 129, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.6rem'
                }}
              >
                <span>I Understand & Start Quiz</span>
                <ChevronRight size={20} />
              </button>

              <button
                type="button"
                onClick={() => setPhase("entry")}
                style={{
                  width: '100%',
                  marginTop: '0.75rem',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  padding: '0.5rem'
                }}
              >
                ← Back to Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. PHASE 3: ACTIVE QUIZ WORKSPACE */}
      {phase === "quiz" && (
        <div style={{ paddingBottom: '6rem' }}>
          {/* Fixed HUD Bar */}
          <header style={{
            position: 'fixed',
            top: '50px',
            left: 0,
            right: 0,
            width: '100%',
            zIndex: 140,
            backgroundColor: isWarning ? 'rgba(127, 29, 29, 0.98)' : 'rgba(17, 24, 39, 0.98)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: `1px solid ${isWarning ? '#EF4444' : 'var(--border)'}`,
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
            transition: 'background-color 0.3s ease, border-color 0.3s ease'
          }}>
            <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0.85rem 1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--accent-hover)' }}>
                    {selectedRound} • Team {participant.team}
                  </span>
                  <h2 style={{ fontSize: '1.05rem', fontWeight: '800', margin: 0 }}>
                    {participant.fullName}
                  </h2>
                </div>

                {/* Unstoppable Timer Badge */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: isWarning ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                  padding: '0.45rem 0.9rem',
                  borderRadius: '0.5rem',
                  border: `1.5px solid ${isWarning ? '#EF4444' : 'rgba(255, 255, 255, 0.15)'}`
                }}>
                  <Clock size={18} color={isWarning ? "#EF4444" : "#F59E0B"} />
                  <span style={{
                    fontSize: '1.25rem',
                    fontWeight: '900',
                    fontFamily: 'monospace',
                    color: isWarning ? '#FCA5A5' : '#F9FAFB'
                  }}>
                    {timeLeftStr}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ flex: 1, height: '7px', backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '9999px', overflow: 'hidden' }}>
                  <div style={{ width: `${progressPercent}%`, height: '100%', backgroundColor: '#10B981', transition: 'width 0.3s ease' }}></div>
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', minWidth: '85px', textAlign: 'right' }}>
                  {answeredCount} of {questions.length} done ({progressPercent}%)
                </span>
              </div>
            </div>
          </header>

          {/* Questions Stream */}
          <main style={{ maxWidth: '800px', margin: '0 auto', paddingTop: '185px', paddingLeft: '1rem', paddingRight: '1rem', paddingBottom: '6rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Quick Navigation Pills */}
            <div style={{
              display: 'flex',
              gap: '0.4rem',
              flexWrap: 'wrap',
              backgroundColor: 'var(--surface)',
              padding: '0.85rem 1rem',
              borderRadius: '0.85rem',
              border: '1px solid var(--border)'
            }}>
              {questions.map((q, idx) => {
                const isAnswered = !!answers[q.id];
                return (
                  <a
                    key={q.id}
                    href={`#q_${q.id}`}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '0.4rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.85rem',
                      fontWeight: '700',
                      textDecoration: 'none',
                      backgroundColor: isAnswered ? 'var(--accent)' : 'rgba(255, 255, 255, 0.05)',
                      color: isAnswered ? '#fff' : 'var(--text-secondary)',
                      border: `1px solid ${isAnswered ? 'var(--accent)' : 'var(--border)'}`,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {idx + 1}
                  </a>
                );
              })}
            </div>

            {/* Question Cards */}
            {questions.map((q, idx) => {
              const opts = q.options || [q.option1, q.option2, q.option3, q.option4].filter(Boolean);
              return (
                <div
                  key={q.id}
                  id={`q_${q.id}`}
                  style={{
                    backgroundColor: 'var(--surface)',
                    borderRadius: '1.25rem',
                    border: '1px solid var(--border)',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)',
                    padding: '1.75rem',
                    scrollMarginTop: '160px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
                    <span style={{
                      fontSize: '0.78rem',
                      fontWeight: '800',
                      textTransform: 'uppercase',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '0.35rem',
                      backgroundColor: answers[q.id] ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                      color: answers[q.id] ? '#34D399' : 'var(--text-secondary)',
                      border: `1px solid ${answers[q.id] ? 'rgba(16, 185, 129, 0.3)' : 'transparent'}`
                    }}>
                      Question {idx + 1} {answers[q.id] ? '• Answered' : ''}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.15rem', fontWeight: '700', lineHeight: '1.45', margin: '0 0 1.5rem 0' }}>
                    {q.question}
                  </h3>

                  {/* Options */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {opts.map((opt, oIdx) => {
                      const isSelected = answers[q.id] === opt;
                      const letter = ["A", "B", "C", "D"][oIdx] || String(oIdx + 1);

                      return (
                        <div
                          key={oIdx}
                          onClick={() => handleOptionSelect(q.id, opt)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.85rem',
                            padding: '0.95rem 1.15rem',
                            borderRadius: '0.75rem',
                            backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.18)' : 'var(--surface-secondary)',
                            border: `1.5px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            userSelect: 'none'
                          }}
                        >
                          <div style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--text-secondary)'}`,
                            backgroundColor: isSelected ? 'var(--accent)' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            {isSelected && <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#fff' }} />}
                          </div>

                          <span style={{ fontWeight: '700', color: isSelected ? 'var(--accent-hover)' : 'var(--text-secondary)', fontSize: '0.95rem' }}>
                            {letter}.
                          </span>

                          <span style={{ fontSize: '0.95rem', fontWeight: isSelected ? '700' : '400', color: isSelected ? '#fff' : 'var(--text-primary)' }}>
                            {opt}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Bottom Submit Button */}
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <button
                type="button"
                onClick={handlePreviewSubmit}
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
                  cursor: 'pointer',
                  boxShadow: '0 12px 30px rgba(16, 185, 129, 0.4)',
                  minWidth: '280px',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <CheckCircle2 size={24} />
                <span>Submit Preview Assessment</span>
              </button>
            </div>

          </main>
        </div>
      )}

      {/* 5. PHASE 4: RESULTS BREAKDOWN */}
      {phase === "result" && previewResult && (
        <div style={{ padding: '5.5rem 1rem 6rem 1rem' }}>
          <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Scorecard */}
            <div style={{
              backgroundColor: 'var(--surface)',
              borderRadius: '1.25rem',
              border: '1px solid var(--border)',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.35)',
              padding: '2.5rem 1.5rem',
              textAlign: 'center',
              position: 'relative'
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                backgroundColor: (previewResult.score / previewResult.totalQuestions) >= 0.7 ? 'rgba(16, 185, 129, 0.15)' : 'var(--accent-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem auto',
                border: `1.5px solid ${(previewResult.score / previewResult.totalQuestions) >= 0.7 ? 'var(--success)' : 'var(--accent)'}`
              }}>
                <Trophy size={42} color={(previewResult.score / previewResult.totalQuestions) >= 0.7 ? "#10B981" : "#3B82F6"} />
              </div>

              <span style={{
                display: 'inline-block',
                backgroundColor: 'rgba(99, 102, 241, 0.18)',
                color: '#A5B4FC',
                padding: '0.3rem 0.8rem',
                borderRadius: '9999px',
                fontSize: '0.8rem',
                fontWeight: '800',
                marginBottom: '0.75rem'
              }}>
                Preview Scorecard • {selectedRound}
              </span>

              <h1 style={{ fontSize: '1.85rem', fontWeight: '800', margin: '0 0 0.4rem 0' }}>
                Preview Assessment Completed!
              </h1>
              <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.95rem' }}>
                Candidate: <strong>{previewResult.fullName}</strong> • Team {previewResult.team}
              </p>

              {/* Big Score Display */}
              <div style={{ margin: '2rem 0' }}>
                <div style={{
                  fontSize: '4rem',
                  fontWeight: '900',
                  lineHeight: '1',
                  color: (previewResult.score / previewResult.totalQuestions) >= 0.7 ? '#34D399' : 'var(--accent-hover)'
                }}>
                  {previewResult.score} <span style={{ fontSize: '1.75rem', fontWeight: '500', color: 'var(--text-secondary)' }}>/ {previewResult.totalQuestions}</span>
                </div>
                <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginTop: '0.5rem', fontWeight: '600' }}>
                  {Math.round((previewResult.score / previewResult.totalQuestions) * 100)}% Overall Score
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => { setAnswers({}); setPhase("entry"); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.75rem 1.5rem',
                    backgroundColor: 'var(--surface-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: '0.6rem',
                    color: 'var(--text-primary)',
                    fontSize: '0.92rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  <RotateCcw size={16} /> Retake Preview
                </button>

                <a
                  href="/admin/quiz"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.75rem 1.5rem',
                    backgroundColor: 'var(--accent)',
                    border: 'none',
                    borderRadius: '0.6rem',
                    color: '#fff',
                    fontSize: '0.92rem',
                    fontWeight: '700',
                    textDecoration: 'none'
                  }}
                >
                  <ArrowLeft size={16} /> Return to Quiz Admin
                </a>
              </div>
            </div>

            {/* Question Breakdown Review */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', margin: 0 }}>
                Question Breakdown & Explanations:
              </h3>

              {previewResult.evaluatedAnswers.map((item, i) => (
                <div
                  key={i}
                  style={{
                    backgroundColor: 'var(--surface)',
                    borderRadius: '1rem',
                    border: `1.5px solid ${item.isCorrect ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                    padding: '1.5rem',
                    boxShadow: '0 8px 25px rgba(0, 0, 0, 0.2)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-secondary)' }}>
                      Question {item.index}
                    </span>
                    <span style={{
                      fontSize: '0.8rem',
                      fontWeight: '800',
                      padding: '0.2rem 0.55rem',
                      borderRadius: '0.35rem',
                      backgroundColor: item.isCorrect ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: item.isCorrect ? '#34D399' : '#F87171',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}>
                      {item.isCorrect ? <Check size={14} /> : <X size={14} />}
                      {item.isCorrect ? "Correct (+1)" : "Incorrect (0)"}
                    </span>
                  </div>

                  <h4 style={{ fontSize: '1.05rem', fontWeight: '700', margin: '0 0 1rem 0' }}>
                    {item.question}
                  </h4>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.9rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Selected Answer: </span>
                      <strong style={{ color: item.isCorrect ? '#34D399' : '#F87171' }}>
                        {item.selectedAnswer || "(No Answer Selected)"}
                      </strong>
                    </div>

                    {!item.isCorrect && (
                      <div>
                        <span style={{ color: 'var(--text-secondary)' }}>Correct Answer: </span>
                        <strong style={{ color: '#34D399' }}>{item.correctAnswer}</strong>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default function QuizPreviewPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0f172a',
        color: '#F9FAFB',
        fontFamily: 'sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem' }}>Loading Quiz Preview...</div>
          <div style={{ fontSize: '0.85rem', color: '#9CA3AF' }}>Preparing live simulation workspace</div>
        </div>
      </div>
    }>
      <QuizPreviewContent />
    </Suspense>
  );
}

