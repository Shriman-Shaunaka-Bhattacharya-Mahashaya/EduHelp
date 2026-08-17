"use client";

import { useState } from "react";
import UploadExamForm from "./UploadExamForm";
import ExamList from "./ExamList";
import ManageAnnouncements from "./ManageAnnouncements";
import UserProfile from "./UserProfile";
import ManageAssignments from "./ManageAssignments";
import ManageContent from "./ManageContent";

export default function InstructorDashboard() {
  const [activeTab, setActiveTab] = useState<"upload" | "list" | "announcements" | "assignments" | "content" | "profile">("list");

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
        {activeTab === "profile" && <UserProfile />}
      </div>
    </div>
  );
}
