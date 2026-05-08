"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/Table";
import {
  statusBadgeVariant,
  formatMs,
  truncateJobId,
  type ComponentStatus,
} from "./health-utils";

interface ComponentHealth {
  status: ComponentStatus;
  message: string;
  latencyMs?: number;
}

interface QueueMetrics {
  name: string;
  queuedCount: number;
  activeCount: number;
  totalCount: number;
  deferredCount: number;
  completedLast24h: number;
  failedLast24h: number;
  avgProcessingTimeMs: number | null;
  recentFailedJobs: FailedJob[];
}

interface FailedJob {
  id: string;
  queue: string;
  state: string;
  createdOn: string;
  completedOn: string | null;
  errorSummary: string;
}

interface SystemHealthData {
  status: ComponentStatus;
  timestamp: string;
  components: {
    database: ComponentHealth;
    blobStorage: ComponentHealth;
    pgBoss: ComponentHealth;
  };
  queues: QueueMetrics[];
}

const AUTO_REFRESH_INTERVAL_MS = 30_000;

function ComponentStatusCard({
  title,
  component,
}: {
  title: string;
  component: ComponentHealth;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <Badge variant={statusBadgeVariant(component.status)}>
          {component.status}
        </Badge>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-[var(--tx2)]">{component.message}</p>
        {component.latencyMs != null && (
          <p className="mt-1 text-[10px] text-[var(--tx3)]">
            Latency: {formatMs(component.latencyMs)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function HealthPage() {
  const [healthData, setHealthData] = useState<SystemHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchHealth = useCallback(async () => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch("/api/health/queues", { signal: controller.signal });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.error?.message ?? `HTTP ${res.status}: ${res.statusText}`
        );
      }
      const json = await res.json();
      setHealthData(json.data);
      setError(null);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    return () => abortControllerRef.current?.abort();
  }, [fetchHealth]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchHealth, AUTO_REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchHealth]);

  return (
    <div>
      <PageHeader
        title="System Health"
        description="Monitor system components, job queues, and storage status"
        actions={
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-[var(--tx2)]">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              Auto-refresh
            </label>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setLoading(true);
                fetchHealth();
              }}
            >
              Refresh
            </Button>
          </div>
        }
      />

      {error && (
        <Card className="mb-4">
          <CardContent>
            <p className="text-xs text-[var(--redtx)]">{error}</p>
          </CardContent>
        </Card>
      )}

      {loading && !healthData && (
        <p className="text-xs text-[var(--tx3)]">Loading health data...</p>
      )}

      {healthData && (
        <>
          {/* Overall Status */}
          <div className="mb-4 flex items-center gap-2">
            <span className="text-xs font-semibold text-[var(--tx1)]">
              Overall Status:
            </span>
            <Badge variant={statusBadgeVariant(healthData.status)}>
              {healthData.status}
            </Badge>
            <span className="text-[10px] text-[var(--tx3)]">
              Last checked: {new Date(healthData.timestamp).toLocaleTimeString()}
            </span>
          </div>

          {/* Component Status Cards */}
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <ComponentStatusCard
              title="Database"
              component={healthData.components.database}
            />
            <ComponentStatusCard
              title="Blob Storage"
              component={healthData.components.blobStorage}
            />
            <ComponentStatusCard
              title="Job Queue (pg-boss)"
              component={healthData.components.pgBoss}
            />
          </div>

          {/* Queue Metrics */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Queue Metrics</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Queue</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead>Queued</TableHead>
                    <TableHead>Deferred</TableHead>
                    <TableHead>Completed (24h)</TableHead>
                    <TableHead>Failed (24h)</TableHead>
                    <TableHead>Avg Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {healthData.queues.map((q) => (
                    <TableRow key={q.name}>
                      <TableCell className="font-medium">{q.name}</TableCell>
                      <TableCell>
                        {q.activeCount > 0 ? (
                          <Badge variant="info">{q.activeCount}</Badge>
                        ) : (
                          <span className="text-[var(--tx3)]">0</span>
                        )}
                      </TableCell>
                      <TableCell>{q.queuedCount}</TableCell>
                      <TableCell>{q.deferredCount}</TableCell>
                      <TableCell>
                        <span className="text-[var(--grntx)]">
                          {q.completedLast24h}
                        </span>
                      </TableCell>
                      <TableCell>
                        {q.failedLast24h > 0 ? (
                          <Badge variant="error">{q.failedLast24h}</Badge>
                        ) : (
                          <span className="text-[var(--tx3)]">0</span>
                        )}
                      </TableCell>
                      <TableCell>{formatMs(q.avgProcessingTimeMs)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Failed Jobs */}
          <FailedJobsList queues={healthData.queues} />
        </>
      )}
    </div>
  );
}

function FailedJobsList({ queues }: { queues: QueueMetrics[] }) {
  const failedJobs = queues.flatMap((q) => q.recentFailedJobs);

  if (failedJobs.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Failed Jobs</CardTitle>
        <Badge variant="error">{failedJobs.length}</Badge>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Queue</TableHead>
              <TableHead>Job ID</TableHead>
              <TableHead>Error</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Completed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {failedJobs.map((job) => (
              <TableRow key={job.id}>
                <TableCell className="font-medium">{job.queue}</TableCell>
                <TableCell className="font-mono text-[10px]">
                  {truncateJobId(job.id)}
                </TableCell>
                <TableCell className="max-w-[200px] truncate text-xs text-[var(--tx2)]">
                  {job.errorSummary}
                </TableCell>
                <TableCell>
                  {new Date(job.createdOn).toLocaleString()}
                </TableCell>
                <TableCell>
                  {job.completedOn
                    ? new Date(job.completedOn).toLocaleString()
                    : '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
