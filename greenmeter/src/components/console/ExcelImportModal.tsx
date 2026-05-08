"use client";

import { useState, useRef, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, FileSpreadsheet, X, Check, AlertTriangle, Copy } from "lucide-react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
  Button,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui";
import { queryKeys } from "@/lib/queryKeys";
import { useFilterStore } from "@/stores/filterStore";
import { MAX_IMPORT_FILE_SIZE } from "@/schemas/kpiImport";
import type { ImportPreviewRow, ImportPreviewResponse, AvailableParameter } from "@/schemas/kpiImport";

interface OrgNode {
  nodeId: string;
  name: string;
  nodeType: string;
  parentId: string | null;
  children?: OrgNode[];
}

interface Period {
  periodId: string;
  label: string;
  fiscalYear: string;
}

/** Flatten a tree of org nodes for selection */
function flattenNodes(nodes: OrgNode[], depth = 0): Array<OrgNode & { depth: number }> {
  const result: Array<OrgNode & { depth: number }> = [];
  for (const node of nodes) {
    result.push({ ...node, depth });
    if (node.children?.length) {
      result.push(...flattenNodes(node.children, depth + 1));
    }
  }
  return result;
}

interface ExcelImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = "upload" | "preview" | "result";

interface ImportResult {
  imported: number;
  failed: number;
  results: Array<{
    rowIndex: number;
    status: "success" | "error";
    valueId?: string;
    error?: string;
  }>;
}

export function ExcelImportModal({ open, onOpenChange }: ExcelImportModalProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { activePeriod } = useFilterStore();

  // State
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [nodeId, setNodeId] = useState("");
  const [periodId, setPeriodId] = useState(activePeriod ?? "");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [manualMappings, setManualMappings] = useState<Record<number, string>>({});

  // Fetch org nodes for selector
  const { data: orgTree } = useQuery<OrgNode[]>({
    queryKey: queryKeys.orgNodes.tree(),
    queryFn: async () => {
      const res = await fetch("/api/org-hierarchy");
      if (!res.ok) throw new Error("Failed to load org nodes");
      const json = await res.json();
      return json.data;
    },
    enabled: open,
  });

  // Fetch periods for selector
  const { data: periods } = useQuery<Period[]>({
    queryKey: queryKeys.periods.list(),
    queryFn: async () => {
      const res = await fetch("/api/periods");
      if (!res.ok) throw new Error("Failed to load periods");
      const json = await res.json();
      return json.data;
    },
    enabled: open,
  });

  const flatNodes = orgTree ? flattenNodes(orgTree) : [];

  // Preview mutation
  const previewMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch("/api/kpi/import", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message ?? "Preview failed");
      }
      return res.json() as Promise<{ data: ImportPreviewResponse }>;
    },
    onSuccess: (response) => {
      const data = response.data;
      setPreview(data);
      // Pre-select all matched rows
      const matched = new Set<number>();
      for (const row of data.rows) {
        if (row.status === "matched") {
          matched.add(row.rowIndex);
        }
      }
      setSelectedRows(matched);
      setStep("preview");
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  // Confirm mutation
  const confirmMutation = useMutation({
    mutationFn: async (payload: unknown) => {
      const res = await fetch("/api/kpi/import/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message ?? "Import failed");
      }
      return res.json() as Promise<{ data: ImportResult }>;
    },
    onSuccess: (response) => {
      setImportResult(response.data);
      setStep("result");
      queryClient.invalidateQueries({ queryKey: queryKeys.kpiValues.all });
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const resetModal = useCallback(() => {
    setStep("upload");
    setFile(null);
    setNodeId("");
    setPeriodId(activePeriod ?? "");
    setError(null);
    setPreview(null);
    setSelectedRows(new Set());
    setImportResult(null);
    setManualMappings({});
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [activePeriod]);

  const handleClose = useCallback(
    (open: boolean) => {
      if (!open) resetModal();
      onOpenChange(open);
    },
    [onOpenChange, resetModal]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.type !== "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
      setError("Only .xlsx files are accepted");
      e.target.value = "";
      return;
    }

    if (selected.size > MAX_IMPORT_FILE_SIZE) {
      setError("File size exceeds 10 MB limit");
      e.target.value = "";
      return;
    }

    setFile(selected);
  };

  const handlePreview = () => {
    setError(null);
    if (!file) {
      setError("Please select an Excel file");
      return;
    }
    if (!nodeId) {
      setError("Please select an organisation unit");
      return;
    }
    if (!periodId) {
      setError("Please select a reporting period");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("nodeId", nodeId);
    formData.append("periodId", periodId);
    previewMutation.mutate(formData);
  };

  const handleConfirm = () => {
    if (!preview || selectedRows.size === 0) return;

    const rowsToImport = preview.rows
      .filter((r) => selectedRows.has(r.rowIndex))
      .map((r) => {
        // Use manual mapping if available, otherwise use auto-matched paramId
        const paramId = manualMappings[r.rowIndex] ?? r.paramId;
        if (!paramId) return null;
        return {
          rowIndex: r.rowIndex,
          paramId,
          value: r.rawValue ?? undefined,
          unit: r.rawUnit ?? r.matchedUnit ?? undefined,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    confirmMutation.mutate({
      nodeId,
      periodId,
      filename: preview.filename,
      rows: rowsToImport,
    });
  };

  const toggleRow = (rowIndex: number) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowIndex)) {
        next.delete(rowIndex);
      } else {
        next.add(rowIndex);
      }
      return next;
    });
  };

  const toggleAllMatched = () => {
    if (!preview) return;
    const matchedRows = preview.rows.filter((r) => r.status === "matched");
    const allSelected = matchedRows.every((r) => selectedRows.has(r.rowIndex));
    if (allSelected) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(matchedRows.map((r) => r.rowIndex)));
    }
  };

  const handleManualMap = (rowIndex: number, paramId: string) => {
    setManualMappings((prev) => {
      if (!paramId) {
        const next = { ...prev };
        delete next[rowIndex];
        // Also deselect the row when un-mapping
        setSelectedRows((sel) => {
          const updated = new Set(sel);
          updated.delete(rowIndex);
          return updated;
        });
        return next;
      }
      return { ...prev, [rowIndex]: paramId };
    });
  };

  const statusBadge = (status: ImportPreviewRow["status"]) => {
    switch (status) {
      case "matched":
        return <Badge variant="success">Matched</Badge>;
      case "unmatched":
        return <Badge variant="error">Unmatched</Badge>;
      case "duplicate":
        return <Badge variant="warning">Duplicate</Badge>;
    }
  };

  return (
    <Modal open={open} onOpenChange={handleClose}>
      <ModalContent className="w-[780px] max-w-[95vw]">
        <ModalHeader>
          <ModalTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-[var(--t600)]" />
            {step === "upload" && "Import KPI Values from Excel"}
            {step === "preview" && "Preview Import"}
            {step === "result" && "Import Complete"}
          </ModalTitle>
          <ModalDescription>
            {step === "upload" &&
              "Upload an .xlsx file with columns: parameter_code (or name), value, and optionally unit."}
            {step === "preview" &&
              `${preview?.summary.matchedRows ?? 0} matched, ${preview?.summary.unmatchedRows ?? 0} unmatched, ${preview?.summary.duplicateRows ?? 0} duplicate rows`}
            {step === "result" &&
              `${importResult?.imported ?? 0} imported, ${importResult?.failed ?? 0} failed`}
          </ModalDescription>
        </ModalHeader>

        {/* Step 1: Upload */}
        {step === "upload" && (
          <div className="space-y-4">
            {/* File Input */}
            <div>
              <label className="block text-[11px] font-semibold text-[var(--tx2)] mb-[5px]">
                Excel File (.xlsx)
              </label>
              <div
                className="flex items-center gap-3 p-3 border border-dashed border-[var(--bdr)] rounded-lg cursor-pointer hover:border-[var(--t500)] transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {file ? (
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileSpreadsheet className="h-4 w-4 text-green-600 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-[var(--tx1)] truncate">
                        {file.name}
                      </p>
                      <p className="text-[10px] text-[var(--tx3)]">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="p-1 rounded hover:bg-[var(--bg)] transition-colors"
                    >
                      <X className="h-3 w-3 text-[var(--tx3)]" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-[var(--tx3)]">
                    <Upload className="h-4 w-4" />
                    <span className="text-xs">Click to select .xlsx file (max 10 MB)</span>
                  </div>
                )}
              </div>
            </div>

            {/* Node and Period selectors */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[var(--tx2)] mb-[5px]">
                  Organisation Unit
                </label>
                <select
                  value={nodeId}
                  onChange={(e) => setNodeId(e.target.value)}
                  className="w-full px-[11px] py-2 border border-[var(--bdr)] rounded-[7px] text-xs outline-none transition-[border-color] bg-[var(--surf)] focus:border-[var(--t500)]"
                >
                  <option value="">Select unit</option>
                  {flatNodes.map((n) => (
                    <option key={n.nodeId} value={n.nodeId}>
                      {"  ".repeat(n.depth)}
                      {n.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[var(--tx2)] mb-[5px]">
                  Reporting Period
                </label>
                <select
                  value={periodId}
                  onChange={(e) => setPeriodId(e.target.value)}
                  className="w-full px-[11px] py-2 border border-[var(--bdr)] rounded-[7px] text-xs outline-none transition-[border-color] bg-[var(--surf)] focus:border-[var(--t500)]"
                >
                  <option value="">Select period</option>
                  {periods?.map((p) => (
                    <option key={p.periodId} value={p.periodId}>
                      {p.label || p.fiscalYear}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {error && <p className="text-[11px] text-[var(--red)]">{error}</p>}

            <ModalFooter>
              <Button variant="secondary" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button
                onClick={handlePreview}
                loading={previewMutation.isPending}
                disabled={!file}
              >
                <Upload className="h-3 w-3" />
                Preview Import
              </Button>
            </ModalFooter>
          </div>
        )}

        {/* Step 2: Preview */}
        {step === "preview" && preview && (
          <div className="space-y-4">
            {/* Summary bar */}
            <div className="flex items-center gap-2 text-xs">
              <Badge variant="neutral">{preview.summary.totalRows} total</Badge>
              <Badge variant="success">{preview.summary.matchedRows} matched</Badge>
              <Badge variant="error">{preview.summary.unmatchedRows} unmatched</Badge>
              <Badge variant="warning">{preview.summary.duplicateRows} duplicate</Badge>
              <span className="ml-auto text-[var(--tx3)]">
                {selectedRows.size} selected for import
              </span>
            </div>

            {/* Preview table */}
            <div className="max-h-[400px] overflow-y-auto border border-[var(--bdr)] rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">
                      <input
                        type="checkbox"
                        checked={
                          preview.rows.filter((r) => r.status === "matched").length > 0 &&
                          preview.rows
                            .filter((r) => r.status === "matched")
                            .every((r) => selectedRows.has(r.rowIndex))
                        }
                        onChange={toggleAllMatched}
                        className="rounded border-[var(--bdr)]"
                      />
                    </TableHead>
                    <TableHead>Row</TableHead>
                    <TableHead>Code / Name</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Matched To</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.rows.map((row) => {
                    const isMapped = !!manualMappings[row.rowIndex];
                    const canSelect =
                      (row.status === "matched" && !!row.paramId) || isMapped;
                    const isSelected = selectedRows.has(row.rowIndex);
                    const mappedParam = isMapped
                      ? preview.availableParameters?.find(
                          (p) => p.paramId === manualMappings[row.rowIndex]
                        )
                      : null;
                    return (
                      <TableRow
                        key={row.rowIndex}
                        className={
                          row.status === "unmatched" && !isMapped
                            ? "bg-red-50/40"
                            : row.status === "duplicate"
                              ? "bg-amber-50/40"
                              : ""
                        }
                      >
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={!canSelect}
                            onChange={() => toggleRow(row.rowIndex)}
                            className="rounded border-[var(--bdr)]"
                          />
                        </TableCell>
                        <TableCell className="text-[var(--tx3)]">{row.rowIndex}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            {row.paramCode && (
                              <span className="text-[10px] text-[var(--tx3)] font-mono">
                                {row.paramCode}
                              </span>
                            )}
                            {row.paramName && (
                              <span className="text-xs truncate max-w-[160px]">
                                {row.paramName}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{row.rawValue ?? "—"}</TableCell>
                        <TableCell className="text-xs">{row.rawUnit ?? "—"}</TableCell>
                        <TableCell>
                          {isMapped ? (
                            <Badge variant="success">Mapped</Badge>
                          ) : (
                            statusBadge(row.status)
                          )}
                          {row.error && !isMapped && (
                            <p className="text-[10px] text-[var(--tx3)] mt-0.5">{row.error}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          {row.status === "unmatched" && preview.availableParameters ? (
                            <select
                              value={manualMappings[row.rowIndex] ?? ""}
                              onChange={(e) =>
                                handleManualMap(row.rowIndex, e.target.value)
                              }
                              className="w-full px-1.5 py-1 border border-[var(--bdr)] rounded text-[10px] bg-[var(--surf)] outline-none"
                            >
                              <option value="">Skip</option>
                              {preview.availableParameters.map((p) => (
                                <option key={p.paramId} value={p.paramId}>
                                  {p.code} — {p.name}
                                </option>
                              ))}
                            </select>
                          ) : mappedParam ? (
                            <div className="flex flex-col">
                              <span className="text-[10px] text-[var(--tx3)] font-mono">
                                {mappedParam.code}
                              </span>
                              <span className="text-[10px] truncate max-w-[140px]">
                                {mappedParam.name}
                              </span>
                            </div>
                          ) : row.matchedParamCode ? (
                            <div className="flex flex-col">
                              <span className="text-[10px] text-[var(--tx3)] font-mono">
                                {row.matchedParamCode}
                              </span>
                              <span className="text-[10px] truncate max-w-[140px]">
                                {row.matchedParamName}
                              </span>
                            </div>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {error && <p className="text-[11px] text-[var(--red)]">{error}</p>}

            <ModalFooter>
              <Button variant="secondary" onClick={() => setStep("upload")}>
                Back
              </Button>
              <Button
                onClick={handleConfirm}
                loading={confirmMutation.isPending}
                disabled={selectedRows.size === 0}
              >
                <Check className="h-3 w-3" />
                Import {selectedRows.size} Row{selectedRows.size !== 1 ? "s" : ""}
              </Button>
            </ModalFooter>
          </div>
        )}

        {/* Step 3: Result */}
        {step === "result" && importResult && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-[var(--bg)]">
              {importResult.failed === 0 ? (
                <Check className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              )}
              <div>
                <p className="text-sm font-semibold text-[var(--tx1)]">
                  {importResult.imported} value{importResult.imported !== 1 ? "s" : ""} imported
                  successfully
                </p>
                {importResult.failed > 0 && (
                  <p className="text-xs text-[var(--red)]">
                    {importResult.failed} row{importResult.failed !== 1 ? "s" : ""} failed
                  </p>
                )}
              </div>
            </div>

            {/* Show failed rows if any */}
            {importResult.failed > 0 && (
              <div className="max-h-[200px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Row</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importResult.results
                      .filter((r) => r.status === "error")
                      .map((r) => (
                        <TableRow key={r.rowIndex}>
                          <TableCell>{r.rowIndex}</TableCell>
                          <TableCell>
                            <Badge variant="error">Failed</Badge>
                          </TableCell>
                          <TableCell className="text-xs text-[var(--red)]">{r.error}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <ModalFooter>
              <Button onClick={() => handleClose(false)}>Done</Button>
            </ModalFooter>
          </div>
        )}
      </ModalContent>
    </Modal>
  );
}
