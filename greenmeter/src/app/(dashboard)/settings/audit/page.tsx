"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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

const ACTION_BADGE: Record<string, string> = {
  CREATE: "b-green",
  UPDATE: "b-teal",
  DELETE: "b-red",
  VERIFY: "b-ind",
  IMPORT: "b-amber",
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
        return;
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

  /* ── Summary stats ── */
  const todayCount = logs.filter(l => {
    const d = new Date(l.createdAt);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;

  const uniqueUsers = new Set(logs.map(l => l.userId).filter(Boolean)).size;

  if (unauthorized) {
    return (
      <div>
        <div className="ph">
          <div><div className="ptitle">Audit Log</div><div className="psub">Access restricted</div></div>
        </div>
        <div style={{ padding: 14, borderRadius: 10, background: "var(--redbg)", color: "var(--redtx)", fontSize: 12 }}>
          You do not have permission to view audit logs. This page is restricted to Admin and Analyst roles.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="ph">
        <div><div className="ptitle">Audit Log</div><div className="psub">Browse and filter the audit trail to verify data integrity</div></div>
      </div>

      {/* Summary stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 14 }}>
        {([
          ["Today", String(todayCount), "Entries today", "var(--t700)"],
          ["This page", String(logs.length), `of ${meta.total} total`, "var(--tx1)"],
          ["Total entries", String(meta.total), "All time", "var(--tx1)"],
          ["Active users", String(uniqueUsers), "On this page", "var(--t700)"],
        ] as [string, string, string, string][]).map(([l, v, s, c]) => (
          <div key={l} className="stat-card"><div className="slbl">{l}</div><div className="sval" style={{ color: c }}>{v}</div><div className="ssub">{s}</div></div>
        ))}
      </div>

      {/* Filter Controls */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 10, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--tx2)", marginBottom: 5 }}>Entity Type</div>
          <select
            className="sel"
            style={{ fontSize: 11, padding: "5px 8px", minWidth: 140 }}
            value={filters.entityType ?? ""}
            onChange={e => setFilters(f => ({ ...f, entityType: e.target.value || undefined }))}
          >
            <option value="">All entities</option>
            {ENTITY_TYPES.map(et => (
              <option key={et} value={et}>{et.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--tx2)", marginBottom: 5 }}>Action</div>
          <select
            className="sel"
            style={{ fontSize: 11, padding: "5px 8px", minWidth: 120 }}
            value={filters.action ?? ""}
            onChange={e => setFilters(f => ({ ...f, action: e.target.value || undefined }))}
          >
            <option value="">All actions</option>
            {ACTION_TYPES.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--tx2)", marginBottom: 5 }}>User ID</div>
          <input
            className="inp"
            style={{ fontSize: 11, padding: "5px 8px", width: 160 }}
            placeholder="UUID..."
            value={filters.userId ?? ""}
            onChange={e => setFilters(f => ({ ...f, userId: e.target.value || undefined }))}
          />
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--tx2)", marginBottom: 5 }}>From</div>
          <input
            className="inp"
            type="date"
            style={{ fontSize: 11, padding: "5px 8px", width: 130 }}
            value={filters.dateFrom ?? ""}
            onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value || undefined }))}
          />
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--tx2)", marginBottom: 5 }}>To</div>
          <input
            className="inp"
            type="date"
            style={{ fontSize: 11, padding: "5px 8px", width: 130 }}
            value={filters.dateTo ?? ""}
            onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value || undefined }))}
          />
        </div>

        <div style={{ display: "flex", gap: 6, paddingBottom: 1 }}>
          <button className="btn-primary" style={{ fontSize: 11, padding: "5px 14px" }} onClick={handleApplyFilters}>Apply</button>
          <button className="btn-secondary" style={{ fontSize: 11, padding: "5px 14px" }} onClick={handleClearFilters}>Clear</button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div style={{ marginBottom: 14, padding: 12, borderRadius: 10, background: "var(--redbg)", color: "var(--redtx)", fontSize: 12 }}>
          {error}
        </div>
      )}

      {/* Table */}
      <div className="card" style={{ overflow: "hidden" }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>User</th>
              <th>Action</th>
              <th>Entity Type</th>
              <th>Entity ID</th>
              <th>Summary</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: 32, color: "var(--tx3)", fontSize: 11 }}>Loading...</td>
              </tr>
            )}
            {!loading && logs.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: 32, color: "var(--tx3)", fontSize: 11 }}>No audit log entries found</td>
              </tr>
            )}
            {!loading && logs.map(log => (
              <AuditRow key={log.logId} log={log} expanded={expandedRows.has(log.logId)} onToggle={() => toggleRow(log.logId)} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
          <span style={{ fontSize: 11, color: "var(--tx3)" }}>
            Page {meta.page} of {totalPages} ({meta.total} total entries)
          </span>
          <div style={{ display: "flex", gap: 4 }}>
            <button className="btn-secondary" style={{ fontSize: 11, padding: "4px 12px" }} disabled={meta.page <= 1} onClick={() => handlePageChange(meta.page - 1)}>Previous</button>
            <button className="btn-secondary" style={{ fontSize: 11, padding: "4px 12px" }} disabled={meta.page >= totalPages} onClick={() => handlePageChange(meta.page + 1)}>Next</button>
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
      <tr onClick={onToggle} style={{ cursor: "pointer", background: expanded ? "var(--bg)" : undefined }}
        onMouseEnter={e => { if (!expanded) (e.currentTarget as HTMLElement).style.background = "var(--bg)"; }}
        onMouseLeave={e => { if (!expanded) (e.currentTarget as HTMLElement).style.background = ""; }}>
        <td style={{ whiteSpace: "nowrap" }}>{formatAuditTimestamp(log.createdAt)}</td>
        <td style={{ fontFamily: "var(--fm)", fontSize: 10 }}>
          {log.userId ? log.userId.slice(0, 8) + "..." : "—"}
        </td>
        <td>
          <span className={`badge ${ACTION_BADGE[log.action] ?? "b-gray"}`} style={{ fontSize: 9 }}>{log.action}</span>
        </td>
        <td>{log.entityType.replace(/_/g, " ")}</td>
        <td style={{ fontFamily: "var(--fm)", fontSize: 10 }}>{log.entityId.slice(0, 8)}...</td>
        <td>{summary}</td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={6} style={{ padding: 0 }}>
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
    <div style={{ background: "var(--bg)", borderTop: ".5px solid var(--bdr2)", padding: "12px 16px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Old Value */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--tx3)", marginBottom: 8 }}>Old Value</div>
          {log.oldValue ? (
            <pre style={{ fontSize: 10, background: "var(--surf)", padding: 8, borderRadius: 6, overflow: "auto", maxHeight: 192, border: ".5px solid var(--bdr)", margin: 0, fontFamily: "var(--fm)" }}>
              {JSON.stringify(log.oldValue, null, 2)}
            </pre>
          ) : (
            <span style={{ fontSize: 10, color: "var(--tx3)", fontStyle: "italic" }}>null</span>
          )}
        </div>

        {/* New Value */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--tx3)", marginBottom: 8 }}>New Value</div>
          {log.newValue ? (
            <pre style={{ fontSize: 10, background: "var(--surf)", padding: 8, borderRadius: 6, overflow: "auto", maxHeight: 192, border: ".5px solid var(--bdr)", margin: 0, fontFamily: "var(--fm)" }}>
              {JSON.stringify(log.newValue, null, 2)}
            </pre>
          ) : (
            <span style={{ fontSize: 10, color: "var(--tx3)", fontStyle: "italic" }}>null</span>
          )}
        </div>
      </div>

      {/* Diff Highlighting */}
      {diff.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--tx3)", marginBottom: 8 }}>Changes</div>
          <div style={{ background: "var(--surf)", borderRadius: 6, border: ".5px solid var(--bdr)", overflow: "hidden" }}>
            {diff
              .filter(d => d.type !== "unchanged")
              .map(entry => (
                <DiffRow key={entry.key} entry={entry} />
              ))}
            {diff.filter(d => d.type !== "unchanged").length === 0 && (
              <div style={{ padding: 8, fontSize: 10, color: "var(--tx3)", fontStyle: "italic" }}>No field-level changes detected</div>
            )}
          </div>
        </div>
      )}

      {/* Metadata */}
      {log.metadata && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--tx3)", marginBottom: 8 }}>Metadata</div>
          <pre style={{ fontSize: 10, background: "var(--surf)", padding: 8, borderRadius: 6, overflow: "auto", maxHeight: 128, border: ".5px solid var(--bdr)", margin: 0, fontFamily: "var(--fm)" }}>
            {JSON.stringify(log.metadata, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

function DiffRow({ entry }: { entry: DiffEntry }) {
  const colors: Record<string, { bg: string; color: string }> = {
    added: { bg: "var(--grnbg)", color: "var(--grntx)" },
    removed: { bg: "var(--redbg)", color: "var(--redtx)" },
    changed: { bg: "var(--ambbg)", color: "var(--ambtx)" },
  };

  const prefix: Record<string, string> = {
    added: "+",
    removed: "-",
    changed: "~",
  };

  const style = colors[entry.type] ?? { bg: "transparent", color: "var(--tx2)" };

  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "4px 8px", fontSize: 10, background: style.bg, color: style.color }}>
      <span style={{ fontFamily: "var(--fm)", fontWeight: 700, width: 10 }}>{prefix[entry.type]}</span>
      <span style={{ fontWeight: 600, minWidth: 80 }}>{entry.key}:</span>
      {entry.type === "changed" && (
        <span>
          <span style={{ textDecoration: "line-through", opacity: 0.6 }}>{formatValue(entry.oldVal)}</span>
          {" → "}
          <span style={{ fontWeight: 600 }}>{formatValue(entry.newVal)}</span>
        </span>
      )}
      {entry.type === "added" && <span style={{ fontWeight: 600 }}>{formatValue(entry.newVal)}</span>}
      {entry.type === "removed" && (
        <span style={{ textDecoration: "line-through" }}>{formatValue(entry.oldVal)}</span>
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
