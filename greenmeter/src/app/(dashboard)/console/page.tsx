"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useFilterStore } from "@/stores/filterStore";
import { useKpiValues } from "@/hooks/useKpiValues";
import { useCoverageMulti } from "@/hooks/useCoverage";
import { queryKeys } from "@/lib/queryKeys";
import { RollupBar } from "@/components/layout/RollupBar";
import { ROLLUP_LEVELS } from "@/app/data";

const STATUS_CFG: Record<string, { label: string; bg: string; col: string; dot: string }> = {
  green: { label: "On Track", bg: "#ecfdf5", col: "#15803d", dot: "#10b981" },
  amber: { label: "At Risk", bg: "#fffbeb", col: "#b45309", dot: "#f59e0b" },
  red: { label: "Alert", bg: "#fef2f2", col: "#b91c1c", dot: "#ef4444" },
  grey: { label: "Pending", bg: "#f8fafb", col: "#64748b", dot: "#94a3b8" },
};
const SRC_CFG: Record<string, { bg: string; col: string; label: string }> = {
  sap: { bg: "#e8f4fd", col: "#1565c0", label: "SAP" },
  excel_seed: { bg: "#ecfdf5", col: "#065f46", label: "Excel" },
  manual: { bg: "#f8fafb", col: "#64748b", label: "Manual" },
  api: { bg: "#eff6ff", col: "#1d4ed8", label: "API" },
};

interface Period { periodId: string; label: string; fiscalYear: string; startDate: string; endDate: string; status: string; }
interface OrgNode { nodeId: string; name: string; nodeType: string; parentNodeId: string | null; level: number; children?: OrgNode[]; }

function flattenNodes(nodes: OrgNode[]): OrgNode[] {
  const result: OrgNode[] = [];
  for (const n of nodes) {
    result.push(n);
    if (n.children) result.push(...flattenNodes(n.children));
  }
  return result;
}

export default function ConsolePage() {
  const router = useRouter();
  const { activePeriod } = useFilterStore();
  const [rollupLevel, setRollupLevel] = useState("department");
  const [tab, setTab] = useState<"E" | "S" | "G">("E");
  const [search, setSearch] = useState("");
  const [stdFilter, setStdFilter] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [nodeFilter, setNodeFilter] = useState("");
  const [periodFilter, setPeriodFilter] = useState("");

  /* ── Periods & Org nodes ── */
  const { data: periods = [] } = useQuery<Period[]>({
    queryKey: queryKeys.periods.list(),
    queryFn: async () => { const r = await fetch("/api/periods"); if (!r.ok) throw new Error("Failed"); const j = await r.json(); return j.data; },
  });
  const { data: orgTree = [] } = useQuery<OrgNode[]>({
    queryKey: queryKeys.orgNodes.tree(),
    queryFn: async () => { const r = await fetch("/api/org-hierarchy"); if (!r.ok) throw new Error("Failed"); const j = await r.json(); return j.data; },
  });

  const allNodes = useMemo(() => flattenNodes(orgTree), [orgTree]);
  const rootNode = useMemo(() => allNodes.find((n) => n.parentNodeId === null) ?? allNodes[0], [allNodes]);
  const currentPeriod = useMemo(() => {
    if (periodFilter) return periods.find((p) => p.periodId === periodFilter);
    if (activePeriod) return periods.find((p) => p.periodId === activePeriod);
    return periods[0];
  }, [periodFilter, activePeriod, periods]);

  const periodId = currentPeriod?.periodId ?? "";
  const nodeId = nodeFilter || rootNode?.nodeId || "";
  const hasContext = !!periodId && !!nodeId;

  const pillarMap: Record<string, string> = { E: "E", S: "S", G: "G" };
  const pillarLabel: Record<string, string> = { E: "Environment", S: "Social", G: "Governance" };

  /* ── KPI values for selected pillar ── */
  const { data: kpiResp, isLoading: kpiLoading } = useKpiValues({
    periodId,
    pillar: pillarMap[tab],
    standard: stdFilter || undefined,
    category: catFilter || undefined,
    nodeId,
    pageSize: 100,
  }, hasContext);

  const allRows = kpiResp?.data ?? [];
  const rows = allRows.filter(
    (r) =>
      !search ||
      r.paramName.toLowerCase().includes(search.toLowerCase()) ||
      r.paramCode.toLowerCase().includes(search.toLowerCase())
  );

  /* ── Coverage for completeness strip ── */
  const ALL_FW = ["BRSR", "ESRS", "GRI", "IFRS_S2"];
  const { data: coverageResp } = useCoverageMulti(ALL_FW, periodId, hasContext);
  const coverages = coverageResp?.coverages ?? [];

  const envCov = coverages.find((c) => c.sections?.some((s) => s.standardSection?.toLowerCase().includes("environment")));
  const pillarCoverage = useMemo(() => {
    let eTotal = 0, eHas = 0, sTotal = 0, sHas = 0, gTotal = 0, gHas = 0;
    for (const c of coverages) {
      for (const sec of c.sections ?? []) {
        const sl = sec.standardSection?.toLowerCase() ?? "";
        if (sl.includes("environment") || sl.includes("emission") || sl.includes("energy") || sl.includes("water") || sl.includes("waste") || sl.includes("biodiversity")) {
          eTotal += sec.totalParams; eHas += sec.hasValue;
        } else if (sl.includes("social") || sl.includes("employee") || sl.includes("worker") || sl.includes("human") || sl.includes("community") || sl.includes("health")) {
          sTotal += sec.totalParams; sHas += sec.hasValue;
        } else if (sl.includes("governance") || sl.includes("business") || sl.includes("leadership") || sl.includes("ethics") || sl.includes("board")) {
          gTotal += sec.totalParams; gHas += sec.hasValue;
        }
      }
    }
    return {
      E: { total: eTotal, has: eHas, pct: eTotal > 0 ? Math.round(eHas / eTotal * 100) : 0 },
      S: { total: sTotal, has: sHas, pct: sTotal > 0 ? Math.round(sHas / sTotal * 100) : 0 },
      G: { total: gTotal, has: gHas, pct: gTotal > 0 ? Math.round(gHas / gTotal * 100) : 0 },
    };
  }, [coverages]);

  const totalParams = coverages.reduce((s, c) => s + c.totalParams, 0);
  const totalHas = coverages.reduce((s, c) => s + c.hasValue, 0);
  const overallPct = totalParams > 0 ? Math.round(totalHas / totalParams * 100) : 0;

  const tabBg = tab === "E" ? "#f0fdfa" : tab === "S" ? "#eef2ff" : "#fffbeb";
  const tabCol = tab === "E" ? "#0f766e" : tab === "S" ? "#6366f1" : "#d97706";

  const selectedNode = allNodes.find((n) => n.nodeId === nodeId);

  return (
    <div>
      <div className="ph">
        <div>
          <div className="ptitle">Console</div>
          <div className="psub">
            {currentPeriod ? `FY ${currentPeriod.fiscalYear}` : ""} · {overallPct}% complete · data rolls up: Department → Facility → Subsidiary → Organization
          </div>
        </div>
        <div className="ph-acts">
          <button className="btn-secondary">Integrations</button>
          <button className="btn-primary">Save &amp; submit for review</button>
        </div>
      </div>
      <RollupBar levels={ROLLUP_LEVELS} activeLevel={rollupLevel} onSetLevel={setRollupLevel} />

      {/* Filter bar */}
      <div style={{ background: "var(--surf)", border: ".5px solid var(--bdr)", borderRadius: 10, padding: "10px 14px", marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4" stroke="#94a3b8" strokeWidth="1.3" /><path d="M10 10l3 3" stroke="#94a3b8" strokeWidth="1.3" strokeLinecap="round" /></svg>
          <input style={{ width: "100%", padding: "8px 12px 8px 30px", border: ".5px solid var(--bdr)", borderRadius: 7, fontSize: 12, outline: "none", background: "var(--surf)" }} placeholder="Search parameters…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="sel" style={{ width: 140, fontSize: 12, padding: "7px 10px" }} value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)}>
          <option value="">All periods</option>
          {periods.map((p) => <option key={p.periodId} value={p.periodId}>FY {p.fiscalYear}</option>)}
        </select>
        <select className="sel" style={{ width: 120, fontSize: 12, padding: "7px 10px" }} value={stdFilter} onChange={(e) => setStdFilter(e.target.value)}>
          <option value="">All standards</option>
          <option value="BRSR">BRSR</option><option value="GRI">GRI 2021</option><option value="ESRS">ESRS</option><option value="IFRS_S2">IFRS S2</option>
        </select>
        <select className="sel" style={{ width: 150, fontSize: 12, padding: "7px 10px" }} value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
          <option value="">All categories</option>
          <option value="Environmental">Environmental</option><option value="Social">Social</option><option value="Governance">Governance</option>
        </select>
        <select className="sel" style={{ width: 180, fontSize: 12, padding: "7px 10px" }} value={nodeFilter} onChange={(e) => setNodeFilter(e.target.value)}>
          <option value="">{ rootNode?.name ?? "Organization" }</option>
          {allNodes.filter((n) => n.parentNodeId !== null).map((n) => (
            <option key={n.nodeId} value={n.nodeId}>{n.name} ({n.nodeType})</option>
          ))}
        </select>
      </div>

      {/* Completeness strip */}
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr 1fr 1fr", gap: 10, alignItems: "center", background: "var(--surf)", border: ".5px solid var(--bdr)", borderRadius: 10, padding: "12px 16px", marginBottom: 12 }}>
        <div style={{ position: "relative", width: 52, height: 52, flexShrink: 0 }}>
          <svg viewBox="0 0 52 52" width="52" height="52" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="26" cy="26" r="22" fill="none" stroke="#f3f4f6" strokeWidth="4" />
            <circle cx="26" cy="26" r="22" fill="none" stroke="#14b8a6" strokeWidth="4" strokeDasharray={`${Math.round(2 * Math.PI * 22 * (overallPct / 100))} ${Math.round(2 * Math.PI * 22)}`} strokeLinecap="round" />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, fontFamily: "var(--fm)" }}>{overallPct}%</div>
        </div>
        {([["Environment", pillarCoverage.E, "var(--t500)"], ["Social", pillarCoverage.S, "var(--ind)"], ["Governance", pillarCoverage.G, "var(--amb)"]] as [string, { total: number; has: number; pct: number }, string][]).map(([l, cov, col]) => (
          <div key={l}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
              <span style={{ color: "var(--tx2)", fontWeight: 500 }}>{l}</span>
              <span style={{ fontFamily: "var(--fm)", fontWeight: 700 }}>{cov.has}/{cov.total}</span>
            </div>
            <div className="pbar-bg" style={{ height: 5 }}><div className="pbar-fill" style={{ width: `${cov.pct}%`, height: 5, background: col }} /></div>
            <div style={{ fontSize: 10, color: "var(--tx3)", marginTop: 3 }}>{cov.pct}% complete</div>
          </div>
        ))}
      </div>

      {/* Pillar tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 0, border: ".5px solid var(--bdr)", borderRadius: "9px 9px 0 0", overflow: "hidden", background: "var(--surf)" }}>
        {(["E", "S", "G"] as const).map((k) => {
          const cov = pillarCoverage[k];
          return (
            <div key={k} onClick={() => setTab(k)} style={{
              flex: 1, padding: "10px 14px", cursor: "pointer",
              background: tab === k ? "var(--t50)" : "var(--surf)",
              borderRight: ".5px solid var(--bdr)",
              borderBottom: tab === k ? "2px solid var(--t700)" : ".5px solid var(--bdr)",
              transition: "background .12s",
            }}>
              <div style={{ fontSize: 12, fontWeight: tab === k ? 700 : 500, color: tab === k ? "var(--t800)" : "var(--tx2)" }}>
                <span className={`badge b-${k.toLowerCase() === "e" ? "e" : k.toLowerCase() === "s" ? "s" : "g"}`} style={{ fontSize: 9, marginRight: 5 }}>{k}</span>{pillarLabel[k]}
              </div>
              <div style={{ fontSize: 10, color: "var(--tx3)", marginTop: 2 }}>{cov.has} / {cov.total} KPIs</div>
            </div>
          );
        })}
        <div style={{ flex: 1, padding: "10px 14px", background: "var(--surf)" }} />
      </div>

      {/* Parameter table */}
      <div style={{ background: "var(--surf)", border: ".5px solid var(--bdr)", borderTop: "none", borderRadius: "0 0 10px 10px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--bg)", borderBottom: ".5px solid var(--bdr)" }}>
              {["Parameter", "Current value", "Unit", "Standard", "Status", "Source", "Last updated", ""].map((h) => (
                <th key={h} style={{ padding: "10px 10px", textAlign: "left", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--tx3)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {kpiLoading && !rows.length ? (
              <tr><td colSpan={8} style={{ padding: 32, textAlign: "center", fontSize: 11, color: "var(--tx3)" }}>Loading parameters...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: 32, textAlign: "center", fontSize: 11, color: "var(--tx3)" }}>No parameters found for this selection</td></tr>
            ) : rows.map((r) => {
              const stCfg = STATUS_CFG[r.ragStatus] ?? STATUS_CFG.grey;
              const srcCfg = SRC_CFG[r.sourceType] ?? SRC_CFG.manual;
              const hasVal = r.value != null || r.valueText != null;
              return (
                <tr key={r.valueId ?? r.paramId} style={{ borderBottom: ".5px solid var(--bdr2)", transition: "background .1s" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#f8fafb")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "")}>
                  <td style={{ padding: "14px 10px 14px 14px", verticalAlign: "top" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: tabBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 2C5 2 2 5 2 8c0 2.2 1.2 4.1 3 5.2V11c0-1.7 1.3-3 3-3s3 1.3 3 3v2.2C12.8 12.1 14 10.2 14 8c0-3-2.5-6-6-6z" fill={tabCol} opacity=".7" /><circle cx="8" cy="8" r="2" fill={tabCol} /></svg>
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--tx1)", lineHeight: 1.3 }}>{r.paramName}</div>
                        <div style={{ fontSize: 10, color: "var(--tx3)", marginTop: 3 }}>{r.paramCode} · {r.category ?? r.pillar}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "14px 10px", verticalAlign: "top", minWidth: 120 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                      <span style={{ fontSize: hasVal ? 16 : 13, fontWeight: 700, fontFamily: "var(--fm)", color: hasVal ? "var(--tx1)" : "var(--tx3)" }}>{hasVal ? (r.value ?? r.valueText) : "—"}</span>
                    </div>
                    <div style={{ marginTop: 6, height: 3, width: 80, background: "var(--bdr2)", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 2, background: stCfg.dot, width: hasVal ? "60%" : "0%" }} />
                    </div>
                  </td>
                  <td style={{ padding: "14px 10px", verticalAlign: "top" }}>
                    <span style={{ fontSize: 11, color: "var(--tx3)" }}>{r.paramUnit}</span>
                  </td>
                  <td style={{ padding: "14px 10px", verticalAlign: "top" }}>
                    <span className="badge b-teal" style={{ fontSize: 9 }}>{r.standard}</span>
                  </td>
                  <td style={{ padding: "14px 10px", verticalAlign: "top" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: stCfg.bg, borderRadius: 20, padding: "4px 10px", border: `.5px solid ${stCfg.dot}30` }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: stCfg.dot }} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: stCfg.col }}>{stCfg.label}</span>
                    </div>
                  </td>
                  <td style={{ padding: "14px 10px", verticalAlign: "top" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: srcCfg.bg, borderRadius: 6, padding: "4px 9px", border: `.5px solid ${srcCfg.bg}` }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: srcCfg.col, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: srcCfg.col }}>{srcCfg.label}</span>
                    </div>
                  </td>
                  <td style={{ padding: "14px 10px", verticalAlign: "top" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--tx3)" }}>
                      <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="#94a3b8" strokeWidth="1.3" /><path d="M8 5v3l2 2" stroke="#94a3b8" strokeWidth="1.3" strokeLinecap="round" /></svg>
                      {r.updatedAt ? (
                        <span style={{ fontSize: 10 }}>{new Date(r.updatedAt).toLocaleDateString()}</span>
                      ) : <span style={{ color: "var(--bdr)" }}>—</span>}
                    </div>
                  </td>
                  <td style={{ padding: "14px 10px 14px 6px", verticalAlign: "top", whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <button style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "none", border: ".5px solid var(--bdr)", borderRadius: 6, padding: "5px 9px", fontSize: 11, fontWeight: 500, color: "var(--tx2)", cursor: "pointer", whiteSpace: "nowrap" }}>
                        History
                      </button>
                      <button onClick={() => router.push("/console")} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "var(--t700)", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 11, fontWeight: 600, color: "#fff", cursor: "pointer", whiteSpace: "nowrap" }}>
                        <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8h12" stroke="white" strokeWidth="2" strokeLinecap="round" /></svg>
                        Log Data
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
