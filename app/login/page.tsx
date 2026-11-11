"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import styles from "../auth.module.css";
import AuthShell from "@/components/AuthShell";

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
  const formRef = useRef<HTMLFormElement>(null);

  const clearCredentials = useCallback(() => {
    setFormData({ email: "", password: "" });
    // Also clear values restored directly by the browser, outside React state.
    formRef.current?.querySelectorAll<HTMLInputElement>("input").forEach(input => {
      input.value = "";
    });
  }, []);

  useEffect(() => {
    // Clear browser-restored values on mount and when returning via Back/Forward.
    formRef.current?.reset();
    window.addEventListener("pageshow", clearCredentials);
    window.addEventListener("pagehide", clearCredentials);
    return () => {
      window.removeEventListener("pageshow", clearCredentials);
      window.removeEventListener("pagehide", clearCredentials);
    };
  }, [clearCredentials]);

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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      clearCredentials();
      setIsLoading(false);
    }
  };

  return (
    <AuthShell>
        <div className={styles.header}>
          <h1 className={styles.title}>Welcome Back</h1>
          <p className={styles.subtitle}>Sign in to your EduHelp account</p>
        </div>

        {successMsg && (
          <div role="status" style={{ color: "var(--success)", background: "rgba(16, 185, 129, 0.1)", padding: "0.75rem", borderRadius: "0.5rem", border: "1px solid rgba(16, 185, 129, 0.2)", fontSize: "0.85rem" }}>
            {successMsg}
          </div>
        )}
        
        {error && <div role="alert" className={styles.error}>{error}</div>}

        <form ref={formRef} onSubmit={handleSubmit} className={styles.form} autoComplete="off">
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="email">Email</label>
            <input type="email" id="email" name="email" required value={formData.email} onChange={handleChange} placeholder="john@example.com" autoComplete="on" />
          </div>
          
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="password">Password</label>
            <input type="password" id="password" name="password" required value={formData.password} onChange={handleChange} placeholder="••••••••" autoComplete="current-password" />
          </div>

          <button type="submit" className={`btn-primary ${styles.submitBtn}`} disabled={isLoading} aria-busy={isLoading}>
            {isLoading ? <>Signing in... <span className="spinner" aria-hidden="true" /></> : "Sign In"}
          </button>
        </form>

        <div className={styles.footer}>
          Don&apos;t have an account? <Link href="/register" className={styles.link}>Sign up</Link>
        </div>
    </AuthShell>
  );
}

export default function Login() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><div className="spinner"></div></div>}>
      <LoginContent />
    </Suspense>
  );
}
