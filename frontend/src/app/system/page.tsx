'use client';

import { useEffect, useState, useCallback } from 'react';
import PageShell from '@/components/page-shell';
import {
  getSystemStatus,
  triggerRun,
  adminListUsers,
  adminCreateUser,
  adminResetPassword,
  adminDeleteUser,
} from '@/lib/api';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import type { SystemStatus, CurrentUser } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';

// ── System page ──────────────────────────────────────────────────────────────

export default function SystemPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [admin, setAdmin] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSystemStatus();
      setStatus(data);
    } catch {
      console.error('Failed to load status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setAdmin(isAdmin());
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  async function handleRun() {
    setRunning(true);
    try {
      await triggerRun();
      setTimeout(load, 3000);
      setTimeout(load, 10000);
      setTimeout(load, 30000);
    } catch {
      console.error('Failed to trigger run');
    } finally {
      setRunning(false);
    }
  }

  if (loading && !status) {
    return (
      <PageShell title="System" subtitle="Monitor and control the pipeline">
        <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
          Loading system status...
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title="System" subtitle="Monitor and control the pipeline">
      <div className="flex flex-col gap-6">
        {/* Quick actions */}
        <div className="flex items-center gap-3">
          <Button onClick={handleRun} disabled={running || status?.run.running}>
            {running || status?.run.running ? 'Running...' : 'Fetch News Now'}
          </Button>
          <Button variant="outline" onClick={load}>Refresh</Button>
        </div>

        {/* Status grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <StatusCard title="Database" value={status?.database === 'connected' ? 'Connected' : 'Error'} status={status?.database === 'connected' ? 'ok' : 'error'} />
          <StatusCard title="AI Provider" value={status?.ai.available ? status.ai.provider : 'Unavailable'} status={status?.ai.available ? 'ok' : 'warning'} />
          <StatusCard title="Total Articles" value={status?.articles.total.toLocaleString() ?? '0'} />
          <StatusCard title="Last 24 Hours" value={`${status?.articles.last_24h ?? 0} new`} />
          <StatusCard title="Last 7 Days" value={`${status?.articles.last_7d ?? 0} articles`} />
          <StatusCard title="Sectors Covered" value={`${status?.articles.sectors ?? 0}`} />
          <StatusCard title="RSS Sources" value={`${status?.sources.enabled ?? 0} / ${status?.sources.total ?? 0} active`} />
          <StatusCard title="Users" value={`${status?.users ?? 0}`} />
        </div>

        <Separator />

        {/* Last run info */}
        <section>
          <h2 className="text-sm font-semibold mb-3">Last Pipeline Run</h2>
          <Card size="sm">
            <CardContent className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant={status?.run.running ? 'default' : status?.run.lastError ? 'destructive' : 'secondary'}>
                  {status?.run.running ? 'Running' : status?.run.lastError ? 'Error' : 'Idle'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Last run</span>
                <span className="text-sm">{status?.run.lastRun ? new Date(status.run.lastRun).toLocaleString('en-GB') : 'Never'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Duration</span>
                <span className="text-sm">{status?.run.lastDuration ? `${Math.round(status.run.lastDuration / 1000)}s` : '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Articles added</span>
                <span className="text-sm">{status?.run.articlesAdded ?? 0}</span>
              </div>
              {status?.run.lastError && (
                <div className="mt-1 rounded bg-red-50 px-3 py-2 text-xs text-red-700">{status.run.lastError}</div>
              )}
            </CardContent>
          </Card>
        </section>

        {status?.timestamp && (
          <p className="text-xs text-muted-foreground text-right">
            Last refreshed: {new Date(status.timestamp).toLocaleTimeString('en-GB')}
          </p>
        )}

        {/* Admin-only: User management */}
        {admin && (
          <>
            <Separator />
            <UserManagement />
          </>
        )}
      </div>
    </PageShell>
  );
}

// ── Status Card ──────────────────────────────────────────────────────────────

function StatusCard({ title, value, status }: { title: string; value: string; status?: 'ok' | 'warning' | 'error' }) {
  const dot =
    status === 'ok' ? 'bg-green-500' :
    status === 'warning' ? 'bg-amber-500' :
    status === 'error' ? 'bg-red-500' : 'hidden';

  return (
    <Card size="sm">
      <CardContent className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{title}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{value}</span>
          <div className={`size-2 rounded-full ${dot}`} />
        </div>
      </CardContent>
    </Card>
  );
}

// ── User Management (admin only) ─────────────────────────────────────────────

type ManagedUser = CurrentUser & { last_active?: string; created_at?: string };

function UserManagement() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Create form
  const [newName, setNewName] = useState('');
  const [newDisplay, setNewDisplay] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  // Reset password modal
  const [resetTarget, setResetTarget] = useState<ManagedUser | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetting, setResetting] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const data = await adminListUsers();
      setUsers(data.users as ManagedUser[]);
    } catch {
      console.error('Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError('');
    if (!newName.trim()) { setCreateError('Username is required.'); return; }
    if (!newPassword) { setCreateError('Password is required.'); return; }
    if (newPassword.length < 6) { setCreateError('Password must be at least 6 characters.'); return; }

    setCreating(true);
    try {
      await adminCreateUser({
        name: newName.trim(),
        display_name: newDisplay.trim() || newName.trim(),
        password: newPassword,
        is_admin: newIsAdmin,
      });
      setNewName('');
      setNewDisplay('');
      setNewPassword('');
      setNewIsAdmin(false);
      await loadUsers();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create user.');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(user: ManagedUser) {
    const me = getCurrentUser();
    if (user.id === me?.id) return;
    if (!confirm(`Delete ${user.display_name || user.name}? This cannot be undone.`)) return;
    try {
      await adminDeleteUser(user.id);
      setUsers(prev => prev.filter(u => u.id !== user.id));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete user.');
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetTarget) return;
    setResetError('');
    if (!resetPassword || resetPassword.length < 6) {
      setResetError('Password must be at least 6 characters.');
      return;
    }
    setResetting(true);
    try {
      await adminResetPassword(resetTarget.id, resetPassword);
      setResetTarget(null);
      setResetPassword('');
    } catch (err: unknown) {
      setResetError(err instanceof Error ? err.message : 'Failed to reset password.');
    } finally {
      setResetting(false);
    }
  }

  return (
    <section>
      <h2 className="text-sm font-semibold mb-1">User Management</h2>
      <p className="text-xs text-muted-foreground mb-4">Create and manage team member accounts.</p>

      {/* User list */}
      <div className="flex flex-col gap-2 mb-6">
        {loadingUsers ? (
          <p className="text-sm text-muted-foreground">Loading users...</p>
        ) : users.length === 0 ? (
          <p className="text-sm text-muted-foreground">No users yet.</p>
        ) : (
          users.map(user => (
            <Card key={user.id} size="sm">
              <CardContent className="flex items-center justify-between py-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{user.display_name || user.name}</span>
                    <span className="text-xs text-muted-foreground">@{user.name}</span>
                    {user.is_admin && (
                      <Badge variant="default" className="text-[10px] px-1.5 py-0">Admin</Badge>
                    )}
                  </div>
                  {user.last_active && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Last active: {new Date(user.last_active).toLocaleDateString('en-GB')}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 ml-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => { setResetTarget(user); setResetPassword(''); setResetError(''); }}
                  >
                    Reset pw
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
                    onClick={() => handleDelete(user)}
                  >
                    ×
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create user form */}
      <h3 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Add new user</h3>
      <form onSubmit={handleCreate} className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Input
            placeholder="Username (login name)"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="flex-1"
          />
          <Input
            placeholder="Display name (optional)"
            value={newDisplay}
            onChange={e => setNewDisplay(e.target.value)}
            className="flex-1"
          />
        </div>
        <div className="flex gap-2 items-center">
          <Input
            type="password"
            placeholder="Password (min 6 chars)"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            className="flex-1"
          />
          <label className="flex items-center gap-1.5 text-sm whitespace-nowrap cursor-pointer select-none">
            <input
              type="checkbox"
              checked={newIsAdmin}
              onChange={e => setNewIsAdmin(e.target.checked)}
              className="w-4 h-4"
            />
            Admin
          </label>
          <Button type="submit" size="sm" disabled={creating}>
            {creating ? 'Creating...' : 'Add user'}
          </Button>
        </div>
        {createError && <p className="text-sm text-red-500">{createError}</p>}
      </form>

      {/* Reset password modal */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <Card className="w-full max-w-sm mx-4">
            <CardContent className="flex flex-col gap-4 pt-6">
              <h3 className="font-semibold">Reset password for {resetTarget.display_name || resetTarget.name}</h3>
              <form onSubmit={handleResetPassword} className="flex flex-col gap-3">
                <Input
                  type="password"
                  placeholder="New password (min 6 chars)"
                  value={resetPassword}
                  onChange={e => setResetPassword(e.target.value)}
                  autoFocus
                />
                {resetError && <p className="text-sm text-red-500">{resetError}</p>}
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setResetTarget(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1" disabled={resetting}>
                    {resetting ? 'Saving...' : 'Set password'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </section>
  );
}
