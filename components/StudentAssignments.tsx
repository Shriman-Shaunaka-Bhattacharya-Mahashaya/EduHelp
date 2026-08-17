"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from 'react-markdown';

export default function StudentAssignments() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // local UI state
  const [activeTab, setActiveTab] = useState<"pending" | "submitted">("pending");
  const [uploadState, setUploadState] = useState<{ [key: string]: { file: File | null, loading: boolean, error: string } }>({});

  const fetchData = async () => {
    try {
      const res = await fetch('/api/student/assignments');
      if (res.ok) {
        const data = await res.json();
        setAssignments(data.assignments);
        setSubmissions(data.submissions);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleFileChange = (assignId: string, file: File | null) => {
    setUploadState(prev => ({ ...prev, [assignId]: { file, loading: false, error: "" } }));
  };

  const handleSubmit = async (assignId: string) => {
    const file = uploadState[assignId]?.file;
    if (!file) {
      setUploadState(prev => ({ ...prev, [assignId]: { ...prev[assignId], error: "Please select a file to submit." } }));
      return;
    }

    setUploadState(prev => ({ ...prev, [assignId]: { ...prev[assignId], loading: true, error: "" } }));
    
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`/api/student/assignments/${assignId}/submit`, {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Upload failed");
      
      alert("Submitted successfully!");
      fetchData(); // refresh lists
    } catch (e: any) {
      setUploadState(prev => ({ ...prev, [assignId]: { ...prev[assignId], error: e.message, loading: false } }));
    }
  };

  const handleUnsubmit = async (assignId: string) => {
    if (!confirm("Are you sure you want to un-submit your file? You will need to re-upload it before the deadline.")) return;
    try {
      const res = await fetch(`/api/student/assignments/${assignId}/submit`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to un-submit");
      fetchData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (loading) return <div className="spinner" style={{ margin: '3rem auto' }}></div>;

  const submittedAssignmentIds = submissions.map(s => s.assignmentId);
  const pendingAssignments = assignments.filter(a => !submittedAssignmentIds.includes(a._id));
  const submittedAssignments = assignments.filter(a => submittedAssignmentIds.includes(a._id));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--surface-border)', gap: '2rem' }}>
        <button
          onClick={() => setActiveTab("pending")}
          style={{ background: 'transparent', color: activeTab === "pending" ? 'var(--primary)' : 'var(--text-secondary)', borderBottom: activeTab === "pending" ? '2px solid var(--primary)' : 'none', borderRadius: 0, padding: '0.5rem 1rem', fontSize: '1.1rem' }}
        >
          Pending ({pendingAssignments.length})
        </button>
        <button
          onClick={() => setActiveTab("submitted")}
          style={{ background: 'transparent', color: activeTab === "submitted" ? 'var(--primary)' : 'var(--text-secondary)', borderBottom: activeTab === "submitted" ? '2px solid var(--primary)' : 'none', borderRadius: 0, padding: '0.5rem 1rem', fontSize: '1.1rem' }}
        >
          Submitted ({submittedAssignments.length})
        </button>
      </div>

      <div className="glass-panel" style={{ padding: '2rem' }}>
        {activeTab === "pending" && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {pendingAssignments.length === 0 && <div style={{ color: 'var(--text-secondary)' }}>No pending assignments! You're all caught up.</div>}
            {pendingAssignments.map(assign => {
              const deadlinePassed = assign.deadline ? new Date() > new Date(assign.deadline) : false;
              
              return (
                <div key={assign._id} style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--surface-border)', borderRadius: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{assign.title}</h3>
                  <div style={{ fontSize: '0.9rem', color: 'var(--primary)', fontWeight: 'bold', marginBottom: '1rem' }}>{assign.courseName}</div>
                  
                  <div style={{ display: 'flex', gap: '2rem', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                    <div><strong>Max Marks:</strong> {assign.maxMarks || "Ungraded"}</div>
                    <div style={{ color: deadlinePassed ? 'var(--danger)' : 'inherit' }}><strong>Deadline:</strong> {assign.deadline ? new Date(assign.deadline).toLocaleString() : "No Deadline"}</div>
                    <div style={{ color: 'var(--danger)' }}><strong>⏳ Auto-deletes on:</strong> {assign.expireAt ? new Date(assign.expireAt).toLocaleString() : "Never"}</div>
                  </div>

                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
                    <ReactMarkdown>{assign.description}</ReactMarkdown>
                  </div>

                  {assign.attachment && (
                    <div style={{ marginBottom: '1.5rem' }}>
                      <a href={assign.attachment.url} target="_blank" rel="noopener noreferrer" className="btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', padding: '0.5rem 1rem' }}>
                        📎 Download Question Attachment ({assign.attachment.filename})
                      </a>
                    </div>
                  )}

                  {/* Upload Section */}
                  <div style={{ borderTop: '1px solid var(--surface-border)', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 'bold' }}>Your Submission</h4>
                    {deadlinePassed ? (
                      <div style={{ color: 'var(--danger)', background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '0.5rem' }}>
                        The deadline for this assignment has passed. Late submissions are not allowed.
                      </div>
                    ) : (
                      <>
                        <input type="file" onChange={e => handleFileChange(assign._id, e.target.files?.[0] || null)} style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '0.5rem', border: '1px solid var(--surface-border)', color: '#fff' }} />
                        {uploadState[assign._id]?.error && <div style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{uploadState[assign._id].error}</div>}
                        <button className="btn-primary" onClick={() => handleSubmit(assign._id)} disabled={uploadState[assign._id]?.loading} style={{ alignSelf: 'flex-start' }}>
                          {uploadState[assign._id]?.loading ? "Uploading..." : "Submit Work"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "submitted" && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {submittedAssignments.length === 0 && <div style={{ color: 'var(--text-secondary)' }}>You haven't submitted any assignments yet.</div>}
            {submittedAssignments.map(assign => {
              const sub = submissions.find(s => s.assignmentId === assign._id);
              const deadlinePassed = assign.deadline ? new Date() > new Date(assign.deadline) : false;

              return (
                <div key={assign._id} style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--surface-border)', borderRadius: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{assign.title}</h3>
                      <div style={{ fontSize: '0.9rem', color: 'var(--primary)', fontWeight: 'bold', marginBottom: '1rem' }}>{assign.courseName}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {sub.marksAwarded !== undefined && sub.marksAwarded !== null ? (
                        <div style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#6ee7b7', padding: '0.5rem 1rem', borderRadius: '2rem', fontWeight: 'bold' }}>
                          Score: {sub.marksAwarded} {assign.maxMarks ? `/ ${assign.maxMarks}` : ''}
                        </div>
                      ) : (
                        <div style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#93c5fd', padding: '0.5rem 1rem', borderRadius: '2rem', fontWeight: 'bold' }}>
                          Under Review
                        </div>
                      )}
                    </div>
                  </div>

                  {sub.feedback && (
                    <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
                      <strong>Instructor Feedback:</strong> {sub.feedback}
                    </div>
                  )}

                  <div style={{ borderTop: '1px solid var(--surface-border)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>Submitted on: {new Date(sub.createdAt).toLocaleString()}</span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--danger)', display: 'block', marginBottom: '0.5rem' }}>⏳ Auto-deletes on: {assign.expireAt ? new Date(assign.expireAt).toLocaleString() : "Never"}</span>
                      <a href={sub.attachment.url} target="_blank" rel="noopener noreferrer" className="btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>
                        View Your Submission
                      </a>
                    </div>
                    
                    {!deadlinePassed && (sub.marksAwarded === undefined || sub.marksAwarded === null) && (
                      <button className="btn-outline" onClick={() => handleUnsubmit(assign._id)} style={{ borderColor: 'var(--danger)', color: 'var(--danger)', fontSize: '0.85rem' }}>
                        Un-submit & Re-upload
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
