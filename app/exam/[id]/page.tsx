"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";

export default function ExamPage() {
  const router = useRouter();
  const params = useParams();
  const examId = params.id as string;
  const { data: session, status } = useSession();
  
  const [examData, setExamData] = useState<any>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Array of { questionIndex, selectedOptionIndex, timeTaken }
  const [answers, setAnswers] = useState<any[]>([]);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  
  // To track time per question
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const answersRef = useRef<any[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated") {
      startExam();
    }
  }, [status]);

  const startExam = async () => {
    try {
      const res = await fetch("/api/student/exams/attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examId: examId, action: "start" }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || "Failed to load exam");
      }
      
      setExamData(data.examDetails);
      const duration = data.examDetails?.durationMinutes || 60;
      setTimeLeft(duration * 60); // in seconds
      
      // Initialize answers array
      const initialAnswers = data.examDetails.questions.map((_: any, idx: number) => ({
        questionIndex: idx,
        selectedOptionIndex: -1,
        timeTaken: 0
      }));
      setAnswers(initialAnswers);
      answersRef.current = initialAnswers;
      
      setQuestionStartTime(Date.now());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (timeLeft === null || isSubmitting) return;

    if (timeLeft <= 0) {
      handleSubmitExam(); // Auto submit
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isSubmitting]);

  const updateTimeTaken = () => {
    const now = Date.now();
    const timeSpent = Math.floor((now - questionStartTime) / 1000);
    
    setAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[currentQuestionIdx] = {
        ...newAnswers[currentQuestionIdx],
        timeTaken: newAnswers[currentQuestionIdx].timeTaken + timeSpent
      };
      answersRef.current = newAnswers; // Keep ref updated for auto-submit
      return newAnswers;
    });
    setQuestionStartTime(now);
  };

  const handleNext = () => {
    if (currentQuestionIdx < examData.questions.length - 1) {
      updateTimeTaken();
      setCurrentQuestionIdx(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIdx > 0) {
      updateTimeTaken();
      setCurrentQuestionIdx(prev => prev - 1);
    }
  };

  const handleOptionSelect = (optionIndex: number) => {
    setAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[currentQuestionIdx] = {
        ...newAnswers[currentQuestionIdx],
        selectedOptionIndex: optionIndex
      };
      answersRef.current = newAnswers;
      return newAnswers;
    });
  };

  const handleSubmitExam = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    // Synchronously calculate final answers array to avoid React batching delay
    const now = Date.now();
    const timeSpent = Math.floor((now - questionStartTime) / 1000);
    const finalAnswers = answersRef.current.map((ans, idx) => 
      idx === currentQuestionIdx 
        ? { ...ans, timeTaken: ans.timeTaken + timeSpent }
        : ans
    );

    updateTimeTaken(); // Still update UI state for completeness

    try {
      const res = await fetch("/api/student/exams/attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          examId: examId, 
          action: "submit",
          answers: finalAnswers 
        }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || "Failed to submit exam");
      }
      
      // Success, go to dashboard
      router.push("/dashboard");
    } catch (err: any) {
      alert(err.message);
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><div className="spinner"></div></div>;

  if (error) {
    return (
      <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ color: 'var(--danger)', padding: '2rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '0.5rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <h2 style={{ marginBottom: '1rem' }}>Cannot Start Exam</h2>
          <p>{error}</p>
          <button className="btn-outline" style={{ marginTop: '1.5rem' }} onClick={() => router.push('/dashboard')}>Back to Dashboard</button>
        </div>
      </div>
    );
  }

  if (!examData) return null;

  const currentQ = examData.questions[currentQuestionIdx];
  const currentAnswer = answers[currentQuestionIdx];

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: '1rem', zIndex: 10, marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{examData.courseName}</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Question {currentQuestionIdx + 1} of {examData.questions.length}</p>
        </div>
        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: (timeLeft || 0) < 300 ? 'var(--danger)' : 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          ⏱ {formatTime(timeLeft || 0)}
        </div>
      </div>

      <div className="glass-panel animate-fade-in" style={{ padding: '2.5rem' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '2rem', lineHeight: 1.5 }}>
          {currentQuestionIdx + 1}. {currentQ.questionText}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {currentQ.options.map((opt: string, idx: number) => {
            const isSelected = currentAnswer?.selectedOptionIndex === idx;
            return (
              <button
                key={idx}
                onClick={() => handleOptionSelect(idx)}
                style={{
                  textAlign: 'left',
                  padding: '1rem 1.5rem',
                  borderRadius: '0.5rem',
                  border: isSelected ? '2px solid var(--primary)' : '1px solid var(--surface-border)',
                  background: isSelected ? 'rgba(79, 70, 229, 0.1)' : 'rgba(0,0,0,0.2)',
                  color: isSelected ? '#fff' : 'var(--text-secondary)',
                  transition: 'all 0.2s',
                  fontSize: '1rem'
                }}
              >
                <span style={{ fontWeight: 600, marginRight: '1rem', color: isSelected ? 'var(--primary)' : 'inherit' }}>
                  {String.fromCharCode(65 + idx)})
                </span>
                {opt}
              </button>
            )
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--surface-border)' }}>
          <button 
            className="btn-outline" 
            onClick={handlePrev} 
            disabled={currentQuestionIdx === 0}
            style={{ opacity: currentQuestionIdx === 0 ? 0.5 : 1 }}
          >
            ← Previous
          </button>
          
          {currentQuestionIdx === examData.questions.length - 1 ? (
            <button 
              className="btn-primary" 
              onClick={() => {
                if (window.confirm("Are you sure you want to submit your exam?")) {
                  handleSubmitExam();
                }
              }}
              disabled={isSubmitting}
              style={{ background: 'var(--success)', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)' }}
            >
              {isSubmitting ? <div className="spinner"></div> : "Submit Exam"}
            </button>
          ) : (
            <button className="btn-primary" onClick={handleNext}>
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
