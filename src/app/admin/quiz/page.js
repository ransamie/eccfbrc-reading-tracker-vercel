"use client";

import React, { useState, useEffect } from "react";
import { 
  Settings, 
  PlusCircle, 
  Trash2, 
  Trophy, 
  Save, 
  AlertCircle, 
  Lock, 
  LogOut, 
  Check, 
  Filter,
  Users,
  ArrowLeft,
  BookOpen
} from "lucide-react";

export default function AdminQuizPage() {
  const [pin, setPin] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");
  const [loading, setLoading] = useState(false);

  // Quiz Data
  const [activeTab, setActiveTab] = useState("control");
  const [settings, setSettings] = useState({ Active_Round: "Round 1", Time_Limit_Minutes: "15" });
  const [questions, setQuestions] = useState([]);
  const [results, setResults] = useState([]);
  const [selectedRoundFilter, setSelectedRoundFilter] = useState("All");
  const [selectedTeamFilter, setSelectedTeamFilter] = useState("All");

  // Form States
  const [newQuestion, setNewQuestion] = useState({
    round: "Round 1",
    question: "",
    option1: "",
    option2: "",
    option3: "",
    option4: "",
    correctAnswer: ""
  });
  const [saveStatus, setSaveStatus] = useState("");

  // 1. Check Authentication on Mount
  useEffect(() => {
    const savedPin = sessionStorage.getItem("admin_quiz_pin");
    if (savedPin) {
      verifyAndLoad(savedPin);
    }
  }, []);

  const verifyAndLoad = async (inputPin) => {
    setLoading(true);
    setAuthError("");
    try {
      const res = await fetch("/api/quiz/admin", {
        headers: { "Authorization": inputPin }
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings || { Active_Round: "Round 1", Time_Limit_Minutes: "15" });
        setQuestions(data.questions || []);
        setResults(data.results || []);
        sessionStorage.setItem("admin_quiz_pin", inputPin);
        setPin(inputPin);
        setIsAuthenticated(true);
      } else {
        setAuthError("Invalid Super Admin PIN");
        sessionStorage.removeItem("admin_quiz_pin");
      }
    } catch (err) {
      setAuthError("Failed to connect to database");
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (pin) verifyAndLoad(pin);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("admin_quiz_pin");
    setIsAuthenticated(false);
    setPin("");
  };

  // 2. Control Center Actions
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaveStatus("saving");
    try {
      const res = await fetch("/api/quiz/admin", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": pin 
        },
        body: JSON.stringify({
          action: "updateSettings",
          activeRound: settings.Active_Round,
          timeLimitMinutes: settings.Time_Limit_Minutes
        })
      });

      if (res.ok) {
        setSaveStatus("success");
        setTimeout(() => setSaveStatus(""), 3000);
      } else {
        setSaveStatus("error");
      }
    } catch (e) {
      setSaveStatus("error");
    }
  };

  // 3. Question Builder Actions
  const handleAddQuestion = async (e) => {
    e.preventDefault();
    if (!newQuestion.correctAnswer) {
      alert("Please select the radio button for the correct answer option!");
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch("/api/quiz/admin", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": pin 
        },
        body: JSON.stringify({
          action: "addQuestion",
          question: newQuestion
        })
      });

      if (res.ok) {
        const data = await res.json();
        setQuestions(prev => [...prev, { ...newQuestion, id: data.id }]);
        setNewQuestion({
          round: settings.Active_Round || "Round 1",
          question: "",
          option1: "",
          option2: "",
          option3: "",
          option4: "",
          correctAnswer: ""
        });
        alert("Question added successfully!");
      } else {
        alert("Failed to add question.");
      }
    } catch (err) {
      alert("Error adding question.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuestion = async (id) => {
    if (!confirm("Are you sure you want to delete this question?")) return;
    
    setLoading(true);
    try {
      const res = await fetch("/api/quiz/admin", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": pin 
        },
        body: JSON.stringify({
          action: "deleteQuestion",
          id
        })
      });

      if (res.ok) {
        setQuestions(prev => prev.filter(q => q.id !== id));
      } else {
        alert("Failed to delete question.");
      }
    } catch (err) {
      alert("Error deleting question.");
    } finally {
      setLoading(false);
    }
  };

  // Calculations for Leaderboard
  const sortedResults = [...results]
    .filter(r => (selectedRoundFilter === "All" || r.round === selectedRoundFilter) &&
                 (selectedTeamFilter === "All" || (r.team && r.team.toLowerCase() === selectedTeamFilter.toLowerCase())))
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return new Date(a.timestamp) - new Date(b.timestamp);
    });

  const uniqueRounds = Array.from(new Set(questions.map(q => q.round).concat(results.map(r => r.round)).filter(Boolean)));
  const uniqueTeams = Array.from(new Set(results.map(r => r.team).filter(Boolean)));

  // --- SCREEN 1: ADMIN PIN GATE ---
  if (!isAuthenticated) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        background: 'radial-gradient(ellipse at top, #1e293b 0%, #0f172a 100%)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-sans)'
      }}>
        <div style={{
          maxWidth: '420px',
          width: '100%',
          backgroundColor: 'rgba(17, 24, 39, 0.8)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '1.25rem',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '2.5rem 2rem',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5)',
          textAlign: 'center'
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            backgroundColor: 'var(--accent-light)',
            color: 'var(--accent-hover)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem auto',
            border: '1px solid rgba(37, 99, 235, 0.3)'
          }}>
            <Lock size={28} />
          </div>
          
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: '0 0 0.4rem 0' }}>Quiz Control Center</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0 0 2rem 0' }}>
            Enter Super Admin PIN to authenticate
          </p>

          <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <input
              type="password"
              placeholder="Enter PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.85rem 1rem',
                backgroundColor: 'var(--surface-secondary)',
                border: '1px solid var(--border)',
                borderRadius: '0.65rem',
                color: 'var(--text-primary)',
                fontSize: '1.1rem',
                textAlign: 'center',
                letterSpacing: '3px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />

            {authError && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid var(--error)',
                borderRadius: '0.5rem',
                padding: '0.65rem 0.85rem',
                color: '#F87171',
                fontSize: '0.85rem'
              }}>
                <AlertCircle size={16} />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.85rem',
                background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '0.65rem',
                fontSize: '1rem',
                fontWeight: '700',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 8px 20px rgba(37, 99, 235, 0.3)',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? "Verifying..." : "Access Quiz Workspace"}
            </button>

            <a
              href="/"
              style={{
                color: 'var(--text-secondary)',
                fontSize: '0.85rem',
                textDecoration: 'none',
                marginTop: '0.5rem'
              }}
              onMouseOver={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              ← Back to Main Dashboard
            </a>
          </form>
        </div>
      </div>
    );
  }

  // --- SCREEN 2: ADMIN WORKSPACE ---
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--background)',
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-sans)',
      paddingBottom: '5rem'
    }}>
      
      {/* Header */}
      <header style={{
        backgroundColor: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        padding: '1rem 1.5rem',
        position: 'sticky',
        top: 0,
        zIndex: 40
      }}>
        <div style={{ maxWidth: '1050px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff'
            }}>
              <Settings size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0 }}>Quiz Control Center</h1>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Super Admin Management</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <a
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 0.9rem',
                backgroundColor: 'var(--surface-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-light)',
                borderRadius: '0.5rem',
                fontSize: '0.85rem',
                fontWeight: '600',
                textDecoration: 'none',
                transition: 'all 0.2s ease'
              }}
            >
              <ArrowLeft size={14} /> Main Dashboard
            </a>

            <button
              onClick={handleLogout}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 0.9rem',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: '#F87171',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: '0.5rem',
                fontSize: '0.85rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              <LogOut size={14} /> Logout
            </button>
          </div>

        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '1050px', margin: '2rem auto 0 auto', padding: '0 1rem' }}>
        
        {/* Tab Buttons */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)', marginBottom: '2rem', gap: '0.5rem', overflowX: 'auto' }}>
          {[
            { id: 'control', label: 'Control Center', icon: Settings },
            { id: 'builder', label: 'Question Builder', icon: PlusCircle },
            { id: 'leaderboard', label: 'Live Leaderboard', icon: Trophy }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.85rem 1.25rem',
                  background: 'none',
                  border: 'none',
                  borderBottom: `3px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
                  color: isActive ? '#fff' : 'var(--text-secondary)',
                  fontSize: '0.95rem',
                  fontWeight: isActive ? '700' : '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap'
                }}
              >
                <Icon size={18} style={{ color: isActive ? 'var(--accent)' : 'inherit' }} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: CONTROL CENTER */}
        {activeTab === 'control' && (
          <div style={{
            maxWidth: '650px',
            backgroundColor: 'var(--surface)',
            borderRadius: '1rem',
            border: '1px solid var(--border)',
            padding: '2rem',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)'
          }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: '700', margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Settings size={20} style={{ color: 'var(--accent)' }} /> Global Quiz Configuration
            </h2>

            <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    Active Quiz Round
                  </label>
                  <input
                    type="text"
                    value={settings.Active_Round || ""}
                    onChange={(e) => setSettings(prev => ({ ...prev, Active_Round: e.target.value }))}
                    placeholder="e.g. Round 1"
                    required
                    style={{
                      width: '100%',
                      padding: '0.85rem 1rem',
                      backgroundColor: 'var(--surface-secondary)',
                      border: '1px solid var(--border)',
                      borderRadius: '0.6rem',
                      color: 'var(--text-primary)',
                      fontSize: '0.95rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.35rem', display: 'block' }}>
                    Only questions tagged with this round are delivered to students.
                  </span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    Time Limit (Minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={settings.Time_Limit_Minutes || ""}
                    onChange={(e) => setSettings(prev => ({ ...prev, Time_Limit_Minutes: e.target.value }))}
                    placeholder="e.g. 15"
                    required
                    style={{
                      width: '100%',
                      padding: '0.85rem 1rem',
                      backgroundColor: 'var(--surface-secondary)',
                      border: '1px solid var(--border)',
                      borderRadius: '0.6rem',
                      color: 'var(--text-primary)',
                      fontSize: '0.95rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.35rem', display: 'block' }}>
                    Server auto-submits once this duration expires.
                  </span>
                </div>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderTop: '1px solid var(--border-light)',
                paddingTop: '1.25rem',
                marginTop: '0.5rem'
              }}>
                <div>
                  {saveStatus === "saving" && <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Saving settings...</span>}
                  {saveStatus === "success" && (
                    <span style={{ color: '#34D399', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Check size={16} /> Settings Saved
                    </span>
                  )}
                  {saveStatus === "error" && <span style={{ color: '#F87171', fontSize: '0.85rem' }}>Failed to save settings</span>}
                </div>

                <button
                  type="submit"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1.5rem',
                    background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '0.6rem',
                    fontSize: '0.95rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(37, 99, 235, 0.3)'
                  }}
                >
                  <Save size={16} /> Save Settings
                </button>
              </div>

            </form>
          </div>
        )}

        {/* TAB 2: QUESTION BUILDER */}
        {activeTab === 'builder' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '2rem' }}>
            
            {/* Creator Form Card */}
            <div style={{
              backgroundColor: 'var(--surface)',
              borderRadius: '1rem',
              border: '1px solid var(--border)',
              padding: '1.75rem',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
              height: 'fit-content'
            }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '700', margin: '0 0 1.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <PlusCircle size={18} style={{ color: 'var(--accent)' }} /> Add New Question
              </h3>

              <form onSubmit={handleAddQuestion} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Round Tag
                  </label>
                  <input
                    type="text"
                    value={newQuestion.round}
                    onChange={(e) => setNewQuestion(prev => ({ ...prev, round: e.target.value }))}
                    placeholder="e.g. Round 1"
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem 0.9rem',
                      backgroundColor: 'var(--surface-secondary)',
                      border: '1px solid var(--border)',
                      borderRadius: '0.5rem',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Question Prompt
                  </label>
                  <textarea
                    rows={3}
                    value={newQuestion.question}
                    onChange={(e) => setNewQuestion(prev => ({ ...prev, question: e.target.value }))}
                    placeholder="Enter the question text..."
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem 0.9rem',
                      backgroundColor: 'var(--surface-secondary)',
                      border: '1px solid var(--border)',
                      borderRadius: '0.5rem',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                      resize: 'vertical'
                    }}
                  />
                </div>

                {/* 4 Options with Radio Select */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    Options & Correct Answer (Select the radio dot):
                  </label>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {[1, 2, 3, 4].map(num => {
                      const isCorrect = newQuestion.correctAnswer === newQuestion[`option${num}`] && newQuestion[`option${num}`] !== "";

                      return (
                        <div 
                          key={num} 
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.65rem',
                            backgroundColor: isCorrect ? 'rgba(16, 185, 129, 0.12)' : 'var(--surface-secondary)',
                            border: `1px solid ${isCorrect ? 'var(--success)' : 'var(--border-light)'}`,
                            padding: '0.4rem 0.65rem',
                            borderRadius: '0.5rem'
                          }}
                        >
                          <input
                            type="radio"
                            name="correctAnswerSelect"
                            checked={isCorrect}
                            onChange={() => setNewQuestion(prev => ({ ...prev, correctAnswer: prev[`option${num}`] }))}
                            disabled={!newQuestion[`option${num}`]}
                            title="Set as correct answer"
                            style={{ cursor: 'pointer' }}
                          />
                          <input
                            type="text"
                            placeholder={`Option ${num}`}
                            value={newQuestion[`option${num}`]}
                            onChange={(e) => {
                              const val = e.target.value;
                              setNewQuestion(prev => {
                                const updated = { ...prev, [`option${num}`]: val };
                                if (prev.correctAnswer === prev[`option${num}`]) {
                                  updated.correctAnswer = val;
                                }
                                return updated;
                              });
                            }}
                            required
                            style={{
                              flex: 1,
                              backgroundColor: 'transparent',
                              border: 'none',
                              color: 'var(--text-primary)',
                              fontSize: '0.88rem',
                              outline: 'none'
                            }}
                          />
                          {isCorrect && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 700 }}>
                              ✓ Correct
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '0.85rem',
                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '0.6rem',
                    fontSize: '0.95rem',
                    fontWeight: '700',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    marginTop: '0.5rem'
                  }}
                >
                  <PlusCircle size={16} /> Add Question
                </button>
              </form>
            </div>

            {/* Questions Bank List */}
            <div style={{
              backgroundColor: 'var(--surface)',
              borderRadius: '1rem',
              border: '1px solid var(--border)',
              padding: '1.75rem',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)'
            }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '700', margin: 0 }}>Questions Bank ({questions.length})</h3>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Filter size={15} style={{ color: 'var(--text-secondary)' }} />
                  <select
                    value={selectedRoundFilter}
                    onChange={(e) => setSelectedRoundFilter(e.target.value)}
                    style={{
                      padding: '0.4rem 0.8rem',
                      backgroundColor: 'var(--surface-secondary)',
                      border: '1px solid var(--border)',
                      borderRadius: '0.4rem',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="All">All Rounds</option>
                    {uniqueRounds.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Questions Scroll Area */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '550px', overflowY: 'auto', paddingRight: '0.35rem' }}>
                {questions.filter(q => selectedRoundFilter === "All" || q.round === selectedRoundFilter).length === 0 ? (
                  <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No questions found for this round.
                  </div>
                ) : (
                  questions
                    .filter(q => selectedRoundFilter === "All" || q.round === selectedRoundFilter)
                    .map((q) => (
                      <div
                        key={q.id}
                        style={{
                          backgroundColor: 'var(--surface-secondary)',
                          border: '1px solid var(--border-light)',
                          borderRadius: '0.75rem',
                          padding: '1rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: '1rem',
                          alignItems: 'flex-start'
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, backgroundColor: 'var(--accent-light)', color: 'var(--accent-hover)', padding: '0.15rem 0.5rem', borderRadius: '0.3rem' }}>
                              {q.round}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>ID: {q.id}</span>
                          </div>

                          <p style={{ margin: '0 0 0.75rem 0', fontWeight: '600', fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                            {q.question}
                          </p>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.4rem' }}>
                            {[q.option1, q.option2, q.option3, q.option4].filter(Boolean).map((opt, i) => {
                              const isAnswer = opt === q.correctAnswer;
                              return (
                                <div
                                  key={i}
                                  style={{
                                    fontSize: '0.78rem',
                                    padding: '0.35rem 0.6rem',
                                    borderRadius: '0.4rem',
                                    backgroundColor: isAnswer ? 'rgba(16, 185, 129, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                                    color: isAnswer ? '#34D399' : 'var(--text-secondary)',
                                    border: `1px solid ${isAnswer ? 'var(--success)' : 'transparent'}`,
                                    fontWeight: isAnswer ? '700' : '400'
                                  }}
                                >
                                  {isAnswer ? '✓ ' : ''}{opt}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteQuestion(q.id)}
                          title="Delete question"
                          style={{
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            color: '#F87171',
                            padding: '0.5rem',
                            borderRadius: '0.5rem',
                            cursor: 'pointer',
                            flexShrink: 0
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))
                )}
              </div>

            </div>

          </div>
        )}

        {/* TAB 3: LIVE LEADERBOARD */}
        {activeTab === 'leaderboard' && (
          <div style={{
            backgroundColor: 'var(--surface)',
            borderRadius: '1rem',
            border: '1px solid var(--border)',
            padding: '2rem',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)'
          }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Trophy size={22} style={{ color: '#F59E0B' }} /> Live Quiz Submissions ({sortedResults.length})
              </h3>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                
                {/* Round Filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Filter size={15} style={{ color: 'var(--text-secondary)' }} />
                  <select
                    value={selectedRoundFilter}
                    onChange={(e) => setSelectedRoundFilter(e.target.value)}
                    style={{
                      padding: '0.45rem 0.85rem',
                      backgroundColor: 'var(--surface-secondary)',
                      border: '1px solid var(--border)',
                      borderRadius: '0.4rem',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="All">All Rounds</option>
                    {uniqueRounds.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                {/* Team Filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Users size={15} style={{ color: 'var(--text-secondary)' }} />
                  <select
                    value={selectedTeamFilter}
                    onChange={(e) => setSelectedTeamFilter(e.target.value)}
                    style={{
                      padding: '0.45rem 0.85rem',
                      backgroundColor: 'var(--surface-secondary)',
                      border: '1px solid var(--border)',
                      borderRadius: '0.4rem',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="All">All Teams</option>
                    {uniqueTeams.map(t => (
                      <option key={t} value={t}>Team {t}</option>
                    ))}
                  </select>
                </div>

              </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-light)', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Rank</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Candidate</th>
                    <th style={{ padding: '0.75rem 1rem' }}>WhatsApp</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Team</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Round</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Score</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Submitted At</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedResults.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        No quiz submissions recorded yet for the selected filters.
                      </td>
                    </tr>
                  ) : (
                    sortedResults.map((r, i) => (
                      <tr 
                        key={i}
                        style={{ borderBottom: '1px solid var(--border-light)', transition: 'background-color 0.15s ease' }}
                        onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        <td style={{ padding: '0.9rem 1rem', fontWeight: '800', color: i < 3 ? '#F59E0B' : 'var(--text-secondary)' }}>
                          #{i + 1}
                        </td>
                        <td style={{ padding: '0.9rem 1rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                          {r.fullName}
                        </td>
                        <td style={{ padding: '0.9rem 1rem', color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                          {r.whatsApp}
                        </td>
                        <td style={{ padding: '0.9rem 1rem' }}>
                          <span style={{
                            padding: '0.2rem 0.6rem',
                            backgroundColor: 'rgba(16, 185, 129, 0.12)',
                            color: 'var(--success)',
                            borderRadius: '0.35rem',
                            fontSize: '0.8rem',
                            fontWeight: '700'
                          }}>
                            {r.team}
                          </span>
                        </td>
                        <td style={{ padding: '0.9rem 1rem' }}>
                          <span style={{
                            padding: '0.2rem 0.6rem',
                            backgroundColor: 'var(--surface-secondary)',
                            borderRadius: '0.35rem',
                            fontSize: '0.8rem',
                            border: '1px solid var(--border-light)'
                          }}>
                            {r.round}
                          </span>
                        </td>
                        <td style={{ padding: '0.9rem 1rem', textAlign: 'center' }}>
                          <span style={{ fontWeight: '800', color: 'var(--accent-hover)', fontSize: '1rem' }}>
                            {r.score}
                          </span>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}> / {r.totalQuestions}</span>
                        </td>
                        <td style={{ padding: '0.9rem 1rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                          {new Date(r.timestamp).toLocaleString("en-GB")}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

      </main>
    </div>
  );
}
