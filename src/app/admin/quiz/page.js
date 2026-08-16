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
  Sliders,
  AlertTriangle,
  CheckCircle2,
  Info,
  Eye,
  Layers
} from "lucide-react";
import { parseQuizQuestions } from "@/lib/quizParser";

const DEFAULT_EDITIONS = [
  "New Testament (3 chapters daily)",
  "Entire Bible Reading (4 chapters daily)"
];

export default function AdminQuizPage() {
  const [pin, setPin] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");
  const [loading, setLoading] = useState(false);

  // Workspace Tabs: 'control' | 'builder' | 'bulk' | 'ai' | 'leaderboard'
  const [activeTab, setActiveTab] = useState("control");
  
  // Data States
  const [settings, setSettings] = useState({ 
    Active_Edition: "New Testament (3 chapters daily)",
    Active_Round: "Round 1", 
    Time_Limit_Minutes: "15", 
    Is_Quiz_Live: "FALSE" 
  });
  const [isQuizLive, setIsQuizLive] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [results, setResults] = useState([]);
  
  // Reading Schedule & Round UI filters
  const [selectedEdition, setSelectedEdition] = useState("New Testament (3 chapters daily)");
  const [selectedBankRound, setSelectedBankRound] = useState("All");
  const [selectedLeaderboardEdition, setSelectedLeaderboardEdition] = useState("All");
  const [selectedRoundFilter, setSelectedRoundFilter] = useState("All");
  const [selectedTeamFilter, setSelectedTeamFilter] = useState("All");
  const [showCustomEditionInput, setShowCustomEditionInput] = useState(false);
  const [newEditionName, setNewEditionName] = useState("");
  
  const [copiedLink, setCopiedLink] = useState(false);
  const [quizUrl, setQuizUrl] = useState("");

  // Toast
  const [toastMessage, setToastMessage] = useState("");
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  // Custom In-App Popup Modal Dialogs
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "danger", // 'danger' | 'warning' | 'info' | 'success'
    confirmText: "Confirm",
    cancelText: null,
    onConfirm: null
  });

  const showConfirm = ({ title = "Confirmation", message, type = "danger", confirmText = "Confirm", onConfirm }) => {
    setModalState({
      isOpen: true,
      title,
      message,
      type,
      confirmText,
      cancelText: "Cancel",
      onConfirm
    });
  };

  const showAlert = ({ title = "Notice", message, type = "info", confirmText = "Got it" }) => {
    setModalState({
      isOpen: true,
      title,
      message,
      type,
      confirmText,
      cancelText: null,
      onConfirm: () => setModalState(prev => ({ ...prev, isOpen: false, onConfirm: null }))
    });
  };

  const closeModal = () => {
    setModalState(prev => ({ ...prev, isOpen: false, onConfirm: null }));
  };

  // Edit / Create Single Form States
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [questionForm, setQuestionForm] = useState({
    edition: "New Testament (3 chapters daily)",
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
  const [bulkEdition, setBulkEdition] = useState("New Testament (3 chapters daily)");
  const [bulkText, setBulkText] = useState("");
  const [bulkRound, setBulkRound] = useState("Round 1");
  const [parsedBulk, setParsedBulk] = useState({ questions: [], errors: [], totalDetected: 0 });
  const [bulkImporting, setBulkImporting] = useState(false);

  // AI Generator States
  const [aiEdition, setAiEdition] = useState("New Testament (3 chapters daily)");
  const [aiRound, setAiRound] = useState("Round 7");
  const [aiScripture, setAiScripture] = useState("Colossians 3 - Hebrews 6");
  const [aiCount, setAiCount] = useState(10);
  const [aiDifficulty, setAiDifficulty] = useState("Balanced");
  const [aiCustomInstructions, setAiCustomInstructions] = useState("");
  const [aiApiKey, setAiApiKey] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiGeneratedQuestions, setAiGeneratedQuestions] = useState([]);
  const [aiSaving, setAiSaving] = useState(false);
  const [savingApiKey, setSavingApiKey] = useState(false);
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
        const loadedSettings = data.settings || { 
          Active_Edition: "New Testament (3 chapters daily)",
          Active_Round: "Round 1", 
          Time_Limit_Minutes: "15", 
          Is_Quiz_Live: "FALSE" 
        };
        setSettings(loadedSettings);
        setIsQuizLive(String(loadedSettings.Is_Quiz_Live).toUpperCase() === "TRUE");
        if (loadedSettings.Active_Edition) {
          setSelectedEdition(loadedSettings.Active_Edition);
          setBulkEdition(loadedSettings.Active_Edition);
          setAiEdition(loadedSettings.Active_Edition);
        }
        if (loadedSettings.GEMINI_API_KEY) {
          setAiApiKey(loadedSettings.GEMINI_API_KEY);
        }
        setQuestions(data.questions || []);
        setResults(data.results || []);
        setQuestionForm(prev => ({ 
          ...prev, 
          edition: loadedSettings.Active_Edition || "New Testament (3 chapters daily)",
          round: loadedSettings.Active_Round || "Round 1" 
        }));
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
        const loadedSettings = data.settings || { 
          Active_Edition: "New Testament (3 chapters daily)",
          Active_Round: "Round 1", 
          Time_Limit_Minutes: "15", 
          Is_Quiz_Live: "FALSE" 
        };
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

  // 2. Settings Updates (Active Edition, Active Round, Time Limit, Live Switch)
  const handleSaveSettings = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setSaveStatus("");

    try {
      const activeEd = settings.Active_Edition || "New Testament (3 chapters daily)";
      const res = await fetch("/api/quiz/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": pin
        },
        body: JSON.stringify({
          action: "updateSettings",
          activeEdition: activeEd,
          activeRound: settings.Active_Round,
          timeLimitMinutes: settings.Time_Limit_Minutes,
          isQuizLive: isQuizLive
        })
      });

      if (res.ok) {
        setSettings(prev => ({
          ...prev,
          Is_Quiz_Live: isQuizLive ? "TRUE" : "FALSE"
        }));
        setSaveStatus(isQuizLive ? `LIVE! ${settings.Active_Round} (${activeEd}) is active.` : "Maintenance saved to database.");
        showToast(isQuizLive ? `🚀 Quiz is LIVE for ${settings.Active_Round} • ${activeEd}!` : "🔒 Quiz is in Maintenance mode.");
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
      showAlert({
        title: "Designate Correct Answer",
        message: "Please select which option (Option 1, 2, 3, or 4) is the correct answer by clicking its radio dot.",
        type: "warning"
      });
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
          showAlert({
            title: "Update Failed",
            message: "Failed to update question in Google Sheets database.",
            type: "danger"
          });
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
          showToast(`Question added to ${questionForm.round} (${questionForm.edition})!`);
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
          showAlert({
            title: "Add Failed",
            message: "Failed to add question to Google Sheets database.",
            type: "danger"
          });
        }
      }
    } catch (err) {
      showAlert({
        title: "Save Error",
        message: "Failed to save question. Please check network connection.",
        type: "danger"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (q) => {
    setEditingQuestionId(q.id);
    setQuestionForm({
      edition: q.edition || selectedEdition || "New Testament (3 chapters daily)",
      round: q.round || "Round 1",
      question: q.question || "",
      option1: q.option1 || "",
      option2: q.option2 || "",
      option3: q.option3 || "",
      option4: q.option4 || "",
      correctAnswer: q.correctAnswer || ""
    });
    setActiveTab("builder");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingQuestionId(null);
    setQuestionForm(prev => ({
      ...prev,
      edition: selectedEdition || "New Testament (3 chapters daily)",
      round: settings.Active_Round || "Round 1",
      question: "",
      option1: "",
      option2: "",
      option3: "",
      option4: "",
      correctAnswer: ""
    }));
  };

  const handleDeleteQuestion = (id) => {
    showConfirm({
      title: "Delete Question?",
      message: "Are you sure you want to delete this question? This action cannot be undone.",
      type: "danger",
      confirmText: "Delete Question",
      onConfirm: async () => {
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
            showToast("Question deleted successfully.");
            setQuestions(prev => prev.filter(q => q.id !== id));
            if (editingQuestionId === id) handleCancelEdit();
          } else {
            showAlert({
              title: "Delete Failed",
              message: "Failed to delete question from Google Sheets.",
              type: "danger"
            });
          }
        } catch (err) {
          showAlert({
            title: "Delete Error",
            message: "Error deleting question. Please check connection.",
            type: "danger"
          });
        }
      }
    });
  };

  const handleDeleteSubmission = (sub) => {
    const candidateName = sub.fullName || "this candidate";
    const subRound = sub.round || "this round";
    const targetPhone = sub.whatsApp || sub.whatsapp || "";

    showConfirm({
      title: "Reset Submission & Allow Retake?",
      message: `Are you sure you want to delete the ${subRound} submission for ${candidateName}? This will permanently remove their score from the leaderboard and reset their active session so they can retake the quiz immediately.`,
      type: "danger",
      confirmText: "Yes, Reset & Allow Retake",
      onConfirm: async () => {
        try {
          const res = await fetch("/api/quiz/admin", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": pin
            },
            body: JSON.stringify({
              action: "deleteSubmission",
              whatsApp: targetPhone,
              fullName: sub.fullName,
              round: sub.round,
              timestamp: sub.timestamp
            })
          });

          if (res.ok) {
            showToast(`Submission reset! ${candidateName} can now retake ${subRound}.`);
            setResults(prev => prev.filter(r => !(
              (targetPhone && (r.whatsApp === targetPhone || r.whatsapp === targetPhone)) ||
              (sub.fullName && r.fullName === sub.fullName)
            ) || r.round !== sub.round || (sub.timestamp && r.timestamp !== sub.timestamp)));
          } else {
            const errData = await res.json().catch(() => ({}));
            showAlert({
              title: "Delete Failed",
              message: errData.error || "Failed to delete submission from database.",
              type: "danger"
            });
          }
        } catch (err) {
          showAlert({
            title: "Network Error",
            message: "Error deleting submission. Please check your connection.",
            type: "danger"
          });
        }
      }
    });
  };

  // 4. Bulk Importer Handlers
  const handleBulkTextChange = (text) => {
    setBulkText(text);
    if (!text.trim()) {
      setParsedBulk({ questions: [], errors: [], totalDetected: 0 });
      return;
    }
    const result = parseQuizQuestions(text, bulkRound);
    // Attach edition to parsed questions
    const questionsWithEdition = (result.questions || []).map(q => ({
      ...q,
      edition: bulkEdition
    }));
    setParsedBulk({ ...result, questions: questionsWithEdition });
  };

  const handleBulkRoundChange = (r) => {
    setBulkRound(r);
    if (bulkText.trim()) {
      const result = parseQuizQuestions(bulkText, r);
      const questionsWithEdition = (result.questions || []).map(q => ({
        ...q,
        edition: bulkEdition
      }));
      setParsedBulk({ ...result, questions: questionsWithEdition });
    }
  };

  const handleBulkEditionChange = (ed) => {
    setBulkEdition(ed);
    if (bulkText.trim()) {
      const result = parseQuizQuestions(bulkText, bulkRound);
      const questionsWithEdition = (result.questions || []).map(q => ({
        ...q,
        edition: ed
      }));
      setParsedBulk({ ...result, questions: questionsWithEdition });
    }
  };

  const handleExecuteBulkImport = async () => {
    if (parsedBulk.questions.length === 0) return;
    setBulkImporting(true);
    try {
      const formattedQuestions = parsedBulk.questions.map(q => ({
        ...q,
        edition: q.edition || bulkEdition
      }));

      const res = await fetch("/api/quiz/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": pin
        },
        body: JSON.stringify({
          action: "bulkAddQuestions",
          questions: formattedQuestions
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to bulk import questions");
      
      showToast(`Successfully imported ${data.count} questions to ${bulkRound} (${bulkEdition})!`);
      setBulkText("");
      setParsedBulk({ questions: [], errors: [], totalDetected: 0 });
      fetchWorkspaceData();
      setSelectedEdition(bulkEdition);
      setSelectedBankRound(bulkRound);
      setActiveTab("builder");
    } catch (e) {
      showAlert({
        title: "Bulk Import Error",
        message: e.message || "Failed to import questions to database.",
        type: "danger"
      });
    } finally {
      setBulkImporting(false);
    }
  };

  // 5. AI Question Generator Handlers
  const handleTriggerAIGenerate = async (e) => {
    if (e) e.preventDefault();
    if (!aiScripture.trim()) {
      showAlert({
        title: "Scripture Range Required",
        message: "Please specify the scripture range for this round (e.g. Colossians 3 - Hebrews 6).",
        type: "warning"
      });
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

      // Tag all generated questions with target AI edition
      const taggedQuestions = (data.questions || []).map(q => ({
        ...q,
        edition: aiEdition,
        round: aiRound
      }));

      setAiGeneratedQuestions(taggedQuestions);
      showToast(`Generated ${taggedQuestions.length} questions for ${aiRound} (${aiEdition}) from ${aiScripture}!`);
      
      if (aiApiKey) {
        setSettings(prev => ({ ...prev, GEMINI_API_KEY: aiApiKey }));
        sessionStorage.setItem("admin_gemini_api_key", aiApiKey);
      }
    } catch (err) {
      showAlert({
        title: "AI Generation Error",
        message: err.message || "AI Generation error. Please check your internet or Gemini API key.",
        type: "danger"
      });
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSaveApiKeyToDatabase = async () => {
    if (!aiApiKey.trim()) {
      showAlert({
        title: "API Key Required",
        message: "Please enter your Google Gemini API Key before saving.",
        type: "warning"
      });
      return;
    }

    setSavingApiKey(true);
    try {
      const res = await fetch("/api/quiz/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": pin
        },
        body: JSON.stringify({
          action: "saveGeminiApiKey",
          apiKey: aiApiKey.trim()
        })
      });

      if (res.ok) {
        showToast("Gemini API Key saved to database across all devices!");
        setSettings(prev => ({ ...prev, GEMINI_API_KEY: aiApiKey.trim() }));
        sessionStorage.setItem("admin_gemini_api_key", aiApiKey.trim());
      } else {
        showAlert({
          title: "Save Failed",
          message: "Failed to save API key to Google Sheets database.",
          type: "danger"
        });
      }
    } catch (err) {
      showAlert({
        title: "Save Error",
        message: "Network error saving API key to database.",
        type: "danger"
      });
    } finally {
      setSavingApiKey(false);
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
      const taggedQuestions = aiGeneratedQuestions.map(q => ({
        ...q,
        edition: q.edition || aiEdition,
        round: q.round || aiRound
      }));

      const res = await fetch("/api/quiz/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": pin
        },
        body: JSON.stringify({
          action: "bulkAddQuestions",
          questions: taggedQuestions
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save AI questions to bank.");

      showToast(`Saved ${data.count} AI generated questions to ${aiRound} (${aiEdition})!`);
      setAiGeneratedQuestions([]);
      fetchWorkspaceData();
      setSelectedEdition(aiEdition);
      setSelectedBankRound(aiRound);
      setActiveTab("builder");
    } catch (e) {
      showAlert({
        title: "Save Failed",
        message: e.message || "Failed to save AI questions to database.",
        type: "danger"
      });
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

  // Filtered Questions and Leaderboard calculations
  const availableEditions = Array.from(new Set([
    ...DEFAULT_EDITIONS,
    settings.Active_Edition || "New Testament (3 chapters daily)",
    ...questions.map(q => q.edition).filter(Boolean)
  ]));

  // Questions filtered for the currently selected Reading Schedule / Edition
  const editionQuestions = questions.filter(q => {
    const qEd = q.edition || "New Testament (3 chapters daily)";
    return qEd.trim().toLowerCase() === selectedEdition.trim().toLowerCase();
  });

  // Unique rounds inside currently selected edition
  const uniqueRoundsInEdition = Array.from(new Set(
    editionQuestions.map(q => q.round).filter(Boolean)
  )).sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, "") || "0", 10);
    const numB = parseInt(b.replace(/\D/g, "") || "0", 10);
    if (numA !== numB) return numA - numB;
    return a.localeCompare(b);
  });

  // Unique rounds across the entire system
  const allUniqueRounds = Array.from(new Set(
    questions.map(q => q.round).filter(Boolean)
  )).sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, "") || "0", 10);
    const numB = parseInt(b.replace(/\D/g, "") || "0", 10);
    if (numA !== numB) return numA - numB;
    return a.localeCompare(b);
  });

  const uniqueTeams = Array.from(new Set(results.map(r => r.team).filter(Boolean))).sort((a, b) => {
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return String(a).localeCompare(String(b));
  });

  const sortedResults = results
    .filter(r => {
      if (selectedLeaderboardEdition === "All") return true;
      const rEd = r.edition || "New Testament (3 chapters daily)";
      return rEd.trim().toLowerCase() === selectedLeaderboardEdition.trim().toLowerCase();
    })
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

      {/* Custom In-App Popup Modal Dialog */}
      {modalState.isOpen && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.25rem',
            backgroundColor: 'rgba(0, 0, 0, 0.78)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)'
          }}
          onClick={closeModal}
        >
          <div 
            style={{
              width: '100%',
              maxWidth: '440px',
              backgroundColor: '#111827',
              borderRadius: '1.25rem',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.05)',
              padding: '1.75rem',
              color: 'var(--text-primary)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close X button */}
            <button 
              onClick={closeModal}
              aria-label="Close dialog"
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '0.35rem',
                borderRadius: '0.375rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)'; }}
              onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <X size={18} />
            </button>

            {/* Icon, Title and Message */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.25rem' }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                backgroundColor: modalState.type === 'danger' 
                  ? 'rgba(239, 68, 68, 0.15)' 
                  : modalState.type === 'warning'
                  ? 'rgba(245, 158, 11, 0.15)'
                  : modalState.type === 'success'
                  ? 'rgba(16, 185, 129, 0.15)'
                  : 'rgba(59, 130, 246, 0.15)',
                border: `1px solid ${
                  modalState.type === 'danger' 
                    ? 'rgba(239, 68, 68, 0.35)' 
                    : modalState.type === 'warning'
                    ? 'rgba(245, 158, 11, 0.35)'
                    : modalState.type === 'success'
                    ? 'rgba(16, 185, 129, 0.35)'
                    : 'rgba(59, 130, 246, 0.35)'
                }`
              }}>
                {modalState.type === 'danger' && <Trash2 size={22} color="#EF4444" />}
                {modalState.type === 'warning' && <AlertTriangle size={22} color="#F59E0B" />}
                {modalState.type === 'success' && <CheckCircle2 size={22} color="#10B981" />}
                {modalState.type === 'info' && <Info size={22} color="#3B82F6" />}
              </div>

              <div style={{ flex: 1, paddingRight: '1rem' }}>
                <h3 style={{ margin: '0 0 0.35rem 0', fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                  {modalState.title}
                </h3>
                <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  {modalState.message}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
              {modalState.cancelText && (
                <button
                  onClick={closeModal}
                  style={{
                    padding: '0.65rem 1.25rem',
                    backgroundColor: 'transparent',
                    border: '1px solid var(--border)',
                    borderRadius: '0.5rem',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  {modalState.cancelText}
                </button>
              )}

              <button
                onClick={() => {
                  const fn = modalState.onConfirm;
                  closeModal();
                  if (fn) fn();
                }}
                style={{
                  padding: '0.65rem 1.4rem',
                  background: modalState.type === 'danger'
                    ? 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)'
                    : modalState.type === 'warning'
                    ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'
                    : modalState.type === 'success'
                    ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                    : 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '0.9rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: modalState.type === 'danger'
                    ? '0 4px 15px rgba(239, 68, 68, 0.35)'
                    : '0 4px 15px rgba(59, 130, 246, 0.35)',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                {modalState.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      {/* Header */}
      <header style={{
        backgroundColor: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        padding: '0.85rem 1.25rem',
        position: 'sticky',
        top: 0,
        zIndex: 40
      }}>
        <div className="quiz-header-wrap" style={{ maxWidth: '1050px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          
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
              padding: '4px',
              flexShrink: 0
            }}>
              <img src="/eccfbrclogo.png" alt="ECCF Logo" style={{ maxWidth: '28px', maxHeight: '28px', objectFit: 'contain' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: '800', margin: 0, lineHeight: '1.2' }}>Quiz Control Center</h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Super Admin Workspace</span>
            </div>
          </div>

          <div className="quiz-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <a 
              href={`/quiz/preview?round=${encodeURIComponent(settings.Active_Round || 'Round 1')}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.85rem',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: '#34D399',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                borderRadius: '0.5rem',
                fontSize: '0.85rem',
                fontWeight: '700',
                textDecoration: 'none',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 10px rgba(16, 185, 129, 0.2)'
              }}
              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.25)'; }}
              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.15)'; }}
            >
              <Eye size={15} /> Preview
            </a>

            <a 
              href="/"
              style={{
                display: 'inline-flex',
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
                display: 'inline-flex',
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
      {/* Main Container */}
      <main style={{ maxWidth: '1050px', margin: '1.5rem auto 0 auto', padding: '0 1rem' }}>
        
        {/* TOP READING SCHEDULE / EDITION SELECTOR BANNER */}
        <div style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '0.85rem',
          padding: '0.85rem 1.15rem',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <BookOpen size={14} style={{ color: 'var(--accent)' }} /> Reading Schedule:
            </span>

            {availableEditions.map(ed => {
              const isSelected = selectedEdition.trim().toLowerCase() === ed.trim().toLowerCase();
              const isLiveEdition = (settings.Active_Edition || "New Testament (3 chapters daily)").trim().toLowerCase() === ed.trim().toLowerCase();
              const questionCount = questions.filter(q => (q.edition || "New Testament (3 chapters daily)").trim().toLowerCase() === ed.trim().toLowerCase()).length;

              return (
                <button
                  key={ed}
                  type="button"
                  onClick={() => {
                    setSelectedEdition(ed);
                    setSelectedBankRound("All");
                    setQuestionForm(prev => ({ ...prev, edition: ed }));
                    setBulkEdition(ed);
                    setAiEdition(ed);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.45rem 0.85rem',
                    borderRadius: '0.55rem',
                    backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.22)' : 'var(--surface-secondary)',
                    border: `1.5px solid ${isSelected ? 'var(--accent)' : 'var(--border-light)'}`,
                    color: isSelected ? '#fff' : 'var(--text-secondary)',
                    fontSize: '0.84rem',
                    fontWeight: isSelected ? '700' : '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <span>{ed.includes("New Testament") ? "📖" : (ed.includes("Entire") ? "📜" : "📚")}</span>
                  <span>{ed}</span>
                  <span style={{
                    fontSize: '0.72rem',
                    padding: '0.1rem 0.45rem',
                    borderRadius: '9999px',
                    backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                    color: isSelected ? '#fff' : 'var(--text-secondary)'
                  }}>
                    {questionCount} Qs
                  </span>
                  {isLiveEdition && (
                    <span style={{
                      fontSize: '0.68rem',
                      padding: '0.1rem 0.4rem',
                      borderRadius: '9999px',
                      backgroundColor: 'rgba(16, 185, 129, 0.25)',
                      color: '#34D399',
                      fontWeight: 800,
                      border: '1px solid rgba(16, 185, 129, 0.4)'
                    }}>
                      Live on Server
                    </span>
                  )}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setShowCustomEditionInput(!showCustomEditionInput)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.4rem 0.75rem',
                borderRadius: '0.5rem',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px dashed var(--border)',
                color: 'var(--text-secondary)',
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              <PlusCircle size={13} /> Add Track
            </button>
          </div>

          {showCustomEditionInput && (
            <div style={{ width: '100%', display: 'flex', gap: '0.5rem', marginTop: '0.5rem', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Enter custom reading schedule name (e.g. Proverbs Deep Dive)..."
                value={newEditionName}
                onChange={(e) => setNewEditionName(e.target.value)}
                style={{
                  flex: 1,
                  padding: '0.5rem 0.75rem',
                  backgroundColor: 'var(--surface-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: '0.4rem',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              />
              <button
                type="button"
                onClick={() => {
                  if (!newEditionName.trim()) return;
                  const name = newEditionName.trim();
                  setSelectedEdition(name);
                  setSelectedBankRound("All");
                  setQuestionForm(prev => ({ ...prev, edition: name }));
                  setBulkEdition(name);
                  setAiEdition(name);
                  setNewEditionName("");
                  setShowCustomEditionInput(false);
                  showToast(`Switched to new reading track: "${name}"!`);
                }}
                style={{
                  padding: '0.5rem 0.85rem',
                  backgroundColor: 'var(--accent)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '0.4rem',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setShowCustomEditionInput(false)}
                style={{
                  padding: '0.5rem 0.75rem',
                  backgroundColor: 'transparent',
                  color: 'var(--text-secondary)',
                  border: 'none',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Tab Buttons (Responsive, No Horizontal Scrollbar) */}
        <div className="quiz-tab-bar" style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          backgroundColor: 'rgba(17, 24, 39, 0.6)',
          border: '1px solid var(--border)',
          padding: '0.4rem',
          borderRadius: '0.75rem',
          marginBottom: '2rem',
          gap: '0.4rem'
        }}>
          {[
            { id: 'control', label: 'Control Center', icon: Settings },
            { id: 'builder', label: editingQuestionId ? 'Editing Question' : 'Question Builder', icon: editingQuestionId ? Pencil : PlusCircle },
            { id: 'bulk', label: 'Bulk Import', icon: Upload },
            { id: 'ai', label: 'AI Generator', icon: Sparkles },
            { id: 'leaderboard', label: 'Live Leaderboard', icon: Trophy }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="quiz-tab-btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.45rem',
                  padding: '0.65rem 1.1rem',
                  backgroundColor: isActive ? 'var(--accent)' : 'transparent',
                  border: 'none',
                  borderRadius: '0.5rem',
                  color: isActive ? '#fff' : 'var(--text-secondary)',
                  fontSize: '0.88rem',
                  fontWeight: isActive ? '700' : '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: isActive ? '0 4px 15px rgba(37, 99, 235, 0.35)' : 'none',
                  flex: '1 1 auto',
                  minWidth: '130px',
                  textAlign: 'center'
                }}
              >
                <Icon size={16} style={{ color: isActive ? (tab.id === 'ai' ? '#F59E0B' : '#fff') : 'inherit', flexShrink: 0 }} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: CONTROL CENTER */}
        {activeTab === 'control' && (() => {
          const serverIsLive = String(settings.Is_Quiz_Live).toUpperCase() === "TRUE";
          const hasLiveStatusChanged = isQuizLive !== serverIsLive;

          return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '750px', margin: '0 auto' }}>
            
            {/* Compact Shareable Link Card */}
            <div style={{
              backgroundColor: 'var(--surface)',
              borderRadius: '0.85rem',
              border: '1px solid var(--border)',
              padding: '1rem 1.25rem',
              boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <Share2 size={16} style={{ color: 'var(--accent)' }} />
                  <h3 style={{ fontSize: '0.98rem', fontWeight: '700', margin: 0 }}>Participant Quiz Link</h3>
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Direct candidate access link</span>
              </div>

              <div className="quiz-share-box" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: 'var(--surface-secondary)',
                border: '1px solid var(--border-light)',
                borderRadius: '0.55rem',
                padding: '0.35rem 0.45rem 0.35rem 0.75rem',
                flexWrap: 'wrap'
              }}>
                <input
                  type="text"
                  readOnly
                  value={quizUrl}
                  style={{
                    flex: '1 1 180px',
                    minWidth: 0,
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    outline: 'none',
                    fontFamily: 'monospace',
                    padding: '0.2rem 0'
                  }}
                />
                <div className="quiz-share-buttons" style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.45rem 0.85rem',
                      backgroundColor: copiedLink ? 'var(--success)' : 'var(--accent)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '0.45rem',
                      fontSize: '0.82rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {copiedLink ? <CheckCheck size={14} /> : <Copy size={14} />}
                    <span>{copiedLink ? "Copied!" : "Copy Link"}</span>
                  </button>

                  <a
                    href={`/quiz/preview?round=${encodeURIComponent(settings.Active_Round || 'Round 1')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.45rem 0.85rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#fff',
                      borderRadius: '0.45rem',
                      fontSize: '0.82rem',
                      fontWeight: '700',
                      textDecoration: 'none',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)'; }}
                  >
                    <Eye size={14} />
                    <span>Preview View</span>
                  </a>
                </div>
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
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Settings size={20} style={{ color: 'var(--accent)' }} />
                  <h3 style={{ fontSize: '1.15rem', fontWeight: '700', margin: 0 }}>Quiz Configuration</h3>
                </div>

                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.25rem 0.65rem',
                  borderRadius: '9999px',
                  backgroundColor: serverIsLive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                  border: `1px solid ${serverIsLive ? 'rgba(16, 185, 129, 0.35)' : 'rgba(245, 158, 11, 0.35)'}`,
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  color: serverIsLive ? '#34D399' : '#FCD34D'
                }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: serverIsLive ? '#10B981' : '#F59E0B' }}></span>
                  <span>Live on Server: {serverIsLive ? "LIVE" : "MAINTENANCE"}</span>
                </div>
              </div>

              <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                {/* Live / Coming Soon Switch Card */}
                <div className="quiz-live-toggle-card" style={{
                  padding: '1.25rem',
                  borderRadius: '0.75rem',
                  backgroundColor: isQuizLive ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                  border: `1.5px solid ${hasLiveStatusChanged ? '#F59E0B' : (isQuizLive ? 'var(--success)' : '#F59E0B')}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  flexWrap: 'wrap'
                }}>
                  <div style={{ flex: '1 1 240px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <Power size={18} color={isQuizLive ? "#10B981" : "#F59E0B"} />
                      <span style={{ fontSize: '1rem', fontWeight: '800', color: isQuizLive ? '#34D399' : '#FCD34D' }}>
                        Target: {isQuizLive ? "Quiz LIVE & Active" : "Quiz in Maintenance (Coming Soon)"}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                      {isQuizLive 
                        ? "Participants will be able to access, start, and submit their quiz."
                        : "Access is blocked. Visitors will see the Coming Soon holding screen."}
                    </p>
                    
                    {hasLiveStatusChanged && (
                      <div style={{
                        marginTop: '0.6rem',
                        padding: '0.4rem 0.65rem',
                        backgroundColor: 'rgba(245, 158, 11, 0.15)',
                        border: '1px solid rgba(245, 158, 11, 0.35)',
                        borderRadius: '0.4rem',
                        color: '#FCD34D',
                        fontSize: '0.78rem',
                        fontWeight: '700',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}>
                        <span>⚠️ Status changed locally. Click "Save Settings" below to apply!</span>
                      </div>
                    )}
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
                    {isQuizLive ? "Switch to Maintenance" : "Switch to Live"}
                  </button>
                </div>

                {/* Reading Schedule / Edition Selector */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    Active Reading Schedule / Edition
                  </label>
                  <select
                    value={settings.Active_Edition || "New Testament (3 chapters daily)"}
                    onChange={(e) => setSettings(prev => ({ ...prev, Active_Edition: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '0.8rem 1rem',
                      backgroundColor: 'var(--surface-secondary)',
                      border: '1px solid var(--border)',
                      borderRadius: '0.6rem',
                      color: 'var(--text-primary)',
                      fontSize: '0.95rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                      cursor: 'pointer'
                    }}
                  >
                    {availableEditions.map(ed => (
                      <option key={ed} value={ed}>{ed}</option>
                    ))}
                  </select>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.35rem', display: 'block' }}>
                    Participants taking the live quiz will receive questions assigned to this reading schedule.
                  </span>
                </div>

                {/* Active Round Selector & Input */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    Active Round Tag
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      value={settings.Active_Round}
                      onChange={(e) => setSettings(prev => ({ ...prev, Active_Round: e.target.value }))}
                      placeholder="e.g. Round 8"
                      required
                      style={{
                        flex: '1 1 200px',
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

                    {uniqueRoundsInEdition.length > 0 && (
                      <select
                        onChange={(e) => {
                          if (e.target.value) setSettings(prev => ({ ...prev, Active_Round: e.target.value }));
                        }}
                        value={settings.Active_Round}
                        style={{
                          padding: '0.8rem 1rem',
                          backgroundColor: 'var(--surface-secondary)',
                          border: '1px solid var(--border)',
                          borderRadius: '0.6rem',
                          color: 'var(--text-primary)',
                          fontSize: '0.88rem',
                          outline: 'none',
                          cursor: 'pointer',
                          minWidth: '150px'
                        }}
                      >
                        <option value="" disabled>Select Saved Round...</option>
                        {uniqueRoundsInEdition.map(r => {
                          const count = editionQuestions.filter(q => q.round === r).length;
                          return (
                            <option key={r} value={r}>{r} ({count} Qs)</option>
                          );
                        })}
                      </select>
                    )}
                  </div>
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
                    backgroundColor: saveStatus.includes('Live') || saveStatus.includes('saved') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: saveStatus.includes('Live') || saveStatus.includes('saved') ? '#34D399' : '#F87171',
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
                    background: hasLiveStatusChanged 
                      ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' 
                      : 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
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
                    boxShadow: hasLiveStatusChanged 
                      ? '0 4px 18px rgba(16, 185, 129, 0.45)' 
                      : '0 4px 15px rgba(37, 99, 235, 0.35)',
                    transition: 'all 0.2s ease',
                    opacity: loading ? 0.7 : 1
                  }}
                  onMouseOver={(e) => { if (!loading) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseOut={(e) => { if (!loading) e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <Save size={18} />
                  <span>{loading ? "Saving to Database..." : (hasLiveStatusChanged ? `Save Settings (Apply ${isQuizLive ? 'LIVE' : 'Maintenance'})` : "Save Settings")}</span>
                </button>
              </form>
            </div>

          </div>
          );
        })()}

        {/* TAB 2: QUESTION BUILDER (Single Edit / Create + Persistent Round Question Bank) */}
        {activeTab === 'builder' && (() => {
          const activeTargetRound = editingQuestionId 
            ? questionForm.round 
            : (selectedBankRound !== "All" ? selectedBankRound : (settings.Active_Round || (uniqueRoundsInEdition[0] || "Round 1")));
          
          const isCurrentlyActiveLive = (settings.Active_Round === activeTargetRound && (settings.Active_Edition || "New Testament (3 chapters daily)") === selectedEdition);

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '1050px', margin: '0 auto' }}>
              
              {/* TOP ROUND SWITCHER BAR */}
              <div style={{
                backgroundColor: 'var(--surface)',
                borderRadius: '1rem',
                border: '1px solid var(--border)',
                padding: '1.25rem 1.5rem',
                boxShadow: '0 8px 25px rgba(0, 0, 0, 0.18)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Layers size={18} style={{ color: 'var(--accent)' }} />
                    <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      Select Round to Manage & Build:
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--accent-hover)', fontWeight: 600 }}>
                      ({selectedEdition})
                    </span>
                  </div>

                  {/* Quick Action: Set as Live Round */}
                  {selectedBankRound !== "All" && (
                    <button
                      type="button"
                      onClick={() => {
                        setSettings(prev => ({
                          ...prev,
                          Active_Edition: selectedEdition,
                          Active_Round: activeTargetRound
                        }));
                        showToast(`Set active live round to: ${activeTargetRound} (${selectedEdition})! Click "Save Settings" in Control Center to commit.`);
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.4rem 0.85rem',
                        backgroundColor: isCurrentlyActiveLive ? 'rgba(16, 185, 129, 0.18)' : 'rgba(37, 99, 235, 0.15)',
                        border: `1px solid ${isCurrentlyActiveLive ? 'rgba(16, 185, 129, 0.4)' : 'rgba(37, 99, 235, 0.4)'}`,
                        borderRadius: '0.5rem',
                        color: isCurrentlyActiveLive ? '#34D399' : '#60A5FA',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <span>{isCurrentlyActiveLive ? "✓ Active Live for Participants" : `🚀 Set ${activeTargetRound} as Live for Participants`}</span>
                    </button>
                  )}
                </div>

                {/* ROUND PILLS */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  flexWrap: 'wrap',
                  padding: '0.45rem',
                  backgroundColor: 'var(--surface-secondary)',
                  borderRadius: '0.75rem',
                  border: '1px solid var(--border-light)'
                }}>
                  {/* All Rounds Pill */}
                  <button
                    type="button"
                    onClick={() => setSelectedBankRound("All")}
                    style={{
                      padding: '0.4rem 0.85rem',
                      borderRadius: '0.5rem',
                      backgroundColor: selectedBankRound === "All" ? 'var(--accent)' : 'transparent',
                      border: 'none',
                      color: selectedBankRound === "All" ? '#fff' : 'var(--text-secondary)',
                      fontSize: '0.84rem',
                      fontWeight: selectedBankRound === "All" ? 700 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    All Rounds ({editionQuestions.length})
                  </button>

                  {/* Individual Round Pills */}
                  {uniqueRoundsInEdition.map(r => {
                    const count = editionQuestions.filter(q => q.round === r).length;
                    const isSelected = selectedBankRound === r || (selectedBankRound === "All" && activeTargetRound === r);
                    const isActiveLive = settings.Active_Round === r && (settings.Active_Edition || "New Testament (3 chapters daily)") === selectedEdition;

                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => {
                          setSelectedBankRound(r);
                          if (editingQuestionId) handleCancelEdit();
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.4rem 0.85rem',
                          borderRadius: '0.5rem',
                          backgroundColor: isSelected ? 'var(--accent)' : (isActiveLive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.04)'),
                          border: `1px solid ${isSelected ? 'var(--accent)' : (isActiveLive ? 'rgba(16, 185, 129, 0.35)' : 'transparent')}`,
                          color: isSelected ? '#fff' : (isActiveLive ? '#34D399' : 'var(--text-primary)'),
                          fontSize: '0.84rem',
                          fontWeight: isSelected || isActiveLive ? 700 : 500,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span>{r}</span>
                        <span style={{
                          fontSize: '0.72rem',
                          opacity: 0.9,
                          backgroundColor: 'rgba(0,0,0,0.25)',
                          padding: '0.05rem 0.4rem',
                          borderRadius: '999px',
                          fontWeight: 700
                        }}>
                          {count}
                        </span>
                        {isActiveLive && !isSelected && (
                          <span style={{ fontSize: '0.65rem', color: '#34D399' }}>●</span>
                        )}
                      </button>
                    );
                  })}

                  {/* + New Round Button */}
                  <button
                    type="button"
                    onClick={() => {
                      const nextRoundNum = uniqueRoundsInEdition.length + 1;
                      const newRoundName = `Round ${nextRoundNum}`;
                      setSelectedBankRound(newRoundName);
                      if (editingQuestionId) handleCancelEdit();
                      showToast(`Switched to ${newRoundName} (${selectedEdition}). Add your questions below!`);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      padding: '0.4rem 0.8rem',
                      borderRadius: '0.5rem',
                      backgroundColor: 'transparent',
                      border: '1px dashed var(--border)',
                      color: 'var(--text-secondary)',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent-hover)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                  >
                    <PlusCircle size={14} /> New Round
                  </button>
                </div>
              </div>

              {/* 2-COLUMN LAYOUT: QUESTION BUILDER + QUESTION BANK */}
              <div className="quiz-admin-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '1.5rem', alignItems: 'flex-start' }}>
                
                {/* Form Column (Question Builder) */}
                <div style={{
                  backgroundColor: 'var(--surface)',
                  borderRadius: '1rem',
                  border: `1.5px solid ${editingQuestionId ? 'var(--accent)' : 'var(--border)'}`,
                  padding: '1.5rem',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)'
                }}>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {editingQuestionId ? (
                        <>
                          <Pencil size={18} style={{ color: 'var(--accent-hover)' }} /> Edit Question
                        </>
                      ) : (
                        <>
                          <PlusCircle size={18} style={{ color: 'var(--accent)' }} /> Add Question
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
                        <X size={14} /> Cancel Edit
                      </button>
                    )}
                  </div>

                  {/* Target Round Badge */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.5rem 0.75rem',
                    backgroundColor: 'var(--surface-secondary)',
                    border: '1px solid var(--border-light)',
                    borderRadius: '0.55rem',
                    marginBottom: '1rem',
                    fontSize: '0.82rem'
                  }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Target:</span>
                    <strong style={{ color: '#60A5FA' }}>{activeTargetRound}</strong>
                    <span style={{ color: 'var(--text-secondary)' }}>•</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{selectedEdition}</span>
                  </div>

                  <form onSubmit={(e) => {
                    // Inject activeTargetRound and selectedEdition into form before submit
                    questionForm.round = activeTargetRound;
                    questionForm.edition = selectedEdition;
                    handleFormSubmit(e);
                  }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    
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
                        Options & Correct Answer (Click radio dot):
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
                        <span>{editingQuestionId ? "Update Question" : `Add Question to ${activeTargetRound}`}</span>
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

                {/* Persistent Round Question Bank Column */}
                <div style={{
                  backgroundColor: 'var(--surface)',
                  borderRadius: '1rem',
                  border: '1px solid var(--border)',
                  padding: '1.5rem',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)'
                }}>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0 }}>
                        {selectedBankRound === "All" ? `All Questions (${editionQuestions.length})` : `${selectedBankRound} Questions (${editionQuestions.filter(q => q.round === selectedBankRound).length})`}
                      </h3>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {selectedEdition}
                      </span>
                    </div>
                  </div>

                  {/* Questions Scroll Area */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', maxHeight: '550px', overflowY: 'auto', paddingRight: '0.35rem' }}>
                    {editionQuestions.filter(q => selectedBankRound === "All" || q.round === selectedBankRound).length === 0 ? (
                      <div style={{ padding: '3.5rem 1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        <p style={{ margin: '0 0 0.5rem 0', fontWeight: 700, color: 'var(--text-primary)' }}>
                          No questions saved in {selectedBankRound === "All" ? selectedEdition : `${selectedBankRound} (${selectedEdition})`}.
                        </p>
                        <span style={{ fontSize: '0.85rem' }}>
                          Type your question on the left and click <strong>"Add Question to {activeTargetRound}"</strong> to begin!
                        </span>
                      </div>
                    ) : (
                      editionQuestions
                        .filter(q => selectedBankRound === "All" || q.round === selectedBankRound)
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
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
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
            </div>
          );
        })()}


        {/* TAB 3: BULK IMPORTER */}
        {activeTab === 'bulk' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '850px', margin: '0 auto' }}>
            
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

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                  {/* Target Edition Selector */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Track:</span>
                    <select
                      value={bulkEdition}
                      onChange={(e) => handleBulkEditionChange(e.target.value)}
                      style={{
                        padding: '0.45rem 0.65rem',
                        backgroundColor: 'var(--surface-secondary)',
                        border: '1px solid var(--border)',
                        borderRadius: '0.5rem',
                        color: 'var(--text-primary)',
                        fontSize: '0.82rem',
                        fontWeight: '600',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      {availableEditions.map(ed => (
                        <option key={ed} value={ed}>{ed}</option>
                      ))}
                    </select>
                  </div>

                  {/* Target Round Selector */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Round:</span>
                    <input
                      type="text"
                      value={bulkRound}
                      onChange={(e) => handleBulkRoundChange(e.target.value)}
                      placeholder="e.g. Round 8"
                      style={{
                        width: '100px',
                        padding: '0.45rem 0.65rem',
                        backgroundColor: 'var(--surface-secondary)',
                        border: '1px solid var(--border)',
                        borderRadius: '0.5rem',
                        color: 'var(--text-primary)',
                        fontSize: '0.85rem',
                        fontWeight: '700',
                        outline: 'none'
                      }}
                    />
                  </div>
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
                  
                  <div className="quiz-bulk-status-bar" style={{
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '880px', margin: '0 auto' }}>
            
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

              <div className="quiz-ai-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    minWidth: '42px',
                    minHeight: '42px',
                    aspectRatio: '1 / 1',
                    flexShrink: 0,
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    boxShadow: '0 4px 15px rgba(245, 158, 11, 0.35)'
                  }}>
                    <Sparkles size={22} style={{ flexShrink: 0 }} />
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
                  padding: '1.25rem',
                  marginBottom: '1.25rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                      Google Gemini API Key
                    </label>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '0.78rem', color: 'var(--accent-hover)', textDecoration: 'none' }}
                    >
                      Get Free Key at Google AI Studio ↗
                    </a>
                  </div>

                  <div className="quiz-ai-api-row" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <input
                      type="password"
                      value={aiApiKey}
                      onChange={(e) => setAiApiKey(e.target.value)}
                      placeholder="AIzaSy... (Paste Gemini API key to use across all devices)"
                      style={{
                        flex: 1,
                        minWidth: '200px',
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

                    <button
                      type="button"
                      disabled={savingApiKey || !aiApiKey.trim()}
                      onClick={handleSaveApiKeyToDatabase}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '0.65rem 1.1rem',
                        backgroundColor: 'var(--accent)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '0.5rem',
                        fontSize: '0.85rem',
                        fontWeight: '700',
                        cursor: savingApiKey || !aiApiKey.trim() ? 'not-allowed' : 'pointer',
                        opacity: savingApiKey || !aiApiKey.trim() ? 0.6 : 1,
                        transition: 'all 0.2s ease',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <Save size={15} />
                      <span>{savingApiKey ? "Saving..." : "Save Key to Cloud"}</span>
                    </button>
                  </div>

                  <div style={{ marginTop: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    <span>🔒 Saved directly to Google Sheets database (accessible on all your admin devices).</span>
                    {settings.GEMINI_API_KEY && (
                      <span style={{ color: '#34D399', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        ✓ Cloud Synced
                      </span>
                    )}
                  </div>
                </div>
              )}

              <form onSubmit={handleTriggerAIGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                  
                  {/* Track / Edition */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                      Reading Schedule Track
                    </label>
                    <select
                      value={aiEdition}
                      onChange={(e) => setAiEdition(e.target.value)}
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
                      {availableEditions.map(ed => (
                        <option key={ed} value={ed}>{ed}</option>
                      ))}
                    </select>
                  </div>

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
                        fontSize: '0.9rem',
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
                  <span>{aiGenerating ? `Generating ${aiCount} Questions from Scripture...` : `Generate ${aiCount} Questions with AI`}</span>
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
                
                <div className="quiz-ai-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Check size={20} color="#10B981" /> Generated Questions ({aiGeneratedQuestions.length})
                    </h3>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      Review, edit wording or options before saving to your Google Sheets database.
                    </span>
                  </div>

                  <div className="quiz-ai-review-actions" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
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
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
            maxWidth: '1050px',
            margin: '0 auto'
          }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Trophy size={20} style={{ color: '#F59E0B' }} /> Submissions ({sortedResults.length})
              </h3>

              <div className="quiz-leaderboard-filters" style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                
                {/* Edition Filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <BookOpen size={14} style={{ color: 'var(--text-secondary)' }} />
                  <select
                    value={selectedLeaderboardEdition}
                    onChange={(e) => setSelectedLeaderboardEdition(e.target.value)}
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
                      minWidth: '130px'
                    }}
                  >
                    <option value="All">All Schedules</option>
                    {availableEditions.map(ed => (
                      <option key={ed} value={ed}>{ed}</option>
                    ))}
                  </select>
                </div>

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
                    {allUniqueRounds.map(r => (
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
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
              <table style={{ width: '100%', minWidth: '820px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-light)', color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    <th style={{ padding: '0.65rem 0.75rem' }}>Rank</th>
                    <th style={{ padding: '0.65rem 0.75rem' }}>Candidate</th>
                    <th style={{ padding: '0.65rem 0.75rem' }}>WhatsApp</th>
                    <th style={{ padding: '0.65rem 0.75rem' }}>Team</th>
                    <th style={{ padding: '0.65rem 0.75rem' }}>Track & Round</th>
                    <th style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>Score</th>
                    <th style={{ padding: '0.65rem 0.75rem' }}>Submitted</th>
                    <th style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedResults.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
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
                        <td style={{ padding: '0.75rem', fontWeight: '700', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                          {r.fullName}
                        </td>
                        <td style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                          {r.whatsApp || r.whatsapp || "—"}
                        </td>
                        <td style={{ padding: '0.75rem', whiteSpace: 'nowrap' }}>
                          {(() => {
                            const raw = String(r.team || '').trim();
                            const displayTeam = !raw || raw.toLowerCase() === 'unassigned'
                              ? 'Unassigned'
                              : (raw.toLowerCase().startsWith('team ') ? raw : `Team ${raw}`);
                            const isUnassigned = displayTeam === 'Unassigned';

                            return (
                              <span style={{
                                backgroundColor: isUnassigned ? 'rgba(255, 255, 255, 0.08)' : 'var(--accent-light)',
                                color: isUnassigned ? 'var(--text-secondary)' : 'var(--accent-hover)',
                                padding: '0.25rem 0.65rem',
                                borderRadius: '0.35rem',
                                fontSize: '0.8rem',
                                fontWeight: '700',
                                whiteSpace: 'nowrap',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem'
                              }}>
                                {displayTeam}
                              </span>
                            );
                          })()}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                              {r.round}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                              {r.edition || "New Testament (3 chapters daily)"}
                            </span>
                          </div>
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
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleDeleteSubmission(r)}
                            title={`Delete submission and allow ${r.fullName || 'candidate'} to retake`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.35rem 0.65rem',
                              backgroundColor: 'rgba(239, 68, 68, 0.12)',
                              color: '#F87171',
                              border: '1px solid rgba(239, 68, 68, 0.25)',
                              borderRadius: '0.4rem',
                              fontSize: '0.78rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.25)'; }}
                            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.12)'; }}
                          >
                            <Trash2 size={13} />
                            <span>Reset / Retake</span>
                          </button>
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
