"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGoals, useGoalDetail, useCreateGoal, useAddGoalComponent, useCreateMilestone } from "@/hooks/useGoals";
import { RollupBar } from "@/components/layout/RollupBar";
import { ROLLUP_LEVELS } from "@/app/data";

/* ── Types ── */
interface StarterGoal {
  name: string;
  description: string;
  canonicalMetricName: string;
  targetValue: string;
  baselineEstimate: string;
  unit: string;
  direction: "lower_is_better" | "higher_is_better";
  targetYear: string;
  pillar: "E" | "S" | "G";
}

/* ── Pillar color map ── */
const PILLAR_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  E: { bg: "#fef2f2", color: "#ef4444", label: "Environmental" },
  S: { bg: "#eef2ff", color: "#6366f1", label: "Social" },
  G: { bg: "#f0fdfa", color: "#0f766e", label: "Governance" },
};

/* ── Sector-aware starter goals ── */
const SECTOR_STARTER_GOALS: Record<string, StarterGoal[]> = {
  default: [
    { name: "Reduce GHG Scope 1+2 by 30%", description: "Achieve a 30% reduction in direct and indirect greenhouse gas emissions against the baseline year", canonicalMetricName: "GHG Scope 1+2", targetValue: "30", baselineEstimate: "0", unit: "% reduction", direction: "lower_is_better", targetYear: "2030", pillar: "E" },
    { name: "50% Renewable Energy", description: "Source at least 50% of total energy consumption from renewable sources", canonicalMetricName: "Renewable Energy %", targetValue: "50", baselineEstimate: "15", unit: "%", direction: "higher_is_better", targetYear: "2030", pillar: "E" },
    { name: "Board Gender Diversity >= 33%", description: "Achieve at least 33% female representation on the board of directors", canonicalMetricName: "Board Gender Diversity", targetValue: "33", baselineEstimate: "20", unit: "%", direction: "higher_is_better", targetYear: "2028", pillar: "G" },
    { name: "Reduce Employee Turnover by 15%", description: "Lower annual employee turnover rate by 15 percentage points from the baseline", canonicalMetricName: "Employee Turnover", targetValue: "15", baselineEstimate: "20", unit: "% reduction", direction: "lower_is_better", targetYear: "2028", pillar: "S" },
  ],
  "IT Services": [
    { name: "Carbon Neutral Operations", description: "Achieve net zero carbon emissions across all direct operations (Scope 1+2)", canonicalMetricName: "GHG Scope 1+2", targetValue: "0", baselineEstimate: "50000", unit: "tCO2e", direction: "lower_is_better", targetYear: "2030", pillar: "E" },
    { name: "80% Renewable Energy", description: "Source 80% of total energy from renewable sources including data centres", canonicalMetricName: "Renewable Energy %", targetValue: "80", baselineEstimate: "30", unit: "%", direction: "higher_is_better", targetYear: "2030", pillar: "E" },
    { name: "Gender Pay Gap < 5%", description: "Reduce the gender pay gap to less than 5% across all levels", canonicalMetricName: "Gender Pay Gap", targetValue: "5", baselineEstimate: "12", unit: "%", direction: "lower_is_better", targetYear: "2028", pillar: "S" },
    { name: "40 Training Hours/Employee", description: "Provide at least 40 hours of training per employee annually", canonicalMetricName: "Training Hours", targetValue: "40", baselineEstimate: "25", unit: "hrs/employee", direction: "higher_is_better", targetYear: "2027", pillar: "S" },
  ],
  "Industrial Manufacturing": [
    { name: "Net Zero Scope 1+2", description: "Achieve net zero for all direct and energy indirect emissions", canonicalMetricName: "GHG Scope 1+2", targetValue: "0", baselineEstimate: "142000", unit: "tCO2e", direction: "lower_is_better", targetYear: "2035", pillar: "E" },
    { name: "Zero Waste to Landfill (95%)", description: "Divert at least 95% of operational waste from landfill through recycling and recovery", canonicalMetricName: "Waste Diversion", targetValue: "95", baselineEstimate: "70", unit: "%", direction: "higher_is_better", targetYear: "2030", pillar: "E" },
    { name: "Reduce Energy Intensity 25%", description: "Reduce energy consumption per unit of revenue by 25%", canonicalMetricName: "Energy Intensity", targetValue: "25", baselineEstimate: "0", unit: "% reduction", direction: "lower_is_better", targetYear: "2030", pillar: "E" },
    { name: "LTIFR < 1.0", description: "Reduce the Lost Time Injury Frequency Rate below 1.0 across all facilities", canonicalMetricName: "LTIFR", targetValue: "1.0", baselineEstimate: "2.5", unit: "rate", direction: "lower_is_better", targetYear: "2028", pillar: "S" },
  ],
  "Steel & Mining": [
    { name: "Net Zero Emissions", description: "Achieve net zero greenhouse gas emissions across all operations", canonicalMetricName: "GHG Scope 1+2", targetValue: "0", baselineEstimate: "500000", unit: "tCO2e", direction: "lower_is_better", targetYear: "2040", pillar: "E" },
    { name: "90% Waste Diversion", description: "Divert 90% of mining and processing waste from landfill", canonicalMetricName: "Waste Diversion", targetValue: "90", baselineEstimate: "55", unit: "%", direction: "higher_is_better", targetYear: "2032", pillar: "E" },
    { name: "30% Water Recycled", description: "Recycle at least 30% of total water withdrawal in operations", canonicalMetricName: "Water Recycled", targetValue: "30", baselineEstimate: "10", unit: "%", direction: "higher_is_better", targetYear: "2030", pillar: "E" },
    { name: "Zero Fatalities", description: "Eliminate all workplace fatalities through safety culture transformation", canonicalMetricName: "Fatalities", targetValue: "0", baselineEstimate: "2", unit: "count", direction: "lower_is_better", targetYear: "2027", pillar: "S" },
  ],
  "Financial Services": [
    { name: "30% Energy Reduction", description: "Reduce total operational energy consumption by 30% from baseline", canonicalMetricName: "Energy Consumption", targetValue: "30", baselineEstimate: "0", unit: "% reduction", direction: "lower_is_better", targetYear: "2030", pillar: "E" },
    { name: "Board Independence >= 50%", description: "Ensure at least 50% of board members are independent directors", canonicalMetricName: "Board Independence", targetValue: "50", baselineEstimate: "40", unit: "%", direction: "higher_is_better", targetYear: "2027", pillar: "G" },
    { name: "Board Gender Diversity >= 40%", description: "Achieve 40% female representation on the board", canonicalMetricName: "Board Gender Diversity", targetValue: "40", baselineEstimate: "25", unit: "%", direction: "higher_is_better", targetYear: "2028", pillar: "G" },
    { name: "Zero Ethics Violations", description: "Achieve zero material ethics and compliance violations annually", canonicalMetricName: "Ethics Violations", targetValue: "0", baselineEstimate: "3", unit: "count", direction: "lower_is_better", targetYear: "2027", pillar: "G" },
  ],
  "Pharmaceuticals": [
    { name: "50% Renewable Energy", description: "Source 50% of energy from renewables across manufacturing sites", canonicalMetricName: "Renewable Energy %", targetValue: "50", baselineEstimate: "20", unit: "%", direction: "higher_is_better", targetYear: "2030", pillar: "E" },
    { name: "90% Waste Diversion", description: "Divert 90% of pharmaceutical and operational waste from landfill", canonicalMetricName: "Waste Diversion", targetValue: "90", baselineEstimate: "60", unit: "%", direction: "higher_is_better", targetYear: "2030", pillar: "E" },
    { name: "Reduce Water Withdrawal 20%", description: "Reduce freshwater withdrawal by 20% through efficiency and recycling", canonicalMetricName: "Water Withdrawal", targetValue: "20", baselineEstimate: "0", unit: "% reduction", direction: "lower_is_better", targetYear: "2030", pillar: "E" },
    { name: "LTIFR < 0.5", description: "Achieve a Lost Time Injury Frequency Rate below 0.5", canonicalMetricName: "LTIFR", targetValue: "0.5", baselineEstimate: "1.2", unit: "rate", direction: "lower_is_better", targetYear: "2028", pillar: "S" },
  ],
  "Specialty Chemicals": [
    { name: "Reduce GHG Intensity 30%", description: "Lower greenhouse gas emission intensity per unit of production by 30%", canonicalMetricName: "GHG Intensity", targetValue: "30", baselineEstimate: "0", unit: "% reduction", direction: "lower_is_better", targetYear: "2030", pillar: "E" },
    { name: "Zero Waste Operations", description: "Achieve near-zero waste to landfill through circular economy practices", canonicalMetricName: "Waste to Landfill", targetValue: "0", baselineEstimate: "500", unit: "MT", direction: "lower_is_better", targetYear: "2032", pillar: "E" },
    { name: "50% Water Recycled", description: "Recycle at least 50% of process water across all chemical plants", canonicalMetricName: "Water Recycled", targetValue: "50", baselineEstimate: "15", unit: "%", direction: "higher_is_better", targetYear: "2030", pillar: "E" },
    { name: "Zero Fatalities", description: "Eliminate all workplace fatalities through enhanced safety programmes", canonicalMetricName: "Fatalities", targetValue: "0", baselineEstimate: "1", unit: "count", direction: "lower_is_better", targetYear: "2027", pillar: "S" },
  ],
  "Telecommunications": [
    { name: "Carbon Neutral by 2035", description: "Achieve carbon neutrality across all network and office operations", canonicalMetricName: "GHG Scope 1+2", targetValue: "0", baselineEstimate: "80000", unit: "tCO2e", direction: "lower_is_better", targetYear: "2035", pillar: "E" },
    { name: "100% Renewable Electricity", description: "Power all operations with 100% renewable electricity", canonicalMetricName: "Renewable Energy %", targetValue: "100", baselineEstimate: "35", unit: "%", direction: "higher_is_better", targetYear: "2032", pillar: "E" },
    { name: "40% Female Employees", description: "Achieve 40% female representation across the total workforce", canonicalMetricName: "Women in Workforce", targetValue: "40", baselineEstimate: "28", unit: "%", direction: "higher_is_better", targetYear: "2030", pillar: "S" },
    { name: "50 Training Hours/Employee", description: "Provide at least 50 hours of skills and development training per employee", canonicalMetricName: "Training Hours", targetValue: "50", baselineEstimate: "30", unit: "hrs/employee", direction: "higher_is_better", targetYear: "2028", pillar: "S" },
  ],
  "Food & Drug Retailing": [
    { name: "Reduce Scope 1+2 by 40%", description: "Achieve 40% reduction in direct and energy emissions across stores and distribution", canonicalMetricName: "GHG Scope 1+2", targetValue: "40", baselineEstimate: "0", unit: "% reduction", direction: "lower_is_better", targetYear: "2030", pillar: "E" },
    { name: "Zero Waste to Landfill", description: "Divert 100% of store and distribution centre waste from landfill", canonicalMetricName: "Waste to Landfill", targetValue: "0", baselineEstimate: "2000", unit: "MT", direction: "lower_is_better", targetYear: "2030", pillar: "E" },
    { name: "30% Female Leadership", description: "Achieve 30% female representation in senior leadership positions", canonicalMetricName: "Women in Leadership", targetValue: "30", baselineEstimate: "18", unit: "%", direction: "higher_is_better", targetYear: "2028", pillar: "S" },
    { name: "Reduce Energy Intensity 20%", description: "Reduce energy consumption per square metre of retail space by 20%", canonicalMetricName: "Energy Intensity", targetValue: "20", baselineEstimate: "0", unit: "% reduction", direction: "lower_is_better", targetYear: "2030", pillar: "E" },
  ],
};

/* ── Scope hierarchy (for modal) ── */
const SCOPE_OPTIONS = [
  { name: "Organisation", desc: "Entire group", type: "org" },
  { name: "Division A", desc: "Subsidiary", type: "sub" },
  { name: "Division B", desc: "Subsidiary", type: "sub" },
  { name: "Facility 1", desc: "Facility", type: "fac" },
  { name: "Facility 2", desc: "Facility", type: "fac" },
];

const STANDARDS_OPTIONS: [string, string][] = [
  ["BRSR Core", "#ef4444"], ["GRI 305", "#14b8a6"], ["ESRS E1", "#f59e0b"],
  ["IFRS S2", "#6366f1"], ["SBTi 1.5\u00b0C", "#0f766e"],
];

const PARAM_POOL = [
  { name: "GHG Scope 1 absolute", current: "74,200 tCO2e", target: "0", pillar: "e", checked: true },
  { name: "GHG Scope 2 (location)", current: "68,100 tCO2e", target: "0", pillar: "e", checked: true },
  { name: "GHG Scope 2 (market)", current: "\u2014 tCO2e", target: "0", pillar: "e", checked: true },
  { name: "GHG intensity (revenue)", current: "4.12 t/\u20b9cr", target: "0", pillar: "e", checked: true },
  { name: "Scope 3 Cat 1 (est.)", current: "890k tCO2e", target: "<500k", pillar: "e", checked: false },
  { name: "Renewable energy %", current: "18%", target: "100%", pillar: "e", checked: true },
  { name: "Energy intensity", current: "4.12 GJ/\u20b9cr", target: "<2.5", pillar: "e", checked: false },
  { name: "Carbon credits retired", current: "0 tCO2e", target: "\u2014", pillar: "e", checked: false },
];

const DEFAULT_MILESTONES = [
  { date: "Mar 2025", desc: "Complete baseline audit across all facilities", owner: "ESG Lead", st: "done" },
  { date: "Sep 2025", desc: "Implement first phase of reduction measures", owner: "Operations", st: "in-progress" },
  { date: "Mar 2026", desc: "Achieve 25% reduction milestone", owner: "Operations", st: "pending" },
  { date: "Mar 2028", desc: "Mid-term review and course correction", owner: "ESG Lead", st: "pending" },
  { date: "Mar 2030", desc: "Achieve 60% of target", owner: "ESG Lead", st: "pending" },
];

const OWNER_OPTIONS = ["ESG Lead", "Operations", "HR Lead", "EHS Manager", "Board ESG Cmte"];

/* ── Helpers ── */

/** Maps DB status strings (on_track, at_risk) to UI keys (on-track, at-risk) */
function normalizeStatus(status: string | null | undefined): string {
  if (!status) return "pending";
  const s = status.toLowerCase().replace(/_/g, "-");
  if (s.includes("track") || s === "on-track") return "on-track";
  if (s.includes("risk") || s === "at-risk") return "at-risk";
  if (s === "critical" || s === "off-track" || s.includes("off")) return "critical";
  if (s === "achieved" || s === "completed" || s === "done") return "done";
  return s;
}

/** Derives ESG pillar from goal name/description via keyword heuristic */
function derivePillar(name: string, description?: string | null): "E" | "S" | "G" {
  const text = `${name} ${description ?? ""}`.toLowerCase();
  const envKeywords = ["emission", "ghg", "carbon", "energy", "renewable", "water", "waste", "climate", "scope 1", "scope 2", "scope 3", "intensity", "landfill", "recycl"];
  const socKeywords = ["employee", "safety", "diversity", "women", "gender", "training", "turnover", "injury", "ltifr", "fatality", "fatalities", "workforce", "pay gap", "human"];
  const govKeywords = ["board", "ethic", "compliance", "governance", "independence", "anti-corruption", "whistleblow", "executive pay"];

  if (govKeywords.some(k => text.includes(k))) return "G";
  if (socKeywords.some(k => text.includes(k))) return "S";
  if (envKeywords.some(k => text.includes(k))) return "E";
  return "E"; // default
}

/** Fuzzy-matches tenant sector string to starter goals map key */
function matchSector(sector: string | null | undefined): string {
  if (!sector) return "default";
  const s = sector.toLowerCase();
  const mapping: [string[], string][] = [
    [["it service", "information technology", "software", "tech service"], "IT Services"],
    [["industrial", "manufacturing", "conglomerate", "engineering"], "Industrial Manufacturing"],
    [["steel", "mining", "metal"], "Steel & Mining"],
    [["financial", "banking", "bank", "insurance", "finance"], "Financial Services"],
    [["pharma", "pharmaceutical", "biotech", "life science"], "Pharmaceuticals"],
    [["chemical", "specialty chemical"], "Specialty Chemicals"],
    [["telecom", "telecommunication"], "Telecommunications"],
    [["food", "retail", "drug retail", "grocery", "supermarket"], "Food & Drug Retailing"],
  ];
  for (const [keywords, key] of mapping) {
    if (keywords.some(k => s.includes(k))) return key;
  }
  return "default";
}

function stColor(s: string) { return s === "on-track" || s === "done" ? "var(--t700)" : s === "at-risk" ? "var(--amb)" : "var(--red)"; }
function stBg(s: string) { return s === "on-track" || s === "done" ? "var(--t50)" : s === "at-risk" ? "var(--ambbg)" : "var(--redbg)"; }
function stLabel(s: string) { return s === "on-track" ? "On track" : s === "at-risk" ? "At risk" : s === "done" ? "Done" : s === "pending" ? "Pending" : "Critical"; }
function stBadge(s: string) { return s === "on-track" || s === "done" ? "b-green" : s === "at-risk" ? "b-amber" : s === "pending" ? "b-gray" : "b-red"; }
function barColor(s: string) { return s === "on-track" || s === "done" ? "var(--t500)" : s === "at-risk" ? "var(--amb)" : s === "pending" ? "var(--bdr)" : "var(--red)"; }

export default function GoalsPage() {
  const router = useRouter();
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [goalModalStep, setGoalModalStep] = useState(1);

  /* ── API data ── */
  const { data: goalsResp, isLoading } = useGoals({ pageSize: 50 });
  const apiGoals = goalsResp?.data ?? [];

  /* ── Tenant sector ── */
  const [tenantSector, setTenantSector] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sessionRes = await fetch("/api/auth/session");
        const session = await sessionRes.json();
        const tid = session?.user?.tenantId;
        if (!tid || cancelled) return;
        const compRes = await fetch("/api/industry/companies");
        if (!compRes.ok || cancelled) return;
        const compData = await compRes.json();
        const me = (compData?.data ?? []).find((c: { tenantId: string }) => c.tenantId === tid);
        if (me?.sector && !cancelled) setTenantSector(me.sector);
      } catch {
        // non-critical — will fall back to default starter goals
      }
    })();
    return () => { cancelled = true; };
  }, []);

  function openAddGoal(step = 1) { setGoalModalStep(step); setShowAddGoal(true); }

  if (isLoading) {
    return <div style={{ padding: 48, textAlign: "center", fontSize: 11, color: "var(--tx3)" }}>Loading goals...</div>;
  }

  return (
    <ApiGoalsView
      apiGoals={apiGoals}
      tenantSector={tenantSector}
      onAddGoal={() => openAddGoal()}
      showAddGoal={showAddGoal}
      setShowAddGoal={setShowAddGoal}
      goalModalStep={goalModalStep}
      setGoalModalStep={setGoalModalStep}
    />
  );
}

/* ═══════════════════════════════════════════════════════════════
   API-based Goals View (always rendered)
   ═══════════════════════════════════════════════════════════════ */
function ApiGoalsView({ apiGoals, tenantSector, onAddGoal, showAddGoal, setShowAddGoal, goalModalStep, setGoalModalStep }: {
  apiGoals: { goalId: string; name: string; status: string | null; progress: number; targetYear: string; direction: string | null; description: string | null; unit: string | null; targetValue: string; baselineValue: string | null; baselineYear: string | null; componentCount: number }[];
  tenantSector: string | null;
  onAddGoal: () => void;
  showAddGoal: boolean;
  setShowAddGoal: (v: boolean) => void;
  goalModalStep: number;
  setGoalModalStep: (n: number) => void;
}) {
  const router = useRouter();
  const [rollupLevel, setRollupLevel] = useState("organization");
  const [selGoalId, setSelGoalId] = useState<string | null>(null);
  const [goalTab, setGoalTab] = useState(1);
  const createGoal = useCreateGoal();

  const activeGoalId = selGoalId ?? apiGoals[0]?.goalId ?? null;
  const { data: detailResp } = useGoalDetail(activeGoalId);
  const g = detailResp?.data ?? null;

  const hasGoals = apiGoals.length > 0;
  const totalGoals = apiGoals.length;
  const onTrack = apiGoals.filter(x => normalizeStatus(x.status) === "on-track").length;
  const atRisk = apiGoals.filter(x => normalizeStatus(x.status) === "at-risk").length;
  const critical = apiGoals.filter(x => normalizeStatus(x.status) === "critical").length;

  const sectorKey = matchSector(tenantSector);
  const starterGoals = SECTOR_STARTER_GOALS[sectorKey] ?? SECTOR_STARTER_GOALS.default;

  async function handleAdoptGoal(sg: StarterGoal) {
    try {
      await createGoal.mutateAsync({
        paramId: crypto.randomUUID(),
        name: sg.name,
        description: `${sg.pillar}: ${sg.description}`,
        targetValue: sg.targetValue,
        baselineValue: sg.baselineEstimate,
        baselineYear: String(new Date().getFullYear()),
        targetYear: sg.targetYear,
        unit: sg.unit,
        direction: sg.direction,
      });
    } catch {
      // non-critical
    }
  }

  return (
    <div>
      <div className="ph">
        <div><div className="ptitle">Goals &amp; milestones</div><div className="psub">Long-term ESG targets &middot; cascaded through rollup hierarchy &middot; AI-forecast</div></div>
        <div className="ph-acts">
          <button className="btn-secondary" onClick={() => router.push("/reports")}>Link to report</button>
          <button className="btn-primary" onClick={onAddGoal}>+ New goal</button>
        </div>
      </div>
      <RollupBar levels={ROLLUP_LEVELS} activeLevel={rollupLevel} onSetLevel={setRollupLevel} />

      {/* Summary stats */}
      {hasGoals && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10, marginBottom: 14 }}>
          {([
            ["Total goals", String(totalGoals), "E, S, G pillars", "var(--tx1)"],
            ["On track", String(onTrack), totalGoals > 0 ? `${Math.round(onTrack / totalGoals * 100)}% of portfolio` : "\u2014", "var(--t700)"],
            ["At risk", String(atRisk), "Need intervention", "var(--amb)"],
            ["Critical", String(critical), "Significant gap", "var(--red)"],
            ["Milestones due", String(g?.milestones?.filter((m: { status: string }) => m.status === "pending").length ?? 0), "Pending milestones", "var(--tx1)"],
          ] as [string, string, string, string][]).map(([l, v, s, c]) => (
            <div key={l} className="stat-card"><div className="slbl">{l}</div><div className="sval" style={{ color: c }}>{v}</div><div className="ssub">{s}</div></div>
          ))}
        </div>
      )}

      {/* Starter goals section (when no real goals exist) */}
      {!hasGoals && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ padding: "14px 18px", background: "var(--t50)", border: "1.5px dashed var(--t300)", borderRadius: 12, marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--t800)", marginBottom: 4 }}>
              Recommended for your sector{tenantSector ? ` (${tenantSector})` : ""}
            </div>
            <div style={{ fontSize: 11, color: "var(--t700)", marginBottom: 14, lineHeight: 1.5 }}>
              Your organisation has no goals defined yet. Here are starter goals tailored to your industry. Click &quot;Adopt Goal&quot; to add any of them to your portfolio.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
              {starterGoals.map(sg => {
                const pm = PILLAR_COLORS[sg.pillar];
                return (
                  <div key={sg.name} style={{ background: "var(--surf)", border: "1.5px dashed var(--bdr)", borderRadius: 10, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: pm.bg, color: pm.color }}>{sg.pillar}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--tx1)" }}>{sg.name}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--tx2)", lineHeight: 1.5, flex: 1 }}>{sg.description}</div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <div style={{ fontSize: 10, color: "var(--tx3)", fontFamily: "var(--fm)" }}>
                        Target: {sg.targetValue} {sg.unit} by {sg.targetYear}
                      </div>
                      <button
                        className="btn-primary"
                        style={{ fontSize: 11, padding: "5px 12px" }}
                        onClick={() => handleAdoptGoal(sg)}
                        disabled={createGoal.isPending}
                      >
                        {createGoal.isPending ? "Adopting..." : "Adopt Goal"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Goals list + detail */}
      {hasGoals && (
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 12 }}>
          {/* Goal list sidebar */}
          <div className="card" style={{ height: "fit-content" }}>
            <div className="card-head"><div className="ctitle">All goals</div><span style={{ fontSize: 10, color: "var(--tx3)" }}>Click to expand</span></div>
            {apiGoals.map(ag => {
              const isSel = ag.goalId === activeGoalId;
              const ns = normalizeStatus(ag.status);
              const pl = derivePillar(ag.name, ag.description);
              return (
                <div key={ag.goalId} onClick={() => { setSelGoalId(ag.goalId); setGoalTab(1); }} style={{
                  padding: "11px 14px", borderBottom: ".5px solid var(--bdr2)", cursor: "pointer",
                  background: isSel ? "var(--t50)" : "var(--surf)",
                  borderLeft: `3px solid ${isSel ? "var(--t700)" : "transparent"}`,
                  transition: "all .12s",
                }}
                  onMouseEnter={e => { if (!isSel) (e.currentTarget as HTMLElement).style.background = "var(--bg)"; }}
                  onMouseLeave={e => { if (!isSel) (e.currentTarget as HTMLElement).style.background = "var(--surf)"; }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                    <div style={{ fontSize: 12, fontWeight: isSel ? 700 : 500, color: "var(--tx1)", lineHeight: 1.3 }}>{ag.name}</div>
                    <span className={`badge ${stBadge(ns)}`} style={{ fontSize: 9, flexShrink: 0 }}>{stLabel(ns)}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div className="pbar-bg" style={{ flex: 1, height: 4 }}><div className="pbar-fill" style={{ width: `${ag.progress}%`, height: 4, borderRadius: 2, background: barColor(ns) }} /></div>
                    <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "var(--fm)", color: "var(--tx2)" }}>{ag.progress}%</span>
                    <span className={`badge b-${pl === "E" ? "e" : pl === "S" ? "s" : "g"}`} style={{ fontSize: 9 }}>{pl}</span>
                  </div>
                  <div style={{ fontSize: 10, color: "var(--tx3)", marginTop: 4 }}>
                    {ag.direction === "higher_is_better" ? "\u2191" : "\u2193"} Target: {ag.targetValue} {ag.unit ?? ""} by {ag.targetYear}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Goal detail panel */}
          {g ? (
            <div>
              {/* Header card */}
              {(() => {
                const ns = normalizeStatus(g.status);
                const pl = derivePillar(g.name, g.description);
                const pm = PILLAR_COLORS[pl];
                const sc = stColor(ns);
                const sb = stBg(ns);
                return (
                  <>
                    <div style={{ background: "var(--surf)", border: ".5px solid var(--bdr)", borderRadius: 12, overflow: "hidden", marginBottom: 10 }}>
                      <div style={{ background: sb, borderBottom: ".5px solid var(--bdr)", padding: "14px 16px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: pm.bg, color: pm.color }}>{pl} &middot; {pm.label}</span>
                            <span className="badge" style={{ background: `${sc}18`, color: sc, fontSize: 9 }}>{stLabel(ns)}</span>
                          </div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--tx1)" }}>{g.name}</div>
                          <div style={{ fontSize: 11, color: "var(--tx2)", marginTop: 4 }}>
                            {g.direction === "higher_is_better" ? "Higher is better" : "Lower is better"} &middot; Baseline: {g.baselineValue ?? "\u2014"} ({g.baselineYear ?? "\u2014"}) &rarr; Target: {g.targetValue} {g.unit ?? ""} by {g.targetYear}
                          </div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "var(--fm)", color: sc, lineHeight: 1 }}>{g.progress}%</div>
                          <div style={{ fontSize: 10, color: "var(--tx3)" }}>of target achieved</div>
                        </div>
                      </div>
                      {/* Meta row */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", borderBottom: ".5px solid var(--bdr)" }}>
                        {([
                          ["Direction", g.direction === "higher_is_better" ? "Higher is better" : "Lower is better"],
                          ["Target year", g.targetYear],
                          ["Unit", g.unit ?? "\u2014"],
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
                        <div style={{ fontSize: 10, color: "var(--tx3)", flexShrink: 0 }}>{g.baselineValue ?? "\u2014"}</div>
                        <div style={{ flex: 1, height: 8, background: "var(--bdr2)", borderRadius: 4, overflow: "hidden" }}>
                          <div style={{ height: "100%", borderRadius: 4, background: sc, width: `${g.progress}%`, transition: "width .4s" }} />
                        </div>
                        <div style={{ fontSize: 10, color: "var(--tx3)", flexShrink: 0 }}>{g.targetValue} {g.unit ?? ""}</div>
                      </div>
                    </div>

                    {/* 3-part tabs */}
                    <div style={{ display: "flex", gap: 0, border: ".5px solid var(--bdr)", borderRadius: 9, overflow: "hidden", marginBottom: 10, background: "var(--surf)" }}>
                      {([[1, "Part 1", "Goal definition"], [2, "Part 2", "Parameters & KPIs"], [3, "Part 3", "Milestones"]] as [number, string, string][]).map(([n, lbl, sub]) => (
                        <div key={n} onClick={() => setGoalTab(n)} style={{ flex: 1, padding: "9px 12px", textAlign: "center", cursor: "pointer", background: goalTab === n ? "var(--t50)" : "var(--surf)", borderRight: n < 3 ? ".5px solid var(--bdr)" : "none", transition: "background .12s" }}>
                          <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: goalTab === n ? "var(--t700)" : "var(--tx3)", marginBottom: 1 }}>{lbl}</div>
                          <div style={{ fontSize: 12, fontWeight: goalTab === n ? 700 : 500, color: goalTab === n ? "var(--t800)" : "var(--tx2)" }}>{sub}</div>
                        </div>
                      ))}
                    </div>

                    {/* Part 1: Definition */}
                    {goalTab === 1 && (
                      <div className="card"><div className="cbody">
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                          {([
                            ["Goal name", g.name],
                            ["ESG pillar", `${pl} \u2014 ${pm.label}`],
                            ["Direction", g.direction === "higher_is_better" ? "Higher is better" : "Lower is better"],
                            ["Unit", g.unit ?? "\u2014"],
                            ["Baseline", `${g.baselineValue ?? "\u2014"} (${g.baselineYear ?? "\u2014"})`],
                            ["Target", `${g.targetValue} ${g.unit ?? ""}`],
                            ["Target year", g.targetYear],
                            ["Components", String(g.componentCount)],
                          ] as [string, string][]).map(([l, v]) => (
                            <div key={l}><div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--tx3)", marginBottom: 3 }}>{l}</div><div style={{ fontSize: 13, fontWeight: 500, color: "var(--tx1)" }}>{v}</div></div>
                          ))}
                        </div>
                        {g.description && (
                          <div style={{ marginTop: 12, padding: "10px 12px", background: "var(--bg)", borderRadius: 8, fontSize: 11, color: "var(--tx2)", lineHeight: 1.6, border: ".5px solid var(--bdr2)" }}>
                            {g.description}
                          </div>
                        )}
                      </div></div>
                    )}

                    {/* Part 2: Parameters & KPIs */}
                    {goalTab === 2 && (
                      <div className="card">
                        <div className="card-head">
                          <div><div className="ctitle">Parameters &amp; KPIs</div><div className="csub">{g.components?.length ?? 0} components tracking progress</div></div>
                          <button className="btn-primary" style={{ fontSize: 11 }} onClick={() => { setGoalModalStep(2); setShowAddGoal(true); }}>+ Add parameter</button>
                        </div>
                        {g.components && g.components.length > 0 ? (
                          <table className="tbl"><thead><tr><th>Parameter</th><th>Target</th><th>Weight</th></tr></thead><tbody>
                            {g.components.map((c: { componentId: string; name: string; targetValue: string | null; weight: string | null }) => (
                              <tr key={c.componentId}><td style={{ fontWeight: 500 }}>{c.name}</td><td style={{ fontFamily: "var(--fm)" }}>{c.targetValue ?? "\u2014"}</td><td style={{ fontFamily: "var(--fm)" }}>{c.weight ?? "\u2014"}</td></tr>
                            ))}
                          </tbody></table>
                        ) : <div style={{ padding: 24, textAlign: "center", fontSize: 11, color: "var(--tx3)" }}>No components linked yet. Click &quot;+ Add parameter&quot; to add KPIs.</div>}
                      </div>
                    )}

                    {/* Part 3: Milestones */}
                    {goalTab === 3 && (
                      <div className="card">
                        <div className="card-head"><div><div className="ctitle">Milestones</div><div className="csub">{g.milestones?.length ?? 0} milestones &middot; {g.milestones?.filter((m: { status: string }) => m.status === "achieved").length ?? 0} achieved</div></div></div>
                        {g.milestones && g.milestones.length > 0 ? (
                          <div style={{ padding: 14, position: "relative" }}>
                            <div style={{ position: "absolute", left: 32, top: 24, bottom: 24, width: "1.5px", background: "linear-gradient(to bottom,var(--t300),var(--bdr2))" }} />
                            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                              {g.milestones.map((m: { milestoneId: string; name: string; description: string | null; targetDate: string | null; status: string }, idx: number) => {
                                const mStatus = normalizeStatus(m.status);
                                return (
                                  <div key={m.milestoneId} style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "10px 0", borderBottom: idx < (g.milestones?.length ?? 0) - 1 ? ".5px solid var(--bdr2)" : "none" }}>
                                    <div style={{ flexShrink: 0, width: 18, height: 18, borderRadius: "50%", border: `2px solid ${mStatus === "done" ? "var(--grn)" : mStatus === "on-track" ? "var(--t500)" : "var(--bdr)"}`, background: mStatus === "done" ? "var(--grn)" : mStatus === "on-track" ? "var(--t50)" : "var(--surf)", display: "flex", alignItems: "center", justifyContent: "center", marginTop: 2, zIndex: 1, position: "relative" }}>
                                      {mStatus === "done" ? <svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                        : mStatus === "on-track" ? <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--t500)" }} />
                                          : <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--bdr)" }} />}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 4 }}>
                                        <div>
                                          {m.targetDate && <div style={{ fontSize: 10, fontFamily: "var(--fm)", fontWeight: 600, color: "var(--tx3)", marginBottom: 2 }}>{new Date(m.targetDate).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}</div>}
                                          <div style={{ fontSize: 12, fontWeight: 500, color: "var(--tx1)", lineHeight: 1.4 }}>{m.name}</div>
                                          {m.description && <div style={{ fontSize: 10, color: "var(--tx3)", marginTop: 2 }}>{m.description}</div>}
                                        </div>
                                        <span className={`badge ${mStatus === "done" ? "b-green" : mStatus === "on-track" ? "b-teal" : "b-gray"}`} style={{ fontSize: 9, flexShrink: 0 }}>{mStatus === "done" ? "Achieved" : mStatus === "on-track" ? "In progress" : "Pending"}</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : <div style={{ padding: 24, textAlign: "center", fontSize: 11, color: "var(--tx3)" }}>No milestones defined yet</div>}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          ) : <div style={{ padding: 48, textAlign: "center", color: "var(--tx3)", fontSize: 11 }}>Select a goal</div>}
        </div>
      )}

      {showAddGoal && <AddGoalModal step={goalModalStep} setStep={setGoalModalStep} onClose={() => setShowAddGoal(false)} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Add Goal Modal — 3-step form matching the reference design
   ═══════════════════════════════════════════════════════════════ */
function AddGoalModal({ step, setStep, onClose }: { step: number; setStep: (n: number) => void; onClose: () => void }) {
  const [milestones, setMilestones] = useState(DEFAULT_MILESTONES.map(m => ({ ...m })));
  const createGoal = useCreateGoal();

  function addMilestoneRow() {
    setMilestones(prev => [...prev, { date: "", desc: "", owner: "ESG Lead", st: "pending" }]);
  }
  function removeMilestone(idx: number) {
    setMilestones(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleCreate() {
    try {
      await createGoal.mutateAsync({
        paramId: crypto.randomUUID(),
        name: "Net zero Scope 1+2 emissions by 2035",
        targetValue: "0",
        targetYear: "2035",
        baselineValue: "142000",
        baselineYear: "2023",
        unit: "tCO2e",
        direction: "lower_is_better",
        description: "E: Absolute reduction target for direct and indirect GHG emissions",
      });
    } catch {
      // API may fail in demo mode
    }
    onClose();
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.45)", zIndex: 700, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: "var(--surf)", borderRadius: 14, padding: 24, width: 620, maxWidth: "96vw", position: "relative", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "var(--tx3)" }}>&times;</button>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: "var(--tx1)" }}>Define a new ESG goal</div>
          <div style={{ display: "flex", gap: 0, border: ".5px solid var(--bdr)", borderRadius: 8, overflow: "hidden" }}>
            {([[1, "Part 1", "Goal definition"], [2, "Part 2", "Parameters"], [3, "Part 3", "Milestones"]] as [number, string, string][]).map(([n, lbl, sub]) => (
              <div key={n} onClick={() => setStep(n)} style={{ flex: 1, padding: "8px 12px", textAlign: "center", cursor: "pointer", fontSize: 12, fontWeight: 600, background: step === n ? "var(--t50)" : "var(--surf)", color: step === n ? "var(--t700)" : "var(--tx3)", borderRight: n < 3 ? ".5px solid var(--bdr)" : "none" }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 1 }}>{lbl}</div>
                {sub}
              </div>
            ))}
          </div>
        </div>

        {/* PART 1 */}
        {step === 1 && (
          <div>
            <div style={{ fontSize: 11, color: "var(--tx2)", marginBottom: 14, padding: "8px 10px", background: "var(--bg)", borderRadius: 7, lineHeight: 1.5 }}>Define the goal itself &mdash; its name, overall owner, target date, baseline, and the scope it applies to across your org hierarchy.</div>
            <div className="field"><label className="lbl">Goal name *</label><input className="inp" placeholder="e.g. Achieve net zero Scope 1+2 emissions by 2035" /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div className="field"><label className="lbl">ESG pillar *</label><select className="sel"><option>Environment</option><option>Social</option><option>Governance</option></select></div>
              <div className="field"><label className="lbl">Goal type</label><select className="sel"><option>Absolute reduction</option><option>Intensity reduction</option><option>% renewable / circular</option><option>Headcount / diversity %</option><option>Rating / index score</option><option>Compliance / policy</option></select></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div className="field"><label className="lbl">Baseline value *</label><input className="inp" placeholder="e.g. 142,000 tCO2e (FY2023)" /></div>
              <div className="field"><label className="lbl">Target value *</label><input className="inp" placeholder="e.g. 0 tCO2e" /></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div className="field"><label className="lbl">Target date *</label><input className="inp" type="date" defaultValue="2035-03-31" /></div>
              <div className="field"><label className="lbl">Interim review frequency</label><select className="sel"><option>Annual</option><option>Quarterly</option><option>Half-yearly</option></select></div>
            </div>
            <div className="field"><label className="lbl">Overall owner *</label>
              <select className="sel"><option>ESG Lead</option><option>EHS Manager</option><option>HR Lead</option><option>Board ESG Committee</option><option>CFO</option></select>
            </div>
            <div className="field"><label className="lbl">Scope &mdash; where this goal applies *</label>
              <div style={{ border: ".5px solid var(--bdr)", borderRadius: 8, overflow: "hidden", marginTop: 4 }}>
                {SCOPE_OPTIONS.map((s, i) => (
                  <label key={s.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderBottom: i < SCOPE_OPTIONS.length - 1 ? ".5px solid var(--bdr2)" : "none", cursor: "pointer" }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--t50)"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ""}>
                    <input type="checkbox" defaultChecked={i === 0} style={{ accentColor: "var(--t700)", width: 14, height: 14, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}><div style={{ fontSize: 12, fontWeight: 500 }}>{s.name}</div><div style={{ fontSize: 10, color: "var(--tx3)" }}>{s.desc}</div></div>
                    <span className={`badge b-${s.type === "org" ? "dark" : s.type === "sub" ? "teal" : "ind"}`} style={{ fontSize: 9 }}>{s.type === "org" ? "Org" : s.type === "sub" ? "Subsidiary" : "Facility"}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="field"><label className="lbl">Standards alignment</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 4 }}>
                {STANDARDS_OPTIONS.map(([l, c]) => (
                  <label key={l} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 9px", border: ".5px solid var(--bdr)", borderRadius: 20, cursor: "pointer", fontSize: 11, fontWeight: 500, color: "var(--tx2)" }}>
                    <input type="checkbox" style={{ accentColor: c, width: 12, height: 12 }} /> {l}
                  </label>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
              <button className="btn-primary" onClick={() => setStep(2)}>Next: Parameters &rarr;</button>
            </div>
          </div>
        )}

        {/* PART 2 */}
        {step === 2 && (
          <div>
            <div style={{ fontSize: 11, color: "var(--tx2)", marginBottom: 14, padding: "8px 10px", background: "var(--bg)", borderRadius: 7, lineHeight: 1.5 }}>Select the KPIs and parameters this goal will track. These will be monitored for progress and used in reporting. You can set a specific target value and threshold per parameter.</div>
            <div style={{ border: ".5px solid var(--bdr)", borderRadius: 8, overflow: "hidden", marginBottom: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 90px 70px 80px", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--tx3)", padding: "8px 10px", borderBottom: ".5px solid var(--bdr2)", background: "var(--bg)" }}>
                <span>Parameter</span><span>Current</span><span>Target</span><span>Threshold</span><span>Track</span>
              </div>
              {PARAM_POOL.map(p => (
                <div key={p.name} style={{ display: "grid", gridTemplateColumns: "1fr 80px 90px 70px 80px", alignItems: "center", padding: "8px 10px", borderBottom: ".5px solid var(--bdr2)" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg)"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ""}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span className={`badge b-${p.pillar}`} style={{ fontSize: 9 }}>{p.pillar.toUpperCase()}</span>
                    <span style={{ fontSize: 12, fontWeight: 500 }}>{p.name}</span>
                  </div>
                  <div style={{ fontSize: 11, fontFamily: "var(--fm)", color: "var(--tx3)" }}>{p.current}</div>
                  <input style={{ width: 80, padding: "4px 7px", border: ".5px solid var(--bdr)", borderRadius: 5, fontFamily: "var(--fm)", fontSize: 11, textAlign: "right", outline: "none" }} defaultValue={p.target} />
                  <select style={{ width: 65, padding: "3px 4px", border: ".5px solid var(--bdr)", borderRadius: 5, fontSize: 9, outline: "none", background: "var(--surf)" }} defaultValue="auto">
                    <option value="auto">Auto</option>
                    <option value="strict">Strict</option>
                    <option value="warn">Warn</option>
                  </select>
                  <div style={{ textAlign: "center" }}><input type="checkbox" defaultChecked={p.checked} style={{ accentColor: "var(--t700)", width: 14, height: 14 }} /></div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <button className="btn-ghost" style={{ fontSize: 11 }}>+ Add custom parameter</button>
              <span style={{ fontSize: 11, color: "var(--tx3)" }}>5 parameters selected &middot; tracked quarterly</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              <button className="btn-secondary" onClick={() => setStep(1)}>&larr; Back</button>
              <button className="btn-primary" onClick={() => setStep(3)}>Next: Milestones &rarr;</button>
            </div>
          </div>
        )}

        {/* PART 3 */}
        {step === 3 && (
          <div>
            <div style={{ fontSize: 11, color: "var(--tx2)", marginBottom: 14, padding: "8px 10px", background: "var(--bg)", borderRadius: 7, lineHeight: 1.5 }}>Break the goal into time-bound milestones, each with a specific owner and evidence requirement. Milestones trigger alerts if they fall behind schedule.</div>
            <div style={{ border: ".5px solid var(--bdr)", borderRadius: 8, overflow: "hidden", marginBottom: 10 }}>
              {milestones.map((m, idx) => (
                <div key={idx} style={{ display: "grid", gridTemplateColumns: "88px 1fr 130px 90px 28px", alignItems: "center", gap: 8, padding: "9px 12px", borderBottom: ".5px solid var(--bdr2)" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg)"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ""}>
                  <input style={{ border: "none", outline: "none", fontSize: 10, fontFamily: "var(--fm)", color: "var(--tx3)", fontWeight: 500, background: "transparent", width: "100%" }} defaultValue={m.date} placeholder="MMM YYYY" />
                  <input style={{ border: "none", outline: "none", fontSize: 11, fontWeight: 500, color: "var(--tx1)", background: "transparent", width: "100%" }} defaultValue={m.desc} placeholder="Milestone description..." />
                  <select defaultValue={m.owner} style={{ border: ".5px solid var(--bdr)", borderRadius: 5, padding: "3px 6px", fontSize: 10, color: "var(--tx2)", outline: "none", background: "var(--surf)" }}>
                    {OWNER_OPTIONS.map(o => <option key={o}>{o}</option>)}
                  </select>
                  <span className={`badge ${m.st === "done" ? "b-green" : m.st === "in-progress" ? "b-teal" : "b-gray"}`} style={{ fontSize: 9 }}>{m.st === "done" ? "Done" : m.st === "in-progress" ? "In progress" : "Pending"}</span>
                  <button onClick={() => removeMilestone(idx)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--tx3)", fontSize: 14, padding: 0 }}>&times;</button>
                </div>
              ))}
            </div>
            <button className="btn-ghost" style={{ fontSize: 11, marginBottom: 14 }} onClick={addMilestoneRow}>+ Add milestone</button>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button className="btn-secondary" onClick={() => setStep(2)}>&larr; Back</button>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn-secondary" onClick={onClose}>Save as draft</button>
                <button className="btn-primary" onClick={handleCreate}>{createGoal.isPending ? "Creating..." : "Create goal"}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
