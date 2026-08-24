"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from 'react-markdown';

export default function ManageAssignments() {
  const [showForm, setShowForm] = useState(false);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [courseName, setCourseName] = useState("");
  const [description, setDescription] = useState("");
  const [targetDepartment, setTargetDepartment] = useState("");
  const [targetBatch, setTargetBatch] = useState("");
  const [deadline, setDeadline] = useState("");
  const [maxMarks, setMaxMarks] = useState("");
  const [expireAt, setExpireAt] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);

  const [submitLoading, setSubmitLoading] = useState(false);
  const [parseLoading, setParseLoading] = useState(false);
  const [error, setError] = useState("");

  // Submissions Modal State
  const [viewingAssignment, setViewingAssignment] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [gradingState, setGradingState] = useState<{ [key: string]: { marks: string, feedback: string } }>({});

  const fetchAssignments = async (pageNum = 1) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const res = await fetch(`/api/instructor/assignments?page=${pageNum}&limit=5`);
      if (res.ok) {
        const data = await res.json();
        setAssignments(prev => pageNum === 1 ? data.assignments : [...prev, ...data.assignments]);
        setHasMore(data.hasMore);
        setPage(pageNum);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const handleParseFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParseLoading(true);
    setError("");
    const formData = new FormData();
    formData.append("file", file);

    try {
      // Re-using the announcement parse endpoint since it's just extracting text
      const res = await fetch("/api/instructor/announcements/parse", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to parse file");
      setDescription(data.text);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setParseLoading(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !courseName || !description) {
      setError("Title, Course Name, and Description are required.");
      return;
    }

    setSubmitLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("title", title);
    formData.append("courseName", courseName);
    formData.append("description", description);
    if (targetDepartment) formData.append("targetDepartment", targetDepartment);
    if (targetBatch) formData.append("targetBatch", targetBatch);
    if (deadline) formData.append("deadline", new Date(deadline).toISOString());
    if (maxMarks) formData.append("maxMarks", maxMarks);
    if (expireAt) formData.append("expireAt", new Date(expireAt).toISOString());
    if (attachment) formData.append("attachment", attachment);
    if (editingId && !attachment) formData.append("removeAttachment", "true");

    try {
      const url = editingId ? `/api/instructor/assignments/${editingId}` : "/api/instructor/assignments";
      const method = editingId ? "PUT" : "POST";
      
      const res = await fetch(url, { method, body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `Failed to ${editingId ? 'update' : 'create'} assignment`);

      resetForm();
      fetchAssignments(1);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitLoading(false);
      setShowForm(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setCourseName("");
    setDescription("");
    setTargetDepartment("");
    setTargetBatch("");
    setDeadline("");
    setMaxMarks("");
    setExpireAt("");
    setAttachment(null);
    setEditingId(null);
    setError("");
    setShowForm(false);
  };

  const handleEdit = (assign: any) => {
    setShowForm(true);
    setEditingId(assign._id);
    setTitle(assign.title);
    setCourseName(assign.courseName);
    setDescription(assign.description);
    setTargetDepartment(assign.targetDepartment || "");
    setTargetBatch(assign.targetBatch || "");
    setDeadline(assign.deadline ? new Date(assign.deadline).toISOString().slice(0, 16) : "");
    setMaxMarks(assign.maxMarks || "");
    setExpireAt(assign.expireAt ? new Date(assign.expireAt).toISOString().slice(0, 16) : "");
    setAttachment(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this assignment and ALL its student submissions?")) return;
    try {
      const res = await fetch(`/api/instructor/assignments/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Failed to delete");
      fetchAssignments(1);
    } catch (e) {
      alert("Error deleting assignment.");
    }
  };

  const openSubmissions = async (assign: any) => {
    setViewingAssignment(assign);
    setSubmissionsLoading(true);
    setSubmissions([]);
    setGradingState({});
    try {
      const res = await fetch(`/api/instructor/assignments/${assign._id}/submissions`);
      const data = await res.json();
      if (res.ok) {
        setSubmissions(data.submissions);
        // Pre-fill grading state
        const state: any = {};
        data.submissions.forEach((sub: any) => {
          state[sub._id] = { marks: sub.marksAwarded || "", feedback: sub.feedback || "" };
        });
        setGradingState(state);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmissionsLoading(false);
    }
  };

  const handleGradeSubmit = async (subId: string) => {
    const { marks, feedback } = gradingState[subId];
    try {
      const res = await fetch(`/api/instructor/assignments/submissions/${subId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marksAwarded: marks ? parseInt(marks) : null, feedback })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save grade");
      alert("Grade saved successfully!");
      // Update local state
      setSubmissions(prev => prev.map(s => s._id === subId ? data.submission : s));
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (showForm) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <button 
          className="btn-outline" 
          onClick={resetForm} 
          style={{ alignSelf: 'flex-start' }}
        >
          ← Back to Assignments
        </button>
        {/* Create/Edit Form */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.5rem' }}>
          {editingId ? "Edit Assignment" : "Create New Assignment"}
        </h2>
        
        {error && <div style={{ color: 'var(--danger)', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '0.5rem', marginBottom: '1rem' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label className="label">Assignment Title</label>
              <input type="text" className="input" value={title} onChange={e => setTitle(e.target.value)} required placeholder="E.g., Mid-Term Project" style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--surface-border)', background: 'rgba(0,0,0,0.2)', color: '#fff' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label className="label">Course Name</label>
              <input type="text" className="input" value={courseName} onChange={e => setCourseName(e.target.value)} required placeholder="E.g., CS101" style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--surface-border)', background: 'rgba(0,0,0,0.2)', color: '#fff' }} />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label className="label" style={{ marginBottom: 0 }}>Description / Question (Markdown Supported)</label>
              <label className="btn-outline" style={{ cursor: 'pointer', fontSize: '0.85rem', padding: '0.25rem 0.5rem' }}>
                {parseLoading ? "Extracting..." : "Auto-Fill from File"}
                <input type="file" accept=".pdf,.txt,.docx,.pptx" onChange={handleParseFile} style={{ display: 'none' }} disabled={parseLoading} />
              </label>
            </div>
            <textarea className="input" rows={6} value={description} onChange={e => setDescription(e.target.value)} required placeholder="Type the assignment details here..." style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--surface-border)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontFamily: 'monospace' }} />
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label className="label">Target Department (Optional)</label>
              <select className="input" value={targetDepartment} onChange={e => setTargetDepartment(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--surface-border)', background: 'rgba(0,0,0,0.2)', color: '#fff' }}>
                <option value="">All Departments</option>
                <option value="Computer Science">Computer Science</option>
                <option value="Information Technology">Information Technology</option>
                <option value="Electronics">Electronics</option>
                <option value="Mechanical">Mechanical</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label className="label">Target Batch / Grad Year (Optional)</label>
              <input type="number" className="input" value={targetBatch} onChange={e => setTargetBatch(e.target.value)} placeholder="E.g., 2026" style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--surface-border)', background: 'rgba(0,0,0,0.2)', color: '#fff' }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label className="label">Deadline (Optional)</label>
              <input type="datetime-local" className="input" value={deadline} onChange={e => setDeadline(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--surface-border)', background: 'rgba(0,0,0,0.2)', color: '#fff' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label className="label">Max Marks (Optional)</label>
              <input type="number" className="input" value={maxMarks} onChange={e => setMaxMarks(e.target.value)} placeholder="E.g., 100" style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--surface-border)', background: 'rgba(0,0,0,0.2)', color: '#fff' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label className="label">Auto-delete Date (Optional)</label>
              <input type="datetime-local" className="input" value={expireAt} onChange={e => setExpireAt(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--surface-border)', background: 'rgba(0,0,0,0.2)', color: '#fff' }} />
            </div>
          </div>

          <div>
            <label className="label">Downloadable Attachment (Optional)</label>
            <input type="file" onChange={e => setAttachment(e.target.files?.[0] || null)} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--surface-border)', background: 'rgba(0,0,0,0.2)', color: '#fff' }} />
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button type="submit" className="btn-primary" disabled={submitLoading} style={{ flex: 1 }}>
              {submitLoading ? <div className="spinner"></div> : (editingId ? "Save Changes" : "Post Assignment")}
            </button>
            {editingId && (
              <button type="button" className="btn-outline" onClick={resetForm} disabled={submitLoading} style={{ flex: 1 }}>
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '-1rem' }}>
        <button 
          className="btn-primary" 
          onClick={() => setShowForm(true)}
        >
          + Add New Assignment
        </button>
      </div>

      {/* List Assignments */}
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.5rem' }}>Your Assignments</h2>
        
        {loading ? (
          <div className="spinner"></div>
        ) : assignments.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>You haven't posted any assignments yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {assignments.map((assign: any) => (
              <div key={assign._id} style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--surface-border)', borderRadius: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{assign.title}</h3>
                    <div style={{ fontSize: '0.9rem', color: 'var(--primary)', fontWeight: 'bold', marginBottom: '0.5rem' }}>{assign.courseName}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      {assign.targetDepartment && <span style={{ fontSize: '0.75rem', padding: '0.1rem 0.5rem', background: 'rgba(59, 130, 246, 0.2)', color: '#93c5fd', borderRadius: '1rem' }}>{assign.targetDepartment}</span>}
                      {assign.targetBatch && <span style={{ fontSize: '0.75rem', padding: '0.1rem 0.5rem', background: 'rgba(16, 185, 129, 0.2)', color: '#6ee7b7', borderRadius: '1rem' }}>Batch {assign.targetBatch}</span>}
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '2rem', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  <div><strong>Max Marks:</strong> {assign.maxMarks || "Ungraded"}</div>
                  <div><strong>Deadline:</strong> {assign.deadline ? new Date(assign.deadline).toLocaleString() : "No Deadline"}</div>
                  <div style={{ color: 'var(--danger)' }}><strong>⏳ Auto-deletes on:</strong> {assign.expireAt ? new Date(assign.expireAt).toLocaleString() : "Never"}</div>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
                  <ReactMarkdown>{assign.description}</ReactMarkdown>
                </div>

                {assign.attachment && (
                  <div style={{ display: 'inline-block', marginBottom: '1.5rem' }}>
                    <a href={assign.attachment.url} target="_blank" rel="noopener noreferrer" className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', padding: '0.5rem 1rem' }}>
                      📎 {assign.attachment.filename}
                    </a>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid var(--surface-border)', paddingTop: '1rem' }}>
                  <button className="btn-outline" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', borderColor: 'var(--danger)', color: 'var(--danger)' }} onClick={() => handleDelete(assign._id)}>Delete</button>
                  <button className="btn-outline" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }} onClick={() => handleEdit(assign)}>Edit</button>
                  <button className="btn-outline" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', background: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)' }} onClick={() => openSubmissions(assign)}>
                    View Submissions
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {hasMore && assignments.length > 0 && (
          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <button 
              onClick={() => fetchAssignments(page + 1)} 
              disabled={loadingMore}
              className="btn-outline" 
              style={{ padding: '0.75rem 2rem', borderRadius: '2rem' }}
            >
              {loadingMore ? 'Loading...' : '⬇ Load More'}
            </button>
          </div>
        )}
      </div>

      {/* Submissions Modal */}
      {viewingAssignment && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '2rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem' }}>Submissions for {viewingAssignment.title}</h2>
              <button className="btn-outline" onClick={() => setViewingAssignment(null)}>Close</button>
            </div>

            {submissionsLoading ? (
              <div className="spinner" style={{ margin: '2rem auto' }}></div>
            ) : submissions.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>No submissions yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {submissions.map(sub => (
                  <div key={sub._id} style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid var(--surface-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{sub.studentId?.fullName || "Unknown Student"}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {sub.studentId?.department} • Roll: {sub.studentId?.rollNumber} • {sub.studentId?.email}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Submitted: {new Date(sub.submittedAt || sub.createdAt).toLocaleString()}
                      </div>
                    </div>
                    
                    <a href={sub.attachment.url} target="_blank" rel="noopener noreferrer" className="btn-outline" style={{ display: 'inline-block', marginBottom: '1.5rem' }}>
                      Download Submission ({sub.attachment.filename})
                    </a>

                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', borderTop: '1px solid var(--surface-border)', paddingTop: '1rem' }}>
                      {viewingAssignment.maxMarks && (
                        <div style={{ width: '100px' }}>
                          <label className="label" style={{ fontSize: '0.8rem' }}>Marks (/{viewingAssignment.maxMarks})</label>
                          <input type="number" max={viewingAssignment.maxMarks} className="input" value={gradingState[sub._id]?.marks || ""} onChange={e => setGradingState(prev => ({...prev, [sub._id]: { ...prev[sub._id], marks: e.target.value }}))} style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--surface-border)', borderRadius: '0.25rem', color: '#fff', width: '100%' }} />
                        </div>
                      )}
                      <div style={{ flex: 1 }}>
                        <label className="label" style={{ fontSize: '0.8rem' }}>Feedback (Optional)</label>
                        <input type="text" className="input" value={gradingState[sub._id]?.feedback || ""} onChange={e => setGradingState(prev => ({...prev, [sub._id]: { ...prev[sub._id], feedback: e.target.value }}))} style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--surface-border)', borderRadius: '0.25rem', color: '#fff', width: '100%' }} />
                      </div>
                      <div style={{ alignSelf: 'flex-end' }}>
                        <button className="btn-primary" onClick={() => handleGradeSubmit(sub._id)} style={{ padding: '0.5rem 1rem' }}>Save Grade</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
