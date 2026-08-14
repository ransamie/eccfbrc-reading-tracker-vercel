"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Award, ChevronLeft, Check, X, BookOpen } from "lucide-react";

export default function QuizResultPage() {
  const router = useRouter();
  const [result, setResult] = useState(null);

  useEffect(() => {
    try {
      const data = sessionStorage.getItem("quiz_result_data");
      if (data) {
        setResult(JSON.parse(data));
      } else {
        // No result data, push to landing page
        router.push("/quiz");
      }
    } catch (e) {
      console.error(e);
      router.push("/quiz");
    }
  }, [router]);

  if (!result) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center font-sans text-slate-100">
        <div className="spinner"></div>
      </div>
    );
  }

  const { score, totalQuestions, evaluatedAnswers } = result;
  const percentage = Math.round((score / totalQuestions) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4 font-sans text-slate-800">
      <div className="max-w-2xl mx-auto space-y-8">
        
        {/* Score Header Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-100 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl"></div>

          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-100">
            <Award size={40} className="text-blue-600 animate-bounce" />
          </div>

          <h1 className="text-3xl font-extrabold text-slate-950 mb-1">Quiz Completed!</h1>
          <p className="text-slate-500 font-medium">Thank you for submitting your answers sincerely.</p>
          
          <div className="mt-8 mb-6 inline-flex flex-col items-center">
            <div className="text-6xl font-black text-blue-600 tracking-tight">
              {score} <span className="text-2xl text-slate-400 font-normal">/ {totalQuestions}</span>
            </div>
            <div className="mt-2 text-sm font-semibold uppercase tracking-wider text-slate-500">
              Your Final Score ({percentage}%)
            </div>
          </div>
          
          <div className="border-t border-slate-100 pt-6 flex justify-center">
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-bold transition-all text-sm py-2 px-4 rounded-lg hover:bg-slate-100"
            >
              <ChevronLeft size={16} /> Back to Reading Tracker
            </button>
          </div>
        </div>

        {/* Answers Review list */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-100 space-y-6">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-4 flex items-center gap-2">
            <BookOpen size={20} className="text-blue-600" />
            Review Answers
          </h2>
          
          <div className="space-y-6 divide-y divide-slate-100">
            {evaluatedAnswers.map((ans, index) => (
              <div key={ans.questionId} className={`pt-6 ${index === 0 ? 'pt-0' : ''}`}>
                <h3 className="font-semibold text-slate-900 leading-snug flex gap-2">
                  <span className="text-slate-400">{index + 1}.</span>
                  {ans.questionText}
                </h3>
                
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* User Answer */}
                  <div className={`p-3.5 rounded-xl border flex items-center gap-3 ${
                    ans.isCorrect 
                      ? 'bg-emerald-50/50 border-emerald-200 text-emerald-800' 
                      : 'bg-red-50/50 border-red-200 text-red-800'
                  }`}>
                    {ans.isCorrect ? (
                      <Check size={18} className="text-emerald-600 flex-shrink-0" />
                    ) : (
                      <X size={18} className="text-red-600 flex-shrink-0" />
                    )}
                    <div className="text-sm">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">Your Answer</span>
                      <span className="font-medium">{ans.userAnswer}</span>
                    </div>
                  </div>

                  {/* Correct Answer (Show only if wrong) */}
                  {!ans.isCorrect && (
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 flex items-center gap-3">
                      <Check size={18} className="text-emerald-600 flex-shrink-0" />
                      <div className="text-sm">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">Correct Answer</span>
                        <span className="font-medium">{ans.correctAnswer}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
