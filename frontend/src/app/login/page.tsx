'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('Please enter your username and password.');
      return;
    }
    setLoading(true);
    try {
      const result = await login(username.trim(), password);
      if (result.success) {
        router.replace('/');
      } else {
        setError(result.error || 'Invalid username or password.');
      }
    } catch {
      setError('Unable to connect. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-background">

      {/* Left panel — brand + context (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-[42%] bg-[#111110] flex-col justify-between p-10 relative overflow-hidden">
        {/* Subtle background texture */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(circle at 25% 25%, white 1px, transparent 0), radial-gradient(circle at 75% 75%, white 1px, transparent 0)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#C9B99A]/20 flex items-center justify-center">
            <span className="text-[#C9B99A] text-sm font-bold">E</span>
          </div>
          <div>
            <div className="text-white text-sm font-semibold leading-none">E&amp;I Brief</div>
            <div className="text-[#C9B99A]/60 text-[10px] mt-0.5 leading-none">Energy Intelligence</div>
          </div>
        </div>

        {/* Hero copy */}
        <div className="relative space-y-6">
          <blockquote className="text-white/90 text-2xl font-light leading-relaxed tracking-tight">
            &ldquo;Stay ahead of the energy sector — every morning.&rdquo;
          </blockquote>
          <div className="space-y-3">
            {[
              'Personalised feed across 13 energy sectors',
              'AI-powered daily briefings by sector',
              'Curated from 100+ industry sources',
            ].map((item) => (
              <div key={item} className="flex items-center gap-2.5 text-white/50 text-sm">
                <span className="w-1 h-1 rounded-full bg-[#C9B99A]/60 shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="relative text-white/20 text-xs">
          E&amp;I Brief — Energy &amp; Infrastructure Intelligence
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[360px] space-y-8">

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center justify-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-foreground/10 flex items-center justify-center">
              <span className="text-foreground text-sm font-bold">E</span>
            </div>
            <div>
              <div className="text-foreground text-sm font-semibold leading-none">E&amp;I Brief</div>
              <div className="text-muted-foreground text-[10px] mt-0.5 leading-none">Energy Intelligence</div>
            </div>
          </div>

          {/* Form header */}
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Welcome back</h1>
            <p className="text-sm text-muted-foreground">Sign in to your account to continue.</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-2">
              <label htmlFor="username" className="text-xs font-medium text-foreground/70">
                Username
              </label>
              <Input
                id="username"
                placeholder="your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                autoComplete="username"
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-xs font-medium text-foreground/70">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="h-10"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-10 mt-2"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
