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
    // If a session is already in progress, redirect straight to `/quiz/take`
    const inProgress = localStorage.getItem("quiz_in_progress");
    if (inProgress) {
      router.push("/quiz/take");
      return;
    }

    // 1. Fetch Quiz Status (isLive & round)
    fetch("/api/quiz/init")
      .then((res) => res.json())
      .then((data) => {
        setIsLive(!!data.isLive);
        if (data.activeRound) setActiveRound(data.activeRound);
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
          {/* Animated Icon Halo */}
          <div style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.2) 0%, rgba(79, 70, 229, 0.2) 100%)',
            border: '1.5px solid var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem auto',
            boxShadow: '0 0 25px rgba(37, 99, 235, 0.3)'
          }}>
            <Sparkles size={36} color="#3B82F6" />
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
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', margin: '0 0 2rem 0' }}>
            The quiz challenge for <strong style={{ color: '#fff' }}>{activeRound}</strong> is currently being prepared and is not open for submissions yet.
            Please stay tuned for announcements from your team leader!
          </p>

          <a
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              width: '100%',
              padding: '0.85rem',
              backgroundColor: 'var(--surface-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-light)',
              borderRadius: '0.65rem',
              fontSize: '0.95rem',
              fontWeight: '600',
              textDecoration: 'none',
              transition: 'all 0.2s ease',
              boxSizing: 'border-box'
            }}
            onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
            onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border-light)'; }}
          >
            <ArrowLeft size={16} /> Return to Reading Tracker
          </a>
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
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem auto',
            boxShadow: '0 8px 25px rgba(37, 99, 235, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <BookOpen size={32} color="#ffffff" />
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

          <a
            href="/"
            style={{
              textAlign: 'center',
              color: 'var(--text-secondary)',
              fontSize: '0.85rem',
              textDecoration: 'none',
              marginTop: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem'
            }}
            onMouseOver={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            <ArrowLeft size={14} /> Return to Reading Tracker
          </a>

        </form>
      </div>
    </div>
  );
}
