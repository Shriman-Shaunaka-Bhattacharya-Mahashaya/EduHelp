"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ManageClasses() {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/instructor/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          scheduledAt,
          durationMinutes,
          targetDepartment,
          targetBatch
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to schedule class");
      }

      setSuccess("Class scheduled successfully!");
      setTitle("");
      setDescription("");
      setScheduledAt("");
      setTargetDepartment("");
      setTargetBatch("");
      setShowForm(false);
      fetchClasses();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const updateClassStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/instructor/classes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        if (status === 'ongoing') {
          router.push(`/class/${id}`);
        } else {
          fetchClasses();
        }
      }
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  const deleteClass = async (id: string) => {
    if (!confirm("Are you sure you want to delete this class?")) return;
    try {
      const res = await fetch(`/api/instructor/classes/${id}`, { method: "DELETE" });
      if (res.ok) fetchClasses();
    } catch (err) {
      console.error("Failed to delete", err);
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
          ← Back to Classes
        </button>
        {/* Schedule Form */}
        <div className="glass-panel animate-fade-in" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.5rem' }}>Schedule Online Class</h2>
        
        {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{error}</div>}
        {success && <div style={{ color: 'var(--success)', marginBottom: '1rem' }}>{success}</div>}
        
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.5rem' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Class Title *</label>
              <input type="text" className="input" required value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Scheduled Time *</label>
              <input type="datetime-local" className="input" required value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Description / Agenda *</label>
            <textarea className="input" rows={3} required value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Duration (Mins) *</label>
              <input type="number" min="15" className="input" required value={durationMinutes} onChange={e => setDurationMinutes(parseInt(e.target.value))} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Target Department (Optional)</label>
              <input type="text" className="input" placeholder="e.g. Computer Science" value={targetDepartment} onChange={e => setTargetDepartment(e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Target Batch (Optional)</label>
              <input type="number" className="input" placeholder="e.g. 2024" value={targetBatch} onChange={e => setTargetBatch(e.target.value)} />
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={submitting} style={{ justifySelf: 'start', padding: '0.75rem 2rem' }}>
            {submitting ? "Scheduling..." : "Schedule Class"}
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
          onClick={() => setShowForm(true)}
        >
          + Schedule New Class
        </button>
      </div>

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
              <div key={c._id} style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--surface-border)', borderRadius: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{c.title}</h3>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>{c.description}</p>
                  
                  <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem' }}>
                    <span><strong>Scheduled:</strong> {new Date(c.scheduledAt).toLocaleString()}</span>
                    <span><strong>Duration:</strong> {c.durationMinutes} mins</span>
                    <span><strong>Status:</strong> <span style={{ color: c.status === 'ongoing' ? 'var(--success)' : c.status === 'completed' ? 'var(--text-secondary)' : 'var(--primary)' }}>{c.status.toUpperCase()}</span></span>
                  </div>
                  
                  {(c.targetDepartment || c.targetBatch) && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Target: {c.targetDepartment || 'All Depts'} • Batch {c.targetBatch || 'All'}
                    </div>
                  )}
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {c.status !== 'completed' && (
                    <button 
                      onClick={() => updateClassStatus(c._id, 'ongoing')}
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
                      End Class
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
