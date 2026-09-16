'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { DEFAULT_ON_TAGS, ALL_CANDIDATE_TAGS } from '@/lib/reports/ao-weekly-config';

interface AOWeeklyMatch {
  id: string;
  name: string;
  caseId: string;
  matchedTags: string[];
  lastUpdate: string;
}

function todayInputValue(): string {
  return new Date().toISOString().split('T')[0];
}

function daysAgoInputValue(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

function formatDateShort(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${month}/${day}/${year.slice(2)}`;
}

export default function AOWeeklyReportPage() {
  const [from, setFrom] = useState(daysAgoInputValue(7));
  const [to, setTo] = useState(todayInputValue());
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set(DEFAULT_ON_TAGS));
  const [matches, setMatches] = useState<AOWeeklyMatch[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        from,
        to,
        tags: Array.from(activeTags).join(','),
      });
      const response = await fetch(`/api/reports/ao-weekly?${params.toString()}`);
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch report');
      }
      const fetchedMatches: AOWeeklyMatch[] = result.data.matches;
      setMatches(fetchedMatches);
      setChecked(new Set(fetchedMatches.map(m => m.id)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleTag = (tag: string) => {
    setActiveTags(prev => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
  };

  const toggleRow = (id: string) => {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const includedMatches = matches.filter(m => checked.has(m.id));

  const handleCopy = async () => {
    const grouped: Record<string, AOWeeklyMatch[]> = {};
    for (const match of includedMatches) {
      const label = match.matchedTags.join(', ');
      if (!grouped[label]) grouped[label] = [];
      grouped[label].push(match);
    }

    const lines: string[] = [];
    for (const [label, rows] of Object.entries(grouped)) {
      lines.push(`${label}:`);
      for (const row of rows) {
        lines.push(`- ${row.name} (${row.caseId}) — ${formatDateShort(row.lastUpdate)}`);
      }
      lines.push('');
    }

    try {
      await navigator.clipboard.writeText(lines.join('\n').trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy to clipboard — your browser may be blocking clipboard access.');
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const rows = includedMatches.map(m => ({
        name: m.name,
        caseId: m.caseId,
        matchedTags: m.matchedTags,
        lastUpdate: m.lastUpdate,
      }));

      const response = await fetch('/api/generate/ao-weekly-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AO_Weekly_Report_${todayInputValue()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download report');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">AO Weekly Report</h1>
          <p className="text-sm text-muted-foreground mt-1">
            AO clients whose status looks like it changed in the selected window.
            This is a first-pass filter — review each row before sending.
          </p>
        </div>

        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Input
                  label="From"
                  type="date"
                  value={from}
                  onChange={e => setFrom(e.target.value)}
                />
                <Input
                  label="To"
                  type="date"
                  value={to}
                  onChange={e => setTo(e.target.value)}
                />
                <div className="flex items-end">
                  <Button onClick={fetchReport} loading={loading} fullWidth>
                    Refresh
                  </Button>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-foreground mb-2">Status tags to include</p>
                <div className="flex flex-wrap gap-2">
                  {ALL_CANDIDATE_TAGS.map(tag => {
                    const active = activeTags.has(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className="focus:outline-none"
                      >
                        <Badge variant={active ? 'default' : 'outline'} className={active ? '' : 'opacity-60'}>
                          {tag}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
            <p className="text-destructive">{error}</p>
          </div>
        )}

        <Card variant="elevated">
          <CardHeader>
            <CardTitle>
              Matches ({includedMatches.length} of {matches.length} selected)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <LoadingSpinner />
              </div>
            ) : matches.length === 0 ? (
              <p className="text-muted-foreground">No matching AO clients in this window.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b border-border">
                      <th className="py-2 pr-4"></th>
                      <th className="py-2 pr-4">Client</th>
                      <th className="py-2 pr-4">Case ID</th>
                      <th className="py-2 pr-4">Matched Tags</th>
                      <th className="py-2 pr-4">Last Update</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matches.map(match => (
                      <tr key={match.id} className="border-b border-border/50">
                        <td className="py-2 pr-4">
                          <input
                            type="checkbox"
                            checked={checked.has(match.id)}
                            onChange={() => toggleRow(match.id)}
                          />
                        </td>
                        <td className="py-2 pr-4 text-foreground">{match.name}</td>
                        <td className="py-2 pr-4 text-foreground">{match.caseId}</td>
                        <td className="py-2 pr-4">
                          <div className="flex flex-wrap gap-1">
                            {match.matchedTags.map(tag => (
                              <Badge key={tag} variant="secondary" size="sm">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="py-2 pr-4 text-foreground">{formatDateShort(match.lastUpdate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {matches.length > 0 && (
              <div className="flex flex-wrap gap-3 mt-6">
                <Button
                  variant="secondary"
                  onClick={handleCopy}
                  disabled={includedMatches.length === 0}
                >
                  {copied ? 'Copied!' : 'Copy for AO'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownload}
                  loading={downloading}
                  disabled={includedMatches.length === 0}
                >
                  Download Excel
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
