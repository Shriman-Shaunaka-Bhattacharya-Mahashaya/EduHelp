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
  const [editableFields, setEditableFields] = useState({ email: false, password: false });

  const clearUntouchedFields = useCallback(() => {
    // Password managers can fill the DOM after hydration without a React change.
    formRef.current?.querySelectorAll<HTMLInputElement>("input[readonly]").forEach(input => {
      input.value = "";
      input.defaultValue = "";
    });
  }, []);

  const clearCredentials = useCallback(() => {
    setFormData({ email: "", password: "" });
    setEditableFields({ email: false, password: false });
    // Also clear values restored directly by the browser, outside React state.
    formRef.current?.querySelectorAll<HTMLInputElement>("input").forEach(input => {
      input.value = "";
      input.defaultValue = "";
      input.readOnly = true;
    });
  }, []);

  useEffect(() => {
    // Clear browser-restored values on mount and when returning via Back/Forward.
    clearUntouchedFields();
    // A one-time reset misses autofill that arrives later. Never scrub fields
    // the person has already focused: their typing and paste must be preserved.
    const autofillCheck = window.setInterval(clearUntouchedFields, 250);
    window.addEventListener("pageshow", clearCredentials);
    window.addEventListener("pagehide", clearCredentials);
    window.addEventListener("focus", clearUntouchedFields);
    return () => {
      window.clearInterval(autofillCheck);
      window.removeEventListener("pageshow", clearCredentials);
      window.removeEventListener("pagehide", clearCredentials);
      window.removeEventListener("focus", clearUntouchedFields);
    };
  }, [clearCredentials, clearUntouchedFields]);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    if (!input.readOnly) return;
    const field = input.name as "email" | "password";
    // Discard any saved value before this field becomes editable.
    input.value = "";
    input.defaultValue = "";
    setFormData(previous => ({ ...previous, [field]: "" }));
    setEditableFields(previous => ({ ...previous, [field]: true }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.currentTarget.readOnly) {
      e.currentTarget.value = "";
      return;
    }
    const { name, value } = e.currentTarget;
    setFormData(previous => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    if (!editableFields.email || !editableFields.password || !formData.email || !formData.password) {
      clearCredentials();
      setError("Enter your email and password to sign in.");
      return;
    }
    setIsLoading(true);

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email: formData.email,
        password: formData.password,
      });

      if (!res?.ok || res.error) {
        throw new Error(res?.error || "Unable to sign in. Please try again.");
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
            <input type="email" id="email" name="email" required readOnly={!editableFields.email} onFocus={handleFocus} value={formData.email} onChange={handleChange} placeholder="john@example.com" autoComplete="off" />
          </div>
          
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="password">Password</label>
            <input type="password" id="password" name="password" required readOnly={!editableFields.password} onFocus={handleFocus} value={formData.password} onChange={handleChange} placeholder="••••••••" autoComplete="new-password" />
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
