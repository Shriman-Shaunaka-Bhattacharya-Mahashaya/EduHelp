"use client";

import { useState, useEffect } from "react";
import UploadExamForm from "./UploadExamForm";
import ExamList from "./ExamList";
import ManageAnnouncements from "./ManageAnnouncements";
import UserProfile from "./UserProfile";
import ManageAssignments from "./ManageAssignments";
import ManageContent from "./ManageContent";
import Messaging from "./Messaging";
import ManageClasses from "./ManageClasses";

export default function InstructorDashboard() {
  const [activeTab, setActiveTab] = useState<"upload" | "list" | "announcements" | "assignments" | "content" | "classes" | "messages" | "profile">("list");
  const [unreadMessages, setUnreadMessages] = useState(0);

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
    fetchUnreadMessages();
    const interval = setInterval(fetchUnreadMessages, 10000); // poll unread every 10s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="glass-panel" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '1rem' }}>
        <button
          onClick={() => setActiveTab("list")}
          style={{
            background: 'transparent',
            color: activeTab === "list" ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === "list" ? '2px solid var(--primary)' : 'none',
            borderRadius: 0,
            padding: '0.5rem 1rem'
          }}
        >
          My Exams
        </button>
        <button
          onClick={() => setActiveTab("upload")}
          style={{
            background: 'transparent',
            color: activeTab === "upload" ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === "upload" ? '2px solid var(--primary)' : 'none',
            borderRadius: 0,
            padding: '0.5rem 1rem'
          }}
        >
          Upload New Exam
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
          onClick={() => setActiveTab("classes")}
          style={{
            background: 'transparent',
            color: activeTab === "classes" ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === "classes" ? '2px solid var(--primary)' : 'none',
            borderRadius: 0,
            padding: '0.5rem 1rem'
          }}
        >
          Classes
        </button>
        <button
          onClick={() => setActiveTab("messages")}
          style={{
            background: 'transparent',
            color: activeTab === "messages" ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === "messages" ? '2px solid var(--primary)' : 'none',
            borderRadius: 0,
            padding: '0.5rem 1rem',
            position: 'relative'
          }}
        >
          Messages
          {unreadMessages > 0 && (
            <span style={{
              position: 'absolute',
              top: '0',
              right: '0',
              background: 'var(--danger)',
              color: 'white',
              borderRadius: '50%',
              padding: '0.1rem 0.4rem',
              fontSize: '0.6rem',
              fontWeight: 'bold',
              transform: 'translate(25%, -25%)'
            }}>
              {unreadMessages}
            </span>
          )}
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

      <div className="animate-fade-in">
        {activeTab === "list" && <ExamList />}
        {activeTab === "upload" && <UploadExamForm onUploadSuccess={() => setActiveTab("list")} />}
        {activeTab === "announcements" && <ManageAnnouncements />}
        {activeTab === "assignments" && <ManageAssignments />}
        {activeTab === "content" && <ManageContent />}
        {activeTab === "classes" && <ManageClasses />}
        {activeTab === "messages" && <Messaging />}
        {activeTab === "profile" && <UserProfile />}
      </div>
    </div>
  );
}
