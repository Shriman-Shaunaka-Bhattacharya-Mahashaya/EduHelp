"use client";

import DashboardNav from "./DashboardNav";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import UserProfile from "./UserProfile";
import StudentAssignments from "./StudentAssignments";
import StudentContent from "./StudentContent";
import StudentChatbot from "./StudentChatbot";
import Messaging from "./Messaging";
import StudentClasses from "./StudentClasses";

export default function StudentDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"available" | "given" | "announcements" | "assignments" | "content" | "classes" | "messages" | "profile">("available");
  
  const [unreadMessages, setUnreadMessages] = useState(0);
  
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);
  const [announcementsPage, setAnnouncementsPage] = useState(1);
  const [hasMoreAnnouncements, setHasMoreAnnouncements] = useState(false);
  const [loadingMoreAnnouncements, setLoadingMoreAnnouncements] = useState(false);
  
  const [startLoading, setStartLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [globalChatOpen, setGlobalChatOpen] = useState(false);

  // Paginated States
  const [availPractice, setAvailPractice] = useState<any[]>([]);
  const [availPracticePage, setAvailPracticePage] = useState(1);
  const [hasMoreAvailPractice, setHasMoreAvailPractice] = useState(false);
  const [loadingAvailPractice, setLoadingAvailPractice] = useState(true);

  const [availScheduled, setAvailScheduled] = useState<any[]>([]);
  const [availScheduledPage, setAvailScheduledPage] = useState(1);
  const [hasMoreAvailScheduled, setHasMoreAvailScheduled] = useState(false);
  const [loadingAvailScheduled, setLoadingAvailScheduled] = useState(true);

  const [givenPractice, setGivenPractice] = useState<any[]>([]);
  const [givenPracticePage, setGivenPracticePage] = useState(1);
  const [hasMoreGivenPractice, setHasMoreGivenPractice] = useState(false);
  const [loadingGivenPractice, setLoadingGivenPractice] = useState(true);

  const [givenScheduled, setGivenScheduled] = useState<any[]>([]);
  const [givenScheduledPage, setGivenScheduledPage] = useState(1);
  const [hasMoreGivenScheduled, setHasMoreGivenScheduled] = useState(false);
  const [loadingGivenScheduled, setLoadingGivenScheduled] = useState(true);

  const fetchChunk = async (status: 'available' | 'given', type: 'practice' | 'scheduled', page: number) => {
    try {
      const res = await fetch(`/api/student/exams/available?status=${status}&type=${type}&page=${page}&limit=10`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      
      const { exams, hasMore } = data;

      if (status === 'available' && type === 'practice') {
        setAvailPractice(prev => page === 1 ? exams : [...prev, ...exams]);
        setHasMoreAvailPractice(hasMore);
        setLoadingAvailPractice(false);
      } else if (status === 'available' && type === 'scheduled') {
        setAvailScheduled(prev => page === 1 ? exams : [...prev, ...exams]);
        setHasMoreAvailScheduled(hasMore);
        setLoadingAvailScheduled(false);
      } else if (status === 'given' && type === 'practice') {
        setGivenPractice(prev => page === 1 ? exams : [...prev, ...exams]);
        setHasMoreGivenPractice(hasMore);
        setLoadingGivenPractice(false);
      } else if (status === 'given' && type === 'scheduled') {
        setGivenScheduled(prev => page === 1 ? exams : [...prev, ...exams]);
        setHasMoreGivenScheduled(hasMore);
        setLoadingGivenScheduled(false);
      }
    } catch (err: any) {
      console.error(err);
      setError("We couldn't load your exams. Please refresh to try again.");
    } finally {
      if (status === 'available' && type === 'practice') setLoadingAvailPractice(false);
      if (status === 'available' && type === 'scheduled') setLoadingAvailScheduled(false);
      if (status === 'given' && type === 'practice') setLoadingGivenPractice(false);
      if (status === 'given' && type === 'scheduled') setLoadingGivenScheduled(false);
    }
  };

  const refreshAll = () => {
    fetchChunk('available', 'practice', 1);
    fetchChunk('available', 'scheduled', 1);
    fetchChunk('given', 'practice', 1);
    fetchChunk('given', 'scheduled', 1);
    fetchAnnouncements();
  };

  const fetchAnnouncements = async (pageNum = 1) => {
    if (pageNum === 1) setLoadingAnnouncements(true);
    else setLoadingMoreAnnouncements(true);
    
    try {
      const res = await fetch(`/api/student/announcements?page=${pageNum}&limit=5`);
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(prev => pageNum === 1 ? data.announcements : [...prev, ...data.announcements]);
        setHasMoreAnnouncements(data.hasMore);
        setAnnouncementsPage(pageNum);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAnnouncements(false);
      setLoadingMoreAnnouncements(false);
    }
  };

  const fetchUnreadMessages = async () => {
    try {
      const res = await fetch("/api/messages/unread");
      if (res.ok) {
        const data = await res.json();
        setUnreadMessages(data.unreadCount);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    refreshAll();
    fetchUnreadMessages();
    const interval = setInterval(fetchUnreadMessages, 10000); // poll unread every 10s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Background sync for offline exams
    const syncOfflineExams = async () => {
      let syncedAny = false;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('exam_sync_')) {
          try {
            const data = JSON.parse(localStorage.getItem(key) || '{}');
            const res = await fetch("/api/student/exams/attempt", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ 
                examId: data.examId, 
                action: "submit", 
                answers: data.answers 
              }),
            });
            if (res.ok) {
              localStorage.removeItem(key);
              syncedAny = true;
            }
          } catch (e) {
            // Silently ignore if still offline
          }
        }
      }
      if (syncedAny) refreshAll();
    };
    
    syncOfflineExams();
    window.addEventListener('online', syncOfflineExams);
    return () => window.removeEventListener('online', syncOfflineExams);
  }, []);

  const handleStartExam = async (examId: string) => {
    setStartLoading(examId);
    setError("");
    try {
      const res = await fetch("/api/student/exams/attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examId, action: 'start' }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.message && data.message.includes('Login window of 15 minutes has passed')) {
          setAvailScheduled(prev => prev.map(e => e._id === examId ? { ...e, isExpired: true } : e));
        }
        throw new Error(data.message || "Failed to start exam");
      }

      router.push(`/exam/${examId}?attemptId=${data.attemptId}`);
    } catch (err: any) {
      setError(err.message);
      setStartLoading(null);
    }
  };

  const renderCard = (exam: any, isGiven: boolean) => (
    <div key={exam._id} className="exam-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', background: 'var(--surface-muted)', border: '1px solid var(--surface-border)', borderRadius: '0.5rem', marginBottom: '1rem' }}>
      <div>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)' }}>{exam.courseName}</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          By {exam.instructor?.fullName} • {exam.durationMinutes || 60} mins • {exam.questions.length} Questions
        </p>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          Type: <strong style={{ color: exam.type === 'scheduled' ? 'var(--secondary)' : 'var(--success)' }}>{exam.type.toUpperCase()}</strong>
          {exam.type === 'scheduled' && exam.scheduledFor && ` (Scheduled: ${new Date(exam.scheduledFor).toLocaleString()})`}
        </p>
        <p style={{ fontSize: '0.85rem', color: 'var(--danger)', marginTop: '0.25rem' }}>
          <strong>⏳ Auto-deletes on:</strong> {exam.expireAt ? new Date(exam.expireAt).toLocaleString() : "Never"}
        </p>
        {isGiven && exam.attempt && (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Score: <strong style={{ color: 'var(--text-primary)' }}>{exam.attempt.score} / {exam.questions.length}</strong>
          </p>
        )}
      </div>
      <div>
        {isGiven ? (
          <button className="btn-outline" onClick={() => router.push(`/student/review/${exam.attempt._id}`)}>
            Review Results
          </button>
        ) : (
          <>
            {exam.isUpcoming ? (
              <button className="btn-outline" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>Upcoming</button>
            ) : exam.isExpired ? (
              <button className="btn-outline" disabled style={{ opacity: 0.7, cursor: 'not-allowed', color: 'var(--danger)', borderColor: 'var(--danger)' }}>Login Window Passed</button>
            ) : (
              <button className="btn-primary" onClick={() => handleStartExam(exam._id)} disabled={startLoading === exam._id}>
                {startLoading === exam._id ? <div className="spinner"></div> : "Take Exam"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="workspace-panel">
      <DashboardNav active={activeTab} onChange={setActiveTab} items={[
        { id: "available", label: "Available Exams" },
        { id: "given", label: "Given Exams" },
        { id: "announcements", label: "Announcements" },
        { id: "assignments", label: "Assignments" },
        { id: "content", label: "Materials" },
        { id: "classes", label: "Classes" },
        { id: "messages", label: "Messages", count: unreadMessages },
        { id: "profile", label: "Profile" },
      ]} />

      {error && <div role="alert" style={{ color: 'var(--danger)', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '0.5rem', border: '1px solid rgba(239, 68, 68, 0.2)', marginBottom: '1rem' }}>{error}</div>}

      <div className="workspace-content">
        {activeTab === "available" && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
            <div>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.5rem', color: 'var(--text-primary)' }}>Scheduled Exams</h2>
              {loadingAvailScheduled && availScheduled.length === 0 ? <div className="spinner"></div> : availScheduled.map(e => renderCard(e, false))}
              {!loadingAvailScheduled && availScheduled.length === 0 && <div style={{ color: 'var(--text-secondary)' }}>No available scheduled exams.</div>}
              {hasMoreAvailScheduled && (
                <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                  <button className="btn-outline" onClick={() => {
                    setAvailScheduledPage(p => p + 1);
                    fetchChunk('available', 'scheduled', availScheduledPage + 1);
                  }}>Load More</button>
                </div>
              )}
            </div>
            <div>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.5rem', color: 'var(--text-primary)' }}>Practice Exams</h2>
              {loadingAvailPractice && availPractice.length === 0 ? <div className="spinner"></div> : availPractice.map(e => renderCard(e, false))}
              {!loadingAvailPractice && availPractice.length === 0 && <div style={{ color: 'var(--text-secondary)' }}>No available practice exams.</div>}
              {hasMoreAvailPractice && (
                <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                  <button className="btn-outline" onClick={() => {
                    setAvailPracticePage(p => p + 1);
                    fetchChunk('available', 'practice', availPracticePage + 1);
                  }}>Load More</button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "given" && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
            <div>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.5rem', color: 'var(--text-primary)' }}>Completed Scheduled Exams</h2>
              {loadingGivenScheduled && givenScheduled.length === 0 ? <div className="spinner"></div> : givenScheduled.map(e => renderCard(e, true))}
              {!loadingGivenScheduled && givenScheduled.length === 0 && <div style={{ color: 'var(--text-secondary)' }}>You haven't completed any scheduled exams.</div>}
              {hasMoreGivenScheduled && (
                <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                  <button className="btn-outline" onClick={() => {
                    setGivenScheduledPage(p => p + 1);
                    fetchChunk('given', 'scheduled', givenScheduledPage + 1);
                  }}>Load More</button>
                </div>
              )}
            </div>
            <div>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.5rem', color: 'var(--text-primary)' }}>Completed Practice Exams</h2>
              {loadingGivenPractice && givenPractice.length === 0 ? <div className="spinner"></div> : givenPractice.map(e => renderCard(e, true))}
              {!loadingGivenPractice && givenPractice.length === 0 && <div style={{ color: 'var(--text-secondary)' }}>You haven't completed any practice exams.</div>}
              {hasMoreGivenPractice && (
                <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                  <button className="btn-outline" onClick={() => {
                    setGivenPracticePage(p => p + 1);
                    fetchChunk('given', 'practice', givenPracticePage + 1);
                  }}>Load More</button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "announcements" && (
          <div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.5rem', color: 'var(--text-primary)' }}>Official Announcements</h2>
            {loadingAnnouncements ? (
              <div className="spinner"></div>
            ) : announcements.length === 0 ? (
              <div style={{ color: 'var(--text-secondary)' }}>No announcements available.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {announcements.map((ann: any) => (
                  <div key={ann._id} style={{ padding: '1.5rem', background: 'var(--surface-muted)', border: '1px solid var(--surface-border)', borderRadius: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{ann.title}</h3>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{new Date(ann.createdAt).toLocaleString()}</span>
                        <div style={{ fontSize: '0.8rem', color: 'var(--primary)', marginTop: '0.25rem' }}>By {ann.instructorId?.fullName || "Instructor"}</div>
                      </div>
                    </div>
                    
                    <div style={{ background: 'var(--surface-muted)', padding: '1.5rem', borderRadius: '0.5rem', marginBottom: '1rem', lineHeight: '1.6' }}>
                      <ReactMarkdown>{ann.message}</ReactMarkdown>
                      <div style={{ color: 'var(--danger)', marginTop: '0.5rem' }}><strong>⏳ Auto-deletes on:</strong> {ann.expireAt ? new Date(ann.expireAt).toLocaleString() : "Never"}</div>
                    </div>

                    {ann.attachment && (
                      <div style={{ display: 'inline-block' }}>
                        <a href={ann.attachment.url} target="_blank" rel="noopener noreferrer" className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', padding: '0.5rem 1rem' }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                          Download Attachment: {ann.attachment.filename}
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {hasMoreAnnouncements && announcements.length > 0 && (
              <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                <button 
                  onClick={() => fetchAnnouncements(announcementsPage + 1)} 
                  disabled={loadingMoreAnnouncements}
                  className="btn-outline" 
                  style={{ padding: '0.75rem 2rem', borderRadius: '2rem' }}
                >
                  {loadingMoreAnnouncements ? 'Loading...' : '⬇ Load More'}
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === "profile" && (
          <UserProfile />
        )}

        {activeTab === "assignments" && (
          <StudentAssignments />
        )}
        
        {activeTab === "content" && (
          <StudentContent />
        )}

        {activeTab === "classes" && (
          <StudentClasses />
        )}

        {activeTab === "messages" && (
          <Messaging />
        )}
      </div>

      {/* Global Generic Chatbot */}
      <button 
        aria-label="Open study assistant"
        aria-expanded={globalChatOpen}
        onClick={() => setGlobalChatOpen(!globalChatOpen)}
        style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'var(--primary-solid)',
          color: '#fff',
          border: 'none',
          boxShadow: '0 4px 15px var(--surface-muted)',
          cursor: 'pointer',
          fontSize: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999
        }}
      >
        <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-2 2V11.5a9.5 9.5 0 0 1 19 0Z"/><path d="M7 9h10M7 13h7"/></svg>
      </button>

      <StudentChatbot 
        isOpen={globalChatOpen}
        onClose={() => setGlobalChatOpen(false)}
      />
    </div>
  );
}
