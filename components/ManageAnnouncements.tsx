"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from 'react-markdown';

export default function ManageAnnouncements() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetDepartment, setTargetDepartment] = useState("");
  const [targetBatch, setTargetBatch] = useState("");
  const [expireAt, setExpireAt] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);

  const [parseLoading, setParseLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchAnnouncements = async () => {
    try {
      const res = await fetch('/api/instructor/announcements');
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data.announcements);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleParseFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParseLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/instructor/announcements/parse", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to parse file");

      setMessage(data.text);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setParseLoading(false);
      // reset file input
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) {
      setError("Title and message are required.");
      return;
    }

    setSubmitLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("title", title);
    formData.append("message", message);
    if (targetDepartment) formData.append("targetDepartment", targetDepartment);
    if (targetBatch) formData.append("targetBatch", targetBatch);
    if (expireAt) formData.append("expireAt", new Date(expireAt).toISOString());
    if (attachment) formData.append("attachment", attachment);
    if (editingId && !attachment) formData.append("removeAttachment", "true");

    try {
      const url = editingId ? `/api/instructor/announcements/${editingId}` : "/api/instructor/announcements";
      const method = editingId ? "PUT" : "POST";
      
      const res = await fetch(url, { method, body: formData });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `Failed to ${editingId ? 'update' : 'post'} announcement`);

      resetForm();
      fetchAnnouncements();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setMessage("");
    setTargetDepartment("");
    setTargetBatch("");
    setExpireAt("");
    setAttachment(null);
    setEditingId(null);
    setError("");
  };

  const handleEdit = (ann: any) => {
    setEditingId(ann._id);
    setTitle(ann.title);
    setMessage(ann.message);
    setTargetDepartment(ann.targetDepartment || "");
    setTargetBatch(ann.targetBatch || "");
    setExpireAt(ann.expireAt ? new Date(ann.expireAt).toISOString().slice(0, 16) : "");
    setAttachment(null); // Attachments must be re-uploaded to change, or leave null to remove
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this announcement? This action cannot be undone.")) return;
    try {
      const res = await fetch(`/api/instructor/announcements/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        alert(data.message || "Failed to delete");
        return;
      }
      fetchAnnouncements();
    } catch (e) {
      console.error(e);
      alert("Error deleting announcement.");
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.5rem' }}>
          {editingId ? "Edit Announcement" : "Create New Announcement"}
        </h2>
        
        {error && <div style={{ color: 'var(--danger)', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '0.5rem', border: '1px solid rgba(239, 68, 68, 0.2)', marginBottom: '1rem' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label className="label">Title</label>
            <input 
              type="text" 
              className="input" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              placeholder="E.g., Mid-Term Exam Rescheduled" 
              required 
              style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--surface-border)', background: 'rgba(0,0,0,0.2)', color: '#fff' }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label className="label" style={{ marginBottom: 0 }}>Message (Markdown Supported)</label>
              <div>
                <label className="btn-outline" style={{ cursor: 'pointer', fontSize: '0.85rem', padding: '0.25rem 0.5rem' }}>
                  {parseLoading ? "Extracting..." : "Auto-Fill from File (PDF/Docx)"}
                  <input type="file" accept=".pdf,.txt,.docx,.pptx" onChange={handleParseFile} style={{ display: 'none' }} disabled={parseLoading} />
                </label>
              </div>
            </div>
            <textarea 
              className="input" 
              rows={6}
              value={message} 
              onChange={e => setMessage(e.target.value)} 
              placeholder="Type your announcement here, or upload a file to auto-fill..." 
              required 
              style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--surface-border)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontFamily: 'monospace' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label className="label">Target Department (Optional)</label>
              <select 
                className="input" 
                value={targetDepartment} 
                onChange={e => setTargetDepartment(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--surface-border)', background: 'rgba(0,0,0,0.2)', color: '#fff' }}
              >
                <option value="">All Departments (General)</option>
                <option value="Computer Science">Computer Science</option>
                <option value="Information Technology">Information Technology</option>
                <option value="Electronics">Electronics</option>
                <option value="Mechanical">Mechanical</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label className="label">Target Batch / Grad Year (Optional)</label>
              <input 
                type="number" 
                className="input" 
                value={targetBatch} 
                onChange={e => setTargetBatch(e.target.value)} 
                placeholder="E.g., 2026" 
                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--surface-border)', background: 'rgba(0,0,0,0.2)', color: '#fff' }}
              />
            </div>
          </div>
          
          <div>
            <label className="label">Auto-delete Date</label>
            <input type="datetime-local" className="input" value={expireAt} onChange={e => setExpireAt(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--surface-border)', background: 'rgba(0,0,0,0.2)', color: '#fff' }} />
          </div>

          <div>
            <label className="label">Downloadable Attachment (Optional)</label>
            <input 
              type="file" 
              onChange={e => setAttachment(e.target.files?.[0] || null)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--surface-border)', background: 'rgba(0,0,0,0.2)', color: '#fff' }}
            />
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Students will be able to download this file securely via Cloudinary.</p>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button type="submit" className="btn-primary" disabled={submitLoading} style={{ flex: 1 }}>
              {submitLoading ? <div className="spinner"></div> : (editingId ? "Save Changes" : "Broadcast Announcement")}
            </button>
            {editingId && (
              <button type="button" className="btn-outline" onClick={resetForm} disabled={submitLoading} style={{ flex: 1 }}>
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.5rem' }}>Your Past Announcements</h2>
        
        {loading ? (
          <div className="spinner"></div>
        ) : announcements.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>You haven't posted any announcements yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {announcements.map((ann: any) => (
              <div key={ann._id} style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--surface-border)', borderRadius: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{ann.title}</h3>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{new Date(ann.createdAt).toLocaleString()}</span>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                      {ann.targetDepartment && <span style={{ fontSize: '0.75rem', padding: '0.1rem 0.5rem', background: 'rgba(59, 130, 246, 0.2)', color: '#93c5fd', borderRadius: '1rem' }}>{ann.targetDepartment}</span>}
                      {ann.targetBatch && <span style={{ fontSize: '0.75rem', padding: '0.1rem 0.5rem', background: 'rgba(16, 185, 129, 0.2)', color: '#6ee7b7', borderRadius: '1rem' }}>Batch {ann.targetBatch}</span>}
                      {!ann.targetDepartment && !ann.targetBatch && <span style={{ fontSize: '0.75rem', padding: '0.1rem 0.5rem', background: 'rgba(255, 255, 255, 0.1)', color: '#ccc', borderRadius: '1rem' }}>General</span>}
                    </div>
                  </div>
                </div>
                
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
                  <ReactMarkdown>{ann.message}</ReactMarkdown>
                </div>
                
                <div style={{ fontSize: '0.85rem', color: 'var(--danger)', marginBottom: '1rem' }}>
                  <strong>⏳ Auto-deletes on:</strong> {ann.expireAt ? new Date(ann.expireAt).toLocaleString() : "Never"}
                </div>

                {ann.attachment && (
                  <div style={{ display: 'inline-block', marginBottom: '1.5rem' }}>
                    <a href={ann.attachment.url} target="_blank" rel="noopener noreferrer" className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', padding: '0.5rem 1rem' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                      {ann.attachment.filename}
                    </a>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid var(--surface-border)', paddingTop: '1rem' }}>
                  <button className="btn-outline" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', borderColor: 'var(--danger)', color: 'var(--danger)' }} onClick={() => handleDelete(ann._id)}>
                    Delete
                  </button>
                  <button className="btn-outline" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }} onClick={() => handleEdit(ann)}>
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
