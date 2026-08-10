"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function StudentReviewPage() {
  const params = useParams();
  const attemptId = params.attemptId as string;
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

    if (status === "authenticated" && attemptId) {
      fetchReviewData();
    }
  }, [status, attemptId]);

  const fetchReviewData = async () => {
    try {
      const res = await fetch(`/api/student/exams/attempt/${attemptId}`);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.message || "Failed to load review data");
      }

      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner"></div></div>;

  if (error) {
    return (
      <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ color: 'var(--danger)', padding: '2rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '0.5rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <h2 style={{ marginBottom: '1rem' }}>Error Loading Review</h2>
          <p>{error}</p>
          <button className="btn-outline" style={{ marginTop: '1.5rem' }} onClick={() => router.push('/dashboard')}>Back to Dashboard</button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { attempt, totalTimeTaken, leaderboard } = data;
  const exam = attempt.exam;
  const maxScore = exam.questions.length;
  const percentage = Math.round((attempt.score / maxScore) * 100);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem' }}>
      <button onClick={() => router.push('/dashboard')} style={{ background: 'transparent', color: 'var(--primary)', padding: 0, marginBottom: '2rem', fontSize: '0.9rem', fontWeight: 600 }}>
        ← Back to Dashboard
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* Left Col: Summary & Questions */}
        <div>
          <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>{exam.courseName} - Review</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
              Completed on {new Date(attempt.completedAt).toLocaleString()}
            </p>

            <div style={{ display: 'flex', gap: '2rem' }}>
              <div>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: percentage >= 50 ? 'var(--success)' : 'var(--danger)' }}>
                  {attempt.score} <span style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>/ {maxScore}</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Final Score</div>
              </div>
              <div style={{ width: '1px', background: 'var(--surface-border)' }}></div>
              <div>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#fff' }}>
                  {formatTime(totalTimeTaken)}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Time Taken</div>
              </div>
            </div>
          </div>

          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Answer Breakdown</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {exam.questions.map((q: any, idx: number) => {
              const studentAns = attempt.answers.find((a: any) => a.questionIndex === idx);
              const selectedIdx = studentAns ? studentAns.selectedOptionIndex : -1;
              const isCorrect = selectedIdx === q.correctOptionIndex;
              const timeSpent = studentAns ? studentAns.timeTaken : 0;

              return (
                <div key={idx} className="glass-panel" style={{ padding: '1.5rem', borderLeft: `4px solid ${isCorrect ? 'var(--success)' : 'var(--danger)'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 500 }}>{idx + 1}. {q.questionText}</h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', marginLeft: '1rem' }}>
                      ⏱ {timeSpent}s
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {q.options.map((opt: string, optIdx: number) => {
                      let bgColor = 'rgba(0,0,0,0.2)';
                      let borderColor = 'var(--surface-border)';
                      let textColor = 'var(--text-secondary)';

                      if (optIdx === q.correctOptionIndex) {
                        bgColor = 'rgba(16, 185, 129, 0.1)';
                        borderColor = 'var(--success)';
                        textColor = '#fff';
                      } else if (optIdx === selectedIdx && !isCorrect) {
                        bgColor = 'rgba(239, 68, 68, 0.1)';
                        borderColor = 'var(--danger)';
                        textColor = '#fff';
                      }

                      return (
                        <div key={optIdx} style={{
                          padding: '0.75rem 1rem',
                          borderRadius: '0.5rem',
                          border: `1px solid ${borderColor}`,
                          background: bgColor,
                          color: textColor,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '1rem'
                        }}>
                          <span style={{ fontWeight: 600 }}>{String.fromCharCode(65 + optIdx)})</span>
                          <span>{opt}</span>
                          
                          {optIdx === q.correctOptionIndex && <span style={{ marginLeft: 'auto', fontSize: '1.2rem' }}>✓</span>}
                          {optIdx === selectedIdx && !isCorrect && <span style={{ marginLeft: 'auto', fontSize: '1.2rem' }}>✗</span>}
                        </div>
                      )
                    })}
                  </div>
                  
                  {selectedIdx === -1 && (
                    <div style={{ marginTop: '1rem', color: 'var(--danger)', fontSize: '0.85rem' }}>
                      You did not attempt this question.
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Right Col: Leaderboard */}
        <div className="glass-panel" style={{ padding: '1.5rem', position: 'sticky', top: '2rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '1.5rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.5rem' }}>
            Leaderboard
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {leaderboard.map((lb: any, idx: number) => {
              const isCurrentUser = lb.studentId === session?.user?.id;
              
              return (
                <div key={lb.studentId} style={{
                  display: 'flex', 
                  alignItems: 'center', 
                  padding: '0.75rem', 
                  borderRadius: '0.5rem',
                  background: isCurrentUser ? 'rgba(79, 70, 229, 0.15)' : 'transparent',
                  border: isCurrentUser ? '1px solid var(--primary)' : '1px solid transparent'
                }}>
                  <div style={{ width: '2rem', fontWeight: 700, color: idx < 3 ? 'var(--primary)' : 'var(--text-secondary)' }}>
                    #{idx + 1}
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {lb.studentName} {isCurrentUser && "(You)"}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 600 }}>{lb.score}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{formatTime(lb.totalTime)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
