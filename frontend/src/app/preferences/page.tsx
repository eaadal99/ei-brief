'use client';

import { useEffect, useState, useCallback } from 'react';
import PageShell from '@/components/page-shell';
import {
  getPreferences,
  updatePreference,
  getSources,
  addSource,
  deleteSource,
  updateSource,
} from '@/lib/api';
import type { RssSource } from '@/lib/types';
import { SECTORS, GEOGRAPHIES } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

export default function PreferencesPage() {
  // ── State ─────────────────────────────────────────────────────────────────
  const [sectorsIncluded, setSectorsIncluded] = useState<string[]>([]);
  const [geosIncluded, setGeosIncluded] = useState<string[]>([]);
  const [keywordsInclude, setKeywordsInclude] = useState<string[]>([]);
  const [keywordsExclude, setKeywordsExclude] = useState<string[]>([]);
  const [matchStrictness, setMatchStrictness] = useState('loose');
  const [sources, setSources] = useState<RssSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // New keyword / source inputs
  const [newInclude, setNewInclude] = useState('');
  const [newExclude, setNewExclude] = useState('');
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [newSourceSector, setNewSourceSector] = useState('general');

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [prefsData, sourcesData] = await Promise.all([
        getPreferences(),
        getSources(),
      ]);
      const p = prefsData.preferences;
      setSectorsIncluded((p.sectors_included as string[]) || []);
      setGeosIncluded((p.geographies_included as string[]) || []);
      setKeywordsInclude((p.keywords_include as string[]) || []);
      setKeywordsExclude((p.keywords_exclude as string[]) || []);
      setMatchStrictness((p.match_strictness as string) || 'loose');
      setSources(sourcesData.sources);
    } catch {
      console.error('Failed to load preferences');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ── Save preferences ──────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      await Promise.all([
        updatePreference('sectors_included', sectorsIncluded),
        updatePreference('geographies_included', geosIncluded),
        updatePreference('keywords_include', keywordsInclude),
        updatePreference('keywords_exclude', keywordsExclude),
        updatePreference('match_strictness', matchStrictness),
      ]);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      console.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  }

  // ── Toggle helpers ────────────────────────────────────────────────────────
  function toggleSector(key: string) {
    setSectorsIncluded((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]
    );
  }

  function toggleGeo(geo: string) {
    setGeosIncluded((prev) =>
      prev.includes(geo) ? prev.filter((g) => g !== geo) : [...prev, geo]
    );
  }

  function addKeywordInclude() {
    const kw = newInclude.trim();
    if (kw && !keywordsInclude.includes(kw)) {
      setKeywordsInclude([...keywordsInclude, kw]);
      setNewInclude('');
    }
  }

  function addKeywordExclude() {
    const kw = newExclude.trim();
    if (kw && !keywordsExclude.includes(kw)) {
      setKeywordsExclude([...keywordsExclude, kw]);
      setNewExclude('');
    }
  }

  // ── RSS source actions ────────────────────────────────────────────────────
  async function handleAddSource(e: React.FormEvent) {
    e.preventDefault();
    if (!newSourceName.trim() || !newSourceUrl.trim()) return;
    try {
      const result = await addSource({
        name: newSourceName.trim(),
        rss_url: newSourceUrl.trim(),
        sector: newSourceSector,
      });
      setSources((prev) => [...prev, result.source]);
      setNewSourceName('');
      setNewSourceUrl('');
      setNewSourceSector('general');
    } catch {
      console.error('Failed to add source');
    }
  }

  async function handleToggleSource(source: RssSource) {
    try {
      await updateSource(source.id, { enabled: !source.enabled });
      setSources((prev) =>
        prev.map((s) =>
          s.id === source.id ? { ...s, enabled: !s.enabled } : s
        )
      );
    } catch {
      console.error('Failed to toggle source');
    }
  }

  async function handleDeleteSource(id: string) {
    try {
      await deleteSource(id);
      setSources((prev) => prev.filter((s) => s.id !== id));
    } catch {
      console.error('Failed to delete source');
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <PageShell title="Preferences" subtitle="Customise your feed">
        <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
          Loading preferences...
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title="Preferences" subtitle="Customise your feed">
      <div className="flex flex-col gap-8">
        {/* ── Sectors ──────────────────────────────────────────────────── */}
        <section>
          <h2 className="text-sm font-semibold mb-2">Sectors</h2>
          <p className="text-xs text-muted-foreground mb-3">
            Select the energy sectors you want to follow. Leave empty for all.
          </p>
          <div className="flex flex-wrap gap-2">
            {SECTORS.map((s) => (
              <Badge
                key={s.key}
                variant={sectorsIncluded.includes(s.key) ? 'default' : 'outline'}
                className="cursor-pointer select-none px-3 py-1 text-xs"
                style={
                  sectorsIncluded.includes(s.key)
                    ? { backgroundColor: s.color, borderColor: s.color, color: '#fff' }
                    : {}
                }
                onClick={() => toggleSector(s.key)}
              >
                {s.label}
              </Badge>
            ))}
          </div>
        </section>

        <Separator />

        {/* ── Geographies ──────────────────────────────────────────────── */}
        <section>
          <h2 className="text-sm font-semibold mb-2">Geographies</h2>
          <p className="text-xs text-muted-foreground mb-3">
            Focus on specific regions. Leave empty for global coverage.
          </p>
          <div className="flex flex-wrap gap-2">
            {GEOGRAPHIES.map((g) => (
              <Badge
                key={g}
                variant={geosIncluded.includes(g) ? 'default' : 'outline'}
                className="cursor-pointer select-none px-3 py-1 text-xs"
                onClick={() => toggleGeo(g)}
              >
                {g}
              </Badge>
            ))}
          </div>
        </section>

        <Separator />

        {/* ── Keywords Include ──────────────────────────────────────────── */}
        <section>
          <h2 className="text-sm font-semibold mb-2">Keywords to Include</h2>
          <p className="text-xs text-muted-foreground mb-3">
            Boost articles containing these terms.
          </p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {keywordsInclude.map((kw) => (
              <Badge key={kw} variant="secondary" className="gap-1 px-2 py-0.5 text-xs">
                {kw}
                <button
                  type="button"
                  onClick={() => setKeywordsInclude(keywordsInclude.filter((k) => k !== kw))}
                  className="ml-0.5 hover:text-red-500"
                >
                  ×
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Add keyword..."
              value={newInclude}
              onChange={(e) => setNewInclude(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeywordInclude())}
              className="flex-1"
            />
            <Button type="button" variant="outline" size="sm" onClick={addKeywordInclude}>
              Add
            </Button>
          </div>
        </section>

        <Separator />

        {/* ── Keywords Exclude ──────────────────────────────────────────── */}
        <section>
          <h2 className="text-sm font-semibold mb-2">Keywords to Exclude</h2>
          <p className="text-xs text-muted-foreground mb-3">
            Hide articles containing these terms.
          </p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {keywordsExclude.map((kw) => (
              <Badge key={kw} variant="secondary" className="gap-1 px-2 py-0.5 text-xs">
                {kw}
                <button
                  type="button"
                  onClick={() => setKeywordsExclude(keywordsExclude.filter((k) => k !== kw))}
                  className="ml-0.5 hover:text-red-500"
                >
                  ×
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Add keyword..."
              value={newExclude}
              onChange={(e) => setNewExclude(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeywordExclude())}
              className="flex-1"
            />
            <Button type="button" variant="outline" size="sm" onClick={addKeywordExclude}>
              Add
            </Button>
          </div>
        </section>

        <Separator />

        {/* ── Match Strictness ──────────────────────────────────────────── */}
        <section>
          <h2 className="text-sm font-semibold mb-2">Match Strictness</h2>
          <p className="text-xs text-muted-foreground mb-3">
            How closely articles must match your preferences.
          </p>
          <Select value={matchStrictness} onValueChange={(v: string | null) => v && setMatchStrictness(v)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="loose">Loose (more results)</SelectItem>
              <SelectItem value="moderate">Moderate</SelectItem>
              <SelectItem value="strict">Strict (fewer results)</SelectItem>
            </SelectContent>
          </Select>
        </section>

        {/* ── Save Button ──────────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Preferences'}
          </Button>
          {saved && (
            <span className="text-sm text-green-600">Saved!</span>
          )}
        </div>

        <Separator />

        {/* ── RSS Sources ──────────────────────────────────────────────── */}
        <section>
          <h2 className="text-sm font-semibold mb-2">RSS Sources</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Manage news sources. Toggle or remove sources you don&apos;t need.
          </p>

          {/* Source list */}
          <div className="flex flex-col gap-2 mb-4">
            {sources.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No sources configured.
              </p>
            ) : (
              sources.map((source) => (
                <Card key={source.id} size="sm">
                  <CardContent className="flex items-center justify-between py-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{source.name}</p>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {SECTORS.find((s) => s.key === source.sector)?.label ?? source.sector}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {source.rss_url}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 ml-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-7 px-2 text-xs ${source.enabled ? 'text-green-600' : 'text-muted-foreground'}`}
                        onClick={() => handleToggleSource(source)}
                      >
                        {source.enabled ? 'On' : 'Off'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
                        onClick={() => handleDeleteSource(source.id)}
                      >
                        ×
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Add source form */}
          <form onSubmit={handleAddSource} className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Input
                placeholder="Source name"
                value={newSourceName}
                onChange={(e) => setNewSourceName(e.target.value)}
                className="flex-1"
              />
              <Select value={newSourceSector} onValueChange={(v: string | null) => v && setNewSourceSector(v)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SECTORS.map((s) => (
                    <SelectItem key={s.key} value={s.key}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="RSS feed URL"
                value={newSourceUrl}
                onChange={(e) => setNewSourceUrl(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" size="sm">
                Add Source
              </Button>
            </div>
          </form>
        </section>
      </div>
    </PageShell>
  );
}
