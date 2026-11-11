"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from 'react-markdown';

interface StudentChatbotProps {
  contentId?: string;
  contentTitle?: string;
  onClose?: () => void;
  isOpen: boolean;
}

export default function StudentChatbot({ contentId, contentTitle, onClose, isOpen }: StudentChatbotProps) {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: contentTitle 
          ? `Hi! I am your AI assistant. I have read the document **${contentTitle}**. What would you like to know about it?`
          : "Hello! I am your AI assistant. How can I help you today?"
      }]);
    }
  }, [isOpen, contentTitle, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = input.trim();
    setInput("");
    
    const newMessages = [...messages, { role: 'user' as const, content: userMsg }];
    setMessages(newMessages);
    setLoading(true);

    try {
      // Only keep the last 6 messages to prevent token bloat
      const contextMessages = newMessages.slice(-6);

      const res = await fetch('/api/student/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: contextMessages,
          contentId: contentId || undefined
        })
      });

      if (!res.ok) throw new Error("Failed to fetch response");

      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '1rem',
      right: '1rem',
      width: 'min(400px, calc(100vw - 2rem))',
      height: 'min(600px, calc(100dvh - 2rem))',
      background: 'var(--surface)',
      border: '1px solid var(--surface-border)',
      borderRadius: '1rem',
      boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1000,
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '1rem',
        background: 'var(--primary-solid)',
        color: '#fff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontWeight: 'bold'
      }}>
        <div>
          <div>🤖 AI Assistant</div>
          {contentTitle && <div style={{ fontSize: '0.75rem', opacity: 0.8, fontWeight: 'normal' }}>Context: {contentTitle}</div>}
        </div>
        {onClose && (
          <button aria-label="Close study assistant" onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.25rem' }}>&times;</button>
        )}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '85%',
            background: m.role === 'user' ? 'var(--primary-solid)' : 'var(--surface-border)',
            padding: '0.75rem 1rem',
            borderRadius: '1rem',
            borderBottomRightRadius: m.role === 'user' ? '0' : '1rem',
            borderBottomLeftRadius: m.role === 'assistant' ? '0' : '1rem',
            color: m.role === 'user' ? '#fff' : 'var(--text-primary)',
            fontSize: '0.9rem',
            lineHeight: '1.5'
          }}>
            {m.role === 'user' ? m.content : <ReactMarkdown>{m.content}</ReactMarkdown>}
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: 'flex-start', background: 'var(--surface-border)', padding: '0.75rem 1rem', borderRadius: '1rem', borderBottomLeftRadius: '0' }}>
            <div className="spinner" style={{ width: '1rem', height: '1rem' }}></div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '1rem', borderTop: '1px solid var(--surface-border)', display: 'flex', gap: '0.5rem', background: 'var(--surface-muted)' }}>
        <input 
          type="text" 
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Question for study assistant"
          placeholder="Ask a question..."
          style={{ flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--surface-border)', background: 'var(--surface-border)', color: 'var(--text-primary)', outlineOffset: '3px' }}
        />
        <button onClick={handleSend} disabled={loading || !input.trim()} className="btn-primary" style={{ padding: '0 1rem', borderRadius: '0.5rem' }}>
          Send
        </button>
      </div>
    </div>
  );
}
