"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useGoals, useGoalDetail } from "@/hooks/useGoals";
import { RollupBar } from "@/components/layout/RollupBar";
import { ROLLUP_LEVELS, GOALS_DATA } from "@/app/data";

/* ── Reference data lookup for enrichment ── */
function findRefGoal(name: string) {
  return GOALS_DATA.find(g => name.toLowerCase().includes(g.name.toLowerCase().split(' ').slice(0, 3).join(' ')));
}

const PILLAR_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  E: { bg: '#fef2f2', color: '#ef4444', label: 'Environmental' },
  S: { bg: '#eef2ff', color: '#6366f1', label: 'Social' },
  G: { bg: '#f0fdfa', color: '#0f766e', label: 'Governance' },
};

export default function GoalsPage() {
  const router = useRouter();
  const [rollupLevel, setRollupLevel] = useState("organization");
  const [selGoalId, setSelGoalId] = useState<string | null>(null);
  const [goalTab, setGoalTab] = useState(1);

  /* ── Goals list ── */
  const { data: goalsResp, isLoading } = useGoals({ pageSize: 50 });
  const goals = goalsResp?.data ?? [];

  /* Select first goal by default */
  const activeGoalId = selGoalId ?? goals[0]?.goalId ?? null;

  /* ── Goal detail (with components + milestones) ── */
  const { data: detailResp } = useGoalDetail(activeGoalId);
  const g = detailResp?.data ?? null;

  /* ── Reference enrichment ── */
  const ref = g ? findRefGoal(g.name) : null;

  /* ── Summary stats ── */
  const totalGoals = goals.length;
  const onTrack = goals.filter((x) => x.status === "on_track" || x.status === "on-track").length;
  const atRisk = goals.filter((x) => x.status === "at_risk" || x.status === "at-risk").length;
  const critical = goals.filter((x) => x.status === "critical").length;
  const milestonesDue = g?.milestones?.filter((m) => m.status === "pending" || m.status === "in_progress").length ?? 0;

  /* ── Helpers ── */
  function statusColor(st: string | null) {
    if (!st) return "var(--tx3)";
    if (st.includes("track")) return "var(--t700)";
    if (st.includes("risk")) return "var(--amb)";
    if (st === "critical") return "var(--red)";
    return "var(--tx3)";
  }
  function statusBg(st: string | null) {
    if (!st) return "var(--bg)";
    if (st.includes("track")) return "var(--t50)";
    if (st.includes("risk")) return "var(--ambbg)";
    if (st === "critical") return "var(--redbg)";
    return "var(--bg)";
  }
  function statusLabel(st: string | null) {
    if (!st) return "Pending";
    if (st.includes("track")) return "On track";
    if (st.includes("risk")) return "At risk";
    if (st === "critical") return "Critical";
    return st;
  }
  function statusBadge(st: string | null) {
    if (!st) return "b-gray";
    if (st.includes("track")) return "b-green";
    if (st.includes("risk")) return "b-amber";
    if (st === "critical") return "b-red";
    return "b-gray";
  }
  function barColor(st: string | null) {
    if (!st) return "var(--bdr)";
    if (st.includes("track")) return "var(--t500)";
    if (st.includes("risk")) return "var(--amb)";
    if (st === "critical") return "var(--red)";
    return "var(--bdr)";
  }
  function directionLabel(d: string | null) {
    if (d === "reduce") return "Reduction target";
    if (d === "increase") return "Increase target";
    return d ?? "Target";
  }

  /** Extract pillar from description or reference data */
  function extractPillar(desc: string | null, goalName: string): string | null {
    if (desc) {
      const match = desc.match(/^([ESG]):/);
      if (match) return match[1];
    }
    const refGoal = findRefGoal(goalName);
    return refGoal?.pillar ?? null;
  }

  const stColor = g ? statusColor(g.status) : "var(--tx3)";
  const stBg = g ? statusBg(g.status) : "var(--bg)";
  const stLabel = g ? statusLabel(g.status) : "Pending";
  const progress = g?.progress ?? 0;
  const pillar = g ? extractPillar(g.description, g.name) : null;
  const pillarMeta = pillar ? PILLAR_COLORS[pillar] : null;

  return (
    <div>
      <div className="ph">
        <div><div className="ptitle">Goals &amp; milestones</div><div className="psub">Long-term ESG targets · cascaded through rollup hierarchy · AI-forecast</div></div>
        <div className="ph-acts">
          <button className="btn-secondary" onClick={() => router.push("/reports")}>Link to report</button>
          <button className="btn-primary">+ New goal</button>
        </div>
      </div>
      <RollupBar levels={ROLLUP_LEVELS} activeLevel={rollupLevel} onSetLevel={setRollupLevel} />

      {/* Summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10, marginBottom: 14 }}>
        {([
          ["Total goals", String(totalGoals), "E, S, G pillars", "var(--tx1)"],
          ["On track", String(onTrack), totalGoals > 0 ? `${Math.round(onTrack / totalGoals * 100)}% of portfolio` : "—", "var(--t700)"],
          ["At risk", String(atRisk), "Need intervention", "var(--amb)"],
          ["Critical", String(critical), "Significant gap", "var(--red)"],
          ["Milestones due", String(milestonesDue), "Pending milestones", "var(--tx1)"],
        ] as [string, string, string, string][]).map(([l, v, s, c]) => (
          <div key={l} className="stat-card"><div className="slbl">{l}</div><div className="sval" style={{ color: c }}>{v}</div><div className="ssub">{s}</div></div>
        ))}
      </div>

      {isLoading ? (
        <div style={{ padding: 48, textAlign: "center", fontSize: 11, color: "var(--tx3)" }}>Loading goals...</div>
      ) : goals.length === 0 ? (
        <div style={{ padding: 48, textAlign: "center", fontSize: 11, color: "var(--tx3)" }}>No goals defined yet. Create your first ESG goal to get started.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 12 }}>
          {/* Goal list */}
          <div className="card" style={{ height: "fit-content" }}>
            <div className="card-head"><div className="ctitle">All goals</div><span style={{ fontSize: 10, color: "var(--tx3)" }}>Click to expand</span></div>
            {goals.map((g2) => {
              const isSel = g2.goalId === activeGoalId;
              const gPillar = extractPillar(g2.description, g2.name);
              const gPm = gPillar ? PILLAR_COLORS[gPillar] : null;
              const gRef = findRefGoal(g2.name);
              return (
                <div key={g2.goalId} onClick={() => { setSelGoalId(g2.goalId); setGoalTab(1); }} style={{
                  padding: "11px 14px", borderBottom: ".5px solid var(--bdr2)", cursor: "pointer",
                  background: isSel ? "var(--t50)" : "var(--surf)",
                  borderLeft: `3px solid ${isSel ? "var(--t700)" : "transparent"}`,
                  transition: "all .12s",
                }}
                  onMouseEnter={(e) => { if (!isSel) (e.currentTarget as HTMLElement).style.background = "var(--bg)"; }}
                  onMouseLeave={(e) => { if (!isSel) (e.currentTarget as HTMLElement).style.background = "var(--surf)"; }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {/* Pillar badge */}
                      {gPm && (
                        <span style={{ fontSize: 8, fontWeight: 700, padding: "1px 5px", borderRadius: 3, background: gPm.bg, color: gPm.color }}>{gPillar}</span>
                      )}
                      <div style={{ fontSize: 12, fontWeight: isSel ? 700 : 500, color: "var(--tx1)", lineHeight: 1.3 }}>{g2.name}</div>
                    </div>
                    <span className={`badge ${statusBadge(g2.status)}`} style={{ fontSize: 9, flexShrink: 0 }}>{statusLabel(g2.status)}</span>
                  </div>
                  {/* Owner from reference */}
                  {gRef && (
                    <div style={{ fontSize: 10, color: "var(--tx3)", marginBottom: 4, display: "flex", gap: 6, alignItems: "center" }}>
                      <span style={{ width: 14, height: 14, borderRadius: "50%", background: "var(--t100)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 7, fontWeight: 700, color: "var(--t700)" }}>{gRef.owner.charAt(0)}</span>
                      <span>{gRef.owner}</span>
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div className="pbar-bg" style={{ flex: 1, height: 4 }}><div className="pbar-fill" style={{ width: `${g2.progress}%`, height: 4, borderRadius: 2, background: barColor(g2.status) }} /></div>
                    <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "var(--fm)", color: "var(--tx2)" }}>{g2.progress}%</span>
                  </div>
                  <div style={{ fontSize: 10, color: "var(--tx3)", marginTop: 4 }}>Target: {g2.targetYear}</div>
                </div>
              );
            })}
          </div>

          {/* Goal detail */}
          {g ? (
            <div>
              {/* Header card */}
              <div style={{ background: "var(--surf)", border: ".5px solid var(--bdr)", borderRadius: 12, overflow: "hidden", marginBottom: 10 }}>
                <div style={{ background: stBg, borderBottom: ".5px solid var(--bdr)", padding: "14px 16px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span className="badge b-teal">{directionLabel(g.direction)}</span>
                      <span className="badge" style={{ background: `${stColor}18`, color: stColor, fontSize: 9 }}>{stLabel}</span>
                      {pillarMeta && (
                        <span style={{ fontSize: 8, fontWeight: 700, padding: "1px 5px", borderRadius: 3, background: pillarMeta.bg, color: pillarMeta.color }}>{pillarMeta.label}</span>
                      )}
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "var(--tx1)" }}>{g.name}</div>
                    <div style={{ fontSize: 11, color: "var(--tx2)", marginTop: 4 }}>
                      {g.description ?? ""} · Baseline: {g.baselineValue ?? "—"} ({g.baselineYear ?? "—"}) → Target: {g.targetValue} by {g.targetYear}
                    </div>
                    {/* Owner from reference */}
                    {ref && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                        <span style={{ width: 18, height: 18, borderRadius: "50%", background: "var(--t100)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: "var(--t700)" }}>{ref.owner.charAt(0)}</span>
                        <span style={{ fontSize: 11, fontWeight: 500, color: "var(--tx2)" }}>{ref.owner} · {ref.role}</span>
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "var(--fm)", color: stColor, lineHeight: 1 }}>{progress}%</div>
                    <div style={{ fontSize: 10, color: "var(--tx3)" }}>of target achieved</div>
                    {/* AI forecast note */}
                    {ref?.aiNote && (
                      <div style={{ fontSize: 9, color: "var(--t700)", marginTop: 4, maxWidth: 160, textAlign: "right", lineHeight: 1.3 }}>AI: {ref.aiNote.split('.')[0]}</div>
                    )}
                  </div>
                </div>
                {/* Meta */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", borderBottom: ".5px solid var(--bdr)" }}>
                  {([
                    ["Direction", directionLabel(g.direction)],
                    ["Target year", g.targetYear],
                    ["Unit", g.unit ?? "—"],
                    ["Components", String(g.componentCount)],
                  ] as [string, string][]).map(([l, v]) => (
                    <div key={l} style={{ padding: "9px 14px", borderRight: ".5px solid var(--bdr2)" }}>
                      <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--tx3)", marginBottom: 2 }}>{l}</div>
                      <div style={{ fontSize: 11, fontWeight: 500, color: "var(--tx1)", lineHeight: 1.4 }}>{v}</div>
                    </div>
                  ))}
                </div>
                {/* Progress bar */}
                <div style={{ padding: "10px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontSize: 10, color: "var(--tx3)", flexShrink: 0 }}>{g.baselineValue ?? "0"}</div>
                  <div style={{ flex: 1, height: 8, background: "var(--bdr2)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 4, background: stColor, width: `${progress}%`, transition: "width .4s" }} />
                  </div>
                  <div style={{ fontSize: 10, color: "var(--tx3)", flexShrink: 0 }}>{g.targetValue}</div>
                </div>
              </div>

              {/* 3-part tabs */}
              <div style={{ display: "flex", gap: 0, border: ".5px solid var(--bdr)", borderRadius: 9, overflow: "hidden", marginBottom: 10, background: "var(--surf)" }}>
                {([[1, "Part 1", "Goal definition"], [2, "Part 2", "Parameters & KPIs"], [3, "Part 3", "Milestones"]] as [number, string, string][]).map(([n, lbl, sub]) => (
                  <div key={n} onClick={() => setGoalTab(n)} style={{
                    flex: 1, padding: "9px 12px", textAlign: "center", cursor: "pointer",
                    background: goalTab === n ? "var(--t50)" : "var(--surf)",
                    borderRight: n < 3 ? ".5px solid var(--bdr)" : "none",
                    transition: "background .12s",
                  }}>
                    <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: goalTab === n ? "var(--t700)" : "var(--tx3)", marginBottom: 1 }}>{lbl}</div>
                    <div style={{ fontSize: 12, fontWeight: goalTab === n ? 700 : 500, color: goalTab === n ? "var(--t800)" : "var(--tx2)" }}>{sub}</div>
                  </div>
                ))}
              </div>

              {/* Part 1: Definition */}
              {goalTab === 1 && (
                <div className="card">
                  <div className="card-head"><div><div className="ctitle">Goal definition</div><div className="csub">Core goal attributes · scope · targets</div></div><button className="btn-secondary" style={{ fontSize: 11 }}>Edit goal</button></div>
                  <div className="cbody">
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                      {([
                        ["Goal name", g.name],
                        ["Direction", directionLabel(g.direction)],
                        ["Baseline", `${g.baselineValue ?? "—"} (${g.baselineYear ?? "—"})`],
                        ["Target", `${g.targetValue} ${g.unit ?? ""}`],
                        ["Target year", g.targetYear],
                        ["Components", String(g.componentCount)],
                        ["Status", stLabel],
                        ["Progress", `${progress}%`],
                      ] as [string, string][]).map(([l, v]) => (
                        <div key={l}><div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--tx3)", marginBottom: 3 }}>{l}</div><div style={{ fontSize: 13, fontWeight: 500, color: "var(--tx1)" }}>{v}</div></div>
                      ))}
                    </div>

                    {/* Scope section — from reference data */}
                    {ref?.scope && ref.scope.length > 0 && (
                      <div style={{ borderTop: ".5px solid var(--bdr2)", paddingTop: 12, marginBottom: 12 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--tx3)", marginBottom: 6 }}>Scope — applies to</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {ref.scope.map(s => (
                            <span key={s} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 5, background: "var(--bg)", border: ".5px solid var(--bdr)", color: "var(--tx2)" }}>{s}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Standards alignment — from reference data */}
                    {ref?.standards && ref.standards.length > 0 && (
                      <div style={{ borderTop: ".5px solid var(--bdr2)", paddingTop: 12, marginBottom: 12 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--tx3)", marginBottom: 6 }}>Standards alignment</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {ref.standards.map(s => (
                            <span key={s} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 5, background: "var(--t50)", border: ".5px solid var(--t200)", color: "var(--t700)", fontWeight: 600 }}>{s}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* AI forecast — from reference data */}
                    {ref?.aiNote && (
                      <div style={{ borderTop: ".5px solid var(--bdr2)", paddingTop: 12, marginBottom: 12 }}>
                        <div style={{ background: "var(--t50)", border: ".5px solid var(--t200)", borderRadius: 8, padding: "10px 14px" }}>
                          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--t700)", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 2l2 4 4 .5-3 3 .5 4L8 12l-3.5 1.5.5-4-3-3L6 6l2-4z" fill="currentColor" /></svg>
                            AI forecast
                          </div>
                          <div style={{ fontSize: 11, color: "var(--tx1)", lineHeight: 1.5 }}>{ref.aiNote}</div>
                        </div>
                      </div>
                    )}

                    {g.description && !ref && (
                      <div style={{ borderTop: ".5px solid var(--bdr2)", paddingTop: 12 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--tx3)", marginBottom: 8 }}>Description</div>
                        <div style={{ fontSize: 12, color: "var(--tx1)", lineHeight: 1.5 }}>{g.description}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Part 2: Components / Parameters & KPIs */}
              {goalTab === 2 && (
                <div className="card">
                  <div className="card-head"><div><div className="ctitle">Parameters &amp; KPIs</div><div className="csub">{g.components?.length ?? 0} components linked to this goal</div></div><button className="btn-secondary" style={{ fontSize: 11 }}>Edit components</button></div>
                  {g.components && g.components.length > 0 ? (
                    <>
                      <table className="tbl">
                        <thead><tr><th>Parameter</th><th style={{ textAlign: "right" }}>Target</th><th style={{ textAlign: "right" }}>Weight</th><th>Progress</th></tr></thead>
                        <tbody>
                          {g.components.map((c) => {
                            const refParam = ref?.params?.find(p => c.name.toLowerCase().includes(p.name.toLowerCase().split(' ').slice(0, 2).join(' ').toLowerCase()));
                            const pct = refParam?.pct ?? null;
                            return (
                              <tr key={c.componentId}>
                                <td style={{ fontWeight: 500 }}>
                                  <div>{c.name}</div>
                                  {refParam && (
                                    <div style={{ fontSize: 10, color: "var(--tx3)", marginTop: 2 }}>Current: {refParam.current} {refParam.unit}</div>
                                  )}
                                </td>
                                <td style={{ fontFamily: "var(--fm)", textAlign: "right" }}>{c.targetValue ?? "—"}</td>
                                <td style={{ fontFamily: "var(--fm)", textAlign: "right" }}>{c.weight ? `${c.weight}%` : "—"}</td>
                                <td style={{ width: 120 }}>
                                  {pct !== null ? (
                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                      <div className="pbar-bg" style={{ flex: 1, height: 4 }}>
                                        <div className="pbar-fill" style={{ width: `${pct}%`, background: pct >= 80 ? "var(--grn)" : pct >= 40 ? "var(--t500)" : "var(--amb)" }} />
                                      </div>
                                      <span style={{ fontSize: 10, fontWeight: 600, fontFamily: "var(--fm)", color: "var(--tx2)" }}>{pct}%</span>
                                    </div>
                                  ) : (
                                    <span style={{ fontSize: 10, color: "var(--tx3)" }}>—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </>
                  ) : (
                    <div style={{ padding: 24, textAlign: "center", fontSize: 11, color: "var(--tx3)" }}>No components linked yet</div>
                  )}
                  <div style={{ padding: "10px 14px", borderTop: ".5px solid var(--bdr2)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 11, color: "var(--tx3)" }}>Data updates quarterly · last synced from platform data</span>
                    <button className="btn-ghost" style={{ fontSize: 11 }} onClick={() => router.push("/console")}>Enter data →</button>
                  </div>
                </div>
              )}

              {/* Part 3: Milestones */}
              {goalTab === 3 && (
                <div className="card">
                  <div className="card-head"><div><div className="ctitle">Milestones</div><div className="csub">{g.milestones?.length ?? 0} milestones · {g.milestones?.filter((m) => m.status === "achieved").length ?? 0} completed</div></div><button className="btn-secondary" style={{ fontSize: 11 }}>Edit milestones</button></div>
                  {g.milestones && g.milestones.length > 0 ? (
                    <div style={{ padding: 14, position: "relative" }}>
                      <div style={{ position: "absolute", left: 32, top: 24, bottom: 24, width: "1.5px", background: "linear-gradient(to bottom,var(--t300),var(--bdr2))" }} />
                      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                        {g.milestones.map((m, idx) => {
                          const mSt = m.status ?? "pending";
                          const isDone = mSt === "achieved";
                          const isInProg = mSt === "in_progress" || mSt === "in-progress";
                          const refMs = ref?.milestones?.[idx];
                          return (
                            <div key={m.milestoneId} style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "10px 0", borderBottom: idx < (g.milestones?.length ?? 0) - 1 ? ".5px solid var(--bdr2)" : "none" }}>
                              <div style={{
                                flexShrink: 0, width: 18, height: 18, borderRadius: "50%",
                                border: `2px solid ${isDone ? "var(--grn)" : isInProg ? "var(--t500)" : "var(--bdr)"}`,
                                background: isDone ? "var(--grn)" : isInProg ? "var(--t50)" : "var(--surf)",
                                display: "flex", alignItems: "center", justifyContent: "center", marginTop: 2, zIndex: 1, position: "relative",
                              }}>
                                {isDone ? <svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                  : isInProg ? <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--t500)" }} />
                                    : <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--bdr)" }} />}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 4 }}>
                                  <div>
                                    {m.targetDate && <div style={{ fontSize: 10, fontFamily: "var(--fm)", fontWeight: 600, color: "var(--tx3)", marginBottom: 2 }}>{new Date(m.targetDate).toLocaleDateString()}</div>}
                                    <div style={{ fontSize: 12, fontWeight: 500, color: "var(--tx1)", lineHeight: 1.4 }}>{m.name}</div>
                                    {m.description && <div style={{ fontSize: 10, color: "var(--tx3)", marginTop: 2 }}>{m.description}</div>}
                                  </div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                                    {/* Evidence badge from reference */}
                                    {refMs?.evidence && refMs.evidence !== "—" && (
                                      <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 3, background: "var(--grnbg)", color: "var(--grntx)", fontWeight: 600 }}>Evidence</span>
                                    )}
                                    <span className={`badge ${isDone ? "b-green" : isInProg ? "b-teal" : "b-gray"}`} style={{ fontSize: 9 }}>{isDone ? "Done" : isInProg ? "In progress" : "Pending"}</span>
                                  </div>
                                </div>
                                {/* Owner from reference */}
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                                  {refMs?.owner && (
                                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                      <span style={{ width: 14, height: 14, borderRadius: "50%", background: "var(--t100)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 7, fontWeight: 700, color: "var(--t700)" }}>{refMs.owner.charAt(0)}</span>
                                      <span style={{ fontSize: 10, color: "var(--tx3)" }}>{refMs.owner}</span>
                                    </div>
                                  )}
                                  {m.targetValue && (
                                    <span style={{ fontSize: 10, color: "var(--tx3)" }}>Target: {m.targetValue}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: 24, textAlign: "center", fontSize: 11, color: "var(--tx3)" }}>No milestones defined yet</div>
                  )}
                  {/* Footer with AI note */}
                  <div style={{ padding: "10px 14px", borderTop: ".5px solid var(--bdr2)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    {ref?.aiNote ? (
                      <span style={{ fontSize: 10, color: "var(--t700)", display: "flex", alignItems: "center", gap: 4 }}>
                        <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M8 2l2 4 4 .5-3 3 .5 4L8 12l-3.5 1.5.5-4-3-3L6 6l2-4z" fill="currentColor" /></svg>
                        {ref.aiNote}
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: "var(--tx3)" }}>Track milestones toward this goal</span>
                    )}
                    <button className="btn-ghost" style={{ fontSize: 11 }}>+ Add milestone</button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: 48, textAlign: "center", fontSize: 11, color: "var(--tx3)" }}>Select a goal to view details</div>
          )}
        </div>
      )}
    </div>
  );
}
