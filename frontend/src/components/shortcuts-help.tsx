'use client';

import { useEffect, useState } from 'react';
import { useShortcut } from './keyboard-shortcuts';

const shortcuts: Array<{ keys: string; label: string }> = [
  { keys: '⌘K', label: 'Open command palette' },
  { keys: 'J / K', label: 'Next / previous article' },
  { keys: 'S', label: 'Save article' },
  { keys: 'R', label: 'Mark relevant' },
  { keys: 'X', label: 'Skip / not relevant' },
  { keys: '/', label: 'Focus search' },
  { keys: 'G F', label: 'Go to Feed' },
  { keys: 'G A', label: 'Go to All News' },
  { keys: 'G D', label: 'Go to Digest' },
  { keys: 'G S', label: 'Go to Saved' },
  { keys: 'T', label: 'Toggle theme' },
  { keys: '?', label: 'This help panel' },
];

export default function ShortcutsHelp() {
  const [open, setOpen] = useState(false);

  useShortcut('?', (e) => {
    e.preventDefault();
    setOpen((v) => !v);
  });

  useEffect(() => {
    if (!open) return;
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl border border-border bg-card shadow-2xl overflow-hidden animate-fade-up"
      >
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <p className="eyebrow text-muted-foreground">Reference</p>
            <h2 className="display-serif text-xl font-semibold mt-1">Keyboard</h2>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            esc
          </button>
        </div>
        <ul className="p-2">
          {shortcuts.map((s) => (
            <li key={s.keys} className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted/50">
              <span className="text-sm text-foreground">{s.label}</span>
              <kbd className="ml-4 inline-flex items-center gap-1 px-2 py-0.5 rounded border border-border bg-muted/60 font-mono text-[11px] text-muted-foreground">
                {s.keys}
              </kbd>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
