"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { parseTheme, resolveTheme, THEME_KEY, type ThemePreference } from '@/lib/theme';

const ThemeContext = createContext<{
  preference: ThemePreference;
  setPreference: (value: ThemePreference) => void;
}>({ preference: 'system', setPreference: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    let current: ThemePreference = 'system';
    try { current = parseTheme(localStorage.getItem(THEME_KEY)); } catch { /* Use system preference. */ }
    const apply = () => {
      const theme = resolveTheme(current, media.matches);
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme;
      setPreferenceState(current);
    };
    const change = (event: Event) => {
      current = (event as CustomEvent<ThemePreference>).detail;
      apply();
    };
    const sync = (event: StorageEvent) => {
      if (event.key === THEME_KEY || event.key === null) {
        current = parseTheme(event.newValue);
        apply();
      }
    };
    apply();
    media.addEventListener('change', apply);
    window.addEventListener('storage', sync);
    window.addEventListener('eduhelp-theme-change', change);
    return () => {
      media.removeEventListener('change', apply);
      window.removeEventListener('storage', sync);
      window.removeEventListener('eduhelp-theme-change', change);
    };
  }, []);

  function setPreference(value: ThemePreference) {
    try { localStorage.setItem(THEME_KEY, value); } catch { /* Keep the in-memory selection. */ }
    window.dispatchEvent(new CustomEvent('eduhelp-theme-change', { detail: value }));
  }

  return <ThemeContext.Provider value={{ preference, setPreference }}>{children}</ThemeContext.Provider>;
}

export function ThemeSwitcher() {
  const { preference, setPreference } = useContext(ThemeContext);
  return (
    <label className="theme-switcher">
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg>
      <span className="sr-only">Color theme</span>
      <select value={preference} onChange={event => setPreference(parseTheme(event.target.value))}>
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
  );
}
