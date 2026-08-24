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
  const isSubmittingRef = useRef(false);

  // Array of { questionIndex, selectedOptionIndex, timeTaken }
  const [answers, setAnswers] = useState<any[]>([]);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [examEndTime, setExamEndTime] = useState<number | null>(null);

  // Proctoring States
  const [strikes, setStrikes] = useState<number>(0);
  const [warningMessage, setWarningMessage] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const hasStartedFullscreenRef = useRef(false);

  // To track time per question
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const answersRef = useRef<any[]>([]);

  // 1. Lockdown Hooks (Copy, Paste, ContextMenu, Keydown)
  useEffect(() => {
    if (status !== "authenticated") return;
    
    const blockInteractions = (e: any) => e.preventDefault();
    const blockKeys = (e: KeyboardEvent) => {
      // Block Ctrl+C, Ctrl+V, Ctrl+S, Ctrl+P, Ctrl+A
      if (e.ctrlKey || e.metaKey) {
        if (['c','v','s','p','a'].includes(e.key.toLowerCase())) {
          e.preventDefault();
        }
      }
    };

    window.addEventListener('contextmenu', blockInteractions);
    window.addEventListener('copy', blockInteractions);
    window.addEventListener('cut', blockInteractions);
    window.addEventListener('paste', blockInteractions);
    window.addEventListener('keydown', blockKeys);

    return () => {
      window.removeEventListener('contextmenu', blockInteractions);
      window.removeEventListener('copy', blockInteractions);
      window.removeEventListener('cut', blockInteractions);
      window.removeEventListener('paste', blockInteractions);
      window.removeEventListener('keydown', blockKeys);
    };
  }, [status]);

  // 2. Visibility / Tab Switch Hook
  useEffect(() => {
    if (status !== "authenticated" || !examData || isSubmitting) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && !isSubmittingRef.current) {
        const cachedStrikes = parseInt(localStorage.getItem(`exam_strikes_${examId}`) || '0');
        const newStrikes = cachedStrikes + 1;
        
        localStorage.setItem(`exam_strikes_${examId}`, newStrikes.toString());
        setStrikes(newStrikes);

        if (newStrikes >= 3) {
          setWarningMessage("Exam auto-submitted due to repeated tab switching.");
          handleSubmitExam();
        } else {
          setWarningMessage(`Warning ${newStrikes}/2: Tab switching is strictly prohibited. Your exam will be auto-submitted on the next violation.`);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [status, examData, isSubmitting]);

  // 3. Fullscreen Hook
  useEffect(() => {
    if (status !== "authenticated" || !examData || isSubmitting) return;

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && !isSubmittingRef.current) {
        setIsFullscreen(false);
        if (hasStartedFullscreenRef.current) {
          const cachedStrikes = parseInt(localStorage.getItem(`exam_strikes_${examId}`) || '0');
          const newStrikes = cachedStrikes + 1;
          
          localStorage.setItem(`exam_strikes_${examId}`, newStrikes.toString());
          setStrikes(newStrikes);

          if (newStrikes >= 3) {
            setWarningMessage("Exam auto-submitted due to escaping full screen repeatedly.");
            handleSubmitExam();
          } else {
            setWarningMessage(`Warning ${newStrikes}/2: Escaping full screen is strictly prohibited. Your exam will be auto-submitted on the next violation.`);
          }
        }
      } else if (document.fullscreenElement) {
        setIsFullscreen(true);
        hasStartedFullscreenRef.current = true;
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [status, examData, isSubmitting, examId]);

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
    // Check cached strikes
    const cachedStrikes = parseInt(localStorage.getItem(`exam_strikes_${examId}`) || '0');
    setStrikes(cachedStrikes);

    // 1. Check local progress first
    const cached = localStorage.getItem(`exam_progress_${examId}`);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setExamData(parsed.examData);
        setAnswers(parsed.answers);
        answersRef.current = parsed.answers;
        setExamEndTime(parsed.examEndTime);
        setCurrentQuestionIdx(parsed.currentQuestionIdx);
        setQuestionStartTime(parsed.questionStartTime);
        setIsLoading(false);
        return;
      } catch (e) {
        // Fallback to fetch if parse fails
      }
    }

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
      setExamEndTime(Date.now() + (duration * 60 * 1000)); // Absolute End Time

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
    if (examEndTime === null || isSubmitting) return;

    const timer = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((examEndTime - now) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(timer);
        handleSubmitExam(); // Auto submit
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [examEndTime, isSubmitting]);

  // Sync state to local storage continuously
  useEffect(() => {
    if (examData && !isSubmitting) {
      localStorage.setItem(`exam_progress_${examId}`, JSON.stringify({
        examData,
        answers: answersRef.current,
        examEndTime,
        currentQuestionIdx,
        questionStartTime
      }));
    }
  }, [examData, answers, examEndTime, currentQuestionIdx, questionStartTime, isSubmitting]);

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
    if (isSubmittingRef.current) return;
    setIsSubmitting(true);
    isSubmittingRef.current = true;

    // Synchronously calculate final answers array to avoid React batching delay
    const now = Date.now();
    const timeSpent = Math.floor((now - questionStartTime) / 1000);
    const finalAnswers = answersRef.current.map((ans, idx) =>
      idx === currentQuestionIdx
        ? { ...ans, timeTaken: ans.timeTaken + timeSpent }
        : ans
    );

    updateTimeTaken();

    try {
      // Save pending sync state locally first
      const syncData = { examId, answers: finalAnswers };
      localStorage.setItem(`exam_sync_${examId}`, JSON.stringify(syncData));
      localStorage.removeItem(`exam_progress_${examId}`); // Clear active progress
      localStorage.removeItem(`exam_strikes_${examId}`); // Clear strikes upon successful submit

      const res = await fetch("/api/student/exams/attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          examId: examId, 
          action: "submit",
          answers: finalAnswers 
        }),
      });
      
      if (res.ok) {
        localStorage.removeItem(`exam_sync_${examId}`);
      }
    } catch (err: any) {
      console.warn("Offline submit: Saved locally for background sync.");
    } finally {
      // If we are auto-submitting from a 3rd strike, the overlay will handle the redirect.
      // Otherwise, redirect immediately.
      if (!warningMessage || !warningMessage.includes("auto-submitted")) {
        router.push("/dashboard");
      }
    }
  };

  const formatTime = (seconds: number) => {
    if (seconds < 0) return "00:00";
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
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem', userSelect: 'none', WebkitUserSelect: 'none' }}>
      
      {/* Warning Overlay (when in fullscreen) */}
      {warningMessage && isFullscreen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1e1e1e', padding: '3rem', borderRadius: '1rem', border: '2px solid var(--danger)', maxWidth: '500px', textAlign: 'center' }}>
            <h2 style={{ color: 'var(--danger)', fontSize: '2rem', marginBottom: '1rem' }}>⚠️ Warning</h2>
            <p style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '2rem' }}>{warningMessage}</p>
            {!warningMessage.includes("auto-submitted") ? (
              <button className="btn-primary" onClick={() => setWarningMessage("")}>I Understand</button>
            ) : (
              <button className="btn-primary" onClick={() => router.push('/dashboard')}>Return to Dashboard</button>
            )}
          </div>
        </div>
      )}

      {/* Fullscreen Requirement Overlay */}
      {!isFullscreen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--background)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--surface)', padding: '3rem', borderRadius: '1rem', border: '1px solid var(--surface-border)', maxWidth: '500px', textAlign: 'center' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: warningMessage ? 'var(--danger)' : '#fff' }}>
              {warningMessage ? '⚠️ Warning' : 'Fullscreen Required'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '2rem' }}>
              {warningMessage || "This exam requires full screen mode to ensure a proctored environment. You will receive a strike if you exit full screen during the exam."}
            </p>
            {!warningMessage.includes("auto-submitted") ? (
              <button className="btn-primary" onClick={async () => {
                try {
                  await document.documentElement.requestFullscreen();
                  if (warningMessage) setWarningMessage("");
                } catch (err) {
                  console.error("Fullscreen request failed", err);
                  alert("Please enable full screen permissions in your browser.");
                }
              }}>
                {warningMessage ? "I Understand, Return to Exam" : "Enter Full Screen to Start"}
              </button>
            ) : (
              <button className="btn-primary" onClick={() => router.push('/dashboard')}>Return to Dashboard</button>
            )}
          </div>
        </div>
      )}

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
