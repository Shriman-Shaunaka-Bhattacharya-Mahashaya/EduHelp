"use client";

import { useState, useEffect, useRef } from "react";
import ReactMarkdown from 'react-markdown';

export default function ManageContent() {
  const [contents, setContents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [course, setCourse] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [targetDepartment, setTargetDepartment] = useState("");
  const [targetBatch, setTargetBatch] = useState("");
  const [expireAt, setExpireAt] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);

  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchContents = async () => {
    try {
      const res = await fetch('/api/instructor/content');
      if (res.ok) {
        const data = await res.json();
        setContents(data.content);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContents();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !course || !description) {
      setError("Title, Course, and Description are required.");
      return;
    }
    
    // File is required when creating new, but not strictly when editing if we just want to update metadata
    if (!editingId && (!attachment || attachment.size === 0)) {
      setError("An educational document attachment is strictly required.");
      return;
    }

    setSubmitLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("title", title);
    formData.append("course", course);
    formData.append("description", description);
    formData.append("tags", tags);
    if (targetDepartment) formData.append("targetDepartment", targetDepartment);
    if (targetBatch) formData.append("targetBatch", targetBatch);
    if (expireAt) formData.append("expireAt", new Date(expireAt).toISOString());
    if (attachment) formData.append("attachment", attachment);

    try {
      const url = editingId ? `/api/instructor/content/${editingId}` : "/api/instructor/content";
      const method = editingId ? "PUT" : "POST";
      
      const res = await fetch(url, { method, body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `Failed to ${editingId ? 'update' : 'upload'} content`);

      resetForm();
      fetchContents();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setCourse("");
    setDescription("");
    setTags("");
    setTargetDepartment("");
    setTargetBatch("");
    setExpireAt("");
    setAttachment(null);
    setEditingId(null);
    setError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleEdit = (c: any) => {
    setEditingId(c._id);
    setTitle(c.title);
    setCourse(c.course);
    setDescription(c.description);
    setTags(c.tags ? c.tags.join(', ') : "");
    setTargetDepartment(c.targetDepartment || "");
    setTargetBatch(c.targetBatch || "");
    setExpireAt(c.expireAt ? new Date(c.expireAt).toISOString().slice(0, 16) : "");
    setAttachment(null); 
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this content?")) return;
    try {
      const res = await fetch(`/api/instructor/content/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Failed to delete");
      fetchContents();
    } catch (e) {
      alert("Error deleting content.");
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.5rem' }}>
          {editingId ? "Edit Educational Content" : "Upload New Educational Content"}
        </h2>
        
        {error && <div style={{ color: 'var(--danger)', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '0.5rem', marginBottom: '1rem' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label className="label">Title</label>
              <input type="text" className="input" value={title} onChange={e => setTitle(e.target.value)} required placeholder="E.g., Chapter 1 Notes" style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--surface-border)', background: 'rgba(0,0,0,0.2)', color: '#fff' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label className="label">Course / Subject</label>
              <input type="text" className="input" value={course} onChange={e => setCourse(e.target.value)} required placeholder="E.g., Mathematics 101" style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--surface-border)', background: 'rgba(0,0,0,0.2)', color: '#fff' }} />
            </div>
          </div>

          <div>
            <label className="label">Tags / Keywords (Comma separated)</label>
            <input type="text" className="input" value={tags} onChange={e => setTags(e.target.value)} placeholder="E.g., calculus, mid-term, important" style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--surface-border)', background: 'rgba(0,0,0,0.2)', color: '#fff' }} />
          </div>

          <div>
            <label className="label">Description / Context (Markdown Supported)</label>
            <textarea className="input" rows={4} value={description} onChange={e => setDescription(e.target.value)} required placeholder="Provide some context about this document..." style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--surface-border)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontFamily: 'monospace' }} />
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
          
          <div>
            <label className="label">Auto-delete Date (Default: 6 months)</label>
            <input type="datetime-local" className="input" value={expireAt} onChange={e => setExpireAt(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--surface-border)', background: 'rgba(0,0,0,0.2)', color: '#fff' }} />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Upload File (PDF, DOCX, PPTX, MP4, etc) *</label>
            <input 
              type="file" 
              ref={fileInputRef}
              accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,video/mp4,video/webm,video/ogg"
              onChange={(e) => setAttachment(e.target.files?.[0] || null)}
              style={{ width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--surface-border)', borderRadius: '0.5rem', color: 'white' }}
              required={!editingId}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button type="submit" className="btn-primary" disabled={submitLoading} style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
              {submitLoading ? (
                <>
                  <div className="spinner" style={{width: '1.2rem', height: '1.2rem', borderWidth: '2px'}}></div> 
                  <span>Parsing OCR & Uploading...</span>
                </>
              ) : (editingId ? "Save Changes" : "Upload Content")}
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
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.5rem' }}>Your Uploaded Content</h2>
        
        {loading ? (
          <div className="spinner"></div>
        ) : contents.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>You haven't uploaded any content yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {contents.map((c: any) => (
              <div key={c._id} style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--surface-border)', borderRadius: '0.5rem' }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{c.title}</h3>
                    <div style={{ fontSize: '0.9rem', color: 'var(--primary)', fontWeight: 'bold', marginBottom: '0.5rem' }}>{c.course}</div>
                    
                    {c.tags && c.tags.length > 0 && (
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                        {c.tags.map((tag: string, i: number) => (
                          <span key={i} style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: 'rgba(255,255,255,0.1)', borderRadius: '1rem' }}>#{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
                      {c.targetDepartment && <span style={{ fontSize: '0.75rem', padding: '0.1rem 0.5rem', background: 'rgba(59, 130, 246, 0.2)', color: '#93c5fd', borderRadius: '1rem' }}>{c.targetDepartment}</span>}
                      {c.targetBatch && <span style={{ fontSize: '0.75rem', padding: '0.1rem 0.5rem', background: 'rgba(16, 185, 129, 0.2)', color: '#6ee7b7', borderRadius: '1rem' }}>Batch {c.targetBatch}</span>}
                    </div>
                  </div>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
                  <ReactMarkdown>{c.description}</ReactMarkdown>
                </div>
                
                <div style={{ fontSize: '0.85rem', color: 'var(--danger)', marginBottom: '1rem' }}>
                  <strong>⏳ Auto-deletes on:</strong> {c.expireAt ? new Date(c.expireAt).toLocaleString() : "Never"}
                </div>

                {c.attachment && (
                  <div style={{ display: 'inline-block', marginBottom: '1.5rem', width: '100%' }}>
                    {c.attachment.resourceType === 'video' ? (
                      <video 
                        controls 
                        src={c.attachment.url} 
                        style={{ width: '100%', maxHeight: '400px', borderRadius: '0.5rem', border: '1px solid var(--surface-border)', background: '#000' }}
                      />
                    ) : (
                      <a href={c.attachment.url} target="_blank" rel="noopener noreferrer" className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', padding: '0.5rem 1rem', width: 'fit-content' }}>
                        📄 View/Download: {c.attachment.filename}
                      </a>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid var(--surface-border)', paddingTop: '1rem' }}>
                  <button className="btn-outline" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', borderColor: 'var(--danger)', color: 'var(--danger)' }} onClick={() => handleDelete(c._id)}>Delete</button>
                  <button className="btn-outline" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }} onClick={() => handleEdit(c)}>Edit Metadata</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
