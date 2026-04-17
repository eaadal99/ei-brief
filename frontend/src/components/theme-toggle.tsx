'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { useShortcut } from './keyboard-shortcuts';

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useShortcut('t', () => {
    setTheme(theme === 'paper' ? 'ink' : 'paper');
  });

  const isPaper = mounted && theme === 'paper';

  if (compact) {
    return (
      <button
        onClick={() => setTheme(isPaper ? 'ink' : 'paper')}
        title={isPaper ? 'Switch to ink mode' : 'Switch to paper mode'}
        className="shrink-0 text-white/30 hover:text-white/90 transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          {isPaper ? (
            /* Sun */
            <>
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
            </>
          ) : (
            /* Moon */
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          )}
        </svg>
      </button>
    );
  }

  return (
    <button
      onClick={() => setTheme(isPaper ? 'ink' : 'paper')}
      className="flex items-center gap-2 px-3 py-2 rounded-md text-xs text-white/60 hover:text-white/90 hover:bg-white/[0.04] transition-colors"
    >
      <span className="relative inline-flex items-center w-8 h-4 bg-white/10 rounded-full">
        <span
          className={`absolute top-0.5 w-3 h-3 rounded-full bg-white/80 transition-transform ${
            isPaper ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </span>
      <span className="eyebrow">{isPaper ? 'Paper' : 'Ink'}</span>
    </button>
  );
}
