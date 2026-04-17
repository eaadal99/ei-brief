'use client';

import { useEffect } from 'react';

type Handler = (e: KeyboardEvent) => void;

const listeners: Record<string, Set<Handler>> = {};

/**
 * Register a keyboard handler for a specific key.
 * Keys are matched case-insensitively against `e.key`.
 * Handlers are skipped automatically when focus is inside an input, textarea, or contentEditable element.
 */
export function onKey(key: string, handler: Handler): () => void {
  const k = key.toLowerCase();
  if (!listeners[k]) listeners[k] = new Set();
  listeners[k].add(handler);
  return () => {
    listeners[k]?.delete(handler);
  };
}

export function useShortcut(key: string, handler: Handler, deps: unknown[] = []) {
  useEffect(() => {
    const off = onKey(key, handler);
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return false;
}

/**
 * Mounted once at the root. Listens globally and dispatches key events
 * to any registered handlers. Skips when typing in editable fields.
 */
export default function KeyboardShortcutsRoot() {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (isEditable(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      const handlers = listeners[k];
      if (handlers && handlers.size > 0) {
        handlers.forEach(h => h(e));
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return null;
}
