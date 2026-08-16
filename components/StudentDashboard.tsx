"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function StudentDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"available" | "given">("available");
  const [availableExams, setAvailableExams] = useState<any[]>([]);
  const [givenExams, setGivenExams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [startLoading, setStartLoading] = useState<string | null>(null);

  const fetchExams = async () => {
    try {
      const res = await fetch("/api/student/exams/available");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to fetch exams");
      }

      setAvailableExams(data.available);
      setGivenExams(data.given);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();

    // Background sync for offline exams
    const syncOfflineExams = async () => {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('exam_sync_')) {
          try {
            const data = JSON.parse(localStorage.getItem(key) || '{}');
            const res = await fetch("/api/student/exams/attempt", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ 
                examId: data.examId, 
                action: "submit", 
                answers: data.answers 
              }),
            });
            if (res.ok) {
              localStorage.removeItem(key);
              fetchExams(); // Refresh dashboard data
            }
          } catch (e) {
            // Silently ignore if still offline
          }
        }
      }
    };
    
    syncOfflineExams();
    window.addEventListener('online', syncOfflineExams);
    return () => window.removeEventListener('online', syncOfflineExams);
  }, []);

  const handleStartExam = async (examId: string) => {
    setStartLoading(examId);
    setError("");
    try {
      const res = await fetch("/api/student/exams/attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examId, action: 'start' }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.message && data.message.includes('Login window of 15 minutes has passed')) {
          setAvailableExams(prev => prev.map(e => e._id === examId ? { ...e, isExpired: true } : e));
        }
        throw new Error(data.message || "Failed to start exam");
      }

      // Store exam details in localStorage/sessionStorage for the exam page if needed
      // Or just rely on the API. The exam page can fetch it if needed, or we just pass via query/context.
      // But we already get examDetails here.
      // Easiest is to navigate to the exam page with the attemptId.
      router.push(`/exam/${examId}?attemptId=${data.attemptId}`);

    } catch (err: any) {
      setError(err.message);
      setStartLoading(null);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '1rem' }}>
        <button
          onClick={() => setActiveTab("available")}
          style={{
            background: 'transparent',
            color: activeTab === "available" ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === "available" ? '2px solid var(--primary)' : 'none',
            borderRadius: 0,
            padding: '0.5rem 1rem'
          }}
        >
          Available Exams
        </button>
        <button
          onClick={() => setActiveTab("given")}
          style={{
            background: 'transparent',
            color: activeTab === "given" ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === "given" ? '2px solid var(--primary)' : 'none',
            borderRadius: 0,
            padding: '0.5rem 1rem'
          }}
        >
          Exams Given
        </button>
      </div>

      {error && <div style={{ color: 'var(--danger)', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '0.5rem', border: '1px solid rgba(239, 68, 68, 0.2)', marginBottom: '1rem' }}>{error}</div>}

      <div className="animate-fade-in">
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner"></div></div>
        ) : activeTab === "available" ? (
          availableExams.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>No exams currently available.</div>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {availableExams.map((exam) => (
                <div key={exam._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--surface-border)', borderRadius: '0.5rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#fff' }}>{exam.courseName}</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      By {exam.instructor?.fullName} • {exam.durationMinutes || 60} mins • {exam.questions.length} Questions
                    </p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      Type: <strong style={{ color: exam.type === 'scheduled' ? '#fbcfe8' : '#a7f3d0' }}>{exam.type.toUpperCase()}</strong>
                      {exam.type === 'scheduled' && exam.scheduledFor && ` (Scheduled: ${new Date(exam.scheduledFor).toLocaleString()})`}
                    </p>
                  </div>
                  <div>
                    {exam.isUpcoming ? (
                      <button className="btn-outline" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>Upcoming</button>
                    ) : exam.isExpired ? (
                      <button className="btn-outline" disabled style={{ opacity: 0.7, cursor: 'not-allowed', color: 'var(--danger)', borderColor: 'var(--danger)' }}>Login Window Passed</button>
                    ) : (
                      <button
                        className="btn-primary"
                        onClick={() => handleStartExam(exam._id)}
                        disabled={startLoading === exam._id}
                      >
                        {startLoading === exam._id ? <div className="spinner"></div> : "Take Exam"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          givenExams.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>You haven't taken any exams yet.</div>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {givenExams.map((exam) => (
                <div key={exam._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--surface-border)', borderRadius: '0.5rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#fff' }}>{exam.courseName}</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      By {exam.instructor?.fullName} • Completed on {new Date(exam.attempt.completedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>
                      {exam.attempt.score} / {exam.questions.length}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Score</div>
                    <button
                      className="btn-outline"
                      style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}
                      onClick={() => router.push(`/student/review/${exam.attempt._id}`)}
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
