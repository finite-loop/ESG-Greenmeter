"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useKpiValues, useCreateKpiValue, useUpdateKpiValue, useDeleteKpiValue, useVerifyKpiValues, useMarkNotApplicable } from "@/hooks/useKpiValues";
import { useFilterStore, type Standard } from "@/stores/filterStore";
import { KpiTable, type KpiValueRow } from "@/components/console/KpiTable";
import { KpiEntryForm } from "@/components/console/KpiEntryForm";
import { ExcelImportModal } from "@/components/console/ExcelImportModal";
import { Button, Badge, Card, CardContent } from "@/components/ui";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui";
import { queryKeys } from "@/lib/queryKeys";
import { FileSpreadsheet } from "lucide-react";

interface OrgNode {
  nodeId: string;
  name: string;
  nodeType: string;
  parentNodeId: string | null;
  level: number;
}

const STANDARDS: { value: Standard; label: string }[] = [
  { value: "BRSR", label: "BRSR" },
  { value: "ESRS", label: "ESRS" },
  { value: "GRI", label: "GRI" },
  { value: "IFRS_S2", label: "IFRS S2" },
];

const PILLARS: { value: string; label: string }[] = [
  { value: "E", label: "Environment" },
  { value: "S", label: "Social" },
  { value: "G", label: "Governance" },
];

export default function ConsolePage() {
  const { selectedStandard, setSelectedStandard, activePeriod } = useFilterStore();
  const [selectedPillar, setSelectedPillar] = useState<string | undefined>();
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>();
  const [page, setPage] = useState(1);

  // Entry form state
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingRow, setEditingRow] = useState<KpiValueRow | null>(null);

  // Delete confirmation state
  const [deletingRow, setDeletingRow] = useState<KpiValueRow | null>(null);

  // Import modal state
  const [importOpen, setImportOpen] = useState(false);

  // Fetch org nodes for the node selector
  const { data: orgNodes } = useQuery<OrgNode[]>({
    queryKey: queryKeys.orgNodes.tree(),
    queryFn: async () => {
      const res = await fetch("/api/org-hierarchy");
      if (!res.ok) throw new Error("Failed to load org nodes");
      const json = await res.json();
      return json.data;
    },
  });

  const filters = {
    periodId: activePeriod ?? undefined,
    standard: selectedStandard ?? undefined,
    pillar: selectedPillar,
    category: selectedCategory,
    nodeId: selectedNodeId,
    page,
    pageSize: 20,
  };

  const { data: response, isLoading } = useKpiValues(filters);
  const createMutation = useCreateKpiValue();
  const updateMutation = useUpdateKpiValue();
  const deleteMutation = useDeleteKpiValue();
  const verifyMutation = useVerifyKpiValues();
  const markNaMutation = useMarkNotApplicable();

  const kpiData: KpiValueRow[] = (response?.data ?? []).map((row) => ({
    valueId: row.valueId,
    paramId: row.paramId,
    paramCode: row.paramCode,
    paramName: row.paramName,
    pillar: row.pillar,
    category: row.category,
    standard: row.standard,
    paramUnit: row.paramUnit,
    value: row.value,
    valueText: row.valueText,
    verified: row.verified,
    notApplicable: row.notApplicable,
    verifiedBy: row.verifiedBy,
    verifiedByName: row.verifiedByName,
    verifiedAt: row.verifiedAt,
    sourceType: row.sourceType,
    ragStatus: row.ragStatus,
    dataType: row.dataType,
  })) as (KpiValueRow & { dataType: string })[];

  // Derive unique categories from current data for the category filter dropdown
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const row of kpiData) {
      if (row.category) set.add(row.category);
    }
    return Array.from(set).sort();
  }, [kpiData]);

  const meta = response?.meta;
  const totalPages = meta ? Math.ceil(meta.total / meta.pageSize) : 1;

  const handleEdit = useCallback((row: KpiValueRow) => {
    setEditingRow(row);
    setFormMode(row.ragStatus === "red" ? "create" : "edit");
    setFormOpen(true);
  }, []);

  const handleDelete = useCallback((row: KpiValueRow) => {
    setDeletingRow(row);
  }, []);

  const handleVerify = useCallback((valueIds: string[]) => {
    verifyMutation.mutate(valueIds);
  }, [verifyMutation]);

  const handleMarkNotApplicable = useCallback((valueIds: string[]) => {
    markNaMutation.mutate(valueIds);
  }, [markNaMutation]);

  const confirmDelete = useCallback(() => {
    if (!deletingRow || !deletingRow.valueId) return;
    deleteMutation.mutate(deletingRow.valueId, {
      onSuccess: () => setDeletingRow(null),
    });
  }, [deletingRow, deleteMutation]);

  const handleFormSubmit = useCallback(
    (values: { value?: string; valueText?: string; unit?: string; notApplicable?: boolean }) => {
      if (formMode === "create") {
        createMutation.mutate(
          {
            paramId: editingRow?.paramId ?? "",
            nodeId: selectedNodeId ?? "",
            periodId: activePeriod ?? "",
            value: values.value || undefined,
            valueText: values.valueText || undefined,
            unit: values.unit || undefined,
            sourceType: "manual",
            notApplicable: values.notApplicable,
          },
          {
            onSuccess: () => {
              setFormOpen(false);
              setEditingRow(null);
            },
          }
        );
      } else if (editingRow?.valueId) {
        updateMutation.mutate(
          {
            valueId: editingRow.valueId,
            input: {
              value: values.value || undefined,
              valueText: values.valueText || undefined,
              unit: values.unit || undefined,
              notApplicable: values.notApplicable,
            },
          },
          {
            onSuccess: () => {
              setFormOpen(false);
              setEditingRow(null);
            },
          }
        );
      }
    },
    [formMode, editingRow, activePeriod, selectedNodeId, createMutation, updateMutation]
  );

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[var(--tx1)]">KPI Console</h1>
          <p className="text-xs text-[var(--tx3)] mt-0.5">
            Enter and manage sustainability metrics for the current reporting period.
          </p>
        </div>
        <Button variant="secondary" onClick={() => setImportOpen(true)}>
          <FileSpreadsheet className="h-3.5 w-3.5" />
          Import Excel
        </Button>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <label className="text-[10px] font-semibold text-[var(--tx3)] uppercase tracking-wide">
                Standard
              </label>
              <Select
                value={selectedStandard ?? ""}
                onValueChange={(val) =>
                  setSelectedStandard(val === "" ? null : (val as Standard))
                }
              >
                <SelectTrigger className="w-[110px]">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  {STANDARDS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1.5">
              <label className="text-[10px] font-semibold text-[var(--tx3)] uppercase tracking-wide">
                Pillar
              </label>
              <Select
                value={selectedPillar ?? ""}
                onValueChange={(val) =>
                  setSelectedPillar(val === "" ? undefined : val)
                }
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  {PILLARS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1.5">
              <label className="text-[10px] font-semibold text-[var(--tx3)] uppercase tracking-wide">
                Category
              </label>
              <Select
                value={selectedCategory ?? ""}
                onValueChange={(val) =>
                  setSelectedCategory(val === "" ? undefined : val)
                }
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {orgNodes && orgNodes.length > 0 && (
              <div className="flex items-center gap-1.5">
                <label className="text-[10px] font-semibold text-[var(--tx3)] uppercase tracking-wide">
                  Node
                </label>
                <Select
                  value={selectedNodeId ?? ""}
                  onValueChange={(val) =>
                    setSelectedNodeId(val === "" ? undefined : val)
                  }
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All</SelectItem>
                    {orgNodes.map((node) => (
                      <SelectItem key={node.nodeId} value={node.nodeId}>
                        {"  ".repeat(node.level)}{node.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {meta && (
              <div className="ml-auto flex items-center gap-2">
                <Badge variant="neutral">
                  {meta.total} parameter{meta.total !== 1 ? "s" : ""}
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* KPI Table */}
      <Card>
        <CardContent className="p-0">
          <KpiTable
            data={kpiData}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onVerify={handleVerify}
            onMarkNotApplicable={handleMarkNotApplicable}
            isLoading={isLoading}
            isVerifying={verifyMutation.isPending}
          />
        </CardContent>
      </Card>

      {/* Pagination */}
      {meta && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-[var(--tx3)]">
            Page {meta.page} of {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Entry/Edit Form Modal */}
      {editingRow && (
        <KpiEntryForm
          open={formOpen}
          onOpenChange={(open) => {
            setFormOpen(open);
            if (!open) setEditingRow(null);
          }}
          paramName={editingRow.paramName}
          paramCode={editingRow.paramCode}
          paramUnit={editingRow.paramUnit}
          dataType={(editingRow as KpiValueRow & { dataType?: string }).dataType ?? "text"}
          initialValues={{
            value: editingRow.value,
            valueText: editingRow.valueText,
            unit: editingRow.paramUnit,
            notApplicable: editingRow.notApplicable,
          }}
          onSubmit={handleFormSubmit}
          isSubmitting={updateMutation.isPending || createMutation.isPending}
          mode={formMode}
        />
      )}

      {/* Excel Import Modal */}
      <ExcelImportModal open={importOpen} onOpenChange={setImportOpen} />

      {/* Delete Confirmation */}
      {deletingRow && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-slate-900/45">
          <div className="bg-[var(--surf)] rounded-[14px] p-6 w-[400px] shadow-lg">
            <h3 className="text-sm font-semibold text-[var(--tx1)] mb-2">
              Delete KPI Value
            </h3>
            <p className="text-xs text-[var(--tx2)] mb-4">
              Are you sure you want to delete the value for{" "}
              <span className="font-semibold">{deletingRow.paramName}</span>?
              This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setDeletingRow(null)}
                disabled={deleteMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                loading={deleteMutation.isPending}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
