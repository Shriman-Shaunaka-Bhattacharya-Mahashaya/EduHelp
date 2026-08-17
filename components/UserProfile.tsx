"use client";

import { useState, useEffect } from "react";

export default function UserProfile() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/user/profile");
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.message || "Failed to load profile");
        }
        
        setProfile(data.user);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (error) {
    return <div style={{ color: 'var(--danger)', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '0.5rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>{error}</div>;
  }

  if (!profile) return null;

  // Simple UI Avatar based on Initials
  const initials = profile.fullName ? profile.fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase() : '?';

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        
        {/* Avatar Placeholder */}
        <div style={{
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--primary) 0%, #8b5cf6 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2.5rem',
          fontWeight: 'bold',
          color: '#fff',
          marginBottom: '1.5rem',
          boxShadow: '0 8px 16px rgba(0,0,0,0.2)'
        }}>
          {initials}
        </div>

        <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '0.25rem', color: '#fff' }}>
          {profile.fullName}
        </h2>
        
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '1rem' }}>
          {profile.email}
        </p>

        <span style={{ 
          background: profile.role === 'instructor' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(59, 130, 246, 0.2)', 
          color: profile.role === 'instructor' ? '#fcd34d' : '#93c5fd',
          padding: '0.25rem 1rem', 
          borderRadius: '2rem', 
          fontSize: '0.85rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          fontWeight: '600',
          marginBottom: '2rem'
        }}>
          {profile.role}
        </span>

        <div style={{ width: '100%', borderTop: '1px solid var(--surface-border)', paddingTop: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', textAlign: 'left' }}>
          
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '0.5rem' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Department</div>
            <div style={{ fontSize: '1.1rem', color: '#fff', fontWeight: '500' }}>{profile.department || "N/A"}</div>
          </div>

          {profile.role === 'student' && (
            <>
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '0.5rem' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Roll Number</div>
                <div style={{ fontSize: '1.1rem', color: '#fff', fontWeight: '500' }}>{profile.rollNumber || "N/A"}</div>
              </div>
              
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '0.5rem' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Registration Number</div>
                <div style={{ fontSize: '1.1rem', color: '#fff', fontWeight: '500' }}>{profile.registrationNumber || "N/A"}</div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '0.5rem' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Graduation Year</div>
                <div style={{ fontSize: '1.1rem', color: '#fff', fontWeight: '500' }}>{profile.graduationYear || "N/A"}</div>
              </div>

              {profile.section && (
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '0.5rem' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Section</div>
                  <div style={{ fontSize: '1.1rem', color: '#fff', fontWeight: '500' }}>{profile.section}</div>
                </div>
              )}
            </>
          )}

          {profile.role === 'instructor' && (
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '0.5rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Instructor ID</div>
              <div style={{ fontSize: '1.1rem', color: '#fff', fontWeight: '500' }}>{profile.instructorId || "N/A"}</div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
