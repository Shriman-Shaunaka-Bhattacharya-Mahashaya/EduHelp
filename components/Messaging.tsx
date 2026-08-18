"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

export default function Messaging() {
  const { data: session } = useSession();
  const [contacts, setContacts] = useState<any[]>([]);
  const [selectedContact, setSelectedContact] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Poll contacts every 10 seconds
  useEffect(() => {
    fetchContacts();
    const interval = setInterval(fetchContacts, 10000);
    return () => clearInterval(interval);
  }, []);

  // Poll messages every 3 seconds if a contact is selected
  useEffect(() => {
    if (!selectedContact) return;
    
    fetchMessages(selectedContact._id);
    const interval = setInterval(() => fetchMessages(selectedContact._id), 3000);
    return () => clearInterval(interval);
  }, [selectedContact]);

  const fetchContacts = async () => {
    try {
      const res = await fetch('/api/messages/contacts');
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (contactId: string) => {
    try {
      const res = await fetch(`/api/messages/${contactId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages);
        
        // If we just marked messages as read, update the contact's unread count locally
        setContacts(prev => prev.map(c => 
          c._id === contactId ? { ...c, unreadCount: 0 } : c
        ));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedContact) return;

    const tempMessage = {
      _id: Date.now().toString(),
      senderId: session?.user?.id,
      receiverId: selectedContact._id,
      content: newMessage.trim(),
      createdAt: new Date().toISOString()
    };

    // Optimistic UI
    setMessages(prev => [...prev, tempMessage]);
    setNewMessage("");

    try {
      const res = await fetch(`/api/messages/${selectedContact._id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: tempMessage.content })
      });
      if (!res.ok) throw new Error("Failed to send");
      // Optionally re-fetch
      fetchMessages(selectedContact._id);
      fetchContacts();
    } catch (e) {
      console.error(e);
      alert("Failed to send message");
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (loading) return <div className="spinner"></div>;

  return (
    <div style={{ display: 'flex', height: '70vh', background: 'rgba(0,0,0,0.3)', borderRadius: '0.5rem', border: '1px solid var(--surface-border)', overflow: 'hidden' }}>
      
      {/* Contacts Sidebar */}
      <div style={{ width: '30%', borderRight: '1px solid var(--surface-border)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--surface-border)', background: 'rgba(255,255,255,0.05)' }}>
          <h3 style={{ margin: 0 }}>Messages</h3>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {contacts.length === 0 ? (
            <div style={{ padding: '1rem', color: 'var(--text-secondary)' }}>No contacts available.</div>
          ) : (
            contacts.map(c => (
              <div 
                key={c._id}
                onClick={() => setSelectedContact(c)}
                style={{ 
                  padding: '1rem', 
                  borderBottom: '1px solid rgba(255,255,255,0.1)',
                  cursor: 'pointer',
                  background: selectedContact?._id === c._id ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontWeight: 'bold', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {c.fullName}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {c.lastMessage ? c.lastMessage.content : `Role: ${c.role}`}
                  </div>
                </div>
                {c.unreadCount > 0 && (
                  <div style={{ 
                    background: 'var(--danger)', 
                    color: 'white', 
                    borderRadius: '50%', 
                    padding: '0.2rem 0.5rem', 
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    marginLeft: '0.5rem'
                  }}>
                    {c.unreadCount}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div style={{ width: '70%', display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.1)' }}>
        {selectedContact ? (
          <>
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--surface-border)', background: 'rgba(255,255,255,0.05)' }}>
              <h3 style={{ margin: 0 }}>{selectedContact.fullName}</h3>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {selectedContact.department} • {selectedContact.role}
              </div>
            </div>
            
            <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '2rem' }}>
                  No messages yet. Start the conversation!
                </div>
              ) : (
                messages.map((m: any) => {
                  const isMe = m.senderId === session?.user?.id;
                  return (
                    <div key={m._id} style={{ 
                      alignSelf: isMe ? 'flex-end' : 'flex-start',
                      maxWidth: '70%'
                    }}>
                      <div style={{
                        background: isMe ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                        padding: '0.75rem 1rem',
                        borderRadius: '1rem',
                        borderBottomRightRadius: isMe ? '0.25rem' : '1rem',
                        borderBottomLeftRadius: !isMe ? '0.25rem' : '1rem',
                        color: 'white',
                        wordBreak: 'break-word'
                      }}>
                        {m.content}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.25rem', textAlign: isMe ? 'right' : 'left' }}>
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <div style={{ padding: '1rem', borderTop: '1px solid var(--surface-border)', background: 'rgba(255,255,255,0.05)' }}>
              <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '1rem' }}>
                <input 
                  type="text" 
                  className="input" 
                  value={newMessage} 
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder="Type a message..." 
                  style={{ flex: 1, padding: '0.75rem', borderRadius: '2rem', border: '1px solid var(--surface-border)', background: 'rgba(0,0,0,0.2)', color: '#fff' }}
                />
                <button type="submit" className="btn-primary" style={{ borderRadius: '2rem', padding: '0 1.5rem' }} disabled={!newMessage.trim()}>
                  Send
                </button>
              </form>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-secondary)' }}>
            Select a contact to start messaging
          </div>
        )}
      </div>

    </div>
  );
}
