"use client";

import { useState, useEffect, useRef } from "react";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
        setUnreadCount(data.notifications.filter((n: any) => !n.read).length);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000); // Polling every 10s
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAllAsRead = async () => {
    if (unreadCount === 0) return;
    try {
      await fetch("/api/notifications", { method: "PUT" });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error(e);
    }
  };

  const markAsRead = async (id: string, read: boolean) => {
    if (read) return;
    try {
      await fetch(`/api/notifications/${id}`, { method: "PUT" });
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button 
        onClick={() => {
          setOpen(!open);
          if (!open) fetchNotifications();
        }}
        style={{
          background: "transparent",
          border: "none",
          fontSize: "1.5rem",
          cursor: "pointer",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          transition: "background 0.2s"
        }}
        onMouseOver={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
        onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
      >
        🔔
        {unreadCount > 0 && (
          <span style={{
            position: "absolute",
            top: "2px",
            right: "2px",
            background: "var(--danger)",
            color: "white",
            fontSize: "0.6rem",
            fontWeight: "bold",
            borderRadius: "50%",
            width: "18px",
            height: "18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 5px rgba(0,0,0,0.5)"
          }}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: "absolute",
          top: "100%",
          right: "0",
          width: "350px",
          maxHeight: "400px",
          background: "rgba(10, 10, 20, 0.95)",
          backdropFilter: "blur(10px)",
          border: "1px solid var(--surface-border)",
          borderRadius: "0.5rem",
          boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
          display: "flex",
          flexDirection: "column",
          zIndex: 1000,
          overflow: "hidden",
          marginTop: "0.5rem"
        }}>
          <div style={{ 
            padding: "1rem", 
            borderBottom: "1px solid var(--surface-border)", 
            display: "flex", 
            justifyContent: "space-between",
            alignItems: "center",
            background: "rgba(255,255,255,0.05)"
          }}>
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: "bold" }}>Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                style={{ background: "transparent", border: "none", color: "var(--primary)", fontSize: "0.8rem", cursor: "pointer" }}
              >
                Mark all as read
              </button>
            )}
          </div>
          
          <div style={{ overflowY: "auto", flex: 1, padding: "0" }}>
            {notifications.length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                You're all caught up!
              </div>
            ) : (
              notifications.map((n) => (
                <div 
                  key={n._id} 
                  onClick={() => markAsRead(n._id, n.read)}
                  style={{ 
                    padding: "1rem", 
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                    background: n.read ? "transparent" : "rgba(59, 130, 246, 0.1)",
                    cursor: n.read ? "default" : "pointer",
                    transition: "background 0.2s"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                    <strong style={{ fontSize: "0.9rem", color: n.read ? "var(--text-secondary)" : "#fff" }}>
                      {n.title}
                    </strong>
                    {!n.read && <span style={{ width: "8px", height: "8px", background: "var(--primary)", borderRadius: "50%", marginTop: "4px" }}></span>}
                  </div>
                  <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                    {n.message}
                  </p>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginTop: "0.5rem", opacity: 0.7 }}>
                    {new Date(n.createdAt).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
