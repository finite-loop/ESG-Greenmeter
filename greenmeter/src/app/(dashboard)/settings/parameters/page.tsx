"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/* ── Types ─────────────────────────────────────────────────────── */

interface ParameterEntry {
  paramId: string;
  tenantId: string | null;
  standard: string;
  standardSection: string;
  standardCode: string | null;
  code: string;
  name: string;
  description: string | null;
  pillar: string;
  unit: string;
  dataType: string;
  category: string | null;
  direction: string | null;
  rollupMethod: string | null;
  howToMeasure: string | null;
  howToCompute: string | null;
  howToReport: string | null;
  status: string | null;
  src: string | null;
  depts: string[] | null;
  standards: string[] | null;
  overrideParamId: string | null;
}

interface ParameterListResponse {
  data: ParameterEntry[];
  meta: { page: number; pageSize: number; total: number };
}

/* ── Constants ─────────────────────────────────────────────────── */

const STD_COLORS: Record<string, { bg: string; col: string }> = {
  BRSR:   { bg: "#fef2f2", col: "#991b1b" },
  GRI:    { bg: "#f0fdfa", col: "#0f766e" },
  ESRS:   { bg: "#fffbeb", col: "#92400e" },
  IFRS:   { bg: "#eef2ff", col: "#3730a3" },
  IFRS_S2:{ bg: "#eef2ff", col: "#3730a3" },
  SASB:   { bg: "#fdf4ff", col: "#7e22ce" },
  TCFD:   { bg: "#f0f9ff", col: "#0369a1" },
  Custom: { bg: "#f8fafb", col: "#64748b" },
};

const STD_CHIPS = ["all", "BRSR", "GRI", "ESRS", "IFRS_S2", "SASB", "TCFD"] as const;

/* ── Page ──────────────────────────────────────────────────────── */

export default function ParametersPage() {
  const [parameters, setParameters] = useState<ParameterEntry[]>([]);
  const [meta, setMeta] = useState({ page: 1, pageSize: 20, total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [selStd, setSelStd] = useState<string>("all");
  const [pillar, setPillar] = useState("all");

  // Detail panel
  const [selParam, setSelParam] = useState<ParameterEntry | null>(null);

  // Edit state (for detail panel save)
  const [saving, setSaving] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  /* ── Data fetching ── */

  const fetchParameters = useCallback(
    async (page: number, opts?: { search?: string; standard?: string; pillar?: string }) => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("pageSize", "20");
        const s = opts?.search ?? search;
        const std = opts?.standard ?? (selStd === "all" ? "" : selStd);
        const p = opts?.pillar ?? (pillar === "all" ? "" : pillar);
        if (s) params.set("search", s);
        if (std) params.set("standard", std);
        if (p) params.set("pillar", p);

        const res = await fetch(`/api/parameters?${params.toString()}`, { signal: controller.signal });
        if (res.status === 401 || res.status === 403) { setUnauthorized(true); return; }
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          setError(body?.error?.message ?? `Request failed with status ${res.status}`);
          return;
        }
        const json: ParameterListResponse = await res.json();
        setParameters(json.data);
        setMeta(json.meta);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Failed to fetch parameters");
      } finally {
        setLoading(false);
      }
    },
    [search, selStd, pillar]
  );

  useEffect(() => {
    fetchParameters(1);
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((s) => { if (s?.user?.role === "admin") setIsAdmin(true); })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleFilterChange(newStd?: string, newPillar?: string) {
    const std = newStd ?? selStd;
    const p = newPillar ?? pillar;
    fetchParameters(1, {
      search: search || undefined,
      standard: std === "all" ? undefined : std,
      pillar: p === "all" ? undefined : p,
    });
  }

  function handleSearchKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleFilterChange();
  }

  function handlePageChange(newPage: number) {
    fetchParameters(newPage, {
      search: search || undefined,
      standard: selStd === "all" ? undefined : selStd,
      pillar: pillar === "all" ? undefined : pillar,
    });
  }

  /* ── Save overrides from detail panel ── */

  async function handleSaveOverride(paramId: string, payload: Record<string, unknown>) {
    if (Object.keys(payload).length === 0) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/parameters/${paramId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) return;
      // Refresh list
      fetchParameters(meta.page, {
        search: search || undefined,
        standard: selStd === "all" ? undefined : selStd,
        pillar: pillar === "all" ? undefined : pillar,
      });
    } finally {
      setSaving(false);
    }
  }

  const totalPages = Math.ceil(meta.total / (meta.pageSize || 20));

  /* ── Unauthorized ── */

  if (unauthorized) {
    return (
      <div>
        <div className="ph">
          <div><div className="ptitle">Parameters &amp; KPI library</div><div className="psub">Access restricted</div></div>
        </div>
        <div style={{ padding: 12, borderRadius: 8, background: "var(--redbg)", color: "var(--redtx)", fontSize: 12 }}>
          You do not have permission to view parameters. This page is restricted to Admin and Analyst roles.
        </div>
      </div>
    );
  }

  /* ── Render ── */

  return (
    <div>
      {/* Page header */}
      <div className="ph">
        <div>
          <div className="ptitle">Parameters &amp; KPI library</div>
          <div className="psub">All standards &middot; system &middot; HSN overlay &middot; custom &middot; with measurement methods and thresholds</div>
        </div>
        <div className="ph-acts">
          <button className="btn-secondary">Import standard</button>
          <button className="btn-primary">+ Add parameter</button>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4" stroke="#94a3b8" strokeWidth="1.3" /><path d="M10 10l3 3" stroke="#94a3b8" strokeWidth="1.3" strokeLinecap="round" /></svg>
          <input
            style={{ width: "100%", padding: "8px 12px 8px 30px", border: ".5px solid var(--bdr)", borderRadius: 7, fontSize: 12, outline: "none", background: "var(--surf)" }}
            placeholder="Search parameters by name, code or category\u2026"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
          />
        </div>
        {STD_CHIPS.map((k) => (
          <button
            key={k}
            onClick={() => { setSelStd(k); setSelParam(null); handleFilterChange(k); }}
            style={{
              padding: "5px 11px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer",
              border: `1.5px solid ${selStd === k ? "#0f766e" : "var(--bdr)"}`,
              background: selStd === k ? "#f0fdfa" : "var(--surf)",
              color: selStd === k ? "#0f766e" : "var(--tx2)",
              transition: "all .12s",
            }}
          >
            {k === "all" ? "All" : k === "IFRS_S2" ? "IFRS" : k}
          </button>
        ))}
        <select
          className="sel"
          style={{ fontSize: 11, padding: "6px 10px", width: 130 }}
          value={pillar}
          onChange={(e) => { setPillar(e.target.value); setSelParam(null); handleFilterChange(undefined, e.target.value); }}
        >
          <option value="all">All pillars</option>
          <option value="E">Environment</option>
          <option value="S">Social</option>
          <option value="G">Governance</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div style={{ marginBottom: 12, padding: 10, borderRadius: 8, background: "var(--redbg)", color: "var(--redtx)", fontSize: 12 }}>
          {error}
        </div>
      )}

      {/* Split pane */}
      <div style={{ display: "grid", gridTemplateColumns: selParam ? "1fr 380px" : "1fr", gap: 12, alignItems: "flex-start" }}>
        {/* Table */}
        <div style={{ background: "var(--surf)", border: ".5px solid var(--bdr)", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg)", borderBottom: ".5px solid var(--bdr)" }}>
                {["Parameter", "Standards", "Unit", "Type", "Status", ""].map((h) => (
                  <th key={h} style={{ padding: "9px 10px", textAlign: "left", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--tx3)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: "32px 10px", color: "var(--tx3)", fontSize: 12 }}>Loading...</td></tr>
              )}
              {!loading && parameters.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: "32px 10px", color: "var(--tx3)", fontSize: 12 }}>No parameters found</td></tr>
              )}
              {!loading && parameters.map((p) => {
                const pCol = p.pillar === "E" ? "var(--t700)" : p.pillar === "S" ? "var(--ind)" : "var(--amb)";
                const pBg = p.pillar === "E" ? "var(--t50)" : p.pillar === "S" ? "var(--indbg)" : "var(--ambbg)";
                const isSel = selParam?.paramId === p.paramId;
                const stdList = p.standards ?? [p.standard];
                const srcLabel = p.src === "tenant_override" ? "Custom" : "System";
                const srcBadge = p.src === "tenant_override" ? "b-amber" : "b-teal";

                return (
                  <tr
                    key={p.paramId}
                    style={{ borderBottom: ".5px solid var(--bdr2)", background: isSel ? "var(--t50)" : "var(--surf)", cursor: "pointer", transition: "background .1s" }}
                    onClick={() => setSelParam(isSel ? null : p)}
                    onMouseEnter={(e) => { if (!isSel) (e.currentTarget as HTMLElement).style.background = "var(--bg)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = isSel ? "var(--t50)" : "var(--surf)"; }}
                  >
                    {/* Parameter cell: pillar badge + name + code + category */}
                    <td style={{ padding: "11px 10px 11px 14px" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                        <span style={{ fontSize: 9, fontFamily: "var(--fm)", fontWeight: 700, color: pCol, background: pBg, padding: "2px 6px", borderRadius: 4, flexShrink: 0, marginTop: 1 }}>{p.pillar}</span>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--tx1)" }}>{p.name}</div>
                          <div style={{ fontSize: 10, color: "var(--tx3)", marginTop: 1 }}>{p.code} &middot; {p.category ?? "—"}</div>
                        </div>
                      </div>
                    </td>

                    {/* Standards */}
                    <td style={{ padding: "11px 10px" }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                        {stdList.map((s) => (
                          <span key={s} style={{ fontSize: 9, padding: "2px 6px", borderRadius: 3, fontWeight: 600, background: STD_COLORS[s]?.bg ?? "#f3f4f6", color: STD_COLORS[s]?.col ?? "#64748b" }}>{s === "IFRS_S2" ? "IFRS" : s}</span>
                        ))}
                      </div>
                    </td>

                    {/* Unit */}
                    <td style={{ padding: "11px 10px", fontSize: 11, fontFamily: "var(--fm)", color: "var(--tx3)" }}>{p.unit}</td>

                    {/* Type */}
                    <td style={{ padding: "11px 10px" }}>
                      <span className={`badge ${srcBadge}`} style={{ fontSize: 9 }}>{srcLabel}</span>
                    </td>

                    {/* Status */}
                    <td style={{ padding: "11px 10px" }}>
                      <span className={`badge ${p.status === "active" ? "b-green" : "b-red"}`} style={{ fontSize: 9 }}>{p.status ?? "active"}</span>
                    </td>

                    {/* Details button */}
                    <td style={{ padding: "11px 10px 11px 6px", whiteSpace: "nowrap" }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelParam(isSel ? null : p); }}
                        style={{ background: "none", border: ".5px solid var(--bdr)", borderRadius: 5, padding: "4px 8px", fontSize: 10, fontWeight: 500, cursor: "pointer", color: "var(--tx2)" }}
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderTop: ".5px solid var(--bdr)" }}>
              <span style={{ fontSize: 11, color: "var(--tx3)" }}>
                Page {meta.page} of {totalPages} ({meta.total} parameters)
              </span>
              <div style={{ display: "flex", gap: 4 }}>
                <button className="btn-secondary" style={{ padding: "4px 10px", fontSize: 11 }} disabled={meta.page <= 1} onClick={() => handlePageChange(meta.page - 1)}>Previous</button>
                <button className="btn-secondary" style={{ padding: "4px 10px", fontSize: 11 }} disabled={meta.page >= totalPages} onClick={() => handlePageChange(meta.page + 1)}>Next</button>
              </div>
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selParam && (
          <DetailPanel
            param={selParam}
            isAdmin={isAdmin}
            saving={saving}
            onClose={() => setSelParam(null)}
            onSave={handleSaveOverride}
          />
        )}
      </div>
    </div>
  );
}

/* ── Detail Panel ─────────────────────────────────────────────── */

function DetailPanel({
  param,
  isAdmin,
  saving,
  onClose,
  onSave,
}: {
  param: ParameterEntry;
  isAdmin: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: (paramId: string, payload: Record<string, unknown>) => void;
}) {
  const pCol = param.pillar === "E" ? "var(--t700)" : param.pillar === "S" ? "var(--ind)" : "var(--amb)";

  const howToBoxes: [string, string, string, string][] = [
    ["How to measure", "var(--t50)", "var(--t700)", param.howToMeasure ?? "Collect data from primary sources — installed meters, sensors, and direct instrument readings at each facility intake point."],
    ["How to compute", "var(--indbg)", "var(--ind)", param.howToCompute ?? "Apply the relevant emission factor or conversion factor to the activity data. Follow GHG Protocol or sector-specific methodology."],
    ["How to report", "var(--ambbg)", "var(--amb)", param.howToReport ?? "Report the absolute value plus any normalised intensity metric. State the methodology, data quality, and any estimations used."],
  ];

  const defaultDepts = ["Operations", "Manufacturing", "Human Resources", "Supply Chain", "Finance", "EHS", "Legal & Compliance", "CSR / Sustainability"];
  const assignedDepts = param.depts ?? [];

  // Local edit state for threshold inputs and dept checkboxes
  const [deptChecks, setDeptChecks] = useState<Record<string, boolean>>(() => {
    const m: Record<string, boolean> = {};
    for (const d of defaultDepts) m[d] = assignedDepts.includes(d);
    return m;
  });

  function handleDeptToggle(dept: string) {
    setDeptChecks((prev) => ({ ...prev, [dept]: !prev[dept] }));
  }

  function handleSave() {
    const newDepts = defaultDepts.filter((d) => deptChecks[d]);
    const payload: Record<string, unknown> = {};
    if (JSON.stringify(newDepts) !== JSON.stringify(assignedDepts)) {
      payload.depts = newDepts;
    }
    onSave(param.paramId, payload);
  }

  return (
    <div style={{ background: "var(--surf)", border: ".5px solid var(--t300)", borderRadius: 12, overflow: "hidden", position: "sticky", top: 60, maxHeight: "calc(100vh - 80px)", overflowY: "auto" }}>
      <div style={{ padding: 16 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 10, fontFamily: "var(--fm)", fontWeight: 700, color: pCol, marginBottom: 3 }}>{param.code} &middot; {param.category ?? "—"}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--tx1)" }}>{param.name}</div>
            <div style={{ fontSize: 11, color: "var(--tx2)", marginTop: 3 }}>Unit: {param.unit}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "var(--tx3)", padding: 0 }}>&times;</button>
        </div>

        {/* Description */}
        {param.description && (
          <div style={{ fontSize: 11, color: "var(--tx2)", lineHeight: 1.6, marginBottom: 12, padding: "8px 10px", background: "var(--bg)", borderRadius: 7 }}>
            {param.description}
          </div>
        )}

        {/* How-to boxes */}
        {howToBoxes.map(([title, bg, col, text]) => (
          <div key={title} style={{ background: bg, borderRadius: 7, padding: "10px 12px", marginBottom: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: col, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>{title}</div>
            <div style={{ fontSize: 11, color: "var(--tx1)", lineHeight: 1.6 }}>{text}</div>
          </div>
        ))}

        {/* Standards list */}
        <div style={{ borderTop: ".5px solid var(--bdr2)", paddingTop: 12, marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--tx1)", marginBottom: 8 }}>Standards</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {(param.standards ?? [param.standard]).map((s) => (
              <span key={s} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 4, fontWeight: 600, background: STD_COLORS[s]?.bg ?? "#f3f4f6", color: STD_COLORS[s]?.col ?? "#64748b" }}>{s === "IFRS_S2" ? "IFRS" : s}</span>
            ))}
          </div>
        </div>

        {/* Metadata */}
        <div style={{ borderTop: ".5px solid var(--bdr2)", paddingTop: 12, marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--tx1)", marginBottom: 8 }}>Details</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {([
              ["Direction", param.direction === "higher_is_better" ? "Higher is better" : "Lower is better"],
              ["Rollup", param.rollupMethod ?? "SUM"],
              ["Data type", param.dataType],
              ["Section", param.standardSection],
            ] as [string, string][]).map(([label, val]) => (
              <div key={label} style={{ padding: "6px 8px", background: "var(--bg)", borderRadius: 5 }}>
                <div style={{ fontSize: 9, fontWeight: 600, color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".05em" }}>{label}</div>
                <div style={{ fontSize: 11, color: "var(--tx1)", marginTop: 2 }}>{val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Department assignment */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--tx1)", marginBottom: 8 }}>Department assignment</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {defaultDepts.map((dept) => (
              <label key={dept} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", border: ".5px solid var(--bdr)", borderRadius: 7, cursor: isAdmin ? "pointer" : "default", opacity: isAdmin ? 1 : 0.7 }}>
                <input
                  type="checkbox"
                  checked={deptChecks[dept] ?? false}
                  onChange={() => handleDeptToggle(dept)}
                  disabled={!isAdmin}
                  style={{ accentColor: "var(--t700)", width: 14, height: 14, flexShrink: 0 }}
                />
                <span style={{ fontSize: 11, fontWeight: 500, color: "var(--tx1)" }}>{dept}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Save button (admin only) */}
        {isAdmin && (
          <div style={{ marginTop: 14 }}>
            <button
              className="btn-primary"
              style={{ width: "100%", justifyContent: "center" }}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving\u2026" : "Save changes"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
