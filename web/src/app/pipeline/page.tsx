'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface Client {
  id: string;
  name: string;
  status: string[];
}

interface StageData {
  id: string;
  name: string;
  description: string;
  color: string;
  count: number;
  clients: Client[];
}

interface PipelineData {
  stages: StageData[];
  summary: {
    totalClients: number;
    clientsWithStatus: number;
    clientsWithoutStatus: number;
  };
}

export default function PipelinePage() {
  const [data, setData] = useState<PipelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStage, setSelectedStage] = useState<StageData | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/pipeline');
        const result = await response.json();

        if (result.success) {
          setData(result.data);
        } else {
          setError(result.error);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch pipeline data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg text-muted-foreground">Loading pipeline data...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
            <h3 className="text-destructive font-semibold">Error Loading Pipeline Data</h3>
            <p className="text-destructive/80 mt-2">{error || 'Unknown error occurred'}</p>
          </div>
        </div>
      </div>
    );
  }

  const chartData = data.stages.map(stage => ({
    name: stage.name,
    count: stage.count,
    fill: stage.color.replace('bg-', ''),
    stageData: stage,
  }));

  // Convert Tailwind color classes to hex colors for the chart
  const getHexColor = (tailwindClass: string): string => {
    const colorMap: Record<string, string> = {
      'blue-500': '#3b82f6',
      'yellow-500': '#eab308',
      'purple-500': '#a855f7',
      'indigo-500': '#6366f1',
      'orange-500': '#f97316',
      'cyan-500': '#06b6d4',
      'amber-500': '#f59e0b',
      'teal-500': '#14b8a6',
      'pink-500': '#ec4899',
      'rose-500': '#f43f5e',
      'green-500': '#22c55e',
      'gray-500': '#6b7280',
    };

    const colorKey = tailwindClass.replace('bg-', '');
    return colorMap[colorKey] || '#6b7280';
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Claims Pipeline Dashboard</h1>
          <p className="text-muted-foreground">
            Management view organized by responsibility - identify bottlenecks and prioritize follow-ups
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-card rounded-lg shadow border border-border p-6">
            <h3 className="text-sm font-medium text-muted-foreground">Total Clients</h3>
            <p className="text-3xl font-bold text-foreground mt-2">{data.summary.totalClients}</p>
          </div>
          <div className="bg-card rounded-lg shadow border border-border p-6">
            <h3 className="text-sm font-medium text-muted-foreground">Clients with Status</h3>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">{data.summary.clientsWithStatus}</p>
          </div>
          <div className="bg-card rounded-lg shadow border border-border p-6">
            <h3 className="text-sm font-medium text-muted-foreground">Clients without Status</h3>
            <p className="text-3xl font-bold text-muted-foreground mt-2">{data.summary.clientsWithoutStatus}</p>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-card rounded-lg shadow border border-border p-6 mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">Clients by Stage</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Note: Clients can appear in multiple stages if they have multiple status tags
          </p>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={120}
                  interval={0}
                  tick={{ fontSize: 12, fill: 'currentColor' }}
                  className="text-muted-foreground"
                />
                <YAxis
                  tick={{ fill: 'currentColor' }}
                  className="text-muted-foreground"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem',
                    color: 'hsl(var(--foreground))'
                  }}
                />
                <Bar
                  dataKey="count"
                  onClick={(data: any) => setSelectedStage(data.stageData)}
                  cursor="pointer"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getHexColor(entry.fill)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stage Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.stages.map((stage) => (
            <button
              key={stage.id}
              onClick={() => setSelectedStage(stage)}
              className="bg-card border border-border rounded-lg shadow p-4 text-left hover:shadow-lg hover:border-primary/50 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`w-3 h-3 rounded-full ${stage.color}`}></div>
                <span className="text-2xl font-bold text-foreground">{stage.count}</span>
              </div>
              <h3 className="font-semibold text-foreground mb-1">{stage.name}</h3>
              <p className="text-sm text-muted-foreground">{stage.description}</p>
            </button>
          ))}
        </div>

        {/* Client Details Modal */}
        {selectedStage && (
          <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-50">
            <div className="bg-card border border-border rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
              <div className="p-6 border-b border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">{selectedStage.name}</h2>
                    <p className="text-muted-foreground mt-1">{selectedStage.description}</p>
                    <p className="text-sm text-muted-foreground/70 mt-2">
                      {selectedStage.count} client{selectedStage.count !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedStage(null)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="p-6 overflow-y-auto max-h-[calc(80vh-180px)]">
                <div className="space-y-4">
                  {selectedStage.clients.map((client) => (
                    <div
                      key={client.id}
                      className="border border-border rounded-lg p-4 hover:bg-accent transition-colors"
                    >
                      <h3 className="font-semibold text-foreground mb-2">{client.name}</h3>
                      <div className="flex flex-wrap gap-2">
                        {client.status.map((tag, idx) => (
                          <span
                            key={idx}
                            className="inline-block bg-primary/10 text-primary text-xs px-2 py-1 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
