"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Award, ChevronLeft, Check, X, BookOpen, Trophy } from "lucide-react";

export default function QuizResultPage() {
  const router = useRouter();
  const [result, setResult] = useState(null);

  useEffect(() => {
    try {
      const data = sessionStorage.getItem("quiz_result_data");
      if (data) {
        setResult(JSON.parse(data));
      } else {
        router.push("/quiz");
      }
    } catch (e) {
      console.error(e);
      router.push("/quiz");
    }
  }, [router]);

  if (!result) {
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

  const { score, totalQuestions, evaluatedAnswers } = result;
  const percentage = Math.round((score / totalQuestions) * 100);
  const isHighPass = percentage >= 70;

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--background)',
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-sans)',
      padding: '3rem 1rem 6rem 1rem'
    }}>
      <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Score Summary Card */}
        <div style={{
          backgroundColor: 'var(--surface)',
          borderRadius: '1.25rem',
          border: '1px solid var(--border)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.35)',
          padding: '2.5rem 1.5rem',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Trophy Badge */}
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: isHighPass ? 'rgba(16, 185, 129, 0.15)' : 'var(--accent-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem auto',
            border: `1.5px solid ${isHighPass ? 'var(--success)' : 'var(--accent)'}`
          }}>
            <Trophy size={42} color={isHighPass ? "#10B981" : "#3B82F6"} />
          </div>

          <h1 style={{ fontSize: '1.85rem', fontWeight: '800', margin: '0 0 0.4rem 0' }}>
            Quiz Completed!
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.95rem' }}>
            Thank you for completing this quiz in Christian integrity.
          </p>

          {/* Big Score Display */}
          <div style={{ margin: '2rem 0' }}>
            <div style={{
              fontSize: '4rem',
              fontWeight: '900',
              lineHeight: '1',
              color: isHighPass ? '#34D399' : 'var(--accent-hover)',
              letterSpacing: '-1px'
            }}>
              {score} <span style={{ fontSize: '1.75rem', fontWeight: '500', color: 'var(--text-secondary)' }}>/ {totalQuestions}</span>
            </div>
            <div style={{
              fontSize: '0.95rem',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '1.5px',
              color: 'var(--text-secondary)',
              marginTop: '0.5rem'
            }}>
              Final Score ({percentage}%)
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1.25rem', display: 'flex', justifyContent: 'center' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              color: '#34D399',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              padding: '0.65rem 1.25rem',
              borderRadius: '0.6rem',
              fontSize: '0.92rem',
              fontWeight: '600'
            }}>
              <Check size={18} /> Submission Recorded Successfully
            </div>
          </div>
        </div>

        {/* Answers Review */}
        <div style={{
          backgroundColor: 'var(--surface)',
          borderRadius: '1.25rem',
          border: '1px solid var(--border)',
          boxShadow: '0 15px 40px rgba(0, 0, 0, 0.25)',
          padding: '2rem 1.5rem'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            borderBottom: '1px solid var(--border-light)',
            paddingBottom: '1rem',
            marginBottom: '1.5rem'
          }}>
            <BookOpen size={22} style={{ color: 'var(--accent)' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0 }}>Review Your Answers</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {evaluatedAnswers.map((ans, idx) => (
              <div 
                key={ans.questionId}
                style={{
                  backgroundColor: 'var(--surface-secondary)',
                  borderRadius: '0.85rem',
                  padding: '1.25rem',
                  border: '1px solid var(--border-light)'
                }}
              >
                <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1rem', alignItems: 'flex-start' }}>
                  <span style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    flexShrink: 0,
                    marginTop: '2px'
                  }}>
                    {idx + 1}
                  </span>
                  <h3 style={{ fontSize: '1rem', fontWeight: '600', margin: 0, color: 'var(--text-primary)', lineHeight: '1.45' }}>
                    {ans.questionText}
                  </h3>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
                  
                  {/* Participant's Answer */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.85rem 1rem',
                    borderRadius: '0.6rem',
                    backgroundColor: ans.isCorrect ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                    border: `1px solid ${ans.isCorrect ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`
                  }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: ans.isCorrect ? '#10B981' : '#EF4444',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {ans.isCorrect ? <Check size={14} /> : <X size={14} />}
                    </div>
                    <div>
                      <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)', display: 'block' }}>Your Choice</span>
                      <span style={{ fontSize: '0.92rem', fontWeight: '600', color: ans.isCorrect ? '#34D399' : '#FCA5A5' }}>
                        {ans.userAnswer}
                      </span>
                    </div>
                  </div>

                  {/* Correct Answer if incorrect */}
                  {!ans.isCorrect && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.85rem 1rem',
                      borderRadius: '0.6rem',
                      backgroundColor: 'rgba(16, 185, 129, 0.08)',
                      border: '1px solid rgba(16, 185, 129, 0.25)'
                    }}>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(16, 185, 129, 0.2)',
                        color: '#10B981',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <Check size={14} />
                      </div>
                      <div>
                        <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)', display: 'block' }}>Correct Answer</span>
                        <span style={{ fontSize: '0.92rem', fontWeight: '600', color: '#34D399' }}>
                          {ans.correctAnswer}
                        </span>
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
