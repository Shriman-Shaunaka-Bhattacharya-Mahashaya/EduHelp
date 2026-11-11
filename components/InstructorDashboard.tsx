"use client";

import DashboardNav from "./DashboardNav";

import { useState, useEffect } from "react";
import ExamList from "./ExamList";
import ManageAnnouncements from "./ManageAnnouncements";
import UserProfile from "./UserProfile";
import ManageAssignments from "./ManageAssignments";
import ManageContent from "./ManageContent";
import Messaging from "./Messaging";
import ManageClasses from "./ManageClasses";

export default function InstructorDashboard() {
  const [activeTab, setActiveTab] = useState<"list" | "announcements" | "assignments" | "content" | "classes" | "messages" | "profile">("list");
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
    <div className="workspace-panel">
      <DashboardNav active={activeTab} onChange={setActiveTab} items={[
        { id: "list", label: "My Exams" },
        { id: "announcements", label: "Announcements" },
        { id: "assignments", label: "Assignments" },
        { id: "content", label: "Materials" },
        { id: "classes", label: "Classes" },
        { id: "messages", label: "Messages", count: unreadMessages },
        { id: "profile", label: "Profile" },
      ]} />

      <div className="workspace-content">
        {activeTab === "list" && <ExamList />}

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
