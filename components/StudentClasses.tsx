"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function StudentClasses() {
  const router = useRouter();
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClasses = async () => {
    try {
      const res = await fetch("/api/student/classes");
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
    
    // Poll for status changes every 30 seconds (so students see when class goes live)
    const interval = setInterval(fetchClasses, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h2 style={{ fontSize: '1.5rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.5rem' }}>Live Online Classes</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>View your upcoming scheduled classes. You can join the room once the instructor starts the class.</p>
      </div>

      <div className="glass-panel" style={{ padding: '2rem' }}>
        {loading ? (
          <div className="spinner" style={{ margin: '3rem auto' }}></div>
        ) : classes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>No upcoming classes scheduled for your batch/department.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {classes.map(c => {
              const isOngoing = c.status === 'ongoing';
              const isScheduled = c.status === 'scheduled';
              const isToday = new Date(c.scheduledAt).toDateString() === new Date().toDateString();
              
              return (
                <div key={c._id} style={{ 
                  padding: '1.5rem', 
                  background: isOngoing ? 'rgba(16, 185, 129, 0.1)' : 'rgba(0,0,0,0.2)', 
                  border: `1px solid ${isOngoing ? 'rgba(16, 185, 129, 0.3)' : 'var(--surface-border)'}`, 
                  borderRadius: '0.5rem', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center' 
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{c.title}</h3>
                      {isOngoing && <span style={{ background: 'var(--danger)', color: '#fff', padding: '0.1rem 0.5rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 'bold', animation: 'pulse 2s infinite' }}>● LIVE NOW</span>}
                      {isScheduled && isToday && <span style={{ background: 'var(--primary)', color: '#fff', padding: '0.1rem 0.5rem', borderRadius: '1rem', fontSize: '0.75rem' }}>TODAY</span>}
                    </div>
                    
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>{c.description}</p>
                    
                    <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem' }}>
                      <span><strong>Scheduled:</strong> {new Date(c.scheduledAt).toLocaleString()}</span>
                      <span><strong>Duration:</strong> {c.durationMinutes} mins</span>
                      <span><strong>Instructor:</strong> {c.instructorId?.fullName}</span>
                    </div>
                  </div>
                  
                  <div>
                    {isOngoing ? (
                      <button 
                        onClick={() => router.push(`/class/${c._id}`)}
                        className="btn-primary" 
                        style={{ padding: '0.75rem 1.5rem', background: 'var(--success)', fontSize: '1rem', animation: 'pulse 2s infinite' }}
                      >
                        Join Class
                      </button>
                    ) : (
                      <button 
                        className="btn-outline" 
                        disabled
                        style={{ padding: '0.75rem 2rem', fontSize: '1rem', opacity: 0.5, cursor: 'not-allowed' }}
                      >
                        Waiting for Instructor...
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
