"use client";

import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ThemeSwitcher } from '@/components/ThemeProvider';
import { normalizeMeetUrl, type ClassStatus } from '@/lib/onlineClasses';

interface ClassInfo {
  title: string;
  description: string;
  status: ClassStatus;
  meetingUrl: string;
  canManage: boolean;
}

function ClassMeeting({ classId }: { classId: string }) {
  const { status } = useSession();
  const router = useRouter();
  const [onlineClass, setOnlineClass] = useState<ClassInfo | null>(null);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
    if (status !== 'authenticated') return;
    const controller = new AbortController();
    async function loadClass() {
      try {
        const response = await fetch(`/api/classes/${classId}`, { signal: controller.signal, cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Unable to load this class');
        const meetingUrl = normalizeMeetUrl(data.meetingUrl);
        if (!meetingUrl) throw new Error('The instructor needs to add a valid Google Meet link');
        setOnlineClass({ ...data, meetingUrl });
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Unable to load this class');
      }
    }
    void loadClass();
    return () => controller.abort();
  }, [classId, status, router]);

  async function updateStatus(nextStatus: 'ongoing' | 'completed') {
    if (updating) return;
    if (nextStatus === 'completed' && !window.confirm('Mark this class completed in EduHelp? End the video call separately in Google Meet.')) return;
    setUpdating(true);
    setError('');
    try {
      const response = await fetch(`/api/instructor/classes/${classId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: nextStatus }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to update this class');
      setOnlineClass(previous => previous ? { ...previous, status: nextStatus } : previous);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update this class');
    } finally {
      setUpdating(false);
    }
  }

  return (
    <main id="main-content" className="meeting-shell">
      <header className="meeting-page-header">
        <Link href="/dashboard" className="brand"><span className="brand-mark" aria-hidden="true">e</span>EduHelp</Link>
        <ThemeSwitcher />
      </header>
      <section className="glass-panel meeting-card" aria-labelledby="class-title">
        {error && <p role="alert" className="class-error">{error}</p>}
        {!onlineClass && !error && <div role="status" className="meeting-loading"><span className="spinner" aria-hidden="true" />Loading class details...</div>}
        {onlineClass && <>
          <span className="role-badge">{onlineClass.status === 'ongoing' ? 'Live now' : onlineClass.status === 'completed' ? 'Completed' : 'Scheduled'}</span>
          <h1 id="class-title">{onlineClass.title}</h1>
          <p className="meeting-description">{onlineClass.description}</p>
          {onlineClass.status === 'ongoing' ? <>
            <h2>Join on Google Meet</h2>
            <p>The video call opens in a new tab. Your instructor may need to admit you to the meeting.</p>
            <a className="btn-primary meeting-join" href={onlineClass.meetingUrl} target="_blank" rel="noopener noreferrer">
              Open Google Meet
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                <path d="M15 3h6v6M10 14 21 3M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
              </svg>
            </a>
          </> : <p>{onlineClass.status === 'completed' ? 'This class is completed.' : 'Start the class to make the meeting available to students.'}</p>}
          {onlineClass.canManage && onlineClass.status !== 'completed' && <div className="meeting-host-actions">
            {onlineClass.status === 'scheduled'
              ? <button className="btn-primary" onClick={() => updateStatus('ongoing')} disabled={updating}>{updating ? 'Starting...' : 'Start Class'}</button>
              : <><p>When the lesson ends, end the call in Google Meet and mark the class completed here.</p><button className="btn-outline" onClick={() => updateStatus('completed')} disabled={updating}>{updating ? 'Updating...' : 'Mark class completed'}</button></>}
          </div>}
        </>}
        <Link href="/dashboard" className="meeting-back">Return to dashboard</Link>
      </section>
    </main>
  );
}

export default function ClassMeetingRoom() {
  const { meetingId } = useParams<{ meetingId: string }>();
  return <ClassMeeting key={meetingId} classId={meetingId} />;
}
