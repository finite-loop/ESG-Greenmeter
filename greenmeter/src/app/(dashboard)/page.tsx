"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFilterStore } from "@/stores/filterStore";
import { useBenchmarkMetrics } from "@/hooks/useBenchmarks";
import { queryKeys } from "@/lib/queryKeys";
import { ScoreOverview } from "@/components/dashboard/ScoreOverview";
import { CoverageWidget } from "@/components/dashboard/CoverageWidget";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";
import { PeerComparisonMini } from "@/components/dashboard/PeerComparisonMini";

interface Period {
  periodId: string;
  label: string;
  fiscalYear: string;
  startDate: string;
  endDate: string;
  status: string;
}

interface OrgNode {
  nodeId: string;
  name: string;
  nodeType: string;
  parentNodeId: string | null;
  level: number;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? `Request failed with status ${res.status}`);
  }
  return res.json();
}

export default function DashboardPage() {
  const { activePeriod } = useFilterStore();

  // Fetch periods (sorted most recent first)
  const { data: periodsResponse, isLoading: periodsLoading } = useQuery<{ data: Period[] }>({
    queryKey: queryKeys.periods.list(),
    queryFn: () => fetchJson<{ data: Period[] }>("/api/periods"),
  });

  // Fetch org nodes to get root node
  const { data: orgNodesResponse, isLoading: orgNodesLoading } = useQuery<{ data: OrgNode[] }>({
    queryKey: queryKeys.orgNodes.tree(),
    queryFn: () => fetchJson<{ data: OrgNode[] }>("/api/org-hierarchy"),
  });

  const periods = periodsResponse?.data ?? [];
  const orgNodes = orgNodesResponse?.data ?? [];

  // Resolve current period: use filter store or first available
  const currentPeriod = useMemo(() => {
    if (activePeriod) {
      return periods.find((p) => p.periodId === activePeriod) ?? periods[0];
    }
    return periods[0];
  }, [activePeriod, periods]);

  // Previous period for trend comparison (second in the sorted list)
  const previousPeriod = useMemo(() => {
    if (!currentPeriod) return undefined;
    const idx = periods.findIndex(
      (p) => p.periodId === currentPeriod.periodId
    );
    return idx >= 0 && idx + 1 < periods.length ? periods[idx + 1] : undefined;
  }, [currentPeriod, periods]);

  // Root org node (organization level = top node with no parent)
  const rootNode = useMemo(() => {
    return orgNodes.find((n) => n.parentNodeId === null) ?? orgNodes[0];
  }, [orgNodes]);

  const periodId = currentPeriod?.periodId ?? "";
  const previousPeriodId = previousPeriod?.periodId;
  const nodeId = rootNode?.nodeId ?? "";
  const fiscalYear = currentPeriod?.fiscalYear ?? "";

  // Fetch available benchmark metrics to get canonical IDs for PeerComparisonMini
  const { data: metricsResponse } = useBenchmarkMetrics({
    fiscalYear,
    enabled: !!fiscalYear,
  });
  const metricsData = metricsResponse?.data;
  const canonicalIds = useMemo(() => {
    const metrics = metricsData ?? [];
    return metrics
      .filter((m) => !m.insufficientData)
      .map((m) => m.canonicalId);
  }, [metricsData]);

  const hasContext = !!periodId && !!nodeId;
  const isBootstrapping = periodsLoading || orgNodesLoading;

  if (!hasContext && isBootstrapping) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-[var(--tx3)]">
          Loading dashboard data...
        </p>
      </div>
    );
  }

  if (!hasContext) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-[var(--tx3)]">
          No reporting period or organization configured. Complete onboarding
          to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <ScoreOverview
        nodeId={nodeId}
        periodId={periodId}
        previousPeriodId={previousPeriodId}
      />
      <CoverageWidget periodId={periodId} />
      <AlertsPanel limit={5} />
      <PeerComparisonMini
        canonicalIds={canonicalIds}
        fiscalYear={fiscalYear}
        periodId={periodId}
      />
    </div>
  );
}
