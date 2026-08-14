"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, User, Phone, Users, Play, ShieldAlert, ArrowLeft, Clock, Sparkles } from "lucide-react";

export default function QuizLandingPage() {
  const router = useRouter();
  
  const [isLive, setIsLive] = useState(null); // null = loading, true = active, false = coming soon
  const [activeRound, setActiveRound] = useState("Round 1");
  const [fullName, setFullName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // 1. Fetch Quiz Status (isLive & active round) from server
    fetch(`/api/quiz/init?t=${Date.now()}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        const live = !!data.isLive;
        setIsLive(live);
        if (data.activeRound) setActiveRound(data.activeRound);

        if (!live) {
          // Clean up stale local storage if quiz is turned off
          localStorage.removeItem("quiz_in_progress");
          localStorage.removeItem("quiz_pending_start");
        } else {
          // If quiz is live and there is an active session, continue quiz
          const inProgress = localStorage.getItem("quiz_in_progress");
          if (inProgress) {
            router.push("/quiz/take");
          }
        }
      })
      .catch((err) => {
        console.error("Failed to check quiz status:", err);
        setIsLive(false);
      });

    // 2. Fetch valid teams list
    fetch("/api/data?type=valid_teams")
      .then((res) => res.json())
      .then((data) => {
        if (data.validTeams && Array.isArray(data.validTeams)) {
          setTeams(data.validTeams);
        }
      })
      .catch((err) => {
        console.error("Failed to load teams:", err);
      });
  }, [router]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!fullName.trim()) {
      setError("Please enter your Full Name");
      setLoading(false);
      return;
    }

    if (!whatsapp.trim()) {
      setError("Please enter your WhatsApp number");
      setLoading(false);
      return;
    }

    if (!selectedTeam) {
      setError("Please select your assigned Team");
      setLoading(false);
      return;
    }

    // Save to pending start and navigate to taking screen
    const pendingInfo = {
      fullName: fullName.trim(),
      whatsapp: whatsapp.replace(/\D/g, "").replace(/^0+/, ""),
      team: selectedTeam,
      round: activeRound
    };

    localStorage.setItem("quiz_pending_start", JSON.stringify(pendingInfo));
    localStorage.setItem("quiz_saved_participant_name", fullName.trim());
    localStorage.setItem("quiz_saved_participant_team", selectedTeam);
    localStorage.setItem("quiz_saved_whatsapp", whatsapp.trim());
    sessionStorage.setItem("quiz_current_participant", JSON.stringify(pendingInfo));
    router.push("/quiz/take");
  };

  // Loading State
  if (isLive === null) {
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

  // --- COMING SOON SCREEN ---
  if (!isLive) {
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
          maxWidth: '460px',
          width: '100%',
          backgroundColor: 'rgba(17, 24, 39, 0.8)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '1.25rem',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5)',
          padding: '2.5rem 1.75rem',
          textAlign: 'center'
        }}>
          {/* Logo */}
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '18px',
            backgroundColor: '#000',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem auto',
            boxShadow: '0 8px 25px rgba(0, 0, 0, 0.4)',
            padding: '8px'
          }}>
            <img 
              src="/eccfbrclogo.png" 
              alt="ECCF Logo" 
              style={{ 
                maxWidth: '64px', 
                maxHeight: '64px', 
                objectFit: 'contain' 
              }} 
            />
          </div>

          {/* Badge */}
          <span style={{
            display: 'inline-block',
            padding: '0.25rem 0.85rem',
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            color: '#FCD34D',
            fontSize: '0.8rem',
            fontWeight: '700',
            borderRadius: '999px',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginBottom: '1rem'
          }}>
            Coming Soon
          </span>

          <h1 style={{ fontSize: '1.6rem', fontWeight: '800', margin: '0 0 0.5rem 0' }}>
            Bible Reading Quiz
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', margin: '0' }}>
            The quiz challenge for <strong style={{ color: '#fff' }}>{activeRound}</strong> is currently being prepared and is not open for submissions yet.
            Please stay tuned for announcements from your team leader!
          </p>
        </div>
      </div>
    );
  }

  // --- LIVE QUIZ REGISTRATION SCREEN ---
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem',
      background: 'radial-gradient(ellipse at top, #1e293b 0%, #0f172a 100%)',
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-sans)'
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
        padding: '2.5rem 2rem',
        position: 'relative'
      }}>
        
        {/* Logo & Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '76px',
            height: '76px',
            borderRadius: '16px',
            backgroundColor: '#000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem auto',
            boxShadow: '0 8px 25px rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            padding: '8px'
          }}>
            <img 
              src="/eccfbrclogo.png" 
              alt="ECCF Logo" 
              style={{ 
                maxWidth: '60px', 
                maxHeight: '60px', 
                objectFit: 'contain' 
              }} 
            />
          </div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: '800', margin: 0, letterSpacing: '-0.5px' }}>
            Bible Challenge Quiz
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.4rem', fontSize: '0.92rem' }}>
            {activeRound} • Test your memory & reading knowledge
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Full Name */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              <User size={16} style={{ color: 'var(--accent)' }} />
              Full Name (Surname First)
            </label>
            <input
              type="text"
              placeholder="e.g. Smith John"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.85rem 1rem',
                backgroundColor: 'var(--surface-secondary)',
                border: '1px solid var(--border)',
                borderRadius: '0.65rem',
                color: 'var(--text-primary)',
                fontSize: '0.98rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* WhatsApp Number */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              <Phone size={16} style={{ color: 'var(--accent)' }} />
              WhatsApp Number
            </label>
            <input
              type="tel"
              placeholder="e.g. 2348012345678"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.85rem 1rem',
                backgroundColor: 'var(--surface-secondary)',
                border: '1px solid var(--border)',
                borderRadius: '0.65rem',
                color: 'var(--text-primary)',
                fontSize: '0.98rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.35rem', display: 'block' }}>
              Used to record your round submission once.
            </span>
          </div>

          {/* Team Dropdown */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              <Users size={16} style={{ color: 'var(--accent)' }} />
              Select Your Team
            </label>
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.85rem 1rem',
                backgroundColor: 'var(--surface-secondary)',
                border: '1px solid var(--border)',
                borderRadius: '0.65rem',
                color: 'var(--text-primary)',
                fontSize: '0.98rem',
                outline: 'none',
                cursor: 'pointer',
                boxSizing: 'border-box'
              }}
            >
              <option value="" disabled>Tap to select your assigned team...</option>
              {teams.map((t) => (
                <option key={t} value={t}>
                  Team {t}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid var(--error)',
              borderRadius: '0.6rem',
              padding: '0.75rem 1rem',
              color: '#F87171',
              fontSize: '0.85rem'
            }}>
              <ShieldAlert size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.95rem',
              background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '0.65rem',
              fontSize: '1.05rem',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              boxShadow: '0 8px 20px rgba(37, 99, 235, 0.4)',
              marginTop: '0.5rem',
              transition: 'all 0.2s ease',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? "Preparing Quiz..." : "Access Quiz"}
            {!loading && <Play size={18} />}
          </button>

        </form>
      </div>
    </div>
  );
}
