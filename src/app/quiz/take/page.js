"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Clock, AlertTriangle, ShieldCheck, CheckCircle2, ChevronRight, WifiOff, Users } from "lucide-react";

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

    try {
      const savedState = localStorage.getItem("quiz_in_progress");
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        
        if (parsedState.deadline && Date.now() > parsedState.deadline) {
          setHasStarted(true);
          setQuestions(parsedState.questions || []);
          setAnswers(parsedState.answers || {});
          setParticipant(parsedState.participant || {});
          setDeadline(parsedState.deadline);
        } else if (parsedState.deadline) {
          setHasStarted(true);
          setQuestions(parsedState.questions || []);
          setAnswers(parsedState.answers || {});
          setParticipant(parsedState.participant || {});
          setDeadline(parsedState.deadline);
        }
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
  }, []);

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
      calculateTimeLeft(); // Initial calculation
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
      
      setQuestions(data.questions);
      setParticipant(p => ({ ...p, round: data.round }));
      setDeadline(data.deadlineTimestamp); // Server absolute timestamp (ms)
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

  // --- RENDER SCREENS ---

  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4 font-sans text-slate-800">
        <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
          <div className="bg-blue-600 p-8 text-center text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 opacity-10">
              <ShieldCheck size={120} className="transform translate-x-4 -translate-y-4" />
            </div>
            <h1 className="text-3xl font-bold mb-2 relative z-10">Integrity Check</h1>
            <p className="text-blue-100 relative z-10">ECCF Bible Reading Challenge</p>
          </div>
          
          <div className="p-8">
            <div className="bg-amber-50 border-l-4 border-amber-500 p-6 rounded-r-lg mb-8 shadow-sm">
              <div className="flex gap-4">
                <AlertTriangle className="text-amber-500 flex-shrink-0 mt-1" size={28} />
                <div>
                  <h3 className="font-bold text-amber-900 text-lg mb-2">Christian Dignity & Truth</h3>
                  <p className="text-amber-800 leading-relaxed">
                    As children of God walking in truth and dignity, please complete this quiz sincerely 
                    <strong className="font-bold"> without using Bibles, notes, or AI assistants.</strong>
                  </p>
                  <p className="text-amber-800 mt-2 font-medium">
                    Let our honesty reflect His light!
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 mb-8 text-slate-600">
              {participant.team && (
                <div className="flex items-center gap-3 text-slate-800 font-semibold">
                  <Users className="text-blue-500" size={20} />
                  <span>Team: <span className="text-blue-600 font-bold">{participant.team}</span></span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Clock className="text-blue-500" size={20} />
                <span>The timer will begin immediately and <strong className="text-slate-800">cannot be paused</strong>.</span>
              </div>
              <div className="flex items-center gap-3">
                <WifiOff className="text-blue-500" size={20} />
                <span>Your answers save offline automatically if connection drops.</span>
              </div>
            </div>

            <button 
              onClick={startQuiz}
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-200 disabled:opacity-70"
            >
              {isSubmitting ? "Connecting..." : "I Agree, Start Quiz"}
              {!isSubmitting && <ChevronRight size={20} />}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const answeredCount = Object.keys(answers).length;
  const progressPercent = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;
  
  const diff = deadline ? deadline - Date.now() : 0;
  const isWarning = diff > 0 && diff < 60000; 

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24">
      {/* Sticky HUD */}
      <header className={`sticky top-0 z-50 transition-colors duration-300 ${isWarning ? 'bg-red-600' : 'bg-white'} shadow-md border-b ${isWarning ? 'border-red-700' : 'border-slate-200'}`}>
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex justify-between items-center mb-2">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold uppercase tracking-wider ${isWarning ? 'text-red-200' : 'text-slate-500'}`}>
                  {participant.round}
                </span>
                {participant.team && (
                  <span className={`text-xs px-2 py-0.5 rounded font-bold ${
                    isWarning ? 'bg-red-800 text-red-100' : 'bg-blue-50 text-blue-700'
                  }`}>
                    Team {participant.team}
                  </span>
                )}
              </div>
              <span className={`font-bold mt-0.5 ${isWarning ? 'text-white' : 'text-slate-800'}`}>
                {participant.fullName}
              </span>
            </div>
            
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xl font-bold tracking-widest
              ${isWarning ? 'bg-red-700 text-white animate-pulse' : 'bg-slate-100 text-slate-800'}
            `}>
              <Clock size={20} />
              {timeLeftStr}
            </div>
          </div>
          
          <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
            <div 
              className={`h-2.5 rounded-full transition-all duration-500 ease-out ${isWarning ? 'bg-white' : 'bg-blue-600'}`} 
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          
          <div className="flex justify-between items-center mt-1">
            <span className={`text-xs ${isWarning ? 'text-red-200' : 'text-slate-500'}`}>
              {answeredCount} of {questions.length} Answered
            </span>
            {isOffline && (
              <span className="text-xs font-bold text-amber-500 flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded">
                <WifiOff size={12} /> Offline - Saving Locally
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Questions Container */}
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {questions.map((q, index) => (
          <div key={q.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-lg font-semibold text-slate-800 leading-snug">
                <span className="text-blue-600 mr-2">{index + 1}.</span>
                {q.question}
              </h3>
            </div>
            
            <div className="p-3">
              {q.options.map((opt, optIndex) => {
                const isSelected = answers[q.id] === opt;
                return (
                  <label 
                    key={optIndex}
                    className={`
                      flex items-center p-4 my-2 rounded-lg cursor-pointer transition-all border
                      ${isSelected 
                        ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300' 
                        : 'border-transparent hover:bg-slate-50 hover:border-slate-200'
                      }
                    `}
                  >
                    <div className="relative flex items-center justify-center w-6 h-6 mr-4 flex-shrink-0">
                      <input
                        type="radio"
                        name={`question_${q.id}`}
                        value={opt}
                        checked={isSelected}
                        onChange={() => handleOptionSelect(q.id, opt)}
                        className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                        disabled={timeExpired}
                      />
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors
                        ${isSelected ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white'}
                      `}>
                        {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-white"></div>}
                      </div>
                    </div>
                    <span className={`text-base ${isSelected ? 'text-blue-900 font-medium' : 'text-slate-700'}`}>
                      {opt}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
        
        <div className="pt-8 pb-12 flex flex-col items-center">
          {timeExpired ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl text-center w-full shadow-sm mb-6">
              <h4 className="font-bold text-lg mb-1">Time Expired!</h4>
              <p>Your quiz is being automatically submitted.</p>
            </div>
          ) : (
            <button
              onClick={handleFinalSubmit}
              disabled={isSubmitting || timeExpired}
              className="w-full md:w-auto md:min-w-[300px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-10 rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-emerald-200 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span>Submitting...</span>
              ) : (
                <>
                  <CheckCircle2 size={24} />
                  <span>Submit Quiz</span>
                </>
              )}
            </button>
          )}
          
          {isOffline && (
            <p className="mt-4 text-amber-600 text-sm font-medium flex items-center gap-2">
              <WifiOff size={16} /> 
              Please restore your internet connection before submitting.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
