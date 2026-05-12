"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFilterStore } from "@/stores/filterStore";
import { useScores } from "@/hooks/useScores";
import { useCoverageMulti } from "@/hooks/useCoverage";
import { useKpiValues } from "@/hooks/useKpiValues";
import { queryKeys } from "@/lib/queryKeys";
import { RollupBar } from "@/components/layout/RollupBar";
import { ROLLUP_LEVELS } from "@/app/data";

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

const LEVEL_BADGE: Record<string, string> = {
  company: "b-dark", division: "b-teal", site: "b-ind", department: "b-gray",
};
const LEVEL_LABEL: Record<string, string> = {
  company: "Org", division: "Subsidiary", site: "Facility", department: "Department",
};

export default function RollupPage() {
  const { activePeriod } = useFilterStore();
  const [rollupLevel, setRollupLevel] = useState("organization");
  const [selectedMetric, setSelectedMetric] = useState("esg-score");

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
    if (activePeriod) return periods.find((p) => p.periodId === activePeriod);
    return periods[0];
  }, [activePeriod, periods]);

  const periodId = currentPeriod?.periodId ?? "";
  const nodeId = rootNode?.nodeId ?? "";
  const hasContext = !!periodId && !!nodeId;

  /* ── Scores for root node ── */
  const { data: scoresResp } = useScores({ nodeId, periodId, enabled: hasContext });
  const scores = scoresResp?.data;
  const eScore = scores?.pillars?.find((p) => p.pillar === "E")?.score ?? 0;
  const sScore = scores?.pillars?.find((p) => p.pillar === "S")?.score ?? 0;
  const gScore = scores?.pillars?.find((p) => p.pillar === "G")?.score ?? 0;

  /* ── Coverage for completeness ── */
  const ALL_FW = ["BRSR", "ESRS", "GRI", "IFRS_S2"];
  const { data: coverageResp } = useCoverageMulti(ALL_FW, periodId, hasContext);
  const coverages = coverageResp?.coverages ?? [];
  const totalParams = coverages.reduce((s, c) => s + c.totalParams, 0);
  const totalHas = coverages.reduce((s, c) => s + c.hasValue, 0);
  const overallPct = totalParams > 0 ? Math.round(totalHas / totalParams * 100) : 0;

  /* ── KPI values for GHG-like metrics ── */
  const { data: kpiResp } = useKpiValues({ periodId, nodeId, pageSize: 20, pillar: "E" }, hasContext);
  const eKpis = kpiResp?.data ?? [];

  /* ── Build tree structure for visual ── */
  const childrenOfRoot = allNodes.filter((n) => n.parentNodeId === rootNode?.nodeId);
  const grandchildren = (parentId: string) => allNodes.filter((n) => n.parentNodeId === parentId);
  const greatGrandchildren = (parentId: string) => allNodes.filter((n) => n.parentNodeId === parentId);

  return (
    <div>
      <div className="ph">
        <div>
          <div className="ptitle">Rollup view</div>
          <div className="psub">ESG data aggregated across your full hierarchy — click any level to drill in</div>
        </div>
        <div className="ph-acts">
          <button className="btn-secondary">Export rollup</button>
          <button className="btn-primary">Configure hierarchy</button>
        </div>
      </div>
      <RollupBar levels={ROLLUP_LEVELS} activeLevel={rollupLevel} onSetLevel={setRollupLevel} />

      {/* Hierarchy tree visual */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-head">
          <div><div className="ctitle">Organization hierarchy</div><div className="csub">Data flows upward: Department → Facility → Subsidiary → Organization</div></div>
          <select className="sel" style={{ width: 160, fontSize: 11, padding: "4px 8px" }} value={selectedMetric} onChange={(e) => setSelectedMetric(e.target.value)}>
            <option value="esg-score">ESG score</option>
            <option value="completeness">Completeness</option>
          </select>
        </div>
        <div className="cbody" style={{ overflowX: "auto" }}>
          {!rootNode ? (
            <div style={{ padding: 32, textAlign: "center", fontSize: 11, color: "var(--tx3)" }}>No organization hierarchy configured</div>
          ) : (
            <div style={{ minWidth: 700 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                {/* Root org node */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--t900)", borderRadius: 8, padding: "8px 14px", cursor: "pointer", width: "fit-content" }} onClick={() => setRollupLevel("organization")}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--t300)" }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#fff" }}>{rootNode.name}</span>
                  <span style={{ fontFamily: "var(--fm)", fontSize: 11, fontWeight: 700, color: "var(--t300)" }}>ESG: {scores?.overall ?? "—"}</span>
                  <span className="badge b-dark" style={{ fontSize: 9 }}>Organization</span>
                </div>
                {childrenOfRoot.length > 0 && <div style={{ width: "1.5px", height: 14, background: "var(--t300)" }} />}

                {/* Children (subsidiaries/divisions) */}
                {childrenOfRoot.length > 0 && (
                  <div style={{ display: "flex", gap: 40, position: "relative" }}>
                    {childrenOfRoot.length > 1 && <div style={{ position: "absolute", top: 0, left: 50, right: 50, height: "1.5px", background: "var(--t200)" }} />}
                    {childrenOfRoot.map((child) => {
                      const gc = grandchildren(child.nodeId);
                      return (
                        <div key={child.nodeId} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                          <div style={{ width: "1.5px", height: 14, background: "var(--t200)" }} />
                          <div style={{ background: "var(--surf)", border: ".5px solid var(--t300)", borderRadius: 8, padding: "8px 12px", cursor: "pointer", textAlign: "center", width: "fit-content" }} onClick={() => setRollupLevel("subsidiary")}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--tx1)" }}>{child.name}</div>
                            <div style={{ fontSize: 9, color: "var(--tx3)" }}>{LEVEL_LABEL[child.nodeType] ?? child.nodeType}</div>
                          </div>
                          {gc.length > 0 && (
                            <>
                              <div style={{ width: "1.5px", height: 14, background: "var(--t200)" }} />
                              <div style={{ display: "flex", gap: 12 }}>
                                {gc.map((facility) => {
                                  const depts = greatGrandchildren(facility.nodeId);
                                  return (
                                    <div key={facility.nodeId} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                      <div style={{ background: "var(--t50)", border: ".5px solid var(--t200)", borderRadius: 7, padding: "6px 10px", cursor: "pointer", textAlign: "center" }} onClick={() => setRollupLevel("facility")}>
                                        <div style={{ fontSize: 10, fontWeight: 600, color: "var(--tx1)" }}>{facility.name}</div>
                                        <div style={{ fontSize: 9, color: "var(--tx3)" }}>{LEVEL_LABEL[facility.nodeType] ?? facility.nodeType}</div>
                                      </div>
                                      {depts.length > 0 && (
                                        <>
                                          <div style={{ width: "1.5px", height: 10, background: "var(--t200)" }} />
                                          <div style={{ display: "flex", gap: 6 }}>
                                            {depts.map((d) => (
                                              <div key={d.nodeId} style={{ background: "var(--bg)", border: ".5px solid var(--bdr)", borderRadius: 5, padding: "4px 7px", fontSize: 9, fontWeight: 500, color: "var(--tx2)", cursor: "pointer" }} onClick={() => setRollupLevel("department")}>{d.name}</div>
                                            ))}
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabular rollup */}
      <div className="card">
        <div className="card-head">
          <div><div className="ctitle">ESG summary — {rootNode?.name ?? "Organization"}</div><div className="csub">All entities consolidated · {currentPeriod ? `FY ${currentPeriod.fiscalYear}` : ""}</div></div>
          <select className="sel" style={{ width: 180, fontSize: 11, padding: "4px 8px" }}>
            <option>Organization view</option><option>Subsidiary view</option><option>Facility view</option><option>Department view</option>
          </select>
        </div>
        <table className="tbl">
          <thead><tr><th>Entity</th><th>Level</th><th>E score</th><th>S score</th><th>G score</th><th>Completeness</th></tr></thead>
          <tbody>
            {/* Root node row */}
            {rootNode && (
              <tr style={{ background: "var(--t50)" }}>
                <td style={{ fontWeight: 700 }}>{rootNode.name}</td>
                <td><span className={`badge ${LEVEL_BADGE[rootNode.nodeType] ?? "b-dark"}`} style={{ fontSize: 9 }}>{LEVEL_LABEL[rootNode.nodeType] ?? rootNode.nodeType}</span></td>
                <td style={{ fontFamily: "var(--fm)", color: "var(--t700)", fontWeight: 600 }}>{eScore || "—"}</td>
                <td style={{ fontFamily: "var(--fm)", color: "var(--ind)", fontWeight: 600 }}>{sScore || "—"}</td>
                <td style={{ fontFamily: "var(--fm)", color: "var(--amb)", fontWeight: 600 }}>{gScore || "—"}</td>
                <td><div style={{ display: "flex", alignItems: "center", gap: 6 }}><div className="pbar-bg" style={{ width: 60 }}><div className="pbar-fill" style={{ width: `${overallPct}%`, background: "var(--t500)" }} /></div><span style={{ fontSize: 10, fontFamily: "var(--fm)" }}>{overallPct}%</span></div></td>
              </tr>
            )}
            {/* All child nodes */}
            {allNodes.filter((n) => n.parentNodeId !== null).map((n) => (
              <tr key={n.nodeId}>
                <td style={{ fontWeight: 500, paddingLeft: n.nodeType === "department" ? 28 : n.nodeType === "site" ? 18 : 10 }}>{n.name}</td>
                <td><span className={`badge ${LEVEL_BADGE[n.nodeType] ?? "b-gray"}`} style={{ fontSize: 9 }}>{LEVEL_LABEL[n.nodeType] ?? n.nodeType}</span></td>
                <td style={{ fontFamily: "var(--fm)" }}>—</td>
                <td style={{ fontFamily: "var(--fm)" }}>—</td>
                <td style={{ fontFamily: "var(--fm)" }}>—</td>
                <td style={{ fontFamily: "var(--fm)" }}>—</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
