"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import UserProfile from "./UserProfile";
import StudentAssignments from "./StudentAssignments";
import StudentContent from "./StudentContent";
import StudentChatbot from "./StudentChatbot";

export default function StudentDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"available" | "given" | "announcements" | "assignments" | "content" | "profile">("available");
  
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);
  
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
    }
  };

  const refreshAll = () => {
    fetchChunk('available', 'practice', 1);
    fetchChunk('available', 'scheduled', 1);
    fetchChunk('given', 'practice', 1);
    fetchChunk('given', 'scheduled', 1);
    fetchAnnouncements();
  };

  const fetchAnnouncements = async () => {
    setLoadingAnnouncements(true);
    try {
      const res = await fetch("/api/student/announcements");
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data.announcements);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAnnouncements(false);
    }
  };

  useEffect(() => {
    refreshAll();

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
    <div key={exam._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--surface-border)', borderRadius: '0.5rem', marginBottom: '1rem' }}>
      <div>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#fff' }}>{exam.courseName}</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          By {exam.instructor?.fullName} • {exam.durationMinutes || 60} mins • {exam.questions.length} Questions
        </p>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          Type: <strong style={{ color: exam.type === 'scheduled' ? '#fbcfe8' : '#a7f3d0' }}>{exam.type.toUpperCase()}</strong>
          {exam.type === 'scheduled' && exam.scheduledFor && ` (Scheduled: ${new Date(exam.scheduledFor).toLocaleString()})`}
        </p>
        <p style={{ fontSize: '0.85rem', color: 'var(--danger)', marginTop: '0.25rem' }}>
          <strong>⏳ Auto-deletes on:</strong> {exam.expireAt ? new Date(exam.expireAt).toLocaleString() : "Never"}
        </p>
        {isGiven && exam.attempt && (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Score: <strong style={{ color: '#fff' }}>{exam.attempt.score} / {exam.questions.length}</strong>
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
    <div className="glass-panel" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '1rem' }}>
        <button
          onClick={() => setActiveTab("available")}
          style={{
            background: 'transparent',
            color: activeTab === "available" ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === "available" ? '2px solid var(--primary)' : 'none',
            borderRadius: 0,
            padding: '0.5rem 1rem'
          }}
        >
          Available Exams
        </button>
        <button
          onClick={() => setActiveTab("given")}
          style={{
            background: 'transparent',
            color: activeTab === "given" ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === "given" ? '2px solid var(--primary)' : 'none',
            borderRadius: 0,
            padding: '0.5rem 1rem'
          }}
        >
          Exams Given
        </button>
        <button
          onClick={() => setActiveTab("announcements")}
          style={{
            background: 'transparent',
            color: activeTab === "announcements" ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === "announcements" ? '2px solid var(--primary)' : 'none',
            borderRadius: 0,
            padding: '0.5rem 1rem'
          }}
        >
          Announcements
        </button>
        <button
          onClick={() => setActiveTab("assignments")}
          style={{
            background: 'transparent',
            color: activeTab === "assignments" ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === "assignments" ? '2px solid var(--primary)' : 'none',
            borderRadius: 0,
            padding: '0.5rem 1rem'
          }}
        >
          Assignments
        </button>
        <button
          onClick={() => setActiveTab("content")}
          style={{
            background: 'transparent',
            color: activeTab === "content" ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === "content" ? '2px solid var(--primary)' : 'none',
            borderRadius: 0,
            padding: '0.5rem 1rem'
          }}
        >
          Materials
        </button>
        <button
          onClick={() => setActiveTab("profile")}
          style={{
            background: 'transparent',
            color: activeTab === "profile" ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === "profile" ? '2px solid var(--primary)' : 'none',
            borderRadius: 0,
            padding: '0.5rem 1rem'
          }}
        >
          Profile
        </button>
      </div>

      {error && <div style={{ color: 'var(--danger)', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '0.5rem', border: '1px solid rgba(239, 68, 68, 0.2)', marginBottom: '1rem' }}>{error}</div>}

      <div className="animate-fade-in">
        {activeTab === "available" && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
            <div>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.5rem', color: '#fff' }}>Scheduled Exams</h2>
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
              <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.5rem', color: '#fff' }}>Practice Exams</h2>
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
              <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.5rem', color: '#fff' }}>Completed Scheduled Exams</h2>
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
              <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.5rem', color: '#fff' }}>Completed Practice Exams</h2>
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
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.5rem', color: '#fff' }}>Official Announcements</h2>
            {loadingAnnouncements ? (
              <div className="spinner"></div>
            ) : announcements.length === 0 ? (
              <div style={{ color: 'var(--text-secondary)' }}>No announcements available.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {announcements.map((ann: any) => (
                  <div key={ann._id} style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--surface-border)', borderRadius: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{ann.title}</h3>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{new Date(ann.createdAt).toLocaleString()}</span>
                        <div style={{ fontSize: '0.8rem', color: 'var(--primary)', marginTop: '0.25rem' }}>By {ann.instructorId?.fullName || "Instructor"}</div>
                      </div>
                    </div>
                    
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '0.5rem', marginBottom: '1rem', lineHeight: '1.6' }}>
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
      </div>

      {/* Global Generic Chatbot */}
      <button 
        onClick={() => setGlobalChatOpen(!globalChatOpen)}
        style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'var(--primary)',
          color: '#fff',
          border: 'none',
          boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
          cursor: 'pointer',
          fontSize: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999
        }}
      >
        💬
      </button>

      <StudentChatbot 
        isOpen={globalChatOpen}
        onClose={() => setGlobalChatOpen(false)}
      />
    </div>
  );
}
