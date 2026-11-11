"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import InstructorDashboard from "@/components/InstructorDashboard";
import StudentDashboard from "@/components/StudentDashboard";
import NotificationBell from "@/components/NotificationBell";
import { ThemeSwitcher } from "@/components/ThemeProvider";
import Link from "next/link";

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="spinner" style={{ width: '40px', height: '40px' }}></div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="dashboard-shell">
      <header className="dashboard-header">
        <Link href="/dashboard" className="brand"><span className="brand-mark" aria-hidden="true">e</span>EduHelp</Link>
        <div className="dashboard-actions">
          <span className="role-badge">{session.user.role}</span>
          <ThemeSwitcher />
          <NotificationBell />
          <button className="btn-outline" onClick={() => signOut({ callbackUrl: '/login' })}>
            Sign Out
          </button>
        </div>
      </header>
      <main id="main-content">
      <div className="dashboard-intro">
        <h1>Welcome back{session.user.name ? `, ${session.user.name.split(' ')[0]}` : ''}.</h1>
        <p>{session.user.role === 'student' ? 'Your next chapter starts here. Pick up where you left off.' : 'A clear view of your classroom. Everything you need to keep learning moving.'}</p>
      </div>
      {session.user?.role === 'student' ? (
        <StudentDashboard />
      ) : (
        <InstructorDashboard />
      )}
      </main>
    </div>
  );
}
