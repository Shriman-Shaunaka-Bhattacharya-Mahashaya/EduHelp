"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from 'react-markdown';
import StudentChatbot from './StudentChatbot';

export default function StudentContent() {
  const [contents, setContents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [chatOpen, setChatOpen] = useState(false);
  const [chatContentId, setChatContentId] = useState<string | undefined>(undefined);
  const [chatContentTitle, setChatContentTitle] = useState<string | undefined>(undefined);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500); // 500ms debounce
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fetchContents = async () => {
    setLoading(true);
    try {
      const queryParam = debouncedSearch ? `?search=${encodeURIComponent(debouncedSearch)}` : "";
      const res = await fetch(`/api/student/content${queryParam}`);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Header & Search */}
      <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h2 style={{ fontSize: '1.5rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.5rem' }}>Educational Materials</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Access documents, notes, and resources uploaded by instructors for your batch and department.</p>
        
        <input 
          type="text" 
          className="input" 
          placeholder="Search by title, course, or tags..." 
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ width: '100%', maxWidth: '600px', padding: '0.75rem 1rem', borderRadius: '2rem', border: '1px solid var(--primary)', background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: '1rem', outline: 'none' }}
        />
      </div>

      <div className="glass-panel" style={{ padding: '2rem' }}>
        {loading ? (
          <div className="spinner" style={{ margin: '3rem auto' }}></div>
        ) : contents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            {debouncedSearch ? "No content found matching your search." : "No educational materials available for you right now."}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {contents.map(c => (
              <div key={c._id} style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--surface-border)', borderRadius: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{c.title}</h3>
                    <div style={{ fontSize: '0.9rem', color: 'var(--primary)', fontWeight: 'bold', marginBottom: '0.5rem' }}>{c.course}</div>
                    
                    {c.tags && c.tags.length > 0 && (
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                        {c.tags.map((tag: string, i: number) => (
                          <span key={i} style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: 'rgba(255,255,255,0.1)', borderRadius: '1rem' }}>#{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
                  <ReactMarkdown>{c.description}</ReactMarkdown>
                </div>

                <div style={{ fontSize: '0.85rem', color: 'var(--danger)', marginBottom: '1rem' }}>
                  <strong>⏳ Auto-deletes on:</strong> {c.expireAt ? new Date(c.expireAt).toLocaleString() : "Never"}
                </div>

                <div style={{ borderTop: '1px solid var(--surface-border)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    By: {c.instructorId?.fullName || 'Instructor'} • Uploaded: {new Date(c.createdAt).toLocaleDateString()}
                  </span>
                  
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button 
                      onClick={() => {
                        setChatContentId(c._id);
                        setChatContentTitle(c.title);
                        setChatOpen(true);
                      }}
                      className="btn-outline" 
                      style={{ padding: '0.5rem 1.5rem', fontSize: '0.9rem', borderRadius: '2rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', borderColor: 'var(--primary)', color: 'var(--primary)' }}
                    >
                      🤖 Chat with Document
                    </button>

                    {c.attachment && (
                      <a href={c.attachment.url} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ padding: '0.5rem 1.5rem', fontSize: '0.9rem', borderRadius: '2rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                        📄 Download {c.attachment.filename}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <StudentChatbot 
        isOpen={chatOpen} 
        onClose={() => setChatOpen(false)} 
        contentId={chatContentId} 
        contentTitle={chatContentTitle} 
      />
    </div>
  );
}
