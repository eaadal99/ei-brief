'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  verifyTeamPassword,
  listUsers,
  createUser,
  setCurrentUser,
  applyPersona,
} from '@/lib/auth';
import type { CurrentUser } from '@/lib/types';
import { PERSONAS } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ── Lock icon SVG ──────────────────────────────────────────────────────────

function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

// ── Login page ─────────────────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter();

  const [step, setStep] = useState<'password' | 'user'>('password');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // User picker state
  const [users, setUsers] = useState<CurrentUser[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newPersona, setNewPersona] = useState('all');
  const [createError, setCreateError] = useState('');
  const [personaWarning, setPersonaWarning] = useState('');

  // On mount, probe open mode
  useEffect(() => {
    let cancelled = false;
    async function probe() {
      try {
        const result = await verifyTeamPassword('');
        if (!cancelled && result.success && result.mode === 'open') {
          setStep('user');
        }
      } catch {
        // ignore — stay on password step
      }
    }
    probe();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load users when entering step 2
  useEffect(() => {
    if (step !== 'user') return;
    let cancelled = false;
    async function load() {
      const data = await listUsers();
      if (!cancelled) setUsers(data);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [step]);

  // ── Password submit ────────────────────────────────────────────────────

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await verifyTeamPassword(password);
      if (result.success) {
        setStep('user');
      } else {
        setError('Incorrect password. Please try again.');
      }
    } catch {
      setError('Unable to verify password. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── Select existing user ──────────────────────────────────────────────

  function handleSelectUser(user: CurrentUser) {
    setCurrentUser(user);
    router.replace('/');
  }

  // ── Create new user ───────────────────────────────────────────────────

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setCreateError('');
    setPersonaWarning('');

    const trimmedName = newName.trim();
    if (!trimmedName) {
      setCreateError('Name is required.');
      return;
    }

    setLoading(true);
    try {
      const user = await createUser({
        name: trimmedName,
        display_name: newDisplayName.trim() || trimmedName,
        sector_focus: newPersona !== 'all' && newPersona !== 'custom' ? newPersona : undefined,
      });

      setCurrentUser(user);

      try {
        await applyPersona(newPersona, user);
      } catch {
        setPersonaWarning('Preferences could not be applied, but your account was created.');
      }

      router.replace('/');
    } catch {
      setCreateError('Failed to create user. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-6 pt-2">
          {/* Header */}
          <div className="flex flex-col items-center gap-1">
            <h1 className="text-2xl font-bold tracking-tight">E&I Brief</h1>
            <p className="text-sm font-medium text-[#C9B99A]">
              Energy Intelligence
            </p>
          </div>

          {/* ── Step 1: Password ──────────────────────────────────────── */}
          {step === 'password' && (
            <form
              onSubmit={handlePasswordSubmit}
              className="flex w-full flex-col items-center gap-4"
            >
              <LockIcon className="size-10 text-muted-foreground" />

              <Input
                type="password"
                placeholder="Team password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                className="w-full"
              />

              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Verifying...' : 'Continue'}
              </Button>
            </form>
          )}

          {/* ── Step 2: User picker ──────────────────────────────────── */}
          {step === 'user' && !showCreate && (
            <div className="flex w-full flex-col gap-3">
              <p className="text-center text-sm text-muted-foreground">
                Who&apos;s using the brief today?
              </p>

              {users.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleSelectUser(user)}
                  className="w-full rounded-lg border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-accent"
                >
                  <p className="font-medium">
                    {user.display_name || user.name}
                  </p>
                  {user.sector_focus && (
                    <p className="text-xs text-muted-foreground">
                      {user.sector_focus}
                    </p>
                  )}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="w-full rounded-lg border-2 border-dashed border-muted-foreground/30 px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-muted-foreground/60 hover:text-foreground"
              >
                + Add new person
              </button>
            </div>
          )}

          {/* ── Create user form ─────────────────────────────────────── */}
          {step === 'user' && showCreate && (
            <form
              onSubmit={handleCreateUser}
              className="flex w-full flex-col gap-3"
            >
              <p className="text-center text-sm text-muted-foreground">
                Create your profile
              </p>

              <Input
                placeholder="Name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
              />

              <Input
                placeholder="Display name (optional)"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
              />

              <Select value={newPersona} onValueChange={(v: string | null) => v && setNewPersona(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a persona" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PERSONAS).map(([key, persona]) => (
                    <SelectItem key={key} value={key}>
                      {persona.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {createError && (
                <p className="text-sm text-red-500">{createError}</p>
              )}

              {personaWarning && (
                <p className="text-sm text-amber-500">{personaWarning}</p>
              )}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowCreate(false)}
                >
                  Back
                </Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? 'Creating...' : 'Create & continue'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
