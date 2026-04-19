'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/auth';
import { getAllArticles } from '@/lib/api';
import type { Article } from '@/lib/types';
import { SectorDot } from '@/components/sector-dot';
import { shortRelativeTime } from '@/lib/reading-time';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [teaser, setTeaser] = useState<Article[]>([]);

  // Pull a handful of live articles to render behind the cover — the app
  // advertises itself through its own content the moment you land.
  useEffect(() => {
    getAllArticles({ limit: 6 })
      .then((d) => setTeaser(d.articles))
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('Enter your username and password.');
      return;
    }
    setLoading(true);
    try {
      const result = await login(username.trim(), password);
      if (result.success) router.replace('/');
      else setError(result.error || 'Invalid username or password.');
    } catch {
      setError('Unable to connect. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Left: editorial cover */}
      <aside className="hidden lg:flex flex-col justify-between relative overflow-hidden w-[58%] bg-sidebar text-sidebar-foreground p-10 border-r border-sidebar-border">
        {/* Logo */}
        <div className="relative flex items-center gap-3 z-10">
          <div className="w-9 h-9 rounded-md brand-bg flex items-center justify-center">
            <span className="text-sidebar font-bold text-base">E</span>
          </div>
          <div>
            <p className="display-serif text-base font-semibold leading-none">E&amp;I Brief</p>
            <p className="eyebrow text-sidebar-foreground/55 mt-1 leading-none">Energy Intelligence</p>
          </div>
        </div>

        {/* Pull quote */}
        <div className="relative z-10 max-w-xl">
          <span className="eyebrow text-sidebar-foreground/50 block mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full brand-bg animate-pulse-dot" />
            Live across {teaser.length > 0 ? 'the wire' : 'energy markets'}
          </span>
          <h1 className="display-serif text-[44px] xl:text-[56px] font-semibold leading-[1.02] text-balance">
            Energy moves fast.
            <br />
            <span className="brand-text italic">You shouldn&rsquo;t.</span>
          </h1>
          <p className="mt-6 text-sidebar-foreground/70 text-[15px] leading-relaxed max-w-md">
            A terminal for energy markets. Personalised feed, sector intelligence, and a daily AI brief — distilled from every source that matters.
          </p>
        </div>

        {/* Live teaser */}
        <div className="relative z-10">
          <p className="eyebrow text-sidebar-foreground/45 mb-3">On the wire right now</p>
          <ul className="space-y-2.5">
            {teaser.slice(0, 4).map((a) => (
              <li key={a.id} className="flex items-center gap-3 text-sm text-sidebar-foreground/75">
                <SectorDot sector={a.sector} />
                <span className="flex-1 truncate">{a.headline}</span>
                <span className="font-mono text-[10px] text-sidebar-foreground/45 shrink-0">
                  {shortRelativeTime(a.published_at)}
                </span>
              </li>
            ))}
            {teaser.length === 0 && (
              <li className="text-sm text-sidebar-foreground/45">Connecting to the wire…</li>
            )}
          </ul>
        </div>

        {/* Ambient gradient */}
        <div
          aria-hidden
          className="absolute -right-40 -top-40 w-[480px] h-[480px] rounded-full blur-3xl pointer-events-none opacity-[0.12]"
          style={{ background: 'var(--brand)' }}
        />
        <div
          aria-hidden
          className="absolute -left-20 -bottom-40 w-[360px] h-[360px] rounded-full blur-3xl pointer-events-none opacity-[0.07]"
          style={{ background: 'var(--brand)' }}
        />
      </aside>

      {/* Right: form */}
      <section className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
        <div className="w-full max-w-[380px] space-y-6 sm:space-y-10">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2.5 justify-center">
            <div className="w-8 h-8 rounded-md brand-bg flex items-center justify-center">
              <span className="text-background font-bold text-sm">E</span>
            </div>
            <div>
              <p className="display-serif text-[15px] font-semibold leading-none">E&amp;I Brief</p>
              <p className="eyebrow text-muted-foreground mt-1 leading-none">Energy Intelligence</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="eyebrow text-muted-foreground">Sign in</p>
            <h2 className="display-serif text-3xl font-semibold leading-tight">
              Welcome back.
            </h2>
            <p className="text-sm text-muted-foreground">Your morning brief is waiting.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Field
              id="username"
              label="Username"
              value={username}
              onChange={setUsername}
              autoFocus
              autoComplete="username"
            />
            <Field
              id="password"
              type="password"
              label="Password"
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
            />

            {error && (
              <div className="flex items-center gap-2 text-[13px] text-rose-400">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-md bg-foreground text-background text-sm font-semibold hover:bg-foreground/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Signing in
                </>
              ) : (
                <>
                  Sign in
                  <span aria-hidden>→</span>
                </>
              )}
            </button>
          </form>

          <p className="eyebrow text-muted-foreground/70 text-center">
            Curated for energy &amp; infrastructure counsel.
          </p>
        </div>
      </section>
    </div>
  );
}

function Field({
  id, label, value, onChange, type = 'text', autoFocus, autoComplete,
}: {
  id: string; label: string; value: string; onChange: (v: string) => void;
  type?: string; autoFocus?: boolean; autoComplete?: string;
}) {
  return (
    <label htmlFor={id} className="block group">
      <span className="eyebrow text-muted-foreground group-focus-within:text-foreground transition-colors">
        {label}
      </span>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        className="mt-1.5 block w-full bg-transparent border-0 border-b border-border py-2 text-sm text-foreground placeholder-muted-foreground/50 outline-none focus:border-ring transition-colors"
      />
    </label>
  );
}
