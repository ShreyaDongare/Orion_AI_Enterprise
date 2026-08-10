import { create } from 'zustand';

function applyLightMode() {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.add('light');
  root.classList.remove('dark');
  root.setAttribute('data-theme', 'light');
  root.style.colorScheme = 'light';
}

export const useThemeStore = create((set) => ({
  theme: 'light',
  resolvedTheme: 'light',

  setTheme: () => {
    applyLightMode();
    set({ theme: 'light', resolvedTheme: 'light' });
  },

  toggleTheme: () => {
    applyLightMode();
    set({ theme: 'light', resolvedTheme: 'light' });
  },

  initTheme: () => {
    applyLightMode();
    set({ theme: 'light', resolvedTheme: 'light' });
  }
}));


