"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "../auth.module.css";

export default function Register() {
  const router = useRouter();
  const [role, setRole] = useState<"student" | "instructor">("student");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    department: "",
    registrationNumber: "",
    rollNumber: "",
    section: "",
    graduationYear: "",
    instructorId: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Something went wrong");
      }

      router.push("/login?registered=true");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={`glass-panel animate-fade-in ${styles.authCard}`}>
        <div className={styles.header}>
          <h1 className={styles.title}>Join EduHelp</h1>
          <p className={styles.subtitle}>Create your account to get started</p>
        </div>

        <div className={styles.roleToggle}>
          <button
            className={`${styles.roleBtn} ${role === "student" ? styles.active : ""}`}
            onClick={() => setRole("student")}
          >
            Student
          </button>
          <button
            className={`${styles.roleBtn} ${role === "instructor" ? styles.active : ""}`}
            onClick={() => setRole("instructor")}
          >
            Instructor
          </button>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form} autoComplete="off">
          <div className={styles.formGroup}>
            <label className={styles.label}>Full Name</label>
            <input type="text" name="fullName" required value={formData.fullName} onChange={handleChange} placeholder="John Doe" />
          </div>

          <div className={styles.row}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Email</label>
              <input type="email" name="email" required value={formData.email} onChange={handleChange} placeholder="john@example.com" autoComplete="off" />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Password</label>
              <input type="password" name="password" required minLength={6} value={formData.password} onChange={handleChange} placeholder="••••••••" autoComplete="new-password" />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Department</label>
            <select name="department" required value={formData.department} onChange={handleChange}>
              <option value="">Select Department</option>
              <option value="Computer Science">Computer Science</option>
              <option value="Information Technology">Information Technology</option>
              <option value="Electronics">Electronics</option>
              <option value="Mechanical">Mechanical</option>
            </select>
          </div>

          {role === "student" && (
            <>
              <div className={styles.row}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Registration Number</label>
                  <input type="text" name="registrationNumber" required value={formData.registrationNumber} onChange={handleChange} placeholder="e.g. REG2023001" />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Roll Number</label>
                  <input type="text" name="rollNumber" required value={formData.rollNumber} onChange={handleChange} placeholder="e.g. 101" />
                </div>
              </div>
              <div className={styles.row}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Section (Optional)</label>
                  <input type="text" name="section" value={formData.section} onChange={handleChange} placeholder="e.g. A" />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Graduation Year</label>
                  <input type="number" name="graduationYear" required min={2020} max={2030} value={formData.graduationYear} onChange={handleChange} placeholder="2027" />
                </div>
              </div>
            </>
          )}

          {role === "instructor" && (
            <div className={styles.formGroup}>
              <label className={styles.label}>Instructor ID</label>
              <input type="text" name="instructorId" required value={formData.instructorId} onChange={handleChange} placeholder="e.g. INS-405" />
            </div>
          )}

          <button type="submit" className={`btn-primary ${styles.submitBtn}`} disabled={isLoading}>
            {isLoading ? <div className="spinner"></div> : "Create Account"}
          </button>
        </form>

        <div className={styles.footer}>
          Already have an account? <Link href="/login" className={styles.link}>Log in</Link>
        </div>
      </div>
    </div>
  );
}
