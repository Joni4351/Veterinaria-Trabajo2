import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();
export const THEME_STORAGE_KEY = 'vet_theme';

export function getInitialTheme() {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch { /* Private browsing can disable storage. */ }
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    try { localStorage.setItem(THEME_STORAGE_KEY, theme); } catch { /* Keep the switch usable without storage. */ }
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0b151b' : '#f8fafc');
  }, [theme]);
  return <ThemeContext.Provider value={{ theme, toggleTheme: () => setTheme(value => value === 'dark' ? 'light' : 'dark') }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
