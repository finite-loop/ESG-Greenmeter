"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/Select";
import {
  ENTITY_TYPES,
  ACTION_TYPES,
  buildAuditQueryString,
  formatAuditTimestamp,
  computeJsonDiff,
  type AuditFilters,
  type DiffEntry,
} from "./audit-utils";

interface AuditLogEntry {
  logId: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface AuditResponse {
  data: AuditLogEntry[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
  };
}

const ACTION_BADGE_VARIANT: Record<string, "success" | "warning" | "error" | "info" | "teal"> = {
  CREATE: "success",
  UPDATE: "info",
  DELETE: "error",
  VERIFY: "teal",
  IMPORT: "warning",
};

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [meta, setMeta] = useState<{ page: number; pageSize: number; total: number }>({
    page: 1,
    pageSize: 20,
    total: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [unauthorized, setUnauthorized] = useState(false);

  // Filter state
  const [filters, setFilters] = useState<AuditFilters>({});

  // Abort controller for cancelling in-flight requests
  const abortRef = useRef<AbortController | null>(null);

  const fetchLogs = useCallback(async (currentFilters: AuditFilters, page: number) => {
    // Cancel any in-flight request
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const qs = buildAuditQueryString({ ...currentFilters, page });
      const res = await fetch(`/api/audit${qs}`, { signal: controller.signal });

      if (res.status === 401 || res.status === 403) {
        setUnauthorized(true);
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const message = body?.error?.message ?? `Request failed with status ${res.status}`;
        setError(message);
        return;
      }

      const json: AuditResponse = await res.json();
      setLogs(json.data);
      setMeta(json.meta);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        return; // Request was cancelled, ignore
      }
      setError(err instanceof Error ? err.message : "Failed to fetch audit logs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs(filters, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleApplyFilters() {
    fetchLogs(filters, 1);
  }

  function handleClearFilters() {
    setFilters({});
    fetchLogs({}, 1);
  }

  function handlePageChange(newPage: number) {
    fetchLogs(filters, newPage);
  }

  function toggleRow(logId: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(logId)) {
        next.delete(logId);
      } else {
        next.add(logId);
      }
      return next;
    });
  }

  const totalPages = Math.ceil(meta.total / (meta.pageSize || 20));

  if (unauthorized) {
    return (
      <div>
        <PageHeader title="Audit Log" description="Access restricted" />
        <div className="p-4 rounded-lg bg-[var(--redbg)] text-[var(--redtx)] text-xs">
          You do not have permission to view audit logs. This page is restricted to Admin and Analyst roles.
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Audit Log"
        description="Browse and filter the audit trail to verify data integrity"
      />

      {/* Filter Controls */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="w-40">
          <label className="block text-[11px] font-semibold text-[var(--tx2)] mb-[5px]">
            Entity Type
          </label>
          <Select
            value={filters.entityType ?? ""}
            onValueChange={(val) =>
              setFilters((f) => ({ ...f, entityType: val === "__all__" ? undefined : val }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All entities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All entities</SelectItem>
              {ENTITY_TYPES.map((et) => (
                <SelectItem key={et} value={et}>
                  {et.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-36">
          <label className="block text-[11px] font-semibold text-[var(--tx2)] mb-[5px]">
            Action
          </label>
          <Select
            value={filters.action ?? ""}
            onValueChange={(val) =>
              setFilters((f) => ({ ...f, action: val === "__all__" ? undefined : val }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All actions</SelectItem>
              {ACTION_TYPES.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-44">
          <Input
            label="User ID"
            id="filter-userId"
            placeholder="UUID..."
            value={filters.userId ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, userId: e.target.value || undefined }))}
          />
        </div>

        <div className="w-36">
          <Input
            label="From"
            id="filter-dateFrom"
            type="date"
            value={filters.dateFrom ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value || undefined }))}
          />
        </div>

        <div className="w-36">
          <Input
            label="To"
            id="filter-dateTo"
            type="date"
            value={filters.dateTo ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value || undefined }))}
          />
        </div>

        <div className="flex gap-2 pb-[13px]">
          <Button variant="primary" size="sm" onClick={handleApplyFilters}>
            Apply
          </Button>
          <Button variant="ghost" size="sm" onClick={handleClearFilters}>
            Clear
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-[var(--redbg)] text-[var(--redtx)] text-xs">
          {error}
        </div>
      )}

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Timestamp</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Entity Type</TableHead>
            <TableHead>Entity ID</TableHead>
            <TableHead>Summary</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-[var(--tx3)]">
                Loading...
              </TableCell>
            </TableRow>
          )}
          {!loading && logs.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-[var(--tx3)]">
                No audit log entries found
              </TableCell>
            </TableRow>
          )}
          {!loading &&
            logs.map((log) => (
              <AuditRow
                key={log.logId}
                log={log}
                expanded={expandedRows.has(log.logId)}
                onToggle={() => toggleRow(log.logId)}
              />
            ))}
        </TableBody>
      </Table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-[11px] text-[var(--tx3)]">
            Page {meta.page} of {totalPages} ({meta.total} total entries)
          </span>
          <div className="flex gap-1">
            <Button
              variant="secondary"
              size="sm"
              disabled={meta.page <= 1}
              onClick={() => handlePageChange(meta.page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={meta.page >= totalPages}
              onClick={() => handlePageChange(meta.page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

interface AuditRowProps {
  log: AuditLogEntry;
  expanded: boolean;
  onToggle: () => void;
}

function AuditRow({ log, expanded, onToggle }: AuditRowProps) {
  const summary = buildSummary(log);

  return (
    <>
      <TableRow onClick={onToggle} className={expanded ? "bg-[var(--bg)]" : ""}>
        <TableCell className="whitespace-nowrap">
          {formatAuditTimestamp(log.createdAt)}
        </TableCell>
        <TableCell className="font-mono text-[10px]">
          {log.userId ? log.userId.slice(0, 8) + "..." : "—"}
        </TableCell>
        <TableCell>
          <Badge variant={ACTION_BADGE_VARIANT[log.action] ?? "neutral"}>
            {log.action}
          </Badge>
        </TableCell>
        <TableCell>{log.entityType.replace(/_/g, " ")}</TableCell>
        <TableCell className="font-mono text-[10px]">
          {log.entityId.slice(0, 8)}...
        </TableCell>
        <TableCell>{summary}</TableCell>
      </TableRow>
      {expanded && (
        <tr>
          <td colSpan={6} className="p-0">
            <ExpandedDetail log={log} />
          </td>
        </tr>
      )}
    </>
  );
}

function ExpandedDetail({ log }: { log: AuditLogEntry }) {
  const diff = computeJsonDiff(log.oldValue, log.newValue);

  return (
    <div className="bg-[var(--bg)] border-t border-[var(--bdr2)] px-4 py-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Old Value */}
        <div>
          <h4 className="text-[10px] font-bold uppercase text-[var(--tx3)] mb-2">
            Old Value
          </h4>
          {log.oldValue ? (
            <pre className="text-[10px] bg-[var(--surf)] p-2 rounded overflow-auto max-h-48 border border-[var(--bdr)]">
              {JSON.stringify(log.oldValue, null, 2)}
            </pre>
          ) : (
            <span className="text-[10px] text-[var(--tx3)] italic">null</span>
          )}
        </div>

        {/* New Value */}
        <div>
          <h4 className="text-[10px] font-bold uppercase text-[var(--tx3)] mb-2">
            New Value
          </h4>
          {log.newValue ? (
            <pre className="text-[10px] bg-[var(--surf)] p-2 rounded overflow-auto max-h-48 border border-[var(--bdr)]">
              {JSON.stringify(log.newValue, null, 2)}
            </pre>
          ) : (
            <span className="text-[10px] text-[var(--tx3)] italic">null</span>
          )}
        </div>
      </div>

      {/* Diff Highlighting */}
      {diff.length > 0 && (
        <div className="mt-3">
          <h4 className="text-[10px] font-bold uppercase text-[var(--tx3)] mb-2">
            Changes
          </h4>
          <div className="bg-[var(--surf)] rounded border border-[var(--bdr)] overflow-hidden">
            {diff
              .filter((d) => d.type !== "unchanged")
              .map((entry) => (
                <DiffRow key={entry.key} entry={entry} />
              ))}
            {diff.filter((d) => d.type !== "unchanged").length === 0 && (
              <div className="p-2 text-[10px] text-[var(--tx3)] italic">
                No field-level changes detected
              </div>
            )}
          </div>
        </div>
      )}

      {/* Metadata */}
      {log.metadata && (
        <div className="mt-3">
          <h4 className="text-[10px] font-bold uppercase text-[var(--tx3)] mb-2">
            Metadata
          </h4>
          <pre className="text-[10px] bg-[var(--surf)] p-2 rounded overflow-auto max-h-32 border border-[var(--bdr)]">
            {JSON.stringify(log.metadata, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

function DiffRow({ entry }: { entry: DiffEntry }) {
  const colors: Record<string, string> = {
    added: "bg-[var(--grnbg)] text-[var(--grntx)]",
    removed: "bg-[var(--redbg)] text-[var(--redtx)]",
    changed: "bg-[var(--ambbg)] text-[var(--ambtx)]",
  };

  const prefix: Record<string, string> = {
    added: "+",
    removed: "-",
    changed: "~",
  };

  return (
    <div className={`flex items-start gap-2 px-2 py-1 text-[10px] ${colors[entry.type] ?? ""}`}>
      <span className="font-mono font-bold w-3">{prefix[entry.type]}</span>
      <span className="font-semibold min-w-[80px]">{entry.key}:</span>
      {entry.type === "changed" && (
        <span>
          <span className="line-through opacity-60">{formatValue(entry.oldVal)}</span>
          {" → "}
          <span className="font-semibold">{formatValue(entry.newVal)}</span>
        </span>
      )}
      {entry.type === "added" && <span className="font-semibold">{formatValue(entry.newVal)}</span>}
      {entry.type === "removed" && (
        <span className="line-through">{formatValue(entry.oldVal)}</span>
      )}
    </div>
  );
}

function buildSummary(log: AuditLogEntry): string {
  const entity = log.entityType.replace(/_/g, " ");
  switch (log.action) {
    case "CREATE":
      return `Created ${entity}`;
    case "UPDATE":
      return `Updated ${entity}`;
    case "DELETE":
      return `Deleted ${entity}`;
    case "VERIFY":
      return `Verified ${entity}`;
    case "IMPORT":
      return `Imported ${entity}`;
    default:
      return `${log.action} on ${entity}`;
  }
}

function formatValue(val: unknown): string {
  if (val === undefined || val === null) return "null";
  if (typeof val === "string") return `"${val}"`;
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}
