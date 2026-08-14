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
  Users
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
  const [saveStatus, setSaveStatus] = useState(""); // "saving" | "success" | "error"

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
        setSettings(data.settings);
        setQuestions(data.questions);
        setResults(data.results);
        sessionStorage.setItem("admin_quiz_pin", inputPin);
        setPin(inputPin);
        setIsAuthenticated(true);
      } else {
        setAuthError("Invalid Admin PIN");
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
      alert("Please select the correct answer option!");
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

  // 4. Calculations for Leaderboard
  // Sort by highest score first, then by earliest completion timestamp
  const sortedResults = [...results]
    .filter(r => (selectedRoundFilter === "All" || r.round === selectedRoundFilter) &&
                 (selectedTeamFilter === "All" || (r.team && r.team.toLowerCase() === selectedTeamFilter.toLowerCase())))
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return new Date(a.timestamp) - new Date(b.timestamp);
    });

  // Extract unique rounds and teams for filters
  const uniqueRounds = Array.from(new Set(questions.map(q => q.round).concat(results.map(r => r.round)).filter(Boolean)));
  const uniqueTeams = Array.from(new Set(results.map(r => r.team).filter(Boolean)));

  // Auth Gate Render
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans text-slate-100">
        <div className="max-w-md w-full bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-700">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock size={28} />
            </div>
            <h1 className="text-2xl font-bold">Quiz Admin Center</h1>
            <p className="text-slate-400 mt-2">Enter Super Admin PIN to authenticate</p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Super Admin PIN</label>
              <input
                type="password"
                className="w-full px-4 py-3 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                required
              />
            </div>

            {authError && (
              <div className="flex items-center gap-2 text-red-400 bg-red-900/20 p-3 rounded-lg text-sm border border-red-500/20">
                <AlertCircle size={16} />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50"
            >
              {loading ? "Authenticating..." : "Access Control"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Dashboard Workspace Render
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans pb-12">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 py-4 px-6 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Settings size={20} />
            </div>
            <h1 className="text-xl font-bold">Quiz Control Center</h1>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="max-w-6xl mx-auto px-4 mt-8">
        
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-700 mb-8">
          <button
            onClick={() => setActiveTab("control")}
            className={`flex items-center gap-2 px-6 py-3 font-medium border-b-2 transition ${
              activeTab === "control" 
                ? "border-blue-500 text-blue-500 font-bold" 
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Settings size={18} /> Control Center
          </button>
          <button
            onClick={() => setActiveTab("builder")}
            className={`flex items-center gap-2 px-6 py-3 font-medium border-b-2 transition ${
              activeTab === "builder" 
                ? "border-blue-500 text-blue-500 font-bold" 
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <PlusCircle size={18} /> Question Builder
          </button>
          <button
            onClick={() => setActiveTab("leaderboard")}
            className={`flex items-center gap-2 px-6 py-3 font-medium border-b-2 transition ${
              activeTab === "leaderboard" 
                ? "border-blue-500 text-blue-500 font-bold" 
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Trophy size={18} /> Live Leaderboard
          </button>
        </div>

        {/* Tab 1: Control Center */}
        {activeTab === "control" && (
          <div className="max-w-2xl bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-200">
              <Settings size={20} className="text-blue-500" />
              Global Settings
            </h2>
            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Active Quiz Round</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-lg bg-slate-700 border border-slate-600 focus:outline-none focus:border-blue-500 text-white"
                    value={settings.Active_Round || ""}
                    onChange={(e) => setSettings(prev => ({ ...prev, Active_Round: e.target.value }))}
                    placeholder="e.g. Round 1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Time Limit (Minutes)</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full px-4 py-3 rounded-lg bg-slate-700 border border-slate-600 focus:outline-none focus:border-blue-500 text-white"
                    value={settings.Time_Limit_Minutes || ""}
                    onChange={(e) => setSettings(prev => ({ ...prev, Time_Limit_Minutes: e.target.value }))}
                    placeholder="e.g. 15"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-700">
                <div className="flex items-center gap-2">
                  {saveStatus === "saving" && <span className="text-sm text-slate-400 animate-pulse">Saving changes...</span>}
                  {saveStatus === "success" && (
                    <span className="text-sm text-emerald-400 flex items-center gap-1 font-medium bg-emerald-950/30 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                      <Check size={16} /> Saved Successfully
                    </span>
                  )}
                  {saveStatus === "error" && <span className="text-sm text-red-400">Failed to save settings</span>}
                </div>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-blue-900/20"
                >
                  <Save size={18} /> Save Settings
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 2: Question Builder */}
        {activeTab === "builder" && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Question Creator Form */}
              <div className="lg:col-span-1 bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl h-fit">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-200">
                  <PlusCircle size={20} className="text-blue-500" />
                  Add New Question
                </h3>
                <form onSubmit={handleAddQuestion} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Round</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 focus:outline-none text-white"
                      value={newQuestion.round}
                      onChange={(e) => setNewQuestion(prev => ({ ...prev, round: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Question Text</label>
                    <textarea
                      rows="3"
                      className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 focus:outline-none text-white"
                      value={newQuestion.question}
                      onChange={(e) => setNewQuestion(prev => ({ ...prev, question: e.target.value }))}
                      required
                    />
                  </div>
                  
                  {/* Options */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-400 mb-1">Answer Options</label>
                    {[1, 2, 3, 4].map(num => (
                      <div key={num} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="correctAnswerSelect"
                          checked={newQuestion.correctAnswer === newQuestion[`option${num}`] && newQuestion[`option${num}`] !== ""}
                          onChange={() => setNewQuestion(prev => ({ ...prev, correctAnswer: prev[`option${num}`] }))}
                          disabled={newQuestion[`option${num}`] === ""}
                          className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 cursor-pointer"
                        />
                        <input
                          type="text"
                          className="flex-1 px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 focus:outline-none text-sm text-white"
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
                        />
                      </div>
                    ))}
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2"
                  >
                    <PlusCircle size={18} /> Add to Sheet
                  </button>
                </form>
              </div>

              {/* Questions List */}
              <div className="lg:col-span-2 bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold">Manage Questions</h3>
                  <div className="flex items-center gap-2">
                    <Filter size={16} className="text-slate-400" />
                    <select
                      className="bg-slate-700 border-slate-600 text-white px-3 py-1.5 rounded-lg text-sm focus:outline-none cursor-pointer"
                      value={selectedRoundFilter}
                      onChange={(e) => setSelectedRoundFilter(e.target.value)}
                    >
                      <option value="All">All Rounds</option>
                      {uniqueRounds.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                  {questions.filter(q => selectedRoundFilter === "All" || q.round === selectedRoundFilter).length === 0 ? (
                    <div className="text-center py-12 text-slate-500">No questions found for this filter.</div>
                  ) : (
                    questions
                      .filter(q => selectedRoundFilter === "All" || q.round === selectedRoundFilter)
                      .map((q) => (
                        <div key={q.id} className="p-4 bg-slate-700/40 border border-slate-700 rounded-xl flex justify-between gap-4">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold px-2 py-0.5 bg-blue-900/30 text-blue-400 border border-blue-500/20 rounded">
                                {q.round}
                              </span>
                              <span className="text-xs text-slate-500">ID: {q.id}</span>
                            </div>
                            <p className="font-semibold text-slate-200">{q.question}</p>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                              {[q.option1, q.option2, q.option3, q.option4].map((opt, i) => {
                                const isCorrect = opt === q.correctAnswer;
                                return (
                                  <div key={i} className={`text-xs px-3 py-1.5 rounded border ${
                                    isCorrect 
                                      ? "bg-emerald-950/20 text-emerald-400 border-emerald-500/20" 
                                      : "bg-slate-800/40 text-slate-400 border-transparent"
                                  }`}>
                                    {opt}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteQuestion(q.id)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-950/30 p-2 rounded-lg h-fit transition self-center"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Live Leaderboard */}
        {activeTab === "leaderboard" && (
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Trophy className="text-yellow-500" />
                Live Submissions
              </h3>
              
              {/* Filter Controls: Round and Team */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Round Filter */}
                <div className="flex items-center gap-1.5">
                  <Filter size={16} className="text-slate-400" />
                  <select
                    className="bg-slate-700 border-slate-600 text-white px-3 py-1.5 rounded-lg text-sm focus:outline-none cursor-pointer"
                    value={selectedRoundFilter}
                    onChange={(e) => setSelectedRoundFilter(e.target.value)}
                  >
                    <option value="All">All Rounds</option>
                    {uniqueRounds.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                {/* Team Filter */}
                <div className="flex items-center gap-1.5">
                  <Users size={16} className="text-slate-400" />
                  <select
                    className="bg-slate-700 border-slate-600 text-white px-3 py-1.5 rounded-lg text-sm focus:outline-none cursor-pointer"
                    value={selectedTeamFilter}
                    onChange={(e) => setSelectedTeamFilter(e.target.value)}
                  >
                    <option value="All">All Teams</option>
                    {uniqueTeams.map(t => (
                      <option key={t} value={t}>Team {t}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400 text-sm font-semibold">
                    <th className="py-3 px-4">Rank</th>
                    <th className="py-3 px-4">Participant Name</th>
                    <th className="py-3 px-4">WhatsApp</th>
                    <th className="py-3 px-4">Team</th>
                    <th className="py-3 px-4">Round</th>
                    <th className="py-3 px-4 text-center">Score</th>
                    <th className="py-3 px-4">Submission Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60 text-sm">
                  {sortedResults.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-8 text-center text-slate-500">
                        No submissions found matching selected filters.
                      </td>
                    </tr>
                  ) : (
                    sortedResults.map((r, index) => (
                      <tr key={index} className="hover:bg-slate-700/20 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-400">
                          {index + 1}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-200">
                          {r.fullName}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-400 text-xs">
                          {r.whatsApp}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 bg-blue-950/40 text-blue-300 border border-blue-500/20 rounded-md text-xs font-semibold">
                            Team {r.team || "Unassigned"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 bg-slate-700 border border-slate-600 rounded text-xs">
                            {r.round}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-blue-400">
                          {r.score} / {r.totalQuestions}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 text-xs">
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
