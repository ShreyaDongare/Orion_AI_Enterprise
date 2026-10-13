import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useThemeStore } from '../store/useThemeStore';

export default function ThemeToggle({ compact = false }) {
  const { resolvedTheme, toggleTheme } = useThemeStore();
  const dark = resolvedTheme === 'dark';
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${dark ? 'light' : 'dark'} mode`}
      title={`Switch to ${dark ? 'light' : 'dark'} mode`}
      className={`theme-toggle inline-flex items-center justify-center gap-2 rounded-xl border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${compact ? 'h-9 w-9' : 'px-3 py-2'}`}
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {!compact && <span className="text-xs font-semibold">{dark ? 'Light mode' : 'Dark mode'}</span>}
    </button>
  );
}
