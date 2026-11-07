import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === 'dark';
  const label = dark ? 'Activar modo claro' : 'Activar modo oscuro';
  return <button type="button" className={`theme-toggle ${className}`} onClick={toggleTheme}
    aria-label={label} title={label} aria-pressed={dark}>
    {dark ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
  </button>;
}
