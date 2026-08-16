"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UploadExamForm({ onUploadSuccess }: { onUploadSuccess: () => void }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    courseName: "",
    topics: "",
    type: "practice",
    scheduledFor: "",
    durationMinutes: "60",
    targetDepartment: "",
    targetBatch: "",
  });

  const [file, setFile] = useState<File | null>(null);
  const [parsingStatus, setParsingStatus] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const allowedTypes = [
      "text/plain", 
      "application/pdf", 
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ];

    if (!allowedTypes.includes(selectedFile.type) && !selectedFile.name.endsWith('.txt') && !selectedFile.name.endsWith('.pdf') && !selectedFile.name.endsWith('.docx') && !selectedFile.name.endsWith('.pptx') && !selectedFile.name.endsWith('.xlsx')) {
      setError("Please upload a .txt, .pdf, .docx, .pptx, or .xlsx file");
      setFile(null);
      return;
    }

    setFile(selectedFile);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    
    if (!file) {
      setError("Please upload an exam file");
      return;
    }

    setIsLoading(true);

    try {
      setParsingStatus("Extracting and parsing document with AI...");
      const formDataToSend = new FormData();
      formDataToSend.append('file', file);

      const parseRes = await fetch('/api/exams/parse', {
        method: 'POST',
        body: formDataToSend,
      });

      const parseData = await parseRes.json();

      if (!parseRes.ok) {
        throw new Error(parseData.message || "Failed to parse document");
      }

      setParsingStatus("Saving exam to database...");
      
      const payload = {
        ...formData,
        topics: formData.topics.split(",").map(t => t.trim()).filter(t => t),
        questions: parseData.questions
      };

      const res = await fetch("/api/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to create exam");
      }

      setSuccess("Exam uploaded successfully!");
      setTimeout(() => {
        onUploadSuccess();
      }, 1500);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
      setParsingStatus("");
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {error && <div style={{ color: 'var(--danger)', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '0.5rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>{error}</div>}
      {success && <div style={{ color: 'var(--success)', padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '0.5rem', border: '1px solid rgba(16, 185, 129, 0.2)' }}>{success}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Course Name *</label>
          <input type="text" name="courseName" required value={formData.courseName} onChange={handleChange} placeholder="e.g. Intro to Data Structures" />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Topics (Comma separated)</label>
          <input type="text" name="topics" value={formData.topics} onChange={handleChange} placeholder="e.g. Arrays, Linked Lists, Trees" />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Exam Type *</label>
          <select name="type" required value={formData.type} onChange={handleChange}>
            <option value="practice">Practice Test (Unlimited Attempts, anytime)</option>
            <option value="scheduled">Scheduled Test (Single Attempt, specific time)</option>
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: formData.type === "scheduled" ? '1fr 1fr' : '1fr', gap: '1rem' }}>
          {formData.type === "scheduled" && (
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Scheduled For *</label>
              <input type="datetime-local" name="scheduledFor" required value={formData.scheduledFor} onChange={handleChange} />
            </div>
          )}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Duration (Minutes) *</label>
            <input type="number" name="durationMinutes" required min={1} value={formData.durationMinutes} onChange={handleChange} />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Target Department (Optional)</label>
          <select name="targetDepartment" value={formData.targetDepartment} onChange={handleChange}>
            <option value="">Any Department</option>
            <option value="Computer Science">Computer Science</option>
            <option value="Information Technology">Information Technology</option>
            <option value="Electronics">Electronics</option>
            <option value="Mechanical">Mechanical</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Target Batch Year (Optional)</label>
          <input type="number" name="targetBatch" min={2020} max={2030} value={formData.targetBatch} onChange={handleChange} placeholder="e.g. 2027" />
        </div>
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Upload Exam Document (.txt, .pdf, .docx, .pptx, .xlsx)</label>
        <input 
          type="file" 
          accept=".txt,.pdf,.docx,.pptx,.xlsx,application/pdf,text/plain"
          onChange={handleFileUpload} 
          style={{ 
            width: '100%', 
            padding: '0.75rem', 
            background: 'rgba(0,0,0,0.2)', 
            border: '1px solid var(--surface-border)', 
            borderRadius: '0.5rem', 
            color: '#fff' 
          }}
        />
      </div>

      <button 
        type="submit" 
        className="btn-primary" 
        style={{ width: '100%', padding: '1rem', marginTop: '1rem' }}
        disabled={isLoading}
      >
        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
            <div className="spinner" style={{ width: '1.25rem', height: '1.25rem', borderWidth: '2px' }}></div>
            {parsingStatus || "Processing..."}
          </div>
        ) : "Create Exam"}
      </button>
    </form>
  );
}
