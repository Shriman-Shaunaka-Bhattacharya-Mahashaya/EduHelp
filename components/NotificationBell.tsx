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
    if (!open) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        ref.current?.querySelector('button')?.focus();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open]);

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
      const response = await fetch("/api/notifications", { method: "PUT" });
      if (!response.ok) return;
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error(e);
    }
  };

  const markAsRead = async (id: string, read: boolean) => {
    if (read) return;
    try {
      const response = await fetch(`/api/notifications/${id}`, { method: "PUT" });
      if (!response.ok) return;
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button aria-label="Notifications" aria-expanded={open} aria-controls="notifications-panel"
        onKeyDown={event => { if (event.key === "Escape") setOpen(false); }}
        onClick={() => {
          setOpen(!open);
          if (!open) fetchNotifications();
        }}
        style={{
          background: "transparent",
          color: "var(--text-primary)",
          border: "none",
          fontSize: "1.5rem",
          cursor: "pointer",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "44px",
          height: "44px",
          padding: 0,
          flexShrink: 0,
          borderRadius: "50%",
          transition: "background 0.2s"
        }}
        onMouseOver={(e) => (e.currentTarget.style.background = "var(--surface-border)")}
        onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
        {unreadCount > 0 && (
          <span style={{
            position: "absolute",
            top: "2px",
            right: "2px",
            background: "#b42338",
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
        <div id="notifications-panel" role="region" aria-label="Notifications" onKeyDown={event => { if (event.key === "Escape") setOpen(false); }} style={{
          position: "absolute",
          top: "100%",
          right: "0",
          width: "min(350px, calc(100vw - 2rem))",
          maxHeight: "400px",
          background: "var(--glass-background)",
          backdropFilter: "var(--glass-filter)",
          WebkitBackdropFilter: "var(--glass-filter)",
          border: "1px solid var(--surface-border)",
          borderRadius: "0.5rem",
          boxShadow: "var(--shadow)",
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
            background: "var(--surface-hover)"
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
                  role="button" tabIndex={0}
                  onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); markAsRead(n._id, n.read); } }}
                  onClick={() => markAsRead(n._id, n.read)}
                  style={{ 
                    padding: "1rem", 
                    borderBottom: "1px solid var(--surface-hover)",
                    background: n.read ? "transparent" : "var(--accent-soft)",
                    cursor: n.read ? "default" : "pointer",
                    transition: "background 0.2s"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                    <strong style={{ fontSize: "0.9rem", color: n.read ? "var(--text-secondary)" : "var(--text-primary)" }}>
                      {n.title}
                    </strong>
                    {!n.read && <span style={{ width: "8px", height: "8px", background: "var(--primary-solid)", borderRadius: "50%", marginTop: "4px" }}></span>}
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
