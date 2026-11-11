"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { normalizeMeetUrl, type ClassStatus } from "@/lib/onlineClasses";

interface ClassRecord { _id: string; title: string; description: string; scheduledAt: string; durationMinutes: number; meetingUrl?: string; targetDepartment?: string; targetBatch?: number; status: ClassStatus; }

export default function ManageClasses() {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [meetingUrl, setMeetingUrl] = useState("");

  function editClass(c: ClassRecord) {
    setEditingId(c._id); setTitle(c.title); setDescription(c.description);
    const date = new Date(c.scheduledAt);
    setScheduledAt(new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
    setDurationMinutes(c.durationMinutes); setMeetingUrl(c.meetingUrl || "");
    setTargetDepartment(c.targetDepartment || ""); setTargetBatch(c.targetBatch?.toString() || "");
    setError(""); setShowForm(true);
  }

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [targetDepartment, setTargetDepartment] = useState("");
  const [targetBatch, setTargetBatch] = useState("");
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchClasses = async () => {
    try {
      const res = await fetch("/api/instructor/classes");
      if (res.ok) {
        const data = await res.json();
        setClasses(data.classes);
      }
    } catch {
      setError("Unable to load classes. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!normalizeMeetUrl(meetingUrl)) { setError("Enter a Google Meet link such as https://meet.google.com/abc-defg-hij"); return; }
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(editingId ? `/api/instructor/classes/${editingId}` : "/api/instructor/classes", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          scheduledAt: new Date(scheduledAt).toISOString(),
          meetingUrl: normalizeMeetUrl(meetingUrl),
          durationMinutes,
          targetDepartment,
          targetBatch
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to schedule class");
      }

      setSuccess(editingId ? "Class updated successfully!" : "Class scheduled successfully!");
      setEditingId(null); setMeetingUrl("");
      setTitle("");
      setDescription("");
      setScheduledAt("");
      setTargetDepartment("");
      setTargetBatch("");
      setShowForm(false);
      fetchClasses();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save class");
    } finally {
      setSubmitting(false);
    }
  };

  const updateClassStatus = async (id: string, status: string) => {
    if (status === "completed" && !confirm("End the call separately in Google Meet, then mark this class completed in EduHelp?")) return;
    try {
      const res = await fetch(`/api/instructor/classes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (!res.ok) { const data = await res.json(); throw new Error(data.message || "Unable to update class"); }
      if (res.ok) {
        if (status === 'ongoing') {
          router.push(`/class/${id}`);
        } else {
          fetchClasses();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update class");
    }
  };

  const deleteClass = async (id: string) => {
    if (!confirm("Are you sure you want to delete this class?")) return;
    try {
      const res = await fetch(`/api/instructor/classes/${id}`, { method: "DELETE" });
      if (!res.ok) { const data = await res.json(); throw new Error(data.message || "Unable to delete class"); }
      await fetchClasses();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete class");
    }
  };

  if (showForm) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <button 
          className="btn-outline" 
          onClick={() => setShowForm(false)} 
          style={{ alignSelf: 'flex-start' }}
        >
          &larr; Back to Classes
        </button>
        {/* Schedule Form */}
        <div className="glass-panel animate-fade-in" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.5rem' }}>{editingId ? "Edit Online Class" : "Schedule Online Class"}</h2>
        
        {error && <div role="alert" style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{error}</div>}
        {success && <div role="status" style={{ color: 'var(--success)', marginBottom: '1rem' }}>{success}</div>}
        
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.5rem' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '1.5rem' }}>
            <div>
              <label htmlFor="class-title" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Class Title *</label>
              <input id="class-title" type="text" className="input" required value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div>
              <label htmlFor="class-time" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Scheduled Time *</label>
              <input id="class-time" type="datetime-local" className="input" required value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
            </div>
          </div>

          <div>
            <label htmlFor="meeting-url">Google Meet link *</label>
            <input id="meeting-url" type="url" className="input" required value={meetingUrl} onChange={e => setMeetingUrl(e.target.value)} aria-describedby="meeting-help" placeholder="https://meet.google.com/abc-defg-hij" />
            <p id="meeting-help" className="class-help">At <a href="https://meet.google.com/" target="_blank" rel="noopener noreferrer">Google Meet</a>, choose New meeting &gt; Create a meeting for later. Paste its link here.</p>
          </div>
          <div>
            <label htmlFor="class-description" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Description / Agenda *</label>
              <textarea id="class-description" className="input" rows={3} required value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '1.5rem' }}>
            <div>
              <label htmlFor="class-duration" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Duration (Mins) *</label>
              <input id="class-duration" type="number" min="15" className="input" required value={durationMinutes} onChange={e => setDurationMinutes(parseInt(e.target.value))} />
            </div>
            <div>
              <label htmlFor="class-department" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Target Department (Optional)</label>
              <input id="class-department" type="text" className="input" placeholder="e.g. Computer Science" value={targetDepartment} onChange={e => setTargetDepartment(e.target.value)} />
            </div>
            <div>
              <label htmlFor="class-batch" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Target Batch (Optional)</label>
              <input id="class-batch" type="number" className="input" placeholder="e.g. 2024" value={targetBatch} onChange={e => setTargetBatch(e.target.value)} />
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={submitting} style={{ justifySelf: 'start', padding: '0.75rem 2rem' }}>
            {submitting ? "Saving..." : editingId ? "Save Changes" : "Schedule Class"}
          </button>
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
          onClick={() => { setEditingId(null); setTitle(""); setDescription(""); setScheduledAt(""); setMeetingUrl(""); setDurationMinutes(60); setTargetDepartment(""); setTargetBatch(""); setError(""); setShowForm(true); }}
        >
          + Schedule New Class
        </button>
      </div>

      {error && <p role="alert" className="class-error">{error}</p>}
      {success && <p role="status">{success}</p>}
      {/* Class List */}
      <div className="glass-panel animate-fade-in" style={{ padding: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.5rem' }}>Your Scheduled Classes</h2>
        
        {loading ? (
          <div className="spinner" style={{ margin: '3rem auto' }}></div>
        ) : classes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>No classes scheduled yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {classes.map(c => (
              <div key={c._id} style={{ padding: '1.5rem', background: 'var(--surface-muted)', border: '1px solid var(--surface-border)', borderRadius: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{c.title}</h3>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>{c.description}</p>
                  
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', fontSize: '0.85rem' }}>
                    <span><strong>Scheduled:</strong> {new Date(c.scheduledAt).toLocaleString()}</span>
                    <span><strong>Duration:</strong> {c.durationMinutes} mins</span>
                    <span><strong>Status:</strong> <span style={{ color: c.status === 'ongoing' ? 'var(--success)' : c.status === 'completed' ? 'var(--text-secondary)' : 'var(--primary)' }}>{c.status.toUpperCase()}</span></span>
                  </div>
                  
                  {(c.targetDepartment || c.targetBatch) && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Target: {c.targetDepartment || 'All Depts'} &middot; Batch {c.targetBatch || 'All'}
                    </div>
                  )}
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <button className="btn-outline" onClick={() => editClass(c)}>{normalizeMeetUrl(c.meetingUrl) ? "Edit Class" : "Add Meet link"}</button>
                  {c.status !== 'completed' && (
                    <button 
                      disabled={!normalizeMeetUrl(c.meetingUrl)}
                      onClick={() => c.status === 'ongoing' ? router.push(`/class/${c._id}`) : updateClassStatus(c._id, 'ongoing')}
                      className="btn-primary" 
                      style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', background: c.status === 'ongoing' ? 'var(--success)' : undefined }}
                    >
                      {c.status === 'ongoing' ? "Re-join Class" : "Start Class"}
                    </button>
                  )}
                  {c.status === 'ongoing' && (
                    <button 
                      onClick={() => updateClassStatus(c._id, 'completed')}
                      className="btn-outline" 
                      style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                    >
                      Mark class completed
                    </button>
                  )}
                  {c.status === 'scheduled' && (
                    <button 
                      onClick={() => deleteClass(c._id)}
                      className="btn-outline" 
                      style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
