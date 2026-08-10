"use client";

import { useState } from "react";
import UploadExamForm from "./UploadExamForm";
import ExamList from "./ExamList";

export default function InstructorDashboard() {
  const [activeTab, setActiveTab] = useState<"upload" | "list">("list");

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
      </div>

      <div className="animate-fade-in">
        {activeTab === "list" ? <ExamList /> : <UploadExamForm onUploadSuccess={() => setActiveTab("list")} />}
      </div>
    </div>
  );
}
