export type ThemePreference = 'light' | 'dark' | 'system';
export const THEME_KEY = 'eduhelp-theme';

export function parseTheme(value: string | null): ThemePreference {
  return value === 'light' || value === 'dark' ? value : 'system';
}

export function resolveTheme(preference: ThemePreference, systemDark: boolean) {
  return preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;
}

// Runs before first paint; storage may be blocked in private/embedded browsers.
export const themeScript = `(function(){var p='system';try{var s=localStorage.getItem('${THEME_KEY}');if(s==='light'||s==='dark')p=s;}catch(e){}var d=p==='system'?window.matchMedia('(prefers-color-scheme: dark)').matches:p==='dark';document.documentElement.dataset.theme=d?'dark':'light';document.documentElement.style.colorScheme=d?'dark':'light';})();`;
