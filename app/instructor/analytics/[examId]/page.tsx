"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function InstructorAnalyticsPage() {
  const params = useParams();
  const examId = params.examId as string;
  const router = useRouter();
  const { data: session, status } = useSession();

  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated" && examId) {
      fetchAnalyticsData();
    }
  }, [status, examId]);

  const fetchAnalyticsData = async () => {
    try {
      const res = await fetch(`/api/instructor/exams/${examId}/analytics`);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.message || "Failed to load analytics data");
      }

      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner"></div></div>;

  if (error) {
    return (
      <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ color: 'var(--danger)', padding: '2rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '0.5rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <h2 style={{ marginBottom: '1rem' }}>Error Loading Analytics</h2>
          <p>{error}</p>
          <button className="btn-outline" style={{ marginTop: '1.5rem' }} onClick={() => router.push('/dashboard')}>Back to Dashboard</button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { examTitle, totalAttempts, averageScore, maxScore, questionStats, leaderboard } = data;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <button onClick={() => router.push('/dashboard')} style={{ background: 'transparent', color: 'var(--primary)', padding: 0, marginBottom: '2rem', fontSize: '0.9rem', fontWeight: 600 }}>
        ← Back to Dashboard
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>{examTitle} Analytics</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '3rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--primary)' }}>{totalAttempts}</div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Total Attempts</div>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--success)' }}>{averageScore}</div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Average Score (out of {maxScore})</div>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--secondary)' }}>
            {totalAttempts > 0 ? Math.round((Number(averageScore) / maxScore) * 100) : 0}%
          </div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Average Percentage</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* Left Col: Per Question Stats */}
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Per-Question Statistics</h2>
          {totalAttempts === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>No attempts recorded yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {questionStats.map((q: any) => {
                const totalAnswers = q.correctCount + q.incorrectCount;
                const correctPercent = totalAnswers > 0 ? Math.round((q.correctCount / totalAttempts) * 100) : 0;
                const incorrectPercent = totalAnswers > 0 ? Math.round((q.incorrectCount / totalAttempts) * 100) : 0;
                const unattemptedPercent = Math.round((q.unattemptedCount / totalAttempts) * 100);

                return (
                  <div key={q.questionIndex} className="glass-panel" style={{ padding: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 500, marginBottom: '1rem' }}>
                      {q.questionIndex + 1}. {q.questionText}
                    </h3>
                    
                    {/* Progress Bar */}
                    <div style={{ display: 'flex', height: '12px', borderRadius: '6px', overflow: 'hidden', marginBottom: '1rem' }}>
                      <div style={{ width: `${correctPercent}%`, background: 'var(--success)' }}></div>
                      <div style={{ width: `${incorrectPercent}%`, background: 'var(--danger)' }}></div>
                      <div style={{ width: `${unattemptedPercent}%`, background: 'var(--surface-border)' }}></div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--success)' }}>Correct: {q.correctCount} ({correctPercent}%)</span>
                      <span style={{ color: 'var(--danger)' }}>Incorrect: {q.incorrectCount} ({incorrectPercent}%)</span>
                      <span style={{ color: 'var(--text-secondary)' }}>Skipped: {q.unattemptedCount} ({unattemptedPercent}%)</span>
                    </div>

                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--surface-border)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Options Chosen: 
                      {q.optionsSelected.map((count: number, i: number) => (
                        <span key={i} style={{ marginLeft: '1rem' }}>
                          {String.fromCharCode(65 + i)}: {count}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right Col: Leaderboard */}
        <div className="glass-panel" style={{ padding: '1.5rem', position: 'sticky', top: '2rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '1.5rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.5rem' }}>
            Class Leaderboard
          </h2>
          
          {leaderboard.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No data available.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {leaderboard.map((lb: any, idx: number) => (
                <div key={idx} style={{
                  display: 'flex', 
                  alignItems: 'center', 
                  padding: '0.75rem', 
                  borderRadius: '0.5rem',
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px solid var(--surface-border)'
                }}>
                  <div style={{ width: '2rem', fontWeight: 700, color: idx < 3 ? 'var(--primary)' : 'var(--text-secondary)' }}>
                    #{idx + 1}
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {lb.studentName}
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                      {new Date(lb.attemptDate).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 600 }}>{lb.score} <span style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>/ {maxScore}</span></div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{formatTime(lb.totalTime)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
