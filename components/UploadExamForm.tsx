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

  const [fileContent, setFileContent] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "text/plain") {
      setError("Please upload a .txt file");
      setFileContent(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setFileContent(event.target?.result as string);
      setError("");
    };
    reader.onerror = () => {
      setError("Error reading file");
    };
    reader.readAsText(file);
  };

  const parseExamFile = (text: string) => {
    const questions: any[] = [];
    // Split by double newline or more to get blocks
    const blocks = text.trim().split(/\n\s*\n/);
    
    for (const block of blocks) {
      const lines = block.split("\n").map(l => l.trim()).filter(l => l);
      if (lines.length < 6) {
        throw new Error("Invalid block format. Must contain a Question, 4 options, and an Answer.");
      }

      const qLine = lines.find(l => l.startsWith("Question:"));
      const ansLine = lines.find(l => l.startsWith("Answer:"));
      
      const optionsLines = lines.filter(l => /^[A-D]\)/.test(l));

      if (!qLine || !ansLine || optionsLines.length < 4) {
        throw new Error("Missing Question:, Answer: or A) B) C) D) options in a block.");
      }

      const questionText = qLine.replace("Question:", "").trim();
      const options = optionsLines.map(o => o.replace(/^[A-D]\)/, "").trim());
      
      const answerLetter = ansLine.replace("Answer:", "").trim().toUpperCase();
      const answerIndex = ["A", "B", "C", "D"].indexOf(answerLetter);

      if (answerIndex === -1) {
        throw new Error(`Invalid answer: ${answerLetter}. Must be A, B, C, or D.`);
      }

      questions.push({
        questionText,
        options,
        correctOptionIndex: answerIndex
      });
    }

    if (questions.length === 0) {
      throw new Error("No valid questions found in the file.");
    }
    return questions;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    
    if (!fileContent) {
      setError("Please upload an exam .txt file");
      return;
    }

    setIsLoading(true);

    try {
      const parsedQuestions = parseExamFile(fileContent);
      
      const payload = {
        ...formData,
        topics: formData.topics.split(",").map(t => t.trim()).filter(t => t),
        questions: parsedQuestions
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
        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Upload Exam Questions (.txt) *</label>
        <div style={{ padding: '2rem', border: '2px dashed var(--surface-border)', borderRadius: '0.5rem', textAlign: 'center', background: 'rgba(0,0,0,0.2)' }}>
          <input type="file" accept=".txt" onChange={handleFileUpload} style={{ padding: '0.5rem', border: 'none', background: 'transparent' }} />
          <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Ensure your file follows the strict format:<br/>
            Question: [Text]<br/>A) [Option]<br/>B) [Option]<br/>C) [Option]<br/>D) [Option]<br/>Answer: [A/B/C/D]
          </p>
        </div>
      </div>

      <button type="submit" className="btn-primary" disabled={isLoading} style={{ alignSelf: 'flex-start' }}>
        {isLoading ? <div className="spinner"></div> : "Upload & Create Exam"}
      </button>
    </form>
  );
}
