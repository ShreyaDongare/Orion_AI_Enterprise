import { create } from 'zustand';

const STORAGE_KEY = 'orion-theme';

function applyTheme(theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.classList.toggle('light', theme === 'light');
  root.setAttribute('data-theme', theme);
  root.style.colorScheme = theme;
}

function readTheme() {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // Storage can be unavailable in private/restricted browser contexts.
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export const useThemeStore = create((set, get) => ({
  theme: 'light',
  resolvedTheme: 'light',
  setTheme: (theme) => {
    const next = theme === 'dark' ? 'dark' : 'light';
    applyTheme(next);
    try { window.localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore storage errors */ }
    set({ theme: next, resolvedTheme: next });
  },
  toggleTheme: () => get().setTheme(get().resolvedTheme === 'dark' ? 'light' : 'dark'),
  initTheme: () => {
    const theme = readTheme();
    applyTheme(theme);
    set({ theme, resolvedTheme: theme });
  },
}));
