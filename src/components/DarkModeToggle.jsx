import React, { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { cn } from '../lib/utils';

export default function DarkModeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check for stored preference or default to system preference
    const stored = localStorage.getItem('academix-dark-mode');
    if (stored) {
      setIsDark(stored === 'true');
    } else {
      setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
  }, []);

  useEffect(() => {
    // Apply or remove the dark mode class based on state
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark-mode');
    } else {
      root.classList.remove('dark-mode');
    }
    // Store preference
    localStorage.setItem('academix-dark-mode', isDark.toString());
  }, [isDark]);

  const toggle = () => setIsDark(!isDark);

  return (
    <button
      onClick={toggle}
      className={cn(
        'group relative grid h-10 w-10 place-items-center',
        'border-2 border-ink bg-paper transition-[transform,box-shadow,background-color]',
        'hover:-translate-y-px hover:shadow-[4px_4px_0_#0f2942] hover:bg-[#fff7d6]',
        'active:translate-x-0.5 active:translate-y-0.5 active:shadow-none'
      )}
      title={`${isDark ? 'Switch to light mode' : 'Switch to dark mode'}`}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <Moon className="h-[18px] w-[18px] text-ink" strokeWidth={2} />
      ) : (
        <Sun className="h-[18px] w-[18px] text-ink" strokeWidth={2} />
      )}
      {/* Tooltip */}
      <div className="absolute left-full ml-2 hidden rounded border-2 border-ink bg-paper px-2 py-1 text-[12px] whitespace-nowrap shadow-[3px_3px_0_#0f2942] group-hover:block">
        {isDark ? 'Light mode' : 'Dark mode'}
      </div>
    </button>
  );
}