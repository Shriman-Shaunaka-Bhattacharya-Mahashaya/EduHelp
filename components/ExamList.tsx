"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function ExamCard({ exam, router }: { exam: any, router: any }) {
  return (
    <div style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--surface-border)', borderRadius: '0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#fff', marginBottom: '0.25rem' }}>{exam.courseName}</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            {exam.questions.length} Questions • {exam.type === 'scheduled' ? `Scheduled Test` : `Practice Test`}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.85rem' }}>
        {exam.topics?.length > 0 && (
          <div><strong>Topics:</strong> {exam.topics.join(', ')}</div>
        )}
        {exam.type === 'scheduled' && exam.scheduledFor && (
          <div><strong>Scheduled For:</strong> {new Date(exam.scheduledFor).toLocaleString()}</div>
        )}
        <div><strong>Duration:</strong> {exam.durationMinutes || 60} mins</div>
        {exam.targetDepartment && (
          <div><strong>Department:</strong> {exam.targetDepartment}</div>
        )}
        {exam.targetBatch && (
          <div><strong>Batch:</strong> {exam.targetBatch}</div>
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
  );
}

export default function ExamList() {
  const router = useRouter();
  
  const [practiceExams, setPracticeExams] = useState<any[]>([]);
  const [practicePage, setPracticePage] = useState(1);
  const [hasMorePractice, setHasMorePractice] = useState(false);
  const [loadingPractice, setLoadingPractice] = useState(false);

  const [scheduledExams, setScheduledExams] = useState<any[]>([]);
  const [scheduledPage, setScheduledPage] = useState(1);
  const [hasMoreScheduled, setHasMoreScheduled] = useState(false);
  const [loadingScheduled, setLoadingScheduled] = useState(false);

  const fetchExams = async (type: 'practice' | 'scheduled', page: number) => {
    try {
      if (type === 'practice') setLoadingPractice(true);
      else setLoadingScheduled(true);

      const res = await fetch(`/api/exams?type=${type}&page=${page}&limit=10`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Failed to fetch");

      if (type === 'practice') {
        setPracticeExams(prev => page === 1 ? data.exams : [...prev, ...data.exams]);
        setHasMorePractice(data.hasMore);
      } else {
        setScheduledExams(prev => page === 1 ? data.exams : [...prev, ...data.exams]);
        setHasMoreScheduled(data.hasMore);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      if (type === 'practice') setLoadingPractice(false);
      else setLoadingScheduled(false);
    }
  };

  useEffect(() => {
    fetchExams('practice', 1);
    fetchExams('scheduled', 1);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      {/* Scheduled Exams Section */}
      <div>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.5rem', color: '#fff' }}>
          Scheduled Exams
        </h2>
        <div style={{ display: 'grid', gap: '1rem' }}>
          {scheduledExams.map(exam => <ExamCard key={exam._id} exam={exam} router={router} />)}
          {scheduledExams.length === 0 && !loadingScheduled && (
            <div style={{ color: 'var(--text-secondary)' }}>No scheduled exams uploaded.</div>
          )}
        </div>
        {hasMoreScheduled && (
          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <button className="btn-outline" onClick={() => {
              const nextPage = scheduledPage + 1;
              setScheduledPage(nextPage);
              fetchExams('scheduled', nextPage);
            }} disabled={loadingScheduled}>
              {loadingScheduled ? "Loading..." : "Load More Scheduled Exams"}
            </button>
          </div>
        )}
      </div>

      {/* Practice Exams Section */}
      <div>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.5rem', color: '#fff' }}>
          Practice Exams
        </h2>
        <div style={{ display: 'grid', gap: '1rem' }}>
          {practiceExams.map(exam => <ExamCard key={exam._id} exam={exam} router={router} />)}
          {practiceExams.length === 0 && !loadingPractice && (
            <div style={{ color: 'var(--text-secondary)' }}>No practice exams uploaded.</div>
          )}
        </div>
        {hasMorePractice && (
          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <button className="btn-outline" onClick={() => {
              const nextPage = practicePage + 1;
              setPracticePage(nextPage);
              fetchExams('practice', nextPage);
            }} disabled={loadingPractice}>
              {loadingPractice ? "Loading..." : "Load More Practice Exams"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
