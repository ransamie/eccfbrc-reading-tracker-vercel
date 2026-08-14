"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, User, Phone, Users, Play, ShieldAlert } from "lucide-react";

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
      whatsapp: whatsapp.replace(/\D/g, "").replace(/^0+/, ""), // Normalize numbers
      team: selectedTeam,
      round: "Active Round" // Handled by /api/quiz/init
    };

    localStorage.setItem("quiz_pending_start", JSON.stringify(pendingInfo));
    router.push("/quiz/take");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 flex items-center justify-center p-4 font-sans text-slate-100">
      <div className="max-w-md w-full bg-slate-900/60 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/5 relative overflow-hidden">
        
        {/* Decorative elements */}
        <div className="absolute -top-16 -right-16 w-32 h-32 bg-blue-500/10 rounded-full blur-xl"></div>
        <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-indigo-500/10 rounded-full blur-xl"></div>

        <div className="text-center mb-8 relative z-10">
          <div className="w-16 h-16 bg-blue-600/90 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
            <BookOpen size={30} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Bible Challenge Quiz</h1>
          <p className="text-slate-400 mt-2 text-sm">Test your memory on the latest reading rounds</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
          
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <User size={16} className="text-blue-500" />
              Full Name (Surname First)
            </label>
            <input
              type="text"
              className="w-full px-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700 focus:outline-none focus:border-blue-500 text-white placeholder-slate-500 transition-colors"
              placeholder="e.g., Smith John"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Phone size={16} className="text-blue-500" />
              WhatsApp Number
            </label>
            <input
              type="tel"
              className="w-full px-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700 focus:outline-none focus:border-blue-500 text-white placeholder-slate-500 transition-colors"
              placeholder="e.g., 2348012345678"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              required
            />
            <p className="text-[11px] text-slate-500 leading-normal">
              Enter number with country code. Used to prevent duplicate entries and check eligibility.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Users size={16} className="text-blue-500" />
              Select Your Team
            </label>
            <select
              className="w-full px-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700 focus:outline-none focus:border-blue-500 text-white transition-colors cursor-pointer"
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              required
            >
              <option value="" disabled>Tap to select your assigned team...</option>
              {teams.map((t) => (
                <option key={t} value={t} className="bg-slate-800 text-white">
                  Team {t}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 bg-red-950/20 border border-red-500/20 p-3 rounded-xl text-xs">
              <ShieldAlert size={16} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30"
          >
            {loading ? "Preparing Quiz..." : "Access Quiz"}
            {!loading && <Play size={16} />}
          </button>
        </form>
        
      </div>
    </div>
  );
}
