"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useFilterStore } from "@/stores/filterStore";
import { useBenchmarkMetrics, useBenchmarkMulti } from "@/hooks/useBenchmarks";
import { useKpiValues } from "@/hooks/useKpiValues";
import { useRecommendations, type Recommendation } from "@/hooks/useRecommendations";
import { useGoals } from "@/hooks/useGoals";
import { useCoverageMulti } from "@/hooks/useCoverage";
import { queryKeys } from "@/lib/queryKeys";
import { ScoreOverview } from "@/components/dashboard/ScoreOverview";
import { CoverageWidget } from "@/components/dashboard/CoverageWidget";
import { RollupBar } from "@/components/layout/RollupBar";
import { ROLLUP_LEVELS } from "@/app/data";

/* ── Colour / label config for standards ── */
const STD_CONFIG: Record<string, { label: string; color: string; bg: string; apiKey: string }> = {
  all:  { label: "All standards", color: "#0f766e", bg: "#f0fdfa", apiKey: "" },
  brsr: { label: "BRSR Core", color: "#ef4444", bg: "#fef2f2", apiKey: "BRSR" },
  gri:  { label: "GRI 2021", color: "#14b8a6", bg: "#f0fdfa", apiKey: "GRI" },
  esrs: { label: "ESRS (CSRD)", color: "#f59e0b", bg: "#fffbeb", apiKey: "ESRS" },
  ifrs: { label: "IFRS S1+S2", color: "#6366f1", bg: "#eef2ff", apiKey: "IFRS_S2" },
};

const RAG_LABEL: Record<string, string> = { green: "On track", red: "Below", amber: "Review", grey: "Pending" };
const RAG_CLASS: Record<string, string> = { green: "b-green", red: "b-red", amber: "b-amber", grey: "b-gray" };

interface Period { periodId: string; label: string; fiscalYear: string; startDate: string; endDate: string; status: string; }
interface OrgNode { nodeId: string; name: string; nodeType: string; parentNodeId: string | null; level: number; }

export default function DashboardPage() {
  const router = useRouter();
  const [rollupLevel, setRollupLevel] = useState("organization");
  const [dashStd, setDashStd] = useState("all");
  const { activePeriod } = useFilterStore();
  const trendRef = useRef<HTMLCanvasElement>(null);

  /* ── Periods & Org nodes ── */
  const { data: periods = [], isLoading: periodsLoading } = useQuery<Period[]>({
    queryKey: queryKeys.periods.list(),
    queryFn: async () => { const r = await fetch("/api/periods"); if (!r.ok) throw new Error("Failed"); const j = await r.json(); return j.data; },
  });
  const { data: orgNodes = [], isLoading: orgNodesLoading } = useQuery<OrgNode[]>({
    queryKey: queryKeys.orgNodes.tree(),
    queryFn: async () => { const r = await fetch("/api/org-hierarchy"); if (!r.ok) throw new Error("Failed"); const j = await r.json(); return j.data; },
  });

  const currentPeriod = useMemo(() => (activePeriod ? periods.find((p) => p.periodId === activePeriod) : undefined) ?? periods[0], [activePeriod, periods]);
  const previousPeriod = useMemo(() => { if (!currentPeriod) return undefined; const i = periods.findIndex((p) => p.periodId === currentPeriod.periodId); return i >= 0 && i + 1 < periods.length ? periods[i + 1] : undefined; }, [currentPeriod, periods]);
  const rootNode = useMemo(() => orgNodes.find((n) => n.parentNodeId === null) ?? orgNodes[0], [orgNodes]);

  const periodId = currentPeriod?.periodId ?? "";
  const previousPeriodId = previousPeriod?.periodId;
  const nodeId = rootNode?.nodeId ?? "";
  const fiscalYear = currentPeriod?.fiscalYear ?? "";
  const hasContext = !!periodId && !!nodeId;
  const isBootstrapping = periodsLoading || orgNodesLoading;

  const sm = STD_CONFIG[dashStd];
  const stdFilter = sm.apiKey || undefined; // undefined = all standards

  /* ── Peer benchmark data ── */
  const { data: metricsResp } = useBenchmarkMetrics({ fiscalYear, enabled: !!fiscalYear });
  const topMetricIds = useMemo(() => {
    const m = metricsResp?.data ?? [];
    return m.filter((x) => !x.insufficientData).slice(0, 5).map((x) => x.canonicalId);
  }, [metricsResp]);
  const { data: benchmarks } = useBenchmarkMulti(topMetricIds, fiscalYear, { periodId, enabled: topMetricIds.length > 0 && !!fiscalYear });
  const peerCount = useMemo(() => Math.max(0, ...(benchmarks ?? []).map((b) => b.peerCount)), [benchmarks]);

  /* ── Key parameters (top 6 for selected standard) ── */
  const { data: kpiResp } = useKpiValues({ periodId, nodeId, standard: stdFilter, pageSize: 6 }, hasContext);
  const keyParams = kpiResp?.data ?? [];

  /* ── AI Recommendations / Alerts ── */
  const { data: recsResp } = useRecommendations(10, hasContext);
  const recs = recsResp?.data ?? [];
  const highRecs = recs.filter((r) => r.priority === "critical" || r.priority === "warning").slice(0, 5);
  const alertRecs = recs.slice(0, 5);

  /* ── Goals snapshot ── */
  const { data: goalsResp } = useGoals({ pageSize: 4 }, hasContext);
  const goals = goalsResp?.data ?? [];
  const goalsOnTrack = goals.filter((g) => g.status === "on_track" || g.status === "on-track").length;
  const goalsAtRisk = goals.filter((g) => g.status === "at_risk" || g.status === "at-risk").length;
  const goalsCritical = goals.filter((g) => g.status === "critical").length;

  /* ── Coverage data for standard panel ── */
  const ALL_FW = ["BRSR", "ESRS", "GRI", "IFRS_S2"];
  const { data: coverageResp } = useCoverageMulti(ALL_FW, periodId, hasContext);
  const coverages = coverageResp?.coverages ?? [];
  const selectedCoverage = dashStd !== "all" ? coverages.find((c) => c.framework === sm.apiKey) : undefined;
  const totalCoveredParams = coverages.reduce((s, c) => s + c.hasValue, 0);
  const totalParams = coverages.reduce((s, c) => s + c.totalParams, 0);

  /* ── GHG Trend chart (Chart.js) ── */
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let chart: any;
    const load = async () => {
      if (!trendRef.current) return;
      const { Chart, registerables } = await import("chart.js");
      Chart.register(...registerables);
      chart = new Chart(trendRef.current, {
        type: "bar",
        data: { labels: ["FY20", "FY21", "FY22", "FY23", "FY24"], datasets: [
          { label: "Scope 1", data: [98, 91, 87, 82, 74], backgroundColor: "#0f766e", borderRadius: 4, barPercentage: 0.55, categoryPercentage: 0.7 },
          { label: "Scope 2", data: [84, 79, 80, 75, 68], backgroundColor: "#5eead4", borderRadius: 4, barPercentage: 0.55, categoryPercentage: 0.7 },
        ] },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { display: true, position: "top" as const, align: "end" as const, labels: { font: { family: "DM Sans", size: 10 }, color: "#94a3b8", boxWidth: 10, boxHeight: 10, padding: 8 } },
            tooltip: { backgroundColor: "#0f172a", cornerRadius: 6, bodyFont: { family: "DM Mono", size: 11 } },
          },
          scales: {
            x: { stacked: true, grid: { display: false }, border: { display: false }, ticks: { font: { family: "DM Sans", size: 10 }, color: "#94a3b8" } },
            y: { stacked: true, grid: { color: "#f3f4f6" }, border: { display: false }, ticks: { font: { family: "DM Mono", size: 10 }, color: "#94a3b8", callback: (v: string | number) => v + "k" } },
          },
        },
      });
    };
    load();
    return () => { chart?.destroy(); };
  }, []);

  /* ── Loading / empty states ── */
  if (!hasContext && isBootstrapping) {
    return (<div><div className="ph"><div><div className="ptitle">ESG Overview</div><div className="psub">Loading dashboard data...</div></div></div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 256 }}><p style={{ fontSize: 11, color: "var(--tx3)" }}>Loading dashboard data...</p></div></div>);
  }
  if (!hasContext) {
    return (<div><div className="ph"><div><div className="ptitle">ESG Overview</div><div className="psub">No reporting period or organization configured</div></div></div>
      <RollupBar levels={ROLLUP_LEVELS} activeLevel={rollupLevel} onSetLevel={setRollupLevel} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 256 }}><p style={{ fontSize: 11, color: "var(--tx3)" }}>Complete onboarding to get started.</p></div></div>);
  }

  return (
    <div>
      {/* Page header */}
      <div className="ph">
        <div>
          <div className="ptitle">ESG Overview</div>
          <div className="psub">
            {rootNode?.name ?? ""}{currentPeriod?.fiscalYear ? ` · FY ${currentPeriod.fiscalYear}` : ""} · viewing against: <strong style={{ color: sm.color }}>{sm.label}</strong>
          </div>
        </div>
        <div className="ph-acts">
          <button className="btn-secondary" onClick={() => router.push("/industry-data")}>Analytics</button>
          <button className="btn-primary" onClick={() => router.push("/reports")}>Generate report</button>
        </div>
      </div>

      <RollupBar levels={ROLLUP_LEVELS} activeLevel={rollupLevel} onSetLevel={setRollupLevel} />

      {/* Standard filter bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, background: "var(--surf)", border: ".5px solid var(--bdr)", borderRadius: 10, padding: "10px 14px" }}>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--tx3)", flexShrink: 0 }}>Filter by standard:</span>
        {Object.entries(STD_CONFIG).map(([k, cfg]) => {
          const cov = coverages.find((c) => c.framework === cfg.apiKey);
          const paramCount = k === "all" ? totalParams : (cov?.totalParams ?? 0);
          return (
            <button key={k} onClick={() => setDashStd(k)} style={{
              display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all .15s",
              border: `1.5px solid ${k === dashStd ? cfg.color : "var(--bdr)"}`,
              background: k === dashStd ? cfg.bg : "transparent",
              color: k === dashStd ? cfg.color : "var(--tx2)",
            }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: cfg.color, flexShrink: 0 }} />
              {cfg.label}
              <span style={{ fontSize: 9, fontWeight: 700, background: k === dashStd ? cfg.color + "22" : "var(--bdr2)", color: k === dashStd ? cfg.color : "var(--tx3)", padding: "1px 5px", borderRadius: 3, marginLeft: 2 }}>{paramCount}</span>
            </button>
          );
        })}
      </div>

      {/* Score strip */}
      <div style={{ display: "grid", gridTemplateColumns: "200px repeat(3,1fr) 1fr", gap: 10, marginBottom: 12 }}>
        <ScoreOverview nodeId={nodeId} periodId={periodId} previousPeriodId={previousPeriodId} />
        <CoverageWidget periodId={periodId} onNavigateReports={() => router.push("/reports")} />
      </div>

      {/* Peer benchmark strip */}
      {benchmarks && benchmarks.length > 0 && (
        <div style={{ background: "var(--surf)", border: ".5px solid var(--bdr)", borderRadius: 12, marginBottom: 12, overflow: "hidden" }}>
          <div className="card-head">
            <div>
              <div className="ctitle">Peer benchmark</div>
              <div className="csub">{peerCount} peers · filtered to {sm.label}</div>
            </div>
            <span className="badge b-teal" style={{ fontSize: 9, cursor: "pointer" }}>● Live corpus</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(benchmarks.length, 5)},1fr)` }}>
            {benchmarks.slice(0, 5).map((b) => {
              const delta = b.tenantValue != null ? ((b.tenantValue - b.sectorMedian) / b.sectorMedian * 100) : null;
              const isBad = delta != null && delta < 0;
              return (
                <div key={b.canonicalId} style={{ padding: "9px 13px", borderRight: ".5px solid var(--bdr2)" }}>
                  <div style={{ fontSize: 9, color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".05em", fontWeight: 600, marginBottom: 3 }}>{b.canonicalName}</div>
                  <div>
                    <span style={{ fontSize: 15, fontWeight: 700, fontFamily: "var(--fm)" }}>{b.tenantValue != null ? b.tenantValue.toLocaleString() : "—"}</span>
                    <span style={{ fontSize: 10, color: "var(--tx3)", marginLeft: 4 }}>· {b.sectorMedian.toLocaleString()} median</span>
                  </div>
                  {delta != null && (
                    <div style={{ fontSize: 10, fontWeight: 600, marginTop: 1, color: isBad ? "var(--red)" : "var(--grn)" }}>
                      {isBad ? "↓" : "↑"} {Math.abs(Math.round(delta))}% vs sector
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mid row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 290px", gap: 12, marginBottom: 12 }}>
        {/* GHG trend */}
        <div className="card">
          <div className="card-head">
            <div><div className="ctitle">GHG trend</div><div className="csub">Scope 1+2 · tCO2e</div></div>
            <span className="badge b-e">E</span>
          </div>
          <div className="chart-wrap"><canvas ref={trendRef} /></div>
        </div>

        {/* Key parameters — real data */}
        <div className="card">
          <div className="card-head">
            <div><div className="ctitle">Key parameters</div><div className="csub">{sm.label} · current period</div></div>
            <div style={{ display: "flex", gap: 4 }}>
              <span className="badge b-e" style={{ cursor: "pointer" }}>E</span>
              <span className="badge b-gray" style={{ cursor: "pointer" }}>S</span>
              <span className="badge b-gray" style={{ cursor: "pointer" }}>G</span>
            </div>
          </div>
          {keyParams.length > 0 ? (
            <table className="tbl">
              <thead><tr><th>Parameter</th><th>Value</th><th>Unit</th><th>Status</th></tr></thead>
              <tbody>
                {keyParams.map((kp) => (
                  <tr key={kp.paramId} onClick={() => router.push("/console")} style={{ cursor: "pointer" }}>
                    <td style={{ fontWeight: 500 }}>{kp.paramName}</td>
                    <td style={{ fontFamily: "var(--fm)" }}>{kp.value ?? kp.valueText ?? "—"}</td>
                    <td style={{ color: "var(--tx3)" }}>{kp.paramUnit}</td>
                    <td><span className={`badge ${RAG_CLASS[kp.ragStatus] ?? "b-gray"}`}>{RAG_LABEL[kp.ragStatus] ?? "—"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: 24, textAlign: "center", fontSize: 11, color: "var(--tx3)" }}>No parameters found</div>
          )}
        </div>

        {/* AI Recommendations — real data */}
        <div className="card">
          <div className="card-head">
            <div><div className="ctitle">AI recommendations</div><div className="csub">{highRecs.length} actionable</div></div>
            <span style={{ fontSize: 11, color: "var(--t700)", cursor: "pointer" }} onClick={() => router.push("/industry-data")}>All →</span>
          </div>
          {highRecs.length > 0 ? highRecs.map((rec) => (
            <div key={rec.recommendationId} className="ai-item">
              <div className="ai-dot" style={{ background: rec.priority === "critical" ? "var(--red)" : rec.priority === "warning" ? "var(--amb)" : "var(--t500)" }} />
              <div style={{ flex: 1 }}>
                <div className="ai-title">{rec.recommendationText}</div>
                <div className="ai-meta">
                  {rec.metric && <span>{rec.metric}</span>}
                  {rec.pillar && <span className={`badge b-${rec.pillar === "E" ? "e" : rec.pillar === "S" ? "s" : "g"}`} style={{ fontSize: 9 }}>{rec.pillar}</span>}
                </div>
              </div>
              <span style={{ color: "var(--tx3)" }}>›</span>
            </div>
          )) : (
            <div style={{ padding: 24, textAlign: "center", fontSize: 11, color: "var(--tx3)" }}>No recommendations yet</div>
          )}
        </div>
      </div>

      {/* Standard coverage panel (when a specific standard is selected) */}
      {dashStd !== "all" && selectedCoverage && (
        <div style={{ background: sm.bg, border: `1px solid ${sm.color}22`, borderRadius: 12, padding: "14px 16px", marginBottom: 12, display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ flexShrink: 0, width: 44, height: 44, borderRadius: "50%", background: `${sm.color}18`, border: `2px solid ${sm.color}33`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 2L3 6v6c0 3.5 3 6.5 7 7 4-.5 7-3.5 7-7V6L10 2z" stroke={sm.color} strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M7 10l2.5 2.5L13 8" stroke={sm.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: sm.color }}>{sm.label} — coverage summary</div>
            <div style={{ fontSize: 11, color: "var(--tx2)", marginTop: 2 }}>
              {selectedCoverage.hasValue} of {selectedCoverage.totalParams} parameters disclosed · {selectedCoverage.sections?.length ?? 0} reporting sections · <span style={{ color: sm.color, fontWeight: 600 }}>{selectedCoverage.percentComplete}% complete</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
            {([["Disclosed", selectedCoverage.hasValue, sm.color], ["Pending", selectedCoverage.totalParams - selectedCoverage.hasValue, "var(--amb)"], ["Verified", selectedCoverage.verified, "var(--tx1)"]] as [string, number, string][]).map(([l, v, c]) => (
              <div key={l} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "var(--fm)", color: c }}>{v}</div>
                <div style={{ fontSize: 9, color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".05em" }}>{l}</div>
              </div>
            ))}
          </div>
          <button onClick={() => router.push("/reports")} className="btn-primary" style={{ background: sm.color, flexShrink: 0 }}>View {sm.label} report →</button>
        </div>
      )}

      {/* Bottom row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {/* Goals snapshot — real data */}
        <div className="card">
          <div className="card-head">
            <div><div className="ctitle">Goals snapshot</div><div className="csub">{goalsOnTrack} on track · {goalsAtRisk} at risk{goalsCritical > 0 ? ` · ${goalsCritical} critical` : ""}</div></div>
            <span style={{ fontSize: 11, color: "var(--t700)", cursor: "pointer" }} onClick={() => router.push("/goals")}>Manage →</span>
          </div>
          {goals.length > 0 ? goals.map((g) => {
            const st = g.status ?? "pending";
            const color = st.includes("track") ? "var(--t700)" : st.includes("risk") ? "var(--amb)" : st === "critical" ? "var(--red)" : "var(--tx3)";
            const barColor = st.includes("track") ? "var(--t500)" : st.includes("risk") ? "var(--amb)" : st === "critical" ? "var(--red)" : "var(--bdr)";
            const label = st.includes("track") ? "On track" : st.includes("risk") ? "At risk" : st === "critical" ? "Critical" : "Pending";
            return (
              <div key={g.goalId} style={{ padding: "10px 14px", borderBottom: ".5px solid var(--bdr2)", cursor: "pointer" }} onClick={() => router.push("/goals")}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 12, fontWeight: 500 }}>{g.name}</span>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 10, color: "var(--tx3)" }}>{g.targetYear}</div>
                    <div style={{ fontSize: 10, fontWeight: 600, color }}>{label}</div>
                  </div>
                </div>
                <div className="pbar-bg"><div className="pbar-fill" style={{ width: `${g.progress}%`, background: barColor }} /></div>
                <div style={{ fontSize: 10, color: "var(--tx3)", marginTop: 2, fontFamily: "var(--fm)" }}>{g.progress}%</div>
              </div>
            );
          }) : (
            <div style={{ padding: 24, textAlign: "center", fontSize: 11, color: "var(--tx3)" }}>No goals defined yet</div>
          )}
        </div>

        {/* Alerts & anomalies — real data */}
        <div className="card">
          <div className="card-head">
            <div><div className="ctitle">Alerts &amp; anomalies</div><div className="csub">{recs.filter((r) => r.priority === "critical").length} need action</div></div>
          </div>
          {alertRecs.length > 0 ? alertRecs.map((rec) => (
            <div key={rec.recommendationId} className="ai-item">
              <div className="ai-dot" style={{ background: rec.priority === "critical" ? "var(--red)" : rec.priority === "warning" ? "var(--amb)" : "var(--t500)" }} />
              <div style={{ flex: 1 }}>
                <div className="ai-title">{rec.recommendationText}</div>
                <div className="ai-meta">{rec.metric}{rec.pillar ? ` · ${rec.pillar}` : ""}</div>
              </div>
              <div style={{ fontSize: 10, color: "var(--tx3)", whiteSpace: "nowrap" }}>{new Date(rec.createdAt).toLocaleDateString()}</div>
            </div>
          )) : (
            <div style={{ padding: 24, textAlign: "center", fontSize: 11, color: "var(--tx3)" }}>No alerts — all metrics are performing well</div>
          )}
        </div>
      </div>
    </div>
  );
}
