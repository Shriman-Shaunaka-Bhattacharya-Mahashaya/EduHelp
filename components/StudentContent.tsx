"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from 'react-markdown';
import StudentChatbot from './StudentChatbot';

export default function StudentContent() {
  const [courses, setCourses] = useState<string[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  
  const [contents, setContents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [chatOpen, setChatOpen] = useState(false);
  const [chatContentId, setChatContentId] = useState<string | undefined>(undefined);
  const [chatContentTitle, setChatContentTitle] = useState<string | undefined>(undefined);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500); // 500ms debounce
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fetchCourses = async () => {
    try {
      const res = await fetch(`/api/student/content/courses`);
      if (res.ok) {
        const data = await res.json();
        setCourses(data.courses);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchContents = async (pageNum = 1, currentCourse: string | null = selectedCourse) => {
    if (!currentCourse) return;
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const queryParam = debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : "";
      const res = await fetch(`/api/student/content?page=${pageNum}&limit=5&course=${encodeURIComponent(currentCourse)}${queryParam}`);
      if (res.ok) {
        const data = await res.json();
        setContents(prev => pageNum === 1 ? data.content : [...prev, ...data.content]);
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
    if (selectedCourse) {
      fetchContents(1, selectedCourse);
    } else {
      setContents([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, selectedCourse]);

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
        
        {!selectedCourse ? (
          <>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.5rem' }}>Available Courses</h2>
            {courses.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No courses are available for your department/batch yet.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
                {courses.map((courseName) => (
                  <div 
                    key={courseName}
                    onClick={() => setSelectedCourse(courseName)}
                    style={{ 
                      padding: '2rem', 
                      background: 'rgba(0,0,0,0.3)', 
                      border: '1px solid var(--primary)', 
                      borderRadius: '1rem', 
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'transform 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>{courseName}</h3>
                    <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Click to view materials</p>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.5rem' }}>
              <button 
                onClick={() => setSelectedCourse(null)}
                className="btn-outline"
                style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', borderRadius: '2rem' }}
              >
                &larr; Back to Courses
              </button>
              <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Materials for: <span style={{color: 'var(--primary)'}}>{selectedCourse}</span></h2>
            </div>

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
                    {c.attachment?.resourceType !== 'video' && (
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
                    )}

                    {c.attachment && c.attachment.resourceType !== 'video' && (
                      <a href={c.attachment.url} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ padding: '0.5rem 1.5rem', fontSize: '0.9rem', borderRadius: '2rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                        📄 Download {c.attachment.filename}
                      </a>
                    )}
                  </div>
                </div>

                {c.attachment && c.attachment.resourceType === 'video' && (
                  <div style={{ marginTop: '1rem', width: '100%' }}>
                    <video 
                      controls 
                      src={c.attachment.url} 
                      style={{ width: '100%', maxHeight: '500px', borderRadius: '0.5rem', border: '1px solid var(--surface-border)', background: '#000' }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {hasMore && contents.length > 0 && (
          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <button 
              onClick={() => fetchContents(page + 1)} 
              disabled={loadingMore}
              className="btn-outline" 
              style={{ padding: '0.75rem 2rem', borderRadius: '2rem' }}
            >
              {loadingMore ? 'Loading...' : '⬇ Load More'}
            </button>
          </div>
        )}
          </>
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
