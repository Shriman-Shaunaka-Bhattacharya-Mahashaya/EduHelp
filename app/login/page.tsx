"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import styles from "../auth.module.css";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get("registered") === "true") {
      setSuccessMsg("Registration successful! Please log in.");
    }
  }, [searchParams]);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setIsLoading(true);

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email: formData.email,
        password: formData.password,
      });

      if (res?.error) {
        throw new Error(res.error);
      }

      router.push("/dashboard");
      router.refresh();
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
          <h1 className={styles.title}>Welcome Back</h1>
          <p className={styles.subtitle}>Sign in to your ExamPortal account</p>
        </div>

        {successMsg && (
          <div style={{ color: "var(--success)", background: "rgba(16, 185, 129, 0.1)", padding: "0.75rem", borderRadius: "0.5rem", border: "1px solid rgba(16, 185, 129, 0.2)", fontSize: "0.85rem" }}>
            {successMsg}
          </div>
        )}
        
        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form} autoComplete="off">
          <div className={styles.formGroup}>
            <label className={styles.label}>Email</label>
            <input type="email" name="email" required value={formData.email} onChange={handleChange} placeholder="john@example.com" autoComplete="off" />
          </div>
          
          <div className={styles.formGroup}>
            <label className={styles.label}>Password</label>
            <input type="password" name="password" required value={formData.password} onChange={handleChange} placeholder="••••••••" autoComplete="new-password" />
          </div>

          <button type="submit" className={`btn-primary ${styles.submitBtn}`} disabled={isLoading}>
            {isLoading ? <div className="spinner"></div> : "Sign In"}
          </button>
        </form>

        <div className={styles.footer}>
          Don't have an account? <Link href="/register" className={styles.link}>Sign up</Link>
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><div className="spinner"></div></div>}>
      <LoginContent />
    </Suspense>
  );
}
