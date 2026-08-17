"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function ExamCard({ exam, router, onEdit, onDelete }: { exam: any, router: any, onEdit: (e: any) => void, onDelete: (id: string) => void }) {
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
        <div style={{ fontSize: '0.85rem', color: 'var(--danger)' }}>
          <strong>⏳ Auto-deletes on:</strong> {exam.expireAt ? new Date(exam.expireAt).toLocaleString() : "Never"}
        </div>
      </div>

      <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
        <button
          className="btn-outline"
          style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', borderColor: 'var(--danger)', color: 'var(--danger)' }}
          onClick={() => onDelete(exam._id)}
        >
          Delete
        </button>
        <button
          className="btn-outline"
          style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
          onClick={() => onEdit(exam)}
        >
          Edit Settings
        </button>
        <button
          className="btn-outline"
          style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', background: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)' }}
          onClick={() => router.push(`/instructor/analytics/${exam._id}`)}
        >
          Analytics
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

  // Edit State
  const [editingExam, setEditingExam] = useState<any>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [targetBatch, setTargetBatch] = useState<number | "">("");
  const [expireAt, setExpireAt] = useState("");

  const startEdit = (exam: any) => {
    setEditingExam(exam);
    setTargetBatch(exam.targetBatch || "");
    setExpireAt(exam.expireAt ? new Date(exam.expireAt).toISOString().slice(0, 16) : "");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this exam? This action cannot be undone.")) return;
    try {
      const res = await fetch(`/api/instructor/exams/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        alert(data.message || "Failed to delete exam");
        return;
      }
      // Optimistically remove from state
      setPracticeExams(prev => prev.filter(e => e._id !== id));
      setScheduledExams(prev => prev.filter(e => e._id !== id));
    } catch (e) {
      console.error(e);
      alert("An error occurred while deleting.");
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError("");
    try {
      const res = await fetch(`/api/instructor/exams/${editingExam._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseName: editingExam.courseName,
          type: editingExam.type,
          durationMinutes: editingExam.durationMinutes,
          targetDepartment: editingExam.targetDepartment,
          targetBatch: targetBatch,
          scheduledFor: editingExam.scheduledFor,
          expireAt: expireAt ? new Date(expireAt).toISOString() : null,
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update exam");
      
      // Update in state
      setPracticeExams(prev => prev.map(ex => ex._id === editingExam._id ? data.exam : ex));
      setScheduledExams(prev => prev.map(ex => ex._id === editingExam._id ? data.exam : ex));
      
      setEditingExam(null);
    } catch (err: any) {
      setEditError(err.message);
    } finally {
      setEditLoading(false);
    }
  };

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
          {scheduledExams.map(exam => <ExamCard key={exam._id} exam={exam} router={router} onEdit={startEdit} onDelete={handleDelete} />)}
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
          {practiceExams.map(exam => <ExamCard key={exam._id} exam={exam} router={router} onEdit={startEdit} onDelete={handleDelete} />)}
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

      {/* Edit Modal */}
      {editingExam && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-panel" style={{ width: '90%', maxWidth: '600px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Edit Exam Settings</h2>
            
            {editError && <div style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{editError}</div>}

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="label">Course / Exam Name</label>
                <input className="input" type="text" required value={editingExam.courseName} onChange={e => setEditingExam({...editingExam, courseName: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--surface-border)', borderRadius: '0.5rem', color: '#fff' }} />
              </div>
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label className="label">Type</label>
                  <select className="input" value={editingExam.type} onChange={e => setEditingExam({...editingExam, type: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--surface-border)', borderRadius: '0.5rem', color: '#fff' }}>
                    <option value="practice">Practice Exam</option>
                    <option value="scheduled">Scheduled Exam</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label className="label">Duration (Minutes)</label>
                  <input className="input" type="number" required min={1} value={editingExam.durationMinutes} onChange={e => setEditingExam({...editingExam, durationMinutes: parseInt(e.target.value)})} style={{ width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--surface-border)', borderRadius: '0.5rem', color: '#fff' }} />
                </div>
              </div>

              {editingExam.type === 'scheduled' && (
                <div>
                  <label className="label">Scheduled For</label>
                  <input className="input" type="datetime-local" required value={editingExam.scheduledFor ? new Date(editingExam.scheduledFor).toISOString().slice(0, 16) : ""} onChange={e => setEditingExam({...editingExam, scheduledFor: new Date(e.target.value).toISOString()})} style={{ width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--surface-border)', borderRadius: '0.5rem', color: '#fff' }} />
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label className="label">Target Department (Optional)</label>
                  <select className="input" value={editingExam.targetDepartment || ""} onChange={e => setEditingExam({...editingExam, targetDepartment: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--surface-border)', borderRadius: '0.5rem', color: '#fff' }}>
                    <option value="">All Departments</option>
                    <option value="Computer Science">Computer Science</option>
                    <option value="Information Technology">Information Technology</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Mechanical">Mechanical</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label className="label">Target Batch (Optional)</label>
                  <input className="input" type="number" placeholder="2026" value={targetBatch} onChange={e => setTargetBatch(Number(e.target.value))} style={{ width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--surface-border)', borderRadius: '0.5rem', color: '#fff' }} />
                </div>
              </div>
              
              <div>
                <label className="label">Auto-delete Date (Optional)</label>
                <input className="input" type="datetime-local" value={expireAt} onChange={e => setExpireAt(e.target.value)} style={{ width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--surface-border)', borderRadius: '0.5rem', color: '#fff' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn-outline" onClick={() => setEditingExam(null)} disabled={editLoading}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={editLoading}>{editLoading ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
