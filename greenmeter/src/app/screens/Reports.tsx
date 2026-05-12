"use client";
import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";

type Props = { navigate:(s:any)=>void; [k:string]:any };

/* ── Hardcoded reference data ───────────────────────────────── */

interface TemplateSection {
  code: string; title: string; pillar: string; color: string; questions: number; guidance: string;
}

interface ReportItem {
  id: number; name: string; std: string; type: string; status: string; color: string;
  fy: string; due: string; updated: string; sectionProgress: number[];
}

interface Question {
  id: string; code: string; type: string; required: boolean; qnum: number; total: number;
  status: string; q: string; guidance: string; unit: string; value: string;
  prevValue: string; prevUnit: string; prevYoY: string; aiSuggestion: string;
}

const RP_TEMPLATES: Record<string, { name: string; color: string; sections: TemplateSection[] }> = {
  BRSR: {
    name: 'BRSR Core', color: '#ef4444',
    sections: [
      { code: 'SEC-A', title: 'Section A \u2014 General Disclosures', pillar: 'Governance', color: '#6366f1', questions: 18, guidance: 'Basic corporate identity, business overview, operations, and sustainability overview.' },
      { code: 'SEC-B', title: 'Section B \u2014 Management & Process', pillar: 'Governance', color: '#6366f1', questions: 12, guidance: 'Governance, oversight, and sustainability management processes.' },
      { code: 'P1', title: 'Principle 1 \u2014 Ethics & Transparency', pillar: 'Governance', color: '#6366f1', questions: 12, guidance: 'Policies, commitments, and performance on ethics, transparency, and accountability.' },
      { code: 'P2', title: 'Principle 2 \u2014 Product Lifecycle', pillar: 'Environmental', color: '#ef4444', questions: 15, guidance: 'Environmental sustainability in product design, lifecycle, and extended producer responsibility.' },
      { code: 'P3', title: 'Principle 3 \u2014 Employee Wellbeing', pillar: 'Social', color: '#0f766e', questions: 18, guidance: 'Employee health, safety, welfare, and development.' },
      { code: 'P4', title: 'Principle 4 \u2014 Stakeholder Engagement', pillar: 'Social', color: '#0f766e', questions: 10, guidance: 'Stakeholder identification, engagement, and responsiveness.' },
      { code: 'P5', title: 'Principle 5 \u2014 Human Rights', pillar: 'Social', color: '#0f766e', questions: 12, guidance: 'Human rights policies, due diligence, and remediation.' },
      { code: 'P6', title: 'Principle 6 \u2014 Environment', pillar: 'Environmental', color: '#ef4444', questions: 20, guidance: 'Environmental protection, resource use, emissions, and climate disclosures.' },
      { code: 'P7', title: 'Principle 7 \u2014 Policy Advocacy', pillar: 'Governance', color: '#6366f1', questions: 8, guidance: 'Public policy engagement and memberships.' },
      { code: 'P8', title: 'Principle 8 \u2014 Inclusive Growth', pillar: 'Social', color: '#0f766e', questions: 14, guidance: 'Inclusive growth and equitable development, CSR programs.' },
      { code: 'P9', title: 'Principle 9 \u2014 Customer Value', pillar: 'Governance', color: '#6366f1', questions: 10, guidance: 'Consumer protection, data privacy, responsible marketing.' },
    ],
  },
  GRI: {
    name: 'GRI Universal 2021', color: '#0f766e',
    sections: [
      { code: 'GRI 2', title: 'GRI 2 \u2014 General Disclosures', pillar: 'Governance', color: '#6366f1', questions: 28, guidance: 'Organizational profile, activities, governance, strategy, and stakeholder engagement.' },
      { code: 'GRI 3', title: 'GRI 3 \u2014 Material Topics', pillar: 'Governance', color: '#6366f1', questions: 10, guidance: 'Process for determining material topics, list of material topics, and management of each.' },
      { code: 'GRI 302', title: 'GRI 302 \u2014 Energy', pillar: 'Environmental', color: '#ef4444', questions: 8, guidance: 'Energy consumption within and outside the organization, energy intensity, reductions.' },
      { code: 'GRI 303', title: 'GRI 303 \u2014 Water & Effluents', pillar: 'Environmental', color: '#ef4444', questions: 6, guidance: 'Interactions with water, water withdrawal, consumption, discharge.' },
      { code: 'GRI 305', title: 'GRI 305 \u2014 Emissions', pillar: 'Environmental', color: '#ef4444', questions: 10, guidance: 'Direct (Scope 1), energy indirect (Scope 2), other indirect (Scope 3) GHG emissions.' },
      { code: 'GRI 306', title: 'GRI 306 \u2014 Waste', pillar: 'Environmental', color: '#ef4444', questions: 8, guidance: 'Waste generation, waste diversion from disposal, waste directed to disposal.' },
      { code: 'GRI 401', title: 'GRI 401 \u2014 Employment', pillar: 'Social', color: '#0f766e', questions: 6, guidance: 'New employee hires and turnover, benefits, parental leave.' },
      { code: 'GRI 403', title: 'GRI 403 \u2014 Occupational H&S', pillar: 'Social', color: '#0f766e', questions: 10, guidance: 'OHS management system, hazard identification, incident reporting, worker training.' },
      { code: 'GRI 405', title: 'GRI 405 \u2014 Diversity & Equal Opp', pillar: 'Social', color: '#0f766e', questions: 6, guidance: 'Diversity of governance bodies and employees, ratio of basic salary.' },
      { code: 'GRI 413', title: 'GRI 413 \u2014 Local Communities', pillar: 'Social', color: '#0f766e', questions: 4, guidance: 'Local community engagement, impact assessment, development programs.' },
    ],
  },
  ESRS: {
    name: 'ESRS (CSRD)', color: '#f59e0b',
    sections: [
      { code: 'ESRS 1', title: 'ESRS 1 \u2014 General Requirements', pillar: 'Governance', color: '#6366f1', questions: 8, guidance: 'General requirements for sustainability reporting under CSRD.' },
      { code: 'ESRS 2', title: 'ESRS 2 \u2014 General Disclosures', pillar: 'Governance', color: '#6366f1', questions: 20, guidance: 'Governance, strategy, materiality assessment, metrics and targets.' },
      { code: 'E1', title: 'E1 \u2014 Climate Change', pillar: 'Environmental', color: '#ef4444', questions: 24, guidance: 'Transition plans, physical and transition risks, Scope 1/2/3, climate targets.' },
      { code: 'E2', title: 'E2 \u2014 Pollution', pillar: 'Environmental', color: '#ef4444', questions: 12, guidance: 'Air, water, soil pollution; substances of concern.' },
      { code: 'E3', title: 'E3 \u2014 Water & Marine Resources', pillar: 'Environmental', color: '#ef4444', questions: 10, guidance: 'Water consumption, withdrawal, discharge in water-stressed areas.' },
      { code: 'E4', title: 'E4 \u2014 Biodiversity & Ecosystems', pillar: 'Environmental', color: '#ef4444', questions: 10, guidance: 'Biodiversity impact and dependencies, ecosystem services.' },
      { code: 'E5', title: 'E5 \u2014 Resource Use & Circular Economy', pillar: 'Environmental', color: '#ef4444', questions: 8, guidance: 'Resource inflows, outflows, waste, circular economy principles.' },
      { code: 'S1', title: 'S1 \u2014 Own Workforce', pillar: 'Social', color: '#0f766e', questions: 22, guidance: 'Working conditions, equal treatment, rights of workers, pay gap, diversity.' },
      { code: 'S2', title: 'S2 \u2014 Workers in Value Chain', pillar: 'Social', color: '#0f766e', questions: 10, guidance: 'Working conditions and human rights in the value chain.' },
      { code: 'G1', title: 'G1 \u2014 Business Conduct', pillar: 'Governance', color: '#6366f1', questions: 14, guidance: 'Corporate culture, anti-corruption, whistleblower protection, supplier relationships.' },
    ],
  },
  'IFRS S2': {
    name: 'IFRS S2 Climate', color: '#6366f1',
    sections: [
      { code: 'GOV', title: 'Governance', pillar: 'Governance', color: '#6366f1', questions: 10, guidance: 'Board oversight of climate-related risks and opportunities, management role.' },
      { code: 'STR', title: 'Strategy', pillar: 'Governance', color: '#6366f1', questions: 14, guidance: 'Climate-related risks and opportunities, their impact on business model and strategy.' },
      { code: 'RISK', title: 'Risk Management', pillar: 'Governance', color: '#6366f1', questions: 8, guidance: 'Processes for identifying, assessing, and managing climate-related risks.' },
      { code: 'MET', title: 'Metrics & Targets', pillar: 'Environmental', color: '#ef4444', questions: 16, guidance: 'Scope 1, 2, 3 GHG emissions, climate-related targets, performance metrics.' },
    ],
  },
  CDP: {
    name: 'CDP Climate', color: '#0d9488',
    sections: [
      { code: 'C0', title: 'Introduction & Targets', pillar: 'Governance', color: '#6366f1', questions: 8, guidance: 'Reporting year, business description, emission targets overview.' },
      { code: 'C1', title: 'Governance', pillar: 'Governance', color: '#6366f1', questions: 10, guidance: 'Board and management level climate oversight.' },
      { code: 'C2', title: 'Risks & Opportunities', pillar: 'Environmental', color: '#ef4444', questions: 14, guidance: 'Physical and transition climate risks and opportunities identification and assessment.' },
      { code: 'C4', title: 'Targets & Performance', pillar: 'Environmental', color: '#ef4444', questions: 12, guidance: 'Emission targets, reduction initiatives, performance against targets.' },
      { code: 'C6', title: 'Emissions Data', pillar: 'Environmental', color: '#ef4444', questions: 16, guidance: 'Scope 1, 2, 3 absolute and intensity emissions with methodology.' },
      { code: 'C7', title: 'Emissions Breakdowns', pillar: 'Environmental', color: '#ef4444', questions: 8, guidance: 'Emissions by geography, activity, and GHG type.' },
      { code: 'C11', title: 'Carbon Pricing', pillar: 'Governance', color: '#6366f1', questions: 6, guidance: 'Carbon pricing instruments, exposure, and internal carbon prices.' },
      { code: 'C12', title: 'Engagement', pillar: 'Social', color: '#0f766e', questions: 8, guidance: 'Value chain engagement, industry association memberships.' },
    ],
  },
  Custom: {
    name: 'Custom', color: '#8b5cf6',
    sections: [
      { code: 'E-OV', title: 'ESG Overview', pillar: 'Governance', color: '#6366f1', questions: 6, guidance: 'High-level ESG performance summary for executive review.' },
      { code: 'KPI', title: 'Key Performance Indicators', pillar: 'Environmental', color: '#ef4444', questions: 10, guidance: 'Top-line KPIs across environmental, social, and governance pillars.' },
      { code: 'NARR', title: 'Executive Narrative', pillar: 'Governance', color: '#6366f1', questions: 4, guidance: 'Board-level commentary on ESG progress and outlook.' },
    ],
  },
};

const RP_REPORTS: ReportItem[] = [
  { id: 0, name: 'Annual Sustainability Report 2025', std: 'BRSR', type: 'Integrated ESG', status: 'in-progress', color: '#ef4444', fy: 'FY 2024-25', due: 'May 30, 2026', updated: '2 hours ago', sectionProgress: [100, 100, 100, 100, 84, 70, 42, 60, 0, 43, 0] },
  { id: 1, name: 'Q4 GRI Performance Report', std: 'GRI', type: 'Standards-based', status: 'review', color: '#0f766e', fy: 'FY 2024-25', due: 'Apr 30, 2026', updated: '1 day ago', sectionProgress: [100, 100, 100, 100, 100, 100, 100, 100, 100, 100] },
  { id: 2, name: 'ESRS Climate & Sustainability', std: 'ESRS', type: 'Regulatory (CSRD)', status: 'draft', color: '#f59e0b', fy: 'FY 2024-25', due: 'Jun 30, 2026', updated: '3 days ago', sectionProgress: [100, 68, 45, 20, 10, 0, 0, 38, 0, 60] },
  { id: 3, name: 'CDP Climate Disclosure 2025', std: 'CDP', type: 'Investor-facing', status: 'draft', color: '#0d9488', fy: 'FY 2024-25', due: 'Jul 31, 2026', updated: '1 week ago', sectionProgress: [100, 80, 60, 40, 70, 30, 0, 20] },
  { id: 4, name: 'IFRS S2 Climate Disclosure', std: 'IFRS S2', type: 'Investor-facing', status: 'pending', color: '#6366f1', fy: 'FY 2024-25', due: 'Sep 30, 2026', updated: '2 weeks ago', sectionProgress: [50, 20, 0, 0] },
  { id: 5, name: 'Board ESG Scorecard Q1', std: 'Custom', type: 'Executive report', status: 'completed', color: '#8b5cf6', fy: 'Q1 FY 2025-26', due: 'Apr 15, 2026', updated: '2 weeks ago', sectionProgress: [100, 100, 100] },
];

const SECTION_QUESTIONS: Record<string, Question[]> = {
  P6: [
    { id: 'P6-Q1', code: 'P6-Q1', type: 'Quantitative', required: true, qnum: 1, total: 5, status: 'answered', q: 'Details of total energy consumption (in Joules or multiples) and energy intensity', guidance: 'Provide details of total energy consumption from renewable and non-renewable sources. Energy intensity should be calculated per rupee of turnover.', unit: 'GJ', value: '45,230', prevValue: '42,150', prevUnit: 'GJ', prevYoY: '+7.3%', aiSuggestion: 'Based on your previous year data and current inputs, your energy consumption has increased by 7.3%. Consider adding context about capacity expansion or production increase.' },
    { id: 'P6-Q2', code: 'P6-Q2', type: 'Qualitative', required: true, qnum: 2, total: 5, status: 'answered', q: 'Does the entity have any sites / facilities identified as designated consumers (DCs) under the PAT Scheme?', guidance: 'Identify all manufacturing units under PAT scheme as per BEE notifications.', unit: 'Text', value: 'Yes, our manufacturing facility in Pune is designated as a DC under the PAT scheme. The facility has been part of PAT Cycle III and has achieved 105% of the prescribed SEC target.', prevValue: 'Yes \u2014 Plant Pune designated DC under PAT Cycle II. Target achieved 98%.', prevUnit: '', prevYoY: '', aiSuggestion: 'Your response is strong. Consider adding the specific energy consumption (SEC) target value and your actual achievement in numbers.' },
    { id: 'P6-Q3', code: 'P6-Q3', type: 'Quantitative', required: true, qnum: 3, total: 5, status: 'answered', q: 'GHG Scope 1 emissions (direct) in metric tonnes CO2 equivalent', guidance: 'Report gross Scope 1 GHG emissions using GHG Protocol. Include all Kyoto gases.', unit: 'tCO2e', value: '74,200', prevValue: '82,100', prevUnit: 'tCO2e', prevYoY: '-9.6%', aiSuggestion: 'Scope 1 reduced 9.6% YoY \u2014 strong performance. Consider disclosing the specific initiatives that drove this reduction.' },
    { id: 'P6-Q4', code: 'P6-Q4', type: 'Quantitative', required: false, qnum: 4, total: 5, status: 'draft', q: 'Water withdrawal in kilolitres by source (groundwater, surface, municipal, rainwater)', guidance: 'Disclose total water withdrawal split by source. Identify sites in water-stressed areas per WRI Aqueduct.', unit: 'kL', value: '', prevValue: '305,000', prevUnit: 'kL', prevYoY: '', aiSuggestion: 'Previous year: 305,000 kL. Your platform data shows 312,000 kL (FY24 meters). Suggest using this and noting the 2.3% increase.' },
    { id: 'P6-Q5', code: 'P6-Q5', type: 'Qualitative', required: false, qnum: 5, total: 5, status: 'pending', q: 'Describe initiatives taken during the year towards reducing energy consumption', guidance: 'Describe specific programs, technologies deployed, and measurable outcomes.', unit: 'Text', value: '', prevValue: 'Deployed LED lighting across all three facilities (savings: 2.1M kWh/yr). VFD on 12 cooling tower motors at Plant Pune.', prevUnit: '', prevYoY: '', aiSuggestion: 'VFD at Plant Pune: \u21936.2% energy in FY24. LED retrofit across 3 facilities: ~2.4M kWh savings. Solar PPA signed for Plant Nashik Sep 2024 (40% RE by FY26).' },
  ],
  'GRI 305': [
    { id: '305-Q1', code: '305-Q1', type: 'Quantitative', required: true, qnum: 1, total: 4, status: 'answered', q: 'GRI 305-1: Direct (Scope 1) GHG emissions in metric tonnes CO2 equivalent', guidance: 'Report gross direct GHG emissions. Disclose gases included, GWP source, consolidation approach, and base year.', unit: 'tCO2e', value: '74,200', prevValue: '82,100', prevUnit: 'tCO2e', prevYoY: '-9.6%', aiSuggestion: 'Good reduction YoY. Add breakdown by gas type (CO2, CH4, N2O) and by source category to fully satisfy GRI 305-1.' },
    { id: '305-Q2', code: '305-Q2', type: 'Quantitative', required: true, qnum: 2, total: 4, status: 'answered', q: 'GRI 305-2: Energy indirect (Scope 2) GHG emissions \u2014 location-based and market-based', guidance: 'Report both location-based (grid factor) and market-based (contractual instruments). Disclose factors used.', unit: 'tCO2e', value: '68,100', prevValue: '74,500', prevUnit: 'tCO2e', prevYoY: '-8.6%', aiSuggestion: 'Report both location and market-based figures. Market-based figure requires RE certificates.' },
    { id: '305-Q3', code: '305-Q3', type: 'Quantitative', required: true, qnum: 3, total: 4, status: 'draft', q: 'GRI 305-3: Other indirect (Scope 3) GHG emissions by relevant category', guidance: 'Identify and disclose all material Scope 3 categories.', unit: 'tCO2e', value: '', prevValue: '~890,000 (estimated)', prevUnit: 'tCO2e', prevYoY: '', aiSuggestion: 'Platform estimate: ~890k tCO2e from Cat 1 (purchased goods ~61%), Cat 4 (transport 14%), Cat 11 (use of products 13%).' },
    { id: '305-Q4', code: '305-Q4', type: 'Quantitative', required: false, qnum: 4, total: 4, status: 'pending', q: 'GRI 305-4: GHG emissions intensity ratio', guidance: 'Report at least one intensity ratio relevant to the organization.', unit: 'tCO2e/\u20b9cr', value: '', prevValue: '4.30', prevUnit: 'tCO2e/\u20b9cr', prevYoY: '', aiSuggestion: 'Your current year intensity = 4.12 t/\u20b9cr. This is 4.2% better than FY23 (4.30) and 14% better than sector median (4.8).' },
  ],
  E1: [
    { id: 'E1-Q1', code: 'E1-Q1', type: 'Qualitative', required: true, qnum: 1, total: 6, status: 'answered', q: 'E1-1: Transition plan for climate change mitigation aligned with 1.5\u00b0C pathway', guidance: "Describe the undertaking's transition plan, including targets, milestones, and actions.", unit: 'Text', value: 'Larsen & Toubro has committed to net-zero Scope 1+2 emissions by 2035, aligned with SBTi 1.5\u00b0C pathway. Key milestones: 25% reduction by FY2026, 50% by FY2030, net-zero by FY2035.', prevValue: 'Net zero commitment announced FY2022. Transition plan under development.', prevUnit: '', prevYoY: '', aiSuggestion: 'Good foundation. ESRS E1-1 requires specific financial resource allocation to the transition plan. Add CapEx committed for renewables and efficiency.' },
    { id: 'E1-Q2', code: 'E1-Q2', type: 'Quantitative', required: true, qnum: 2, total: 6, status: 'answered', q: 'E1-6: Gross Scope 1, 2, and 3 GHG emissions in metric tonnes CO2 equivalent', guidance: 'Report gross Scope 1 (direct), Scope 2 (location + market-based), and material Scope 3 categories.', unit: 'tCO2e', value: '1,106,500', prevValue: '1,214,600', prevUnit: 'tCO2e', prevYoY: '-8.9%', aiSuggestion: 'Good disclosure. Ensure Scope 3 breakdown covers all material categories.' },
    { id: 'E1-Q3', code: 'E1-Q3', type: 'Quantitative', required: true, qnum: 3, total: 6, status: 'draft', q: 'E1-5: Energy consumption and mix from fossil and renewable sources', guidance: 'Report total energy from fossil fuels, nuclear, renewable. Disclose renewable energy as % of total.', unit: 'GJ', value: '', prevValue: '1,910,000', prevUnit: 'GJ', prevYoY: '', aiSuggestion: 'Platform data: 1,840,000 GJ total. Renewable: 331,200 GJ (18%). Non-renewable: 1,508,800 GJ (82%).' },
    { id: 'E1-Q4', code: 'E1-Q4', type: 'Qualitative', required: true, qnum: 4, total: 6, status: 'pending', q: 'E1-2: Climate-related policies and actions for climate change mitigation and adaptation', guidance: "Describe the undertaking's policies related to climate change mitigation and any adaptation actions.", unit: 'Text', value: '', prevValue: '', prevUnit: '', prevYoY: '', aiSuggestion: 'Describe your ISO 50001 energy management framework, renewable procurement policy, and fleet electrification roadmap.' },
    { id: 'E1-Q5', code: 'E1-Q5', type: 'Quantitative', required: false, qnum: 5, total: 6, status: 'pending', q: 'E1-7: GHG removals and carbon credits', guidance: 'Disclose GHG removals from the atmosphere and credits purchased/retired, if any.', unit: 'tCO2e', value: '', prevValue: '0', prevUnit: 'tCO2e', prevYoY: '', aiSuggestion: 'Currently 0. If considering carbon credits for residual emissions post-2030, document the strategy now.' },
    { id: 'E1-Q6', code: 'E1-Q6', type: 'Quantitative', required: false, qnum: 6, total: 6, status: 'pending', q: 'E1-8: Internal carbon pricing', guidance: 'If the undertaking uses an internal carbon price, disclose the price and how it influences decision-making.', unit: '$/tCO2e', value: '', prevValue: 'Not in use', prevUnit: '', prevYoY: '', aiSuggestion: 'Consider implementing an internal shadow carbon price ($20\u2013150/tCO2e) to guide CapEx decisions.' },
  ],
};

/* ── Helpers ── */

const STATUS_BADGE: Record<string, string> = {
  'in-progress': 'b-teal', review: 'b-ind', draft: 'b-amber', pending: 'b-gray', completed: 'b-green',
};

const STATUS_LABEL: Record<string, string> = {
  'in-progress': 'In Progress', review: 'In Review', draft: 'Draft', pending: 'Pending', completed: 'Completed',
};

const Q_STATUS_STYLE: Record<string, { bg: string; col: string; label: string }> = {
  answered: { bg: 'var(--grnbg)', col: 'var(--grn)', label: 'Answered' },
  draft: { bg: 'var(--ambbg)', col: 'var(--amb)', label: 'Draft' },
  pending: { bg: 'var(--bg)', col: 'var(--tx3)', label: 'Pending' },
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? `Request failed: ${res.status}`);
  }
  if (res.status === 204) return {} as T;
  return res.json();
}

/* ── Component ── */

export default function ReportsScreen({ navigate }: Props) {
  const queryClient = useQueryClient();
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [showGenModal, setShowGenModal] = useState(false);
  const [genFramework, setGenFramework] = useState('BRSR');
  const donutRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<any>(null);

  const report = RP_REPORTS[selectedIdx];
  const template = RP_TEMPLATES[report.std] ?? RP_TEMPLATES.Custom;
  const sections = template.sections;
  const progress = sections.length > 0
    ? Math.round(report.sectionProgress.reduce((a, b) => a + b, 0) / report.sectionProgress.length)
    : 0;
  const sectionsDone = report.sectionProgress.filter(p => p === 100).length;
  const totalQuestions = sections.reduce((s, sec) => s + sec.questions, 0);
  const questionsAnswered = Math.round(totalQuestions * progress / 100);

  /* Donut chart */
  useEffect(() => {
    let chart: any;
    (async () => {
      const { Chart, registerables } = await import('chart.js');
      Chart.register(...registerables);
      if (!donutRef.current) return;
      if (chartRef.current) chartRef.current.destroy();
      chart = new Chart(donutRef.current, {
        type: 'doughnut',
        data: {
          labels: ['Done', 'Remaining'],
          datasets: [{ data: [progress, 100 - progress], backgroundColor: ['#0f766e', '#f3f4f6'], borderWidth: 0 }],
        },
        options: { responsive: true, maintainAspectRatio: true, cutout: '72%', plugins: { legend: { display: false }, tooltip: { enabled: false } } },
      });
      chartRef.current = chart;
    })();
    return () => { chartRef.current?.destroy(); chartRef.current = null; };
  }, [selectedIdx, progress]);

  /* Generate handler */
  async function handleGenerate(fw: string) {
    setGenerating(true);
    setGenError(null);
    try {
      await fetchJson('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ framework: fw, periodId: 'fy-2024-25' }),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.all });
      setShowGenModal(false);
    } catch (err: unknown) {
      setGenError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="ph">
        <div><div className="ptitle">Report builder</div><div className="psub">Framework templates &middot; BRSR &middot; GRI 2021 &middot; ESRS &middot; IFRS S2 &middot; auto-generate PDF &amp; XBRL</div></div>
        <div className="ph-acts">
          <button className="btn-secondary" style={{ fontSize: 11 }}>Preview</button>
          <button className="btn-primary" onClick={() => setShowGenModal(true)}>+ New report</button>
        </div>
      </div>

      {/* Generate modal */}
      {showGenModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowGenModal(false)}>
          <div style={{ background: 'var(--surf)', borderRadius: 12, padding: 24, width: 400, maxWidth: '90vw' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--tx1)', marginBottom: 16 }}>Generate new report</div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx2)', marginBottom: 5 }}>Framework</div>
              <select className="sel" style={{ fontSize: 12, padding: '6px 10px', width: '100%' }} value={genFramework} onChange={e => setGenFramework(e.target.value)}>
                {Object.entries(RP_TEMPLATES).map(([k, t]) => <option key={k} value={k}>{t.name}</option>)}
              </select>
            </div>
            {genError && <div style={{ fontSize: 11, color: 'var(--red)', marginBottom: 12, padding: 8, background: 'var(--redbg)', borderRadius: 6 }}>{genError}</div>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setShowGenModal(false)}>Cancel</button>
              <button className="btn-primary" disabled={generating} onClick={() => handleGenerate(genFramework)}>{generating ? 'Generating...' : 'Generate'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Stats strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 14 }}>
        {([
          [RP_REPORTS.length, 'Total Reports', 'var(--tx1)'],
          [RP_REPORTS.filter(r => r.status === 'in-progress').length, 'In Progress', 'var(--t700)'],
          [RP_REPORTS.filter(r => r.status === 'review').length, 'In Review', 'var(--ind)'],
          [RP_REPORTS.filter(r => r.status === 'draft').length, 'Draft', 'var(--amb)'],
          [RP_REPORTS.filter(r => r.status === 'completed').length, 'Completed', 'var(--grn)'],
        ] as [number, string, string][]).map(([val, label, c]) => (
          <div key={label} className="stat-card">
            <div className="slbl">{label}</div>
            <div className="sval" style={{ color: c }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Main grid: sidebar + content */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 12 }}>
        {/* Left sidebar - Report list */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--tx3)', marginBottom: 8 }}>Active Reports</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {RP_REPORTS.map((r, i) => {
              const isSel = i === selectedIdx;
              return (
                <div key={r.id} onClick={() => { setSelectedIdx(i); setOpenSection(null); }} style={{
                  background: isSel ? 'var(--t50)' : 'var(--surf)',
                  border: isSel ? '1.5px solid var(--t400)' : '.5px solid var(--bdr)',
                  borderRadius: 10, padding: '12px 14px', cursor: 'pointer', transition: 'all .12s',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 6, background: `${r.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: r.color }}>{r.std.charAt(0)}</span>
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx1)', lineHeight: 1.3 }}>{r.name}</div>
                        <div style={{ display: 'flex', gap: 4, marginTop: 3, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 3, fontWeight: 700, background: `${r.color}15`, color: r.color }}>{r.std}</span>
                          <span className={`badge ${STATUS_BADGE[r.status] ?? 'b-gray'}`} style={{ fontSize: 8 }}>{STATUS_LABEL[r.status] ?? r.status}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <div style={{ fontSize: 9, color: 'var(--tx3)' }}>{r.fy} &middot; Due {r.due}</div>
                    <div style={{ fontSize: 9, color: 'var(--tx3)' }}>Updated {r.updated}</div>
                  </div>
                  {/* Mini progress bar */}
                  <div className="pbar-bg" style={{ height: 3, marginTop: 6 }}>
                    <div className="pbar-fill" style={{ width: `${Math.round(r.sectionProgress.reduce((a, b) => a + b, 0) / r.sectionProgress.length)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right content */}
        <div>
          {/* Report header card */}
          <div style={{ background: 'var(--surf)', border: '.5px solid var(--bdr)', borderRadius: 12, padding: '20px 24px', marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--tx1)', marginBottom: 4 }}>{report.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--tx2)' }}>
                  <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, fontWeight: 700, background: `${report.color}15`, color: report.color }}>{report.std}</span>
                  <span className={`badge ${STATUS_BADGE[report.status] ?? 'b-gray'}`} style={{ fontSize: 9 }}>{STATUS_LABEL[report.status] ?? report.status}</span>
                  <span>{report.type}</span>
                  <span>&middot;</span>
                  <span>{report.fy}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn-secondary" style={{ fontSize: 11 }}>Export PDF</button>
                <button className="btn-secondary" style={{ fontSize: 11 }}>XBRL</button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr 1fr', gap: 16, alignItems: 'center' }}>
              {/* Donut */}
              <div style={{ position: 'relative', width: 80, height: 80 }}>
                <canvas ref={donutRef} />
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--fm)', color: 'var(--t700)' }}>{progress}%</div>
                  <div style={{ fontSize: 8, color: 'var(--tx3)' }}>Coverage</div>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--fm)', color: 'var(--tx1)' }}>{sectionsDone}/{sections.length}</div>
                <div style={{ fontSize: 10, color: 'var(--tx3)' }}>Sections complete</div>
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--fm)', color: 'var(--tx1)' }}>{questionsAnswered}/{totalQuestions}</div>
                <div style={{ fontSize: 10, color: 'var(--tx3)' }}>Questions answered</div>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--fm)', color: 'var(--tx1)' }}>Due {report.due}</div>
                <div style={{ fontSize: 10, color: 'var(--tx3)' }}>Deadline</div>
              </div>
            </div>
          </div>

          {/* AI bar */}
          <div style={{ background: 'linear-gradient(135deg, var(--t700), #0d9488)', borderRadius: 10, padding: '14px 18px', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 28, height: 28, background: 'rgba(255,255,255,.2)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 2l2 4 4 .5-3 3 .5 4L8 12l-3.5 1.5.5-4-3-3L6 6l2-4z" fill="white" /></svg>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>AI-Powered Assistance</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.8)' }}>Intelligent content generation, smart suggestions, and automated compliance checking.</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ padding: '7px 14px', background: '#fff', color: 'var(--t700)', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                onClick={() => handleGenerate(report.std)}>Generate Content</button>
            </div>
          </div>

          {/* Section list or section detail */}
          {openSection ? (
            <SectionDetail
              sectionCode={openSection}
              template={template}
              report={report}
              onBack={() => setOpenSection(null)}
            />
          ) : (
            <div style={{ background: 'var(--surf)', border: '.5px solid var(--bdr)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '.5px solid var(--bdr)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx1)' }}>Report sections</span>
                  <span style={{ fontSize: 11, color: 'var(--tx3)', marginLeft: 8 }}>{sections.length} sections &middot; {template.name} template</span>
                </div>
              </div>
              {sections.map((sec, i) => {
                const pct = report.sectionProgress[i] ?? 0;
                return (
                  <div key={sec.code} onClick={() => setOpenSection(sec.code)} style={{
                    display: 'grid', gridTemplateColumns: '40px 1fr 160px', alignItems: 'center', gap: 12,
                    padding: '12px 18px', borderBottom: i < sections.length - 1 ? '.5px solid var(--bdr2)' : 'none',
                    cursor: 'pointer', transition: 'background .1s',
                  }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                    {/* Status icon */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {pct === 100 ? (
                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--grn)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M4 8l3 3 5-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </div>
                      ) : pct > 0 ? (
                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--t100)', border: '2px solid var(--t400)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--t600)' }} />
                        </div>
                      ) : (
                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--bdr2)', border: '2px solid var(--bdr)' }} />
                      )}
                    </div>
                    {/* Section info */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx1)' }}>{sec.title}</span>
                        <span style={{ fontSize: 8, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: `${sec.color}15`, color: sec.color }}>{sec.pillar}</span>
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--tx3)', marginTop: 3, display: 'flex', gap: 8 }}>
                        <span>{sec.questions} questions</span>
                        <span>{sec.guidance}</span>
                      </div>
                    </div>
                    {/* Progress */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="pbar-bg" style={{ flex: 1, height: 4 }}>
                        <div className="pbar-fill" style={{ width: `${pct}%`, background: pct === 100 ? 'var(--grn)' : pct > 50 ? 'var(--t500)' : pct > 0 ? 'var(--amb)' : 'var(--bdr)' }} />
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'var(--fm)', color: pct === 100 ? 'var(--grn)' : pct > 50 ? 'var(--t700)' : 'var(--red)', minWidth: 28, textAlign: 'right' }}>{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Section detail view with questions ─────────────────────── */
function SectionDetail({ sectionCode, template, report, onBack }: {
  sectionCode: string;
  template: { name: string; color: string; sections: TemplateSection[] };
  report: ReportItem;
  onBack: () => void;
}) {
  const secIdx = template.sections.findIndex(s => s.code === sectionCode);
  const section = template.sections[secIdx];
  if (!section) return null;

  const pct = report.sectionProgress[secIdx] ?? 0;
  const questions = SECTION_QUESTIONS[sectionCode] ?? [];
  const hasQuestions = questions.length > 0;
  const answered = questions.filter(q => q.status === 'answered').length;
  const drafts = questions.filter(q => q.status === 'draft').length;
  const pending = questions.filter(q => q.status === 'pending').length;

  return (
    <div>
      {/* Breadcrumb + back */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <button onClick={onBack} style={{ background: 'none', border: '.5px solid var(--bdr)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 11, color: 'var(--tx2)' }}>
          &larr; Back to sections
        </button>
        <span style={{ fontSize: 11, color: 'var(--tx3)' }}>{template.name}</span>
        <span style={{ fontSize: 11, color: 'var(--tx3)' }}>&rsaquo;</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx1)' }}>{section.code}</span>
      </div>

      {/* Section header */}
      <div style={{ background: 'var(--surf)', border: '.5px solid var(--bdr)', borderRadius: 12, padding: '18px 22px', marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--tx1)', marginBottom: 4 }}>{section.title}</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3, background: `${section.color}15`, color: section.color }}>{section.pillar}</span>
              <span style={{ fontSize: 11, color: 'var(--tx3)' }}>{section.questions} questions</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="pbar-bg" style={{ width: 120, height: 6 }}>
              <div className="pbar-fill" style={{ width: `${pct}%`, background: pct === 100 ? 'var(--grn)' : 'var(--t500)' }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--fm)', color: pct === 100 ? 'var(--grn)' : 'var(--t700)' }}>{pct}%</span>
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--tx2)', lineHeight: 1.6, background: 'var(--bg)', borderRadius: 8, padding: '10px 14px' }}>{section.guidance}</div>

        {hasQuestions && (
          <div style={{ display: 'flex', gap: 12, marginTop: 12, fontSize: 11 }}>
            <span style={{ color: 'var(--grn)', fontWeight: 600 }}>{answered} answered</span>
            <span style={{ color: 'var(--amb)', fontWeight: 600 }}>{drafts} draft</span>
            <span style={{ color: 'var(--tx3)', fontWeight: 600 }}>{pending} pending</span>
          </div>
        )}
      </div>

      {/* Questions list */}
      {hasQuestions ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {questions.map(q => (
            <QuestionCard key={q.id} q={q} templateColor={template.color} />
          ))}
        </div>
      ) : (
        <div style={{ background: 'var(--surf)', border: '.5px solid var(--bdr)', borderRadius: 12, padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: 'var(--tx2)', marginBottom: 8 }}>Questions for this section will appear once data entry begins.</div>
          <div style={{ fontSize: 11, color: 'var(--tx3)' }}>This section has {section.questions} disclosure questions. Click "Generate Content" to auto-populate from your existing KPI data.</div>
          <button className="btn-primary" style={{ marginTop: 12, fontSize: 11 }}>Generate section content</button>
        </div>
      )}
    </div>
  );
}

/* ── Individual question card ───────────────────────────────── */
function QuestionCard({ q, templateColor }: { q: Question; templateColor: string }) {
  const [expanded, setExpanded] = useState(false);
  const qs = Q_STATUS_STYLE[q.status] ?? Q_STATUS_STYLE.pending;

  return (
    <div style={{ background: 'var(--surf)', border: '.5px solid var(--bdr)', borderRadius: 10, overflow: 'hidden' }}>
      {/* Question header row */}
      <div onClick={() => setExpanded(!expanded)} style={{ display: 'grid', gridTemplateColumns: '40px 1fr auto 90px', alignItems: 'center', gap: 10, padding: '12px 16px', cursor: 'pointer', transition: 'background .1s' }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg)'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
        {/* Status dot */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 24, height: 24, borderRadius: '50%', background: qs.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {q.status === 'answered' && <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M4 8l3 3 5-6" stroke={qs.col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            {q.status === 'draft' && <div style={{ width: 8, height: 8, borderRadius: '50%', background: qs.col }} />}
            {q.status === 'pending' && <div style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--bdr)', border: '1px solid var(--tx3)' }} />}
          </div>
        </div>
        {/* Question text */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'var(--fm)', color: templateColor }}>{q.code}</span>
            <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 3, fontWeight: 700, background: q.type === 'Quantitative' ? 'var(--t50)' : 'var(--bg)', color: q.type === 'Quantitative' ? 'var(--t700)' : 'var(--tx2)' }}>{q.type}</span>
            {q.required && <span style={{ fontSize: 8, fontWeight: 700, color: 'var(--red)' }}>Required</span>}
          </div>
          <div style={{ fontSize: 12, color: 'var(--tx1)', lineHeight: 1.4 }}>{q.q}</div>
        </div>
        {/* Value preview */}
        <div style={{ textAlign: 'right' }}>
          {q.value ? (
            <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--fm)', color: 'var(--t700)' }}>
              {q.value.length > 30 ? q.value.slice(0, 28) + '\u2026' : q.value}
              {q.unit !== 'Text' && <span style={{ fontSize: 9, fontWeight: 400, color: 'var(--tx3)', marginLeft: 3 }}>{q.unit}</span>}
            </div>
          ) : (
            <div style={{ fontSize: 11, color: 'var(--tx3)', fontStyle: 'italic' }}>No value</div>
          )}
        </div>
        {/* Status badge */}
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: qs.bg, color: qs.col }}>{qs.label}</span>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ borderTop: '.5px solid var(--bdr)', padding: '14px 16px', background: 'var(--bg)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 12 }}>
            {/* Guidance */}
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--tx3)', marginBottom: 4 }}>Guidance</div>
              <div style={{ fontSize: 11, color: 'var(--tx2)', lineHeight: 1.6 }}>{q.guidance}</div>
            </div>
            {/* Previous year */}
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--tx3)', marginBottom: 4 }}>Previous year value</div>
              {q.prevValue ? (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--fm)', color: 'var(--tx1)' }}>
                    {q.prevValue.length > 50 ? q.prevValue.slice(0, 48) + '\u2026' : q.prevValue}
                    {q.prevUnit && <span style={{ fontSize: 9, fontWeight: 400, color: 'var(--tx3)', marginLeft: 3 }}>{q.prevUnit}</span>}
                  </div>
                  {q.prevYoY && (
                    <div style={{ fontSize: 10, fontWeight: 600, color: q.prevYoY.startsWith('-') ? 'var(--grn)' : q.prevYoY.startsWith('+') ? 'var(--amb)' : 'var(--tx3)', marginTop: 3 }}>
                      {q.prevYoY} YoY
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: 11, color: 'var(--tx3)', fontStyle: 'italic' }}>No previous data</div>
              )}
            </div>
          </div>

          {/* Current value */}
          {q.value && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--tx3)', marginBottom: 4 }}>Current value</div>
              <div style={{ fontSize: 12, color: 'var(--tx1)', lineHeight: 1.6, background: 'var(--surf)', borderRadius: 8, padding: '10px 14px', border: '.5px solid var(--bdr)' }}>
                {q.value}
                {q.unit !== 'Text' && <span style={{ fontSize: 10, color: 'var(--tx3)', marginLeft: 4 }}>{q.unit}</span>}
              </div>
            </div>
          )}

          {/* AI suggestion */}
          <div style={{ background: 'linear-gradient(135deg, #f0fdfa, #ecfdf5)', borderRadius: 8, padding: '12px 14px', border: '1px solid #99f6e440' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 2l2 4 4 .5-3 3 .5 4L8 12l-3.5 1.5.5-4-3-3L6 6l2-4z" fill="#0f766e" /></svg>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--t700)' }}>AI Suggestion</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--tx1)', lineHeight: 1.6 }}>{q.aiSuggestion}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <button style={{ padding: '4px 10px', fontSize: 10, fontWeight: 600, background: 'var(--t700)', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer' }}>Apply suggestion</button>
              <button style={{ padding: '4px 10px', fontSize: 10, background: 'var(--surf)', border: '.5px solid var(--bdr)', borderRadius: 5, cursor: 'pointer', color: 'var(--tx2)' }}>Dismiss</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
