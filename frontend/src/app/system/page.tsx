'use client';

import { useEffect, useState, useCallback } from 'react';
import PageShell from '@/components/page-shell';
import { getSystemStatus, triggerRun } from '@/lib/api';
import type { SystemStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default function SystemPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

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
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  async function handleRun() {
    setRunning(true);
    try {
      await triggerRun();
      // Poll for completion
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
          <Button
            onClick={handleRun}
            disabled={running || status?.run.running}
          >
            {running || status?.run.running ? 'Running...' : 'Fetch News Now'}
          </Button>
          <Button variant="outline" onClick={load}>
            Refresh
          </Button>
        </div>

        {/* Status grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <StatusCard
            title="Database"
            value={status?.database === 'connected' ? 'Connected' : 'Error'}
            status={status?.database === 'connected' ? 'ok' : 'error'}
          />
          <StatusCard
            title="AI Provider"
            value={status?.ai.available ? status.ai.provider : 'Unavailable'}
            status={status?.ai.available ? 'ok' : 'warning'}
          />
          <StatusCard
            title="Total Articles"
            value={status?.articles.total.toLocaleString() ?? '0'}
          />
          <StatusCard
            title="Last 24 Hours"
            value={`${status?.articles.last_24h ?? 0} new`}
          />
          <StatusCard
            title="Last 7 Days"
            value={`${status?.articles.last_7d ?? 0} articles`}
          />
          <StatusCard
            title="Sectors Covered"
            value={`${status?.articles.sectors ?? 0}`}
          />
          <StatusCard
            title="RSS Sources"
            value={`${status?.sources.enabled ?? 0} / ${status?.sources.total ?? 0} active`}
          />
          <StatusCard
            title="Users"
            value={`${status?.users ?? 0}`}
          />
        </div>

        <Separator />

        {/* Last run info */}
        <section>
          <h2 className="text-sm font-semibold mb-3">Last Pipeline Run</h2>
          <Card size="sm">
            <CardContent className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge
                  variant={
                    status?.run.running
                      ? 'default'
                      : status?.run.lastError
                        ? 'destructive'
                        : 'secondary'
                  }
                >
                  {status?.run.running
                    ? 'Running'
                    : status?.run.lastError
                      ? 'Error'
                      : 'Idle'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Last run</span>
                <span className="text-sm">
                  {status?.run.lastRun
                    ? new Date(status.run.lastRun).toLocaleString('en-GB')
                    : 'Never'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Duration</span>
                <span className="text-sm">
                  {status?.run.lastDuration
                    ? `${Math.round(status.run.lastDuration / 1000)}s`
                    : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Articles added</span>
                <span className="text-sm">{status?.run.articlesAdded ?? 0}</span>
              </div>
              {status?.run.lastError && (
                <div className="mt-1 rounded bg-red-50 px-3 py-2 text-xs text-red-700">
                  {status.run.lastError}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Timestamp */}
        {status?.timestamp && (
          <p className="text-xs text-muted-foreground text-right">
            Last refreshed: {new Date(status.timestamp).toLocaleTimeString('en-GB')}
          </p>
        )}
      </div>
    </PageShell>
  );
}

// ── Status Card ─────────────────────────────────────────────────────────────

function StatusCard({
  title,
  value,
  status,
}: {
  title: string;
  value: string;
  status?: 'ok' | 'warning' | 'error';
}) {
  const dot =
    status === 'ok'
      ? 'bg-green-500'
      : status === 'warning'
        ? 'bg-amber-500'
        : status === 'error'
          ? 'bg-red-500'
          : 'hidden';

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
