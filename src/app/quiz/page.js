"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, User, Phone, Users, Play, ShieldAlert, ArrowLeft } from "lucide-react";

export default function QuizLandingPage() {
  const router = useRouter();
  
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

    // Fetch valid teams list
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
      round: "Active Round"
    };

    localStorage.setItem("quiz_pending_start", JSON.stringify(pendingInfo));
    router.push("/quiz/take");
  };

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
            Test your memory on the latest reading rounds
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
              className="input-field"
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
              className="input-field"
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
              Used to prevent duplicate entries and record your round score.
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
