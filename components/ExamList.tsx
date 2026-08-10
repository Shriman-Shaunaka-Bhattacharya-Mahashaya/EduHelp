"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ExamList() {
  const router = useRouter();
  const [exams, setExams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchExams = async () => {
    try {
      const res = await fetch("/api/exams");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to fetch exams");
      }

      setExams(data.exams);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner"></div></div>;
  }

  if (error) {
    return <div style={{ color: 'var(--danger)', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '0.5rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>{error}</div>;
  }

  if (exams.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
        No exams uploaded yet. Click "Upload New Exam" to get started.
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      {exams.map((exam) => (
        <div key={exam._id} style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--surface-border)', borderRadius: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#fff', marginBottom: '0.25rem' }}>{exam.courseName}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                {exam.questions.length} Questions • {exam.type === 'scheduled' ? `Scheduled Test` : `Practice Test`}
              </p>
            </div>
            <span style={{
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 600,
              background: exam.type === 'scheduled' ? 'rgba(236, 72, 153, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              color: exam.type === 'scheduled' ? '#fbcfe8' : '#a7f3d0'
            }}>
              {exam.type.toUpperCase()}
            </span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.85rem' }}>
            {exam.topics.length > 0 && (
              <div>
                <strong>Topics:</strong> {exam.topics.join(', ')}
              </div>
            )}
            {exam.type === 'scheduled' && exam.scheduledFor && (
              <div>
                <strong>Scheduled For:</strong> {new Date(exam.scheduledFor).toLocaleString()}
              </div>
            )}
            <div>
              <strong>Duration:</strong> {exam.durationMinutes || 60} mins
            </div>
            {exam.targetDepartment && (
              <div>
                <strong>Department:</strong> {exam.targetDepartment}
              </div>
            )}
            {exam.targetBatch && (
              <div>
                <strong>Batch:</strong> {exam.targetBatch}
              </div>
            )}
          </div>

          <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--surface-border)', textAlign: 'right' }}>
            <button
              className="btn-outline"
              style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
              onClick={() => router.push(`/instructor/analytics/${exam._id}`)}
            >
              View Analytics
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
