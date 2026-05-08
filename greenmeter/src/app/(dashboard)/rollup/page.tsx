"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
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
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/Select";
import { queryKeys } from "@/lib/queryKeys";
import { useFilterStore } from "@/stores/filterStore";

interface OrgNodeTree {
  nodeId: string;
  tenantId: string;
  parentNodeId: string | null;
  name: string;
  nodeType: string;
  code: string | null;
  currency: string | null;
  level: number;
  active: boolean | null;
  createdAt: string;
  updatedAt: string;
  children: OrgNodeTree[];
}

interface Period {
  periodId: string;
  label: string;
  fiscalYear: string;
}

interface ChildContribution {
  nodeId: string;
  nodeName: string;
  originalValue: number;
  convertedValue: number;
  currency: string | null;
  currencyConverted: boolean;
  conversionRate: number | null;
  missingExchangeRate: boolean;
}

interface RollupParameter {
  paramId: string;
  paramName: string;
  unit: string;
  method: string;
  aggregatedValue: number;
  childContributions: ChildContribution[];
  hasMissingExchangeRates: boolean;
}

interface RollupSummary {
  nodeId: string;
  nodeName: string;
  nodeCurrency: string | null;
  periodId: string;
  parameters: RollupParameter[];
}

const NODE_TYPE_BADGE: Record<string, "dark" | "teal" | "info" | "neutral"> = {
  company: "dark",
  division: "teal",
  department: "info",
  site: "neutral",
};

const METHOD_LABELS: Record<string, string> = {
  SUM: "Sum",
  AVG: "Average",
  AVERAGE: "Average",
  WEIGHTED_AVG: "Weighted Avg",
};

function TreeNode({
  node,
  selectedId,
  onSelect,
  depth = 0,
}: {
  node: OrgNodeTree;
  selectedId: string | null;
  onSelect: (node: OrgNodeTree) => void;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children.length > 0;
  const isSelected = selectedId === node.nodeId;

  return (
    <div className={depth > 0 ? "ml-5 border-l border-[var(--bdr)]" : ""}>
      <div
        className={`flex items-center gap-2 px-3 py-2 cursor-pointer rounded-lg transition-colors ${
          isSelected
            ? "bg-[var(--t50)] border border-[var(--t300)]"
            : "hover:bg-[var(--bg)]"
        }`}
        onClick={() => onSelect(node)}
      >
        {hasChildren ? (
          <button
            className="w-4 h-4 flex items-center justify-center text-[var(--tx3)] text-xs shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
          >
            {expanded ? "\u25BE" : "\u25B8"}
          </button>
        ) : (
          <span className="w-4 h-4 flex items-center justify-center text-[var(--tx3)] text-[8px] shrink-0">{"\u25CF"}</span>
        )}
        <span className="text-[12px] font-semibold text-[var(--tx1)] truncate">{node.name}</span>
        {node.code && (
          <span className="text-[10px] text-[var(--tx3)] font-mono">{node.code}</span>
        )}
        <Badge variant={NODE_TYPE_BADGE[node.nodeType] ?? "neutral"} className="text-[9px] ml-auto shrink-0">
          {node.nodeType}
        </Badge>
      </div>
      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.nodeId}
              node={child}
              selectedId={selectedId}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function formatNumber(value: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function RollupDetailPanel({
  node,
  rollup,
  isLoading,
}: {
  node: OrgNodeTree;
  rollup: RollupSummary | null;
  isLoading: boolean;
}) {
  const [expandedParam, setExpandedParam] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {/* Node info card */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>{node.name}</CardTitle>
            <CardDescription>Rollup aggregation</CardDescription>
          </div>
          <Badge variant={NODE_TYPE_BADGE[node.nodeType] ?? "neutral"}>{node.nodeType}</Badge>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
            {node.code && (
              <>
                <dt className="text-[var(--tx3)] font-medium">Code</dt>
                <dd className="text-[var(--tx1)] font-mono">{node.code}</dd>
              </>
            )}
            {node.currency && (
              <>
                <dt className="text-[var(--tx3)] font-medium">Currency</dt>
                <dd className="text-[var(--tx1)]">{node.currency}</dd>
              </>
            )}
            <dt className="text-[var(--tx3)] font-medium">Children</dt>
            <dd className="text-[var(--tx1)]">{node.children.length}</dd>
          </dl>
        </CardContent>
      </Card>

      {/* Rollup values */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Aggregated values</CardTitle>
            <CardDescription>
              {rollup && rollup.parameters.length > 0
                ? `${rollup.parameters.length} parameters computed`
                : "Select a parent node with child data"}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-6 text-xs text-[var(--tx3)]">
              Computing rollups...
            </div>
          ) : !rollup || rollup.parameters.length === 0 ? (
            <div className="flex items-center justify-center py-6 text-xs text-[var(--tx3)]">
              {node.children.length === 0
                ? "Leaf node — no child values to aggregate"
                : "No child values found for the selected period"}
            </div>
          ) : (
            <div className="space-y-2">
              {rollup.parameters.map((param) => (
                <div
                  key={param.paramId}
                  className="border border-[var(--bdr2)] rounded-lg overflow-hidden"
                >
                  <button
                    className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-[var(--bg)] transition-colors"
                    onClick={() =>
                      setExpandedParam(
                        expandedParam === param.paramId ? null : param.paramId
                      )
                    }
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[11px] font-semibold text-[var(--tx1)] truncate">
                        {param.paramName}
                      </span>
                      <Badge variant="neutral" className="text-[9px] shrink-0">
                        {METHOD_LABELS[param.method] ?? param.method}
                      </Badge>
                      {param.hasMissingExchangeRates && (
                        <Badge variant="warning" className="text-[9px] shrink-0">
                          FX missing
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[12px] font-bold text-[var(--tx1)] tabular-nums">
                        {formatNumber(param.aggregatedValue)}
                      </span>
                      <span className="text-[10px] text-[var(--tx3)]">{param.unit}</span>
                      <span className="text-[10px] text-[var(--tx3)]">
                        {expandedParam === param.paramId ? "\u25B4" : "\u25BE"}
                      </span>
                    </div>
                  </button>

                  {expandedParam === param.paramId && (
                    <div className="border-t border-[var(--bdr2)] px-1">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Node</TableHead>
                            <TableHead className="text-right">Value</TableHead>
                            <TableHead className="text-right">Converted</TableHead>
                            <TableHead>FX</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {param.childContributions.map((child) => (
                            <TableRow key={child.nodeId}>
                              <TableCell className="font-medium">
                                {child.nodeName}
                                {child.currency && (
                                  <span className="text-[10px] text-[var(--tx3)] ml-1">
                                    ({child.currency})
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {formatNumber(child.originalValue)}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {child.currencyConverted ? (
                                  <span className="text-[var(--amber)]">
                                    {formatNumber(child.convertedValue)}
                                  </span>
                                ) : (
                                  formatNumber(child.convertedValue)
                                )}
                              </TableCell>
                              <TableCell>
                                {child.missingExchangeRate ? (
                                  <Badge variant="error" className="text-[9px]">
                                    No rate
                                  </Badge>
                                ) : child.currencyConverted && child.conversionRate ? (
                                  <Badge variant="warning" className="text-[9px]">
                                    x{child.conversionRate.toFixed(2)}
                                  </Badge>
                                ) : (
                                  <span className="text-[10px] text-[var(--tx3)]">-</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function findNodeById(nodes: OrgNodeTree[], nodeId: string): OrgNodeTree | null {
  for (const node of nodes) {
    if (node.nodeId === nodeId) return node;
    const found = findNodeById(node.children, nodeId);
    if (found) return found;
  }
  return null;
}

export default function RollupPage() {
  const { activePeriod } = useFilterStore();
  const [tree, setTree] = useState<OrgNodeTree[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(activePeriod);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedNode = selectedNodeId ? findNodeById(tree, selectedNodeId) : null;

  // Fetch org tree
  const fetchTree = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/org-hierarchy");
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? `Failed to load hierarchy (${res.status})`);
      }
      const body = await res.json();
      setTree(body.data ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load hierarchy");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  // Sync activePeriod from global store when it changes
  useEffect(() => {
    if (activePeriod && !selectedPeriodId) {
      setSelectedPeriodId(activePeriod);
    }
  }, [activePeriod, selectedPeriodId]);

  // Fetch periods
  const { data: periods } = useQuery<Period[]>({
    queryKey: queryKeys.periods.list(),
    queryFn: async () => {
      const res = await fetch("/api/periods");
      if (!res.ok) throw new Error("Failed to load periods");
      const json = await res.json();
      return json.data;
    },
  });

  // Auto-select first period if none selected
  useEffect(() => {
    if (!selectedPeriodId && periods && periods.length > 0) {
      setSelectedPeriodId(periods[0].periodId);
    }
  }, [periods, selectedPeriodId]);

  // Fetch rollup data
  const {
    data: rollupData,
    isLoading: rollupLoading,
  } = useQuery<RollupSummary>({
    queryKey: queryKeys.rollup.summary({
      nodeId: selectedNodeId ?? undefined,
      periodId: selectedPeriodId ?? undefined,
    }),
    queryFn: async () => {
      const params = new URLSearchParams({
        nodeId: selectedNodeId!,
        periodId: selectedPeriodId!,
      });
      const res = await fetch(`/api/rollup?${params}`);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? "Failed to load rollup data");
      }
      const json = await res.json();
      return json.data;
    },
    enabled: !!selectedNodeId && !!selectedPeriodId,
  });

  return (
    <div>
      <PageHeader
        title="Rollup Aggregation"
        description="View consolidated metrics across the org hierarchy"
        actions={
          <div className="flex items-center gap-2">
            {periods && periods.length > 0 && (
              <Select
                value={selectedPeriodId ?? undefined}
                onValueChange={(val) => setSelectedPeriodId(val)}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  {periods.map((p) => (
                    <SelectItem key={p.periodId} value={p.periodId}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button variant="secondary" size="sm" onClick={fetchTree}>
              Refresh
            </Button>
          </div>
        }
      />

      {error && (
        <div className="mb-3 p-3 bg-[var(--redbg)] text-[var(--redtx)] text-xs rounded-lg">
          {error}
        </div>
      )}

      {loading ? (
        <Card>
          <CardContent>
            <div className="flex items-center justify-center py-8 text-xs text-[var(--tx3)]">
              Loading hierarchy...
            </div>
          </CardContent>
        </Card>
      ) : tree.length === 0 ? (
        <Card>
          <CardContent>
            <div className="flex items-center justify-center py-8 text-xs text-[var(--tx3)]">
              No organisation nodes found. Complete onboarding to set up your hierarchy.
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Organisation tree</CardTitle>
                  <CardDescription>Click a node to view rollup</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {tree.map((root) => (
                  <TreeNode
                    key={root.nodeId}
                    node={root}
                    selectedId={selectedNode?.nodeId ?? null}
                    onSelect={(node) => setSelectedNodeId(node.nodeId)}
                  />
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            {selectedNode ? (
              <RollupDetailPanel
                node={selectedNode}
                rollup={rollupData ?? null}
                isLoading={rollupLoading}
              />
            ) : (
              <Card>
                <CardContent>
                  <div className="flex items-center justify-center py-8 text-xs text-[var(--tx3)]">
                    Select a node to view aggregated values
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
