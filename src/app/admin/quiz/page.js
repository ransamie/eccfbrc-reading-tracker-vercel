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
  Copy, 
  CheckCheck, 
  Share2, 
  Power, 
  Pencil, 
  X,
  FileText,
  Upload,
  Sparkles,
  HelpCircle,
  Clock,
  ListOrdered,
  Key,
  BookOpen,
  RefreshCw,
  Sliders
} from "lucide-react";
import { parseQuizQuestions } from "@/lib/quizParser";

export default function AdminQuizPage() {
  const [pin, setPin] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");
  const [loading, setLoading] = useState(false);

  // Workspace Tabs: 'control' | 'builder' | 'bulk' | 'ai' | 'leaderboard'
  const [activeTab, setActiveTab] = useState("control");
  
  // Data States
  const [settings, setSettings] = useState({ Active_Round: "Round 1", Time_Limit_Minutes: "15", Is_Quiz_Live: "FALSE" });
  const [isQuizLive, setIsQuizLive] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [results, setResults] = useState([]);
  const [selectedRoundFilter, setSelectedRoundFilter] = useState("All");
  const [selectedTeamFilter, setSelectedTeamFilter] = useState("All");
  const [copiedLink, setCopiedLink] = useState(false);
  const [quizUrl, setQuizUrl] = useState("");

  // Toast
  const [toastMessage, setToastMessage] = useState("");
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  // Edit / Create Single Form States
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [questionForm, setQuestionForm] = useState({
    round: "Round 1",
    question: "",
    option1: "",
    option2: "",
    option3: "",
    option4: "",
    correctAnswer: ""
  });
  const [saveStatus, setSaveStatus] = useState("");

  // Bulk Importer States
  const [bulkText, setBulkText] = useState("");
  const [bulkRound, setBulkRound] = useState("Round 1");
  const [parsedBulk, setParsedBulk] = useState({ questions: [], errors: [], totalDetected: 0 });
  const [bulkImporting, setBulkImporting] = useState(false);

  // AI Generator States
  const [aiRound, setAiRound] = useState("Round 7");
  const [aiScripture, setAiScripture] = useState("Colossians 3 - Hebrews 6");
  const [aiCount, setAiCount] = useState(10);
  const [aiDifficulty, setAiDifficulty] = useState("Balanced");
  const [aiCustomInstructions, setAiCustomInstructions] = useState("");
  const [aiApiKey, setAiApiKey] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiGeneratedQuestions, setAiGeneratedQuestions] = useState([]);
  const [aiSaving, setAiSaving] = useState(false);
  const [showApiKeySetting, setShowApiKeySetting] = useState(false);

  // 1. Check Authentication on Mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      setQuizUrl(`${window.location.origin}/quiz`);
      const savedAiKey = sessionStorage.getItem("admin_gemini_api_key") || "";
      if (savedAiKey) setAiApiKey(savedAiKey);
    }

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
        const loadedSettings = data.settings || { Active_Round: "Round 1", Time_Limit_Minutes: "15", Is_Quiz_Live: "FALSE" };
        setSettings(loadedSettings);
        setIsQuizLive(String(loadedSettings.Is_Quiz_Live).toUpperCase() === "TRUE");
        setQuestions(data.questions || []);
        setResults(data.results || []);
        setQuestionForm(prev => ({ ...prev, round: loadedSettings.Active_Round || "Round 1" }));
        setBulkRound(loadedSettings.Active_Round || "Round 1");
        setAiRound(loadedSettings.Active_Round || "Round 7");
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

  const fetchWorkspaceData = async () => {
    if (!pin) return;
    try {
      const res = await fetch("/api/quiz/admin", {
        headers: { "Authorization": pin }
      });
      if (res.ok) {
        const data = await res.json();
        const loadedSettings = data.settings || { Active_Round: "Round 1", Time_Limit_Minutes: "15", Is_Quiz_Live: "FALSE" };
        setSettings(loadedSettings);
        setIsQuizLive(String(loadedSettings.Is_Quiz_Live).toUpperCase() === "TRUE");
        setQuestions(data.questions || []);
        setResults(data.results || []);
      }
    } catch (e) {
      console.error(e);
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

  // 2. Settings Updates (Active Round, Time Limit, Live Switch)
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSaveStatus("");

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
          timeLimitMinutes: settings.Time_Limit_Minutes,
          isQuizLive: isQuizLive
        })
      });

      if (res.ok) {
        setSaveStatus("Settings saved successfully!");
        showToast("Settings updated successfully!");
      } else {
        setSaveStatus("Failed to save settings.");
      }
    } catch (err) {
      setSaveStatus("Error connecting to server.");
    } finally {
      setLoading(false);
      setTimeout(() => setSaveStatus(""), 3500);
    }
  };

  // 3. Single Question Form (Add / Edit)
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!questionForm.correctAnswer) {
      alert("Please designate a correct answer by selecting the corresponding option!");
      setLoading(false);
      return;
    }

    try {
      if (editingQuestionId) {
        const res = await fetch("/api/quiz/admin", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": pin
          },
          body: JSON.stringify({
            action: "updateQuestion",
            id: editingQuestionId,
            question: questionForm
          })
        });

        if (res.ok) {
          showToast("Question updated successfully!");
          setQuestions(prev => prev.map(q => q.id === editingQuestionId ? { ...questionForm, id: editingQuestionId } : q));
          handleCancelEdit();
        } else {
          alert("Failed to update question.");
        }
      } else {
        const res = await fetch("/api/quiz/admin", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": pin
          },
          body: JSON.stringify({
            action: "addQuestion",
            question: questionForm
          })
        });

        if (res.ok) {
          const data = await res.json();
          showToast("Question added successfully!");
          setQuestions(prev => [{ ...questionForm, id: data.id }, ...prev]);
          setQuestionForm(prev => ({
            ...prev,
            question: "",
            option1: "",
            option2: "",
            option3: "",
            option4: "",
            correctAnswer: ""
          }));
        } else {
          alert("Failed to add question.");
        }
      }
    } catch (err) {
      alert("Failed to save question.");
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (q) => {
    setEditingQuestionId(q.id);
    setQuestionForm({
      round: q.round || "Round 1",
      question: q.question || "",
      option1: q.option1 || "",
      option2: q.option2 || "",
      option3: q.option3 || "",
      option4: q.option4 || "",
      correctAnswer: q.correctAnswer || ""
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingQuestionId(null);
    setQuestionForm(prev => ({
      ...prev,
      round: settings.Active_Round || "Round 1",
      question: "",
      option1: "",
      option2: "",
      option3: "",
      option4: "",
      correctAnswer: ""
    }));
  };

  const handleDeleteQuestion = async (id) => {
    if (!confirm("Are you sure you want to delete this question?")) return;

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
        showToast("Question deleted.");
        setQuestions(prev => prev.filter(q => q.id !== id));
        if (editingQuestionId === id) handleCancelEdit();
      } else {
        alert("Failed to delete question.");
      }
    } catch (err) {
      alert("Error deleting question.");
    }
  };

  // 4. Bulk Importer Handlers
  const handleBulkTextChange = (text) => {
    setBulkText(text);
    if (!text.trim()) {
      setParsedBulk({ questions: [], errors: [], totalDetected: 0 });
      return;
    }
    const result = parseQuizQuestions(text, bulkRound);
    setParsedBulk(result);
  };

  const handleBulkRoundChange = (r) => {
    setBulkRound(r);
    if (bulkText.trim()) {
      const result = parseQuizQuestions(bulkText, r);
      setParsedBulk(result);
    }
  };

  const handleExecuteBulkImport = async () => {
    if (parsedBulk.questions.length === 0) return;
    setBulkImporting(true);
    try {
      const res = await fetch("/api/quiz/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": pin
        },
        body: JSON.stringify({
          action: "bulkAddQuestions",
          questions: parsedBulk.questions
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to bulk import questions");
      
      showToast(`Successfully imported ${data.count} questions to ${bulkRound}!`);
      setBulkText("");
      setParsedBulk({ questions: [], errors: [], totalDetected: 0 });
      fetchWorkspaceData();
      setActiveTab("builder");
    } catch (e) {
      alert(e.message || "Failed to import questions");
    } finally {
      setBulkImporting(false);
    }
  };

  // 5. AI Question Generator Handlers
  const handleTriggerAIGenerate = async (e) => {
    if (e) e.preventDefault();
    if (!aiScripture.trim()) {
      alert("Please specify the scripture range (e.g. Colossians 3 - Hebrews 6)");
      return;
    }

    setAiGenerating(true);
    setAiGeneratedQuestions([]);

    try {
      const res = await fetch("/api/quiz/ai-generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": pin
        },
        body: JSON.stringify({
          round: aiRound,
          scripture: aiScripture,
          questionCount: aiCount,
          difficulty: aiDifficulty,
          customInstructions: aiCustomInstructions,
          apiKey: aiApiKey
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate questions with AI.");
      }

      setAiGeneratedQuestions(data.questions || []);
      showToast(`✨ Generated ${data.questions.length} questions from ${aiScripture}!`);
      
      if (aiApiKey) {
        sessionStorage.setItem("admin_gemini_api_key", aiApiKey);
      }
    } catch (err) {
      alert(err.message || "AI Generation error. Please check your internet or Gemini API key.");
    } finally {
      setAiGenerating(false);
    }
  };

  const handleUpdateAIQuestionField = (idx, field, value) => {
    setAiGeneratedQuestions(prev => prev.map((q, i) => {
      if (i === idx) {
        return { ...q, [field]: value };
      }
      return q;
    }));
  };

  const handleSelectAICorrectAnswer = (idx, answerText) => {
    setAiGeneratedQuestions(prev => prev.map((q, i) => {
      if (i === idx) {
        return { ...q, correctAnswer: answerText };
      }
      return q;
    }));
  };

  const handleRemoveAIQuestion = (idx) => {
    setAiGeneratedQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSaveAIGeneratedToBank = async () => {
    if (aiGeneratedQuestions.length === 0) return;
    setAiSaving(true);
    try {
      const res = await fetch("/api/quiz/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": pin
        },
        body: JSON.stringify({
          action: "bulkAddQuestions",
          questions: aiGeneratedQuestions
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save AI questions to bank.");

      showToast(`Saved ${data.count} AI generated questions to ${aiRound}!`);
      setAiGeneratedQuestions([]);
      fetchWorkspaceData();
      setActiveTab("builder");
    } catch (e) {
      alert(e.message || "Failed to save questions to database.");
    } finally {
      setAiSaving(false);
    }
  };

  const sampleQABlock = `1. Who led the children of Israel across the Red Sea?
A. Aaron
B. Moses
C. Joshua
D. Caleb
Answer: B

2. How many days and nights did rain fall during Noah's flood?
A. 30 days
B. 50 days
C. 40 days
D. 70 days
Answer: C

3. Which apostle was known as the 'beloved disciple'?
*A. John
B. Peter
C. James
D. Andrew`;

  const sampleTableBlock = `Who was the first king of Israel?\tDavid\tSaul\tSolomon\tSamuel\tSaul
Where was Jesus born?\tNazareth\tJerusalem\tBethlehem\tJericho\tBethlehem`;

  // 6. Copy Link Handler
  const handleCopyLink = () => {
    if (typeof window !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(quizUrl);
      setCopiedLink(true);
      showToast("Quiz Link copied to clipboard!");
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // Filtered Questions and Leaderboard
  const uniqueRounds = Array.from(new Set(questions.map(q => q.round).filter(Boolean)));
  const uniqueTeams = Array.from(new Set(results.map(r => r.team).filter(Boolean))).sort((a, b) => {
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return String(a).localeCompare(String(b));
  });

  const sortedResults = results
    .filter(r => selectedRoundFilter === "All" || r.round === selectedRoundFilter)
    .filter(r => selectedTeamFilter === "All" || r.team === selectedTeamFilter)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(a.timestamp || 0) - new Date(b.timestamp || 0);
    });

  // --- SCREEN 1: ADMIN LOGIN ---
  if (!isAuthenticated) {
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
          maxWidth: '400px',
          width: '100%',
          backgroundColor: 'rgba(17, 24, 39, 0.75)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '1.25rem',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5)',
          padding: '2.5rem 2rem',
          textAlign: 'center'
        }}>
          
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            backgroundColor: 'rgba(37, 99, 235, 0.15)',
            border: '1.5px solid var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem auto',
            boxShadow: '0 0 25px rgba(37, 99, 235, 0.25)'
          }}>
            <Lock size={30} style={{ color: 'var(--accent)' }} />
          </div>

          <h1 style={{ fontSize: '1.45rem', fontWeight: '800', margin: '0 0 0.4rem 0' }}>
            Quiz Control Center
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: '0 0 1.75rem 0' }}>
            Super Admin access required to manage settings and questions.
          </p>

          <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input
              type="password"
              placeholder="Enter Super Admin PIN"
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
      
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          backgroundColor: '#10B981',
          color: '#fff',
          padding: '0.75rem 1.25rem',
          borderRadius: '0.6rem',
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          zIndex: 100,
          fontWeight: 600,
          fontSize: '0.9rem'
        }}>
          <Check size={18} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <header style={{
        backgroundColor: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        padding: '0.85rem 1.25rem',
        position: 'sticky',
        top: 0,
        zIndex: 40
      }}>
        <div style={{ maxWidth: '1050px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: '#000',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px'
            }}>
              <img src="/eccfbrclogo.png" alt="ECCF Logo" style={{ maxWidth: '28px', maxHeight: '28px', objectFit: 'contain' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: '800', margin: 0, lineHeight: '1.2' }}>Quiz Control Center</h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Super Admin Workspace</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <a 
              href="/"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.85rem',
                backgroundColor: 'var(--surface-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                borderRadius: '0.5rem',
                fontSize: '0.85rem',
                fontWeight: '600',
                textDecoration: 'none',
                transition: 'all 0.2s ease'
              }}
            >
              <ArrowLeft size={15} /> Dashboard
            </a>

            <button
              onClick={handleLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.85rem',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                color: '#F87171',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: '0.5rem',
                fontSize: '0.85rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              <LogOut size={15} /> Logout
            </button>
          </div>

        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '1050px', margin: '1.5rem auto 0 auto', padding: '0 1rem' }}>
        
        {/* Tab Buttons */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)', marginBottom: '1.75rem', gap: '0.5rem', overflowX: 'auto' }}>
          {[
            { id: 'control', label: 'Control Center', icon: Settings },
            { id: 'builder', label: editingQuestionId ? 'Editing Question' : 'Question Builder', icon: editingQuestionId ? Pencil : PlusCircle },
            { id: 'bulk', label: 'Bulk Import', icon: Upload },
            { id: 'ai', label: '✨ AI Generator', icon: Sparkles },
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
                  gap: '0.45rem',
                  padding: '0.75rem 1.1rem',
                  background: 'none',
                  border: 'none',
                  borderBottom: `3px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
                  color: isActive ? '#fff' : 'var(--text-secondary)',
                  fontSize: '0.92rem',
                  fontWeight: isActive ? '700' : '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap'
                }}
              >
                <Icon size={17} style={{ color: isActive ? (tab.id === 'ai' ? '#F59E0B' : 'var(--accent)') : 'inherit' }} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: CONTROL CENTER */}
        {activeTab === 'control' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '680px' }}>
            
            {/* Shareable Link Card */}
            <div style={{
              backgroundColor: 'var(--surface)',
              borderRadius: '1rem',
              border: '1px solid var(--border)',
              padding: '1.5rem',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <Share2 size={18} style={{ color: 'var(--accent)' }} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: '700', margin: 0 }}>Participant Quiz Link</h3>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 1rem 0' }}>
                Copy and share this direct link with your reading team members when the quiz is ready.
              </p>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: 'var(--surface-secondary)',
                border: '1px solid var(--border)',
                borderRadius: '0.65rem',
                padding: '0.4rem 0.5rem 0.4rem 0.9rem'
              }}>
                <input
                  type="text"
                  readOnly
                  value={quizUrl}
                  style={{
                    flex: 1,
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: 'var(--text-primary)',
                    fontSize: '0.88rem',
                    outline: 'none',
                    fontFamily: 'monospace'
                  }}
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.55rem 1rem',
                    backgroundColor: copiedLink ? 'var(--success)' : 'var(--accent)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {copiedLink ? <CheckCheck size={16} /> : <Copy size={16} />}
                  <span>{copiedLink ? "Copied!" : "Copy Link"}</span>
                </button>
              </div>
            </div>

            {/* Global Settings Form */}
            <div style={{
              backgroundColor: 'var(--surface)',
              borderRadius: '1rem',
              border: '1px solid var(--border)',
              padding: '1.5rem',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)'
            }}>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <Settings size={20} style={{ color: 'var(--accent)' }} />
                <h3 style={{ fontSize: '1.15rem', fontWeight: '700', margin: 0 }}>Quiz Configuration</h3>
              </div>

              <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                {/* Live / Coming Soon Switch Card */}
                <div style={{
                  padding: '1.25rem',
                  borderRadius: '0.75rem',
                  backgroundColor: isQuizLive ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                  border: `1.5px solid ${isQuizLive ? 'var(--success)' : '#F59E0B'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  flexWrap: 'wrap'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <Power size={18} color={isQuizLive ? "#10B981" : "#F59E0B"} />
                      <span style={{ fontSize: '1rem', fontWeight: '800', color: isQuizLive ? '#34D399' : '#FCD34D' }}>
                        {isQuizLive ? "Quiz is LIVE & Active" : "Quiz is in Maintenance (Coming Soon)"}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      {isQuizLive 
                        ? "Participants can currently access, start, and submit their quiz."
                        : "Access is blocked. Visitors will see the Coming Soon holding screen."}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsQuizLive(!isQuizLive)}
                    style={{
                      padding: '0.65rem 1.25rem',
                      borderRadius: '0.5rem',
                      border: 'none',
                      backgroundColor: isQuizLive ? '#EF4444' : '#10B981',
                      color: '#fff',
                      fontSize: '0.88rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                      transition: 'all 0.2s ease',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {isQuizLive ? "Close Quiz" : "Go Live Now"}
                  </button>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    Active Round Tag
                  </label>
                  <input
                    type="text"
                    value={settings.Active_Round}
                    onChange={(e) => setSettings(prev => ({ ...prev, Active_Round: e.target.value }))}
                    placeholder="e.g. Round 8"
                    required
                    style={{
                      width: '100%',
                      padding: '0.8rem 1rem',
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
                    Participants will take questions assigned to this exact round tag.
                  </span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    Time Limit (Minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={settings.Time_Limit_Minutes}
                    onChange={(e) => setSettings(prev => ({ ...prev, Time_Limit_Minutes: e.target.value }))}
                    required
                    style={{
                      width: '100%',
                      padding: '0.8rem 1rem',
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
                    Unstoppable countdown timer allocated per candidate session.
                  </span>
                </div>

                {saveStatus && (
                  <div style={{
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    backgroundColor: saveStatus.includes('success') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: saveStatus.includes('success') ? '#34D399' : '#F87171',
                    fontSize: '0.88rem',
                    fontWeight: '600'
                  }}>
                    {saveStatus}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: '0.85rem',
                    background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
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
                    boxShadow: '0 8px 20px rgba(37, 99, 235, 0.3)',
                    marginTop: '0.5rem'
                  }}
                >
                  <Save size={18} />
                  <span>{loading ? "Saving..." : "Save Settings"}</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 2: QUESTION BUILDER (Single Edit / Create + Bank) */}
        {activeTab === 'builder' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', alignItems: 'flex-start' }}>
            
            {/* Form Column */}
            <div style={{
              backgroundColor: 'var(--surface)',
              borderRadius: '1rem',
              border: `1.5px solid ${editingQuestionId ? 'var(--accent)' : 'var(--border)'}`,
              padding: '1.5rem',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)'
            }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {editingQuestionId ? (
                    <>
                      <Pencil size={18} style={{ color: 'var(--accent-hover)' }} /> Edit Question
                    </>
                  ) : (
                    <>
                      <PlusCircle size={18} style={{ color: 'var(--accent)' }} /> Add Single Question
                    </>
                  )}
                </h3>

                {editingQuestionId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      padding: '0.35rem 0.65rem',
                      borderRadius: '0.4rem',
                      fontSize: '0.78rem',
                      cursor: 'pointer'
                    }}
                  >
                    <X size={14} /> Cancel
                  </button>
                )}
              </div>

              <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Round Tag
                  </label>
                  <input
                    type="text"
                    value={questionForm.round}
                    onChange={(e) => setQuestionForm(prev => ({ ...prev, round: e.target.value }))}
                    placeholder="e.g. Round 8"
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
                    value={questionForm.question}
                    onChange={(e) => setQuestionForm(prev => ({ ...prev, question: e.target.value }))}
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
                      const isCorrect = questionForm.correctAnswer === questionForm[`option${num}`] && questionForm[`option${num}`] !== "";

                      return (
                        <div 
                          key={num} 
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.65rem',
                            backgroundColor: isCorrect ? 'rgba(16, 185, 129, 0.12)' : 'var(--surface-secondary)',
                            border: `1px solid ${isCorrect ? 'var(--success)' : 'var(--border)'}`,
                            borderRadius: '0.5rem',
                            padding: '0.35rem 0.65rem',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <input
                            type="radio"
                            name="correctAnswerOption"
                            checked={isCorrect}
                            onChange={() => {
                              if (questionForm[`option${num}`]) {
                                setQuestionForm(prev => ({ ...prev, correctAnswer: prev[`option${num}`] }));
                              }
                            }}
                            style={{ cursor: 'pointer', transform: 'scale(1.15)' }}
                          />
                          <input
                            type="text"
                            placeholder={`Option ${num}`}
                            value={questionForm[`option${num}`]}
                            onChange={(e) => {
                              const val = e.target.value;
                              setQuestionForm(prev => {
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

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      flex: 1,
                      padding: '0.85rem',
                      background: editingQuestionId ? 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '0.6rem',
                      fontSize: '0.95rem',
                      fontWeight: '700',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    {editingQuestionId ? <Save size={16} /> : <PlusCircle size={16} />}
                    <span>{editingQuestionId ? "Update Question" : "Add Question"}</span>
                  </button>

                  {editingQuestionId && (
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      style={{
                        padding: '0.85rem 1rem',
                        backgroundColor: 'var(--surface-secondary)',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border-light)',
                        borderRadius: '0.6rem',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Questions Bank List */}
            <div style={{
              backgroundColor: 'var(--surface)',
              borderRadius: '1rem',
              border: '1px solid var(--border)',
              padding: '1.5rem',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)'
            }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0 }}>Questions ({questions.length})</h3>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Filter size={15} style={{ color: 'var(--text-secondary)' }} />
                  
                  {/* Native Clean Dropdown with Proper Spacing */}
                  <select
                    value={selectedRoundFilter}
                    onChange={(e) => setSelectedRoundFilter(e.target.value)}
                    style={{
                      padding: '0.45rem 0.85rem',
                      backgroundColor: 'var(--surface-secondary)',
                      border: '1px solid var(--border)',
                      borderRadius: '0.5rem',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      outline: 'none',
                      cursor: 'pointer',
                      minWidth: '120px'
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', maxHeight: '550px', overflowY: 'auto', paddingRight: '0.35rem' }}>
                {questions.filter(q => selectedRoundFilter === "All" || q.round === selectedRoundFilter).length === 0 ? (
                  <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No questions found for this round.
                  </div>
                ) : (
                  questions
                    .filter(q => selectedRoundFilter === "All" || q.round === selectedRoundFilter)
                    .map((q) => {
                      const isBeingEdited = editingQuestionId === q.id;

                      return (
                        <div
                          key={q.id}
                          style={{
                            backgroundColor: isBeingEdited ? 'rgba(37, 99, 235, 0.12)' : 'var(--surface-secondary)',
                            border: `1px solid ${isBeingEdited ? 'var(--accent)' : 'var(--border-light)'}`,
                            borderRadius: '0.75rem',
                            padding: '1rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: '0.75rem',
                            alignItems: 'flex-start',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, backgroundColor: 'var(--accent-light)', color: 'var(--accent-hover)', padding: '0.15rem 0.5rem', borderRadius: '0.3rem' }}>
                                {q.round}
                              </span>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>ID: {q.id}</span>
                              {isBeingEdited && (
                                <span style={{ fontSize: '0.7rem', color: 'var(--accent-hover)', fontWeight: 700 }}>
                                  [Editing]
                                </span>
                              )}
                            </div>

                            <p style={{ margin: '0 0 0.75rem 0', fontWeight: '600', fontSize: '0.92rem', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                              {q.question}
                            </p>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.4rem' }}>
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

                          {/* Action Buttons: Edit and Delete */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flexShrink: 0 }}>
                            <button
                              onClick={() => handleStartEdit(q)}
                              title="Edit question"
                              style={{
                                backgroundColor: isBeingEdited ? 'var(--accent)' : 'rgba(37, 99, 235, 0.12)',
                                border: '1px solid rgba(37, 99, 235, 0.3)',
                                color: isBeingEdited ? '#fff' : 'var(--accent-hover)',
                                padding: '0.45rem',
                                borderRadius: '0.45rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <Pencil size={15} />
                            </button>

                            <button
                              onClick={() => handleDeleteQuestion(q.id)}
                              title="Delete question"
                              style={{
                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.25)',
                                color: '#F87171',
                                padding: '0.45rem',
                                borderRadius: '0.45rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>

            </div>

          </div>
        )}

        {/* TAB 3: BULK IMPORTER */}
        {activeTab === 'bulk' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '820px' }}>
            
            <div style={{
              backgroundColor: 'var(--surface)',
              borderRadius: '1rem',
              border: '1px solid var(--border)',
              padding: '1.5rem',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)'
            }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Upload size={20} style={{ color: 'var(--accent)' }} />
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: '800', margin: 0 }}>Bulk Import Questions</h3>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      Paste questions directly from your Word document, WhatsApp, or notes
                    </span>
                  </div>
                </div>

                {/* Target Round Selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Target Round:</span>
                  <input
                    type="text"
                    value={bulkRound}
                    onChange={(e) => handleBulkRoundChange(e.target.value)}
                    placeholder="e.g. Round 8"
                    style={{
                      width: '110px',
                      padding: '0.45rem 0.75rem',
                      backgroundColor: 'var(--surface-secondary)',
                      border: '1px solid var(--border)',
                      borderRadius: '0.5rem',
                      color: 'var(--text-primary)',
                      fontSize: '0.88rem',
                      fontWeight: '700',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Sample Format Quick Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => handleBulkTextChange(sampleQABlock)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.4rem 0.75rem',
                    backgroundColor: 'rgba(37, 99, 235, 0.12)',
                    border: '1px solid rgba(37, 99, 235, 0.3)',
                    borderRadius: '0.4rem',
                    color: 'var(--accent-hover)',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  <FileText size={14} /> Load Sample Q&A Text
                </button>

                <button
                  type="button"
                  onClick={() => handleBulkTextChange(sampleTableBlock)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.4rem 0.75rem',
                    backgroundColor: 'rgba(16, 185, 129, 0.12)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '0.4rem',
                    color: '#34D399',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  <ListOrdered size={14} /> Load Sample Table
                </button>

                {bulkText && (
                  <button
                    type="button"
                    onClick={() => handleBulkTextChange("")}
                    style={{
                      padding: '0.4rem 0.75rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-light)',
                      borderRadius: '0.4rem',
                      color: 'var(--text-secondary)',
                      fontSize: '0.8rem',
                      cursor: 'pointer'
                    }}
                  >
                    Clear Text
                  </button>
                )}
              </div>

              {/* Paste Textarea */}
              <textarea
                rows={12}
                value={bulkText}
                onChange={(e) => handleBulkTextChange(e.target.value)}
                placeholder={`Paste your questions document here...\n\nExample:\n1. Who was the first king of Israel?\nA. David\nB. Saul\nC. Solomon\nD. Samuel\nAnswer: B`}
                style={{
                  width: '100%',
                  padding: '1rem',
                  backgroundColor: 'var(--surface-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: '0.75rem',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                  fontFamily: 'monospace',
                  lineHeight: '1.55',
                  outline: 'none',
                  boxSizing: 'border-box',
                  resize: 'vertical'
                }}
              />

              {/* Real-time Parser Results Bar */}
              {bulkText.trim() && (
                <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    borderRadius: '0.6rem',
                    backgroundColor: parsedBulk.questions.length > 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                    border: `1px solid ${parsedBulk.questions.length > 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                  }}>
                    <span style={{ fontSize: '0.92rem', fontWeight: 700, color: parsedBulk.questions.length > 0 ? '#34D399' : '#F87171' }}>
                      {parsedBulk.questions.length > 0 
                        ? `✓ ${parsedBulk.questions.length} Question${parsedBulk.questions.length > 1 ? 's' : ''} successfully parsed for ${bulkRound}` 
                        : "No valid questions detected in the pasted text."}
                    </span>

                    <button
                      type="button"
                      disabled={parsedBulk.questions.length === 0 || bulkImporting}
                      onClick={handleExecuteBulkImport}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        padding: '0.65rem 1.25rem',
                        backgroundColor: 'var(--success)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '0.5rem',
                        fontSize: '0.92rem',
                        fontWeight: '700',
                        cursor: parsedBulk.questions.length === 0 || bulkImporting ? 'not-allowed' : 'pointer',
                        opacity: parsedBulk.questions.length === 0 || bulkImporting ? 0.6 : 1,
                        boxShadow: '0 4px 15px rgba(16, 185, 129, 0.35)'
                      }}
                    >
                      <Upload size={16} />
                      <span>{bulkImporting ? "Importing..." : `Import All (${parsedBulk.questions.length})`}</span>
                    </button>
                  </div>

                  {parsedBulk.errors.length > 0 && (
                    <div style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '0.6rem',
                      backgroundColor: 'rgba(245, 158, 11, 0.12)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      fontSize: '0.82rem',
                      color: '#FCD34D'
                    }}>
                      <strong>Notice:</strong>
                      <ul style={{ margin: '0.35rem 0 0 1rem', padding: 0 }}>
                        {parsedBulk.errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Live Parsed Preview Cards */}
                  {parsedBulk.questions.length > 0 && (
                    <div style={{ marginTop: '0.75rem' }}>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 0.6rem 0', color: 'var(--text-secondary)' }}>
                        Live Import Preview ({parsedBulk.questions.length} cards):
                      </h4>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '420px', overflowY: 'auto', paddingRight: '0.35rem' }}>
                        {parsedBulk.questions.map((q, idx) => (
                          <div 
                            key={idx}
                            style={{
                              backgroundColor: 'var(--surface-secondary)',
                              border: '1px solid var(--border-light)',
                              borderRadius: '0.65rem',
                              padding: '0.85rem 1rem'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                              <span style={{ fontSize: '0.72rem', fontWeight: 700, backgroundColor: 'var(--accent-light)', color: 'var(--accent-hover)', padding: '0.15rem 0.45rem', borderRadius: '0.3rem' }}>
                                #{idx + 1} • {q.round}
                              </span>
                            </div>

                            <p style={{ margin: '0 0 0.6rem 0', fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                              {q.question}
                            </p>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.4rem' }}>
                              {[
                                { label: 'A', val: q.option1 },
                                { label: 'B', val: q.option2 },
                                { label: 'C', val: q.option3 },
                                { label: 'D', val: q.option4 }
                              ].filter(o => Boolean(o.val)).map((opt, i) => {
                                const isAns = opt.val === q.correctAnswer;
                                return (
                                  <div
                                    key={i}
                                    style={{
                                      fontSize: '0.8rem',
                                      padding: '0.35rem 0.6rem',
                                      borderRadius: '0.35rem',
                                      backgroundColor: isAns ? 'rgba(16, 185, 129, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                                      color: isAns ? '#34D399' : 'var(--text-secondary)',
                                      border: `1px solid ${isAns ? 'var(--success)' : 'transparent'}`,
                                      fontWeight: isAns ? 700 : 400
                                    }}
                                  >
                                    <strong>{opt.label}.</strong> {opt.val} {isAns ? '✓' : ''}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              )}

            </div>

          </div>
        )}

        {/* TAB 4: ✨ AI QUESTION GENERATOR */}
        {activeTab === 'ai' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '880px' }}>
            
            {/* AI Generator Settings Card */}
            <div style={{
              backgroundColor: 'var(--surface)',
              borderRadius: '1rem',
              border: '1.5px solid rgba(245, 158, 11, 0.3)',
              padding: '1.75rem',
              boxShadow: '0 12px 35px rgba(0, 0, 0, 0.25)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              
              {/* Decorative Glow */}
              <div style={{
                position: 'absolute',
                top: '-40px',
                right: '-40px',
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(245, 158, 11, 0.2) 0%, transparent 70%)',
                pointerEvents: 'none'
              }}></div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    boxShadow: '0 4px 15px rgba(245, 158, 11, 0.35)'
                  }}>
                    <Sparkles size={22} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0 }}>AI Scripture Question Generator</h3>
                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Automatically generate biblically accurate multiple-choice questions for any reading passage.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowApiKeySetting(!showApiKeySetting)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.4rem 0.75rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid var(--border-light)',
                    borderRadius: '0.5rem',
                    color: 'var(--text-secondary)',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  <Key size={13} /> {showApiKeySetting ? "Hide API Key" : "Gemini API Key"}
                </button>
              </div>

              {/* Optional Gemini API Key Box */}
              {showApiKeySetting && (
                <div style={{
                  backgroundColor: 'var(--surface-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: '0.75rem',
                  padding: '1rem',
                  marginBottom: '1.25rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                      Google Gemini API Key (Optional Override)
                    </label>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '0.75rem', color: 'var(--accent-hover)', textDecoration: 'none' }}
                    >
                      Get Free Key at Google AI Studio ↗
                    </a>
                  </div>
                  <input
                    type="password"
                    value={aiApiKey}
                    onChange={(e) => setAiApiKey(e.target.value)}
                    placeholder="AIzaSy... (Leave empty to use server default GEMINI_API_KEY)"
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      backgroundColor: 'var(--surface)',
                      border: '1px solid var(--border-light)',
                      borderRadius: '0.5rem',
                      color: 'var(--text-primary)',
                      fontSize: '0.88rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              )}

              <form onSubmit={handleTriggerAIGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                  
                  {/* Round Tag */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                      Target Round Tag
                    </label>
                    <input
                      type="text"
                      value={aiRound}
                      onChange={(e) => setAiRound(e.target.value)}
                      placeholder="e.g. Round 7"
                      required
                      style={{
                        width: '100%',
                        padding: '0.75rem 0.9rem',
                        backgroundColor: 'var(--surface-secondary)',
                        border: '1px solid var(--border)',
                        borderRadius: '0.5rem',
                        color: 'var(--text-primary)',
                        fontSize: '0.92rem',
                        fontWeight: '600',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* Question Count */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                      Number of Questions
                    </label>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      {[5, 10, 15, 20].map(cnt => (
                        <button
                          key={cnt}
                          type="button"
                          onClick={() => setAiCount(cnt)}
                          style={{
                            flex: 1,
                            padding: '0.75rem 0.4rem',
                            backgroundColor: aiCount === cnt ? 'var(--accent)' : 'var(--surface-secondary)',
                            color: aiCount === cnt ? '#fff' : 'var(--text-secondary)',
                            border: `1px solid ${aiCount === cnt ? 'var(--accent)' : 'var(--border)'}`,
                            borderRadius: '0.5rem',
                            fontSize: '0.9rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {cnt}
                        </button>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Scripture Passage Range */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                    Scripture / Reading Plan Range
                  </label>
                  <input
                    type="text"
                    value={aiScripture}
                    onChange={(e) => setAiScripture(e.target.value)}
                    placeholder="e.g. Colossians 3 - Hebrews 6"
                    required
                    style={{
                      width: '100%',
                      padding: '0.8rem 1rem',
                      backgroundColor: 'var(--surface-secondary)',
                      border: '1px solid var(--border)',
                      borderRadius: '0.5rem',
                      color: 'var(--text-primary)',
                      fontSize: '0.95rem',
                      fontWeight: '600',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Examples:</span>
                    {["Colossians 3 - Hebrews 6", "Matthew 1 - 7", "Genesis 1 - 12", "Romans 1 - 8"].map(ex => (
                      <button
                        key={ex}
                        type="button"
                        onClick={() => setAiScripture(ex)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          color: 'var(--accent-hover)',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          textDecoration: 'underline'
                        }}
                      >
                        {ex}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Difficulty & Custom Instructions */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                      Question Difficulty
                    </label>
                    <select
                      value={aiDifficulty}
                      onChange={(e) => setAiDifficulty(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem 0.9rem',
                        backgroundColor: 'var(--surface-secondary)',
                        border: '1px solid var(--border)',
                        borderRadius: '0.5rem',
                        color: 'var(--text-primary)',
                        fontSize: '0.88rem',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="Balanced">Balanced (Standard Challenge)</option>
                      <option value="Easy">Foundational / Key Facts</option>
                      <option value="Challenging">In-depth / Chapter Details</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                      Extra Instructions (Optional)
                    </label>
                    <input
                      type="text"
                      value={aiCustomInstructions}
                      onChange={(e) => setAiCustomInstructions(e.target.value)}
                      placeholder="e.g. Focus on memory verses and faith"
                      style={{
                        width: '100%',
                        padding: '0.75rem 0.9rem',
                        backgroundColor: 'var(--surface-secondary)',
                        border: '1px solid var(--border)',
                        borderRadius: '0.5rem',
                        color: 'var(--text-primary)',
                        fontSize: '0.88rem',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={aiGenerating}
                  style={{
                    width: '100%',
                    padding: '0.95rem',
                    background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '0.65rem',
                    fontSize: '1rem',
                    fontWeight: '800',
                    cursor: aiGenerating ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 8px 25px rgba(245, 158, 11, 0.35)',
                    marginTop: '0.5rem',
                    opacity: aiGenerating ? 0.7 : 1
                  }}
                >
                  <Sparkles size={18} />
                  <span>{aiGenerating ? `Generating ${aiCount} Questions from Scripture...` : `✨ Generate ${aiCount} Questions with AI`}</span>
                </button>

              </form>
            </div>

            {/* Generated Questions Review Grid */}
            {aiGeneratedQuestions.length > 0 && (
              <div style={{
                backgroundColor: 'var(--surface)',
                borderRadius: '1rem',
                border: '1px solid var(--border)',
                padding: '1.5rem',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)'
              }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Check size={20} color="#10B981" /> Generated Questions ({aiGeneratedQuestions.length})
                    </h3>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      Review, edit wording or options before saving to your Google Sheets database.
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      disabled={aiSaving}
                      onClick={handleSaveAIGeneratedToBank}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        padding: '0.65rem 1.25rem',
                        backgroundColor: 'var(--success)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '0.5rem',
                        fontSize: '0.92rem',
                        fontWeight: '700',
                        cursor: aiSaving ? 'not-allowed' : 'pointer',
                        boxShadow: '0 4px 15px rgba(16, 185, 129, 0.35)'
                      }}
                    >
                      <Save size={16} />
                      <span>{aiSaving ? "Saving to Database..." : `Save All (${aiGeneratedQuestions.length}) to Question Bank`}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAiGeneratedQuestions([])}
                      style={{
                        padding: '0.65rem 0.85rem',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--border-light)',
                        borderRadius: '0.5rem',
                        color: 'var(--text-secondary)',
                        fontSize: '0.85rem',
                        cursor: 'pointer'
                      }}
                    >
                      Discard
                    </button>
                  </div>
                </div>

                {/* Editable Question Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '650px', overflowY: 'auto', paddingRight: '0.35rem' }}>
                  {aiGeneratedQuestions.map((q, idx) => (
                    <div 
                      key={idx}
                      style={{
                        backgroundColor: 'var(--surface-secondary)',
                        border: '1px solid var(--border-light)',
                        borderRadius: '0.75rem',
                        padding: '1.25rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, backgroundColor: 'var(--accent-light)', color: 'var(--accent-hover)', padding: '0.2rem 0.55rem', borderRadius: '0.35rem' }}>
                          Question {idx + 1} • {q.round}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleRemoveAIQuestion(idx)}
                          title="Remove this question"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#F87171',
                            cursor: 'pointer',
                            padding: '0.25rem',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {/* Question Prompt Editor */}
                      <textarea
                        rows={2}
                        value={q.question}
                        onChange={(e) => handleUpdateAIQuestionField(idx, 'question', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.65rem 0.85rem',
                          backgroundColor: 'var(--surface)',
                          border: '1px solid var(--border)',
                          borderRadius: '0.5rem',
                          color: 'var(--text-primary)',
                          fontSize: '0.92rem',
                          fontWeight: '600',
                          marginBottom: '0.75rem',
                          outline: 'none',
                          boxSizing: 'border-box',
                          resize: 'vertical'
                        }}
                      />

                      {/* 4 Options & Correct Answer Selector */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.5rem' }}>
                        {[
                          { key: 'option1', label: 'A' },
                          { key: 'option2', label: 'B' },
                          { key: 'option3', label: 'C' },
                          { key: 'option4', label: 'D' }
                        ].map((opt) => {
                          const isCorrect = q.correctAnswer === q[opt.key] && q[opt.key] !== "";

                          return (
                            <div 
                              key={opt.key}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                backgroundColor: isCorrect ? 'rgba(16, 185, 129, 0.15)' : 'var(--surface)',
                                border: `1px solid ${isCorrect ? 'var(--success)' : 'var(--border-light)'}`,
                                borderRadius: '0.45rem',
                                padding: '0.35rem 0.65rem'
                              }}
                            >
                              <input
                                type="radio"
                                name={`correct_ai_${idx}`}
                                checked={isCorrect}
                                onChange={() => handleSelectAICorrectAnswer(idx, q[opt.key])}
                                style={{ cursor: 'pointer', transform: 'scale(1.1)' }}
                                title="Set as correct answer"
                              />
                              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{opt.label}.</span>
                              <input
                                type="text"
                                value={q[opt.key]}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  handleUpdateAIQuestionField(idx, opt.key, val);
                                  if (isCorrect) {
                                    handleSelectAICorrectAnswer(idx, val);
                                  }
                                }}
                                style={{
                                  flex: 1,
                                  backgroundColor: 'transparent',
                                  border: 'none',
                                  color: 'var(--text-primary)',
                                  fontSize: '0.85rem',
                                  outline: 'none'
                                }}
                              />
                              {isCorrect && (
                                <span style={{ fontSize: '0.72rem', color: 'var(--success)', fontWeight: 800 }}>✓</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            )}

          </div>
        )}

        {/* TAB 5: LIVE LEADERBOARD */}
        {activeTab === 'leaderboard' && (
          <div style={{
            backgroundColor: 'var(--surface)',
            borderRadius: '1rem',
            border: '1px solid var(--border)',
            padding: '1.5rem',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)'
          }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Trophy size={20} style={{ color: '#F59E0B' }} /> Submissions ({sortedResults.length})
              </h3>

              <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                
                {/* Round Filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Filter size={14} style={{ color: 'var(--text-secondary)' }} />
                  <select
                    value={selectedRoundFilter}
                    onChange={(e) => setSelectedRoundFilter(e.target.value)}
                    style={{
                      padding: '0.45rem 0.85rem',
                      backgroundColor: 'var(--surface-secondary)',
                      border: '1px solid var(--border)',
                      borderRadius: '0.5rem',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      outline: 'none',
                      cursor: 'pointer',
                      minWidth: '120px'
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
                  <Users size={14} style={{ color: 'var(--text-secondary)' }} />
                  <select
                    value={selectedTeamFilter}
                    onChange={(e) => setSelectedTeamFilter(e.target.value)}
                    style={{
                      padding: '0.45rem 0.85rem',
                      backgroundColor: 'var(--surface-secondary)',
                      border: '1px solid var(--border)',
                      borderRadius: '0.5rem',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      outline: 'none',
                      cursor: 'pointer',
                      minWidth: '120px'
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
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-light)', color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    <th style={{ padding: '0.65rem 0.75rem' }}>Rank</th>
                    <th style={{ padding: '0.65rem 0.75rem' }}>Candidate</th>
                    <th style={{ padding: '0.65rem 0.75rem' }}>WhatsApp</th>
                    <th style={{ padding: '0.65rem 0.75rem' }}>Team</th>
                    <th style={{ padding: '0.65rem 0.75rem' }}>Round</th>
                    <th style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>Score</th>
                    <th style={{ padding: '0.65rem 0.75rem' }}>Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedResults.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
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
                        <td style={{ padding: '0.75rem', fontWeight: '800', color: i < 3 ? '#F59E0B' : 'var(--text-secondary)' }}>
                          #{i + 1}
                        </td>
                        <td style={{ padding: '0.75rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                          {r.fullName}
                        </td>
                        <td style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                          {r.whatsapp}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <span style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent-hover)', padding: '0.2rem 0.5rem', borderRadius: '0.3rem', fontSize: '0.8rem', fontWeight: '700' }}>
                            Team {r.team}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>
                          {r.round}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <span style={{ 
                            fontWeight: '800', 
                            fontSize: '0.95rem',
                            color: (r.score / (r.totalQuestions || 10)) >= 0.7 ? '#34D399' : 'var(--text-primary)' 
                          }}>
                            {r.score}
                          </span>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}> / {r.totalQuestions}</span>
                        </td>
                        <td style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                          {r.timestamp ? new Date(r.timestamp).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : 'N/A'}
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
