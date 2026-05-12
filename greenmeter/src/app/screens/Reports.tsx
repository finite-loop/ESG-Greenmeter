"use client";
import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";

type Props = { navigate:(s:any)=>void; [k:string]:any };

/* ── Framework template structures (UI reference data) ───── */

interface TemplateSection {
  code: string; title: string; pillar: string; color: string; questions: number; guidance: string;
}

const RP_TEMPLATES: Record<string, { name: string; color: string; apiKey: string; sections: TemplateSection[] }> = {
  BRSR: {
    name: 'BRSR Core', color: '#ef4444', apiKey: 'BRSR',
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
    name: 'GRI Universal 2021', color: '#0f766e', apiKey: 'GRI',
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
    name: 'ESRS (CSRD)', color: '#f59e0b', apiKey: 'ESRS',
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
  IFRS_S2: {
    name: 'IFRS S2 Climate', color: '#6366f1', apiKey: 'IFRS_S2',
    sections: [
      { code: 'GOV', title: 'Governance', pillar: 'Governance', color: '#6366f1', questions: 10, guidance: 'Board oversight of climate-related risks and opportunities, management role.' },
      { code: 'STR', title: 'Strategy', pillar: 'Governance', color: '#6366f1', questions: 14, guidance: 'Climate-related risks and opportunities, their impact on business model and strategy.' },
      { code: 'RISK', title: 'Risk Management', pillar: 'Governance', color: '#6366f1', questions: 8, guidance: 'Processes for identifying, assessing, and managing climate-related risks.' },
      { code: 'MET', title: 'Metrics & Targets', pillar: 'Environmental', color: '#ef4444', questions: 16, guidance: 'Scope 1, 2, 3 GHG emissions, climate-related targets, performance metrics.' },
    ],
  },
};

/* ── Types ── */

interface GeneratedReport {
  reportId: string;
  tenantId: string;
  templateId: string;
  periodId: string;
  name: string;
  status: string | null;
  format: string | null;
  blobUrl: string | null;
  metadata: Record<string, unknown> | null;
  generatedBy: string | null;
  generatedAt: string | null;
  createdAt: string;
}

interface RenderedParameter {
  paramId: string; code: string; name: string; unit: string; dataType: string;
  value: string | null; valueText: string | null; displayValue: string;
  status: 'reported' | 'not_reported' | 'not_applicable'; verified: boolean;
}

interface RenderedDisclosure {
  id: string; name: string; description?: string;
  parameters: RenderedParameter[]; reported: number; total: number;
}

interface RenderedSection {
  id: string; name: string; description?: string; pillar?: string;
  disclosures: RenderedDisclosure[]; reported: number; total: number;
}

interface RenderedReport {
  framework: string; templateName: string; templateVersion: string;
  tenantId: string; periodId: string; fiscalYear: string; generatedAt: string;
  sections: RenderedSection[];
  coverage: { reported: number; notReported: number; notApplicable: number; total: number; percentComplete: number };
}

interface PeriodOption { periodId: string; label: string; fiscalYear: string }

/* ── Helpers ── */

const STATUS_BADGE: Record<string, string> = {
  pending: 'b-gray', generating: 'b-amber', complete: 'b-green', failed: 'b-red',
  'in-progress': 'b-teal', review: 'b-ind', draft: 'b-amber', completed: 'b-green',
};
const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending', generating: 'Generating...', complete: 'Complete', failed: 'Failed',
  'in-progress': 'In Progress', review: 'In Review', draft: 'Draft', completed: 'Completed',
};

const PILLAR_COLOR: Record<string, string> = {
  Environmental: '#ef4444', Social: '#0f766e', Governance: '#6366f1', environmental: '#ef4444', social: '#0f766e', governance: '#6366f1',
};

const FRAMEWORK_COLOR: Record<string, string> = {
  BRSR: '#ef4444', GRI: '#0f766e', ESRS: '#f59e0b', IFRS_S2: '#6366f1',
};

function frameworkLabel(std: string): string {
  const map: Record<string, string> = { BRSR: 'BRSR', GRI: 'GRI', ESRS: 'ESRS', IFRS_S2: 'IFRS S2' };
  return map[std] ?? std;
}

function templateForStandard(std: string) {
  return RP_TEMPLATES[std] ?? RP_TEMPLATES.BRSR;
}

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
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [showGenModal, setShowGenModal] = useState(false);
  const [genFramework, setGenFramework] = useState('BRSR');
  const donutRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<any>(null);

  /* Fetch reporting periods */
  const { data: periods = [] } = useQuery<PeriodOption[]>({
    queryKey: queryKeys.periods.list(),
    queryFn: async () => {
      const res = await fetchJson<{ data: Array<{ periodId: string; label: string; fiscalYear: string }> }>('/api/periods');
      return res.data.map(p => ({ periodId: p.periodId, label: p.label, fiscalYear: p.fiscalYear }));
    },
  });
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  useEffect(() => { if (periods.length > 0 && !selectedPeriodId) setSelectedPeriodId(periods[0].periodId); }, [periods, selectedPeriodId]);

  /* Fetch real reports from API */
  const { data: reports = [], isLoading: reportsLoading } = useQuery<GeneratedReport[]>({
    queryKey: queryKeys.reports.all,
    queryFn: async () => {
      const res = await fetchJson<{ data: GeneratedReport[] }>('/api/reports');
      return res.data;
    },
  });

  // Auto-select first report
  useEffect(() => {
    if (reports.length > 0 && !selectedReportId) setSelectedReportId(reports[0].reportId);
  }, [reports, selectedReportId]);

  const selectedReport = reports.find(r => r.reportId === selectedReportId) ?? null;
  const framework = selectedReport
    ? (selectedReport.metadata as Record<string, unknown>)?.framework as string ?? detectFramework(selectedReport.name)
    : 'BRSR';

  /* Fetch rendered report data for the selected report */
  const renderPeriodId = selectedReport?.periodId;
  const { data: renderedReport, isLoading: renderLoading } = useQuery<RenderedReport>({
    queryKey: queryKeys.reports.render({ framework, periodId: renderPeriodId! }),
    queryFn: async () => {
      const res = await fetchJson<{ data: RenderedReport }>(`/api/reports/render?framework=${framework}&periodId=${renderPeriodId}`);
      return res.data;
    },
    enabled: !!renderPeriodId && !!framework && !!selectedReport,
  });

  const template = templateForStandard(framework);
  const fwColor = FRAMEWORK_COLOR[framework] ?? '#6366f1';

  /* Derive section progress from rendered data */
  const sectionProgress = renderedReport
    ? renderedReport.sections.map(s => s.total > 0 ? Math.round((s.reported / s.total) * 100) : 0)
    : template.sections.map(() => 0);

  const progress = renderedReport?.coverage.percentComplete ?? 0;
  const sectionsDone = sectionProgress.filter(p => p === 100).length;
  const totalSections = renderedReport?.sections.length ?? template.sections.length;
  const totalParams = renderedReport?.coverage.total ?? 0;
  const paramsReported = renderedReport?.coverage.reported ?? 0;

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
  }, [selectedReportId, progress]);

  /* Generate handler */
  async function handleGenerate(fw: string) {
    if (!selectedPeriodId) { setGenError('Please select a reporting period'); return; }
    setGenerating(true);
    setGenError(null);
    try {
      await fetchJson('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ framework: fw, periodId: selectedPeriodId }),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.all });
      setShowGenModal(false);
    } catch (err: unknown) {
      setGenError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  }

  /* ── Empty state ── */
  if (reportsLoading) {
    return (
      <div>
        <div className="ph"><div><div className="ptitle">Report builder</div><div className="psub">Loading reports...</div></div></div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
          <div style={{ fontSize: 13, color: 'var(--tx3)' }}>Loading...</div>
        </div>
      </div>
    );
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

      {/* New Report modal */}
      {showGenModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowGenModal(false)}>
          <div style={{ background: 'var(--surf)', borderRadius: 14, padding: 24, width: 520, maxWidth: '96vw', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowGenModal(false)} style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--tx3)' }}>&times;</button>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx1)', marginBottom: 4 }}>Create a new report</div>
            <div style={{ fontSize: 11, color: 'var(--tx2)', marginBottom: 16, lineHeight: 1.5 }}>Select a reporting standard, name your report, and choose the fiscal year. The template will pre-populate sections based on the selected standard.</div>

            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx2)', marginBottom: 8 }}>Select reporting standard *</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
              {([
                ['BRSR', 'BRSR Core', 'SEBI-mandated Business Responsibility & Sustainability Report for top 1000 listed entities.', '#ef4444'],
                ['GRI', 'GRI Universal 2021', 'Global Reporting Initiative universal and topic-specific standards for comprehensive sustainability disclosure.', '#0f766e'],
                ['ESRS', 'ESRS (CSRD)', 'European Sustainability Reporting Standards under the Corporate Sustainability Reporting Directive.', '#f59e0b'],
                ['IFRS_S2', 'IFRS S2 Climate', 'ISSB climate-related disclosure standard focused on risks, opportunities, and metrics.', '#6366f1'],
              ] as [string, string, string, string][]).map(([k, label, desc, c]) => (
                <label key={k} onClick={() => setGenFramework(k)} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                  border: genFramework === k ? `1.5px solid ${c}` : '.5px solid var(--bdr)',
                  borderRadius: 10, cursor: 'pointer', transition: 'all .12s',
                  background: genFramework === k ? `${c}08` : 'var(--surf)',
                }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${genFramework === k ? c : 'var(--bdr)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {genFramework === k && <div style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx1)' }}>{label}</div>
                    <div style={{ fontSize: 10, color: 'var(--tx3)', lineHeight: 1.4, marginTop: 1 }}>{desc}</div>
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: `${c}15`, color: c }}>{frameworkLabel(k)}</span>
                </label>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <div className="field"><label className="lbl">Report name *</label><input className="inp" placeholder={`e.g. Annual Sustainability Report ${new Date().getFullYear()}`} /></div>
              <div className="field"><label className="lbl">Reporting period *</label>
                <select className="sel" value={selectedPeriodId} onChange={e => setSelectedPeriodId(e.target.value)}>
                  {periods.length === 0 && <option value="">No periods available</option>}
                  {periods.map(p => <option key={p.periodId} value={p.periodId}>{p.label} (FY {p.fiscalYear})</option>)}
                </select>
              </div>
            </div>

            {genError && <div style={{ fontSize: 11, color: 'var(--red)', marginBottom: 12, padding: 8, background: 'var(--redbg)', borderRadius: 6 }}>{genError}</div>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setShowGenModal(false)}>Cancel</button>
              <button className="btn-primary" disabled={generating} onClick={() => handleGenerate(genFramework)}>{generating ? 'Creating...' : 'Create report'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Stats strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 14 }}>
        {([
          [reports.length, 'Total Reports', 'var(--tx1)'],
          [reports.filter(r => r.status === 'pending' || r.status === 'generating').length, 'In Progress', 'var(--amb)'],
          [reports.filter(r => r.status === 'complete').length, 'Complete', 'var(--grn)'],
          [reports.filter(r => r.status === 'failed').length, 'Failed', 'var(--red)'],
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
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--tx3)', marginBottom: 8 }}>Your Reports</div>
          {reports.length === 0 ? (
            <div style={{ background: 'var(--surf)', border: '1px dashed var(--bdr)', borderRadius: 10, padding: '24px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--tx2)', marginBottom: 8 }}>No reports yet</div>
              <div style={{ fontSize: 11, color: 'var(--tx3)', marginBottom: 12 }}>Create your first ESG report using a framework template.</div>
              <button className="btn-primary" style={{ fontSize: 11 }} onClick={() => setShowGenModal(true)}>+ New report</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {reports.map(r => {
                const isSel = r.reportId === selectedReportId;
                const rFw = (r.metadata as Record<string, unknown>)?.framework as string ?? detectFramework(r.name);
                const rc = FRAMEWORK_COLOR[rFw] ?? '#6366f1';
                const rPeriod = periods.find(p => p.periodId === r.periodId);
                return (
                  <div key={r.reportId} onClick={() => { setSelectedReportId(r.reportId); setOpenSection(null); }} style={{
                    background: isSel ? 'var(--t50)' : 'var(--surf)',
                    border: isSel ? '1.5px solid var(--t400)' : '.5px solid var(--bdr)',
                    borderRadius: 10, padding: '12px 14px', cursor: 'pointer', transition: 'all .12s',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 6, background: `${rc}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: rc }}>{frameworkLabel(rFw).charAt(0)}</span>
                        </div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx1)', lineHeight: 1.3 }}>{r.name}</div>
                          <div style={{ display: 'flex', gap: 4, marginTop: 3, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 3, fontWeight: 700, background: `${rc}15`, color: rc }}>{frameworkLabel(rFw)}</span>
                            <span className={`badge ${STATUS_BADGE[r.status ?? 'pending'] ?? 'b-gray'}`} style={{ fontSize: 8 }}>{STATUS_LABEL[r.status ?? 'pending'] ?? r.status}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                      <div style={{ fontSize: 9, color: 'var(--tx3)' }}>
                        {rPeriod ? `FY ${rPeriod.fiscalYear}` : ''} &middot; {r.format ?? 'pdf'}
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--tx3)' }}>{new Date(r.createdAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right content */}
        <div>
          {!selectedReport ? (
            <div style={{ background: 'var(--surf)', border: '.5px solid var(--bdr)', borderRadius: 12, padding: '60px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 14, color: 'var(--tx2)', marginBottom: 8 }}>Select a report or create a new one</div>
              <div style={{ fontSize: 11, color: 'var(--tx3)' }}>Choose a report from the sidebar to view its sections and progress, or click &quot;+ New report&quot; to start fresh.</div>
            </div>
          ) : openSection ? (
            <SectionDetail
              sectionId={openSection}
              renderedReport={renderedReport}
              template={template}
              framework={framework}
              fwColor={fwColor}
              onBack={() => setOpenSection(null)}
            />
          ) : (
            <>
              {/* Report header card */}
              <div style={{ background: 'var(--surf)', border: '.5px solid var(--bdr)', borderRadius: 12, padding: '20px 24px', marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--tx1)', marginBottom: 4 }}>{selectedReport.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--tx2)' }}>
                      <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, fontWeight: 700, background: `${fwColor}15`, color: fwColor }}>{frameworkLabel(framework)}</span>
                      <span className={`badge ${STATUS_BADGE[selectedReport.status ?? 'pending'] ?? 'b-gray'}`} style={{ fontSize: 9 }}>{STATUS_LABEL[selectedReport.status ?? 'pending'] ?? selectedReport.status}</span>
                      <span>{selectedReport.format ?? 'pdf'}</span>
                      {renderedReport && <><span>&middot;</span><span>FY {renderedReport.fiscalYear}</span></>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {selectedReport.blobUrl && <button className="btn-secondary" style={{ fontSize: 11 }}>Download PDF</button>}
                    <button className="btn-secondary" style={{ fontSize: 11 }}>Export XBRL</button>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr 1fr', gap: 16, alignItems: 'center' }}>
                  <div style={{ position: 'relative', width: 80, height: 80 }}>
                    <canvas ref={donutRef} />
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
                      <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--fm)', color: 'var(--t700)' }}>{progress}%</div>
                      <div style={{ fontSize: 8, color: 'var(--tx3)' }}>Coverage</div>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--fm)', color: 'var(--tx1)' }}>{sectionsDone}/{totalSections}</div>
                    <div style={{ fontSize: 10, color: 'var(--tx3)' }}>Sections complete</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--fm)', color: 'var(--tx1)' }}>{paramsReported}/{totalParams}</div>
                    <div style={{ fontSize: 10, color: 'var(--tx3)' }}>Parameters reported</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--fm)', color: 'var(--tx1)' }}>
                      {selectedReport.generatedAt ? new Date(selectedReport.generatedAt).toLocaleDateString() : 'Pending'}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--tx3)' }}>{selectedReport.generatedAt ? 'Generated' : 'Status'}</div>
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
                    onClick={() => handleGenerate(framework)}>Generate Content</button>
                </div>
              </div>

              {/* Section list */}
              {renderLoading ? (
                <div style={{ background: 'var(--surf)', border: '.5px solid var(--bdr)', borderRadius: 12, padding: '40px 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: 13, color: 'var(--tx3)' }}>Loading report sections...</div>
                </div>
              ) : (
                <div style={{ background: 'var(--surf)', border: '.5px solid var(--bdr)', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 18px', borderBottom: '.5px solid var(--bdr)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx1)' }}>Report sections</span>
                      <span style={{ fontSize: 11, color: 'var(--tx3)', marginLeft: 8 }}>
                        {renderedReport ? `${renderedReport.sections.length} sections` : `${template.sections.length} sections`}
                        {' '}&middot; {renderedReport?.templateName ?? template.name} template
                      </span>
                    </div>
                  </div>
                  {(renderedReport ? renderedReport.sections : template.sections.map(ts => ({
                    id: ts.code, name: ts.title, description: ts.guidance, pillar: ts.pillar,
                    disclosures: [], reported: 0, total: ts.questions,
                  }))).map((sec, i) => {
                    const pct = sectionProgress[i] ?? 0;
                    const pColor = PILLAR_COLOR[sec.pillar ?? ''] ?? '#6366f1';
                    return (
                      <div key={sec.id} onClick={() => setOpenSection(sec.id)} style={{
                        display: 'grid', gridTemplateColumns: '40px 1fr 160px', alignItems: 'center', gap: 12,
                        padding: '12px 18px', borderBottom: i < (renderedReport?.sections.length ?? 0) - 1 ? '.5px solid var(--bdr2)' : 'none',
                        cursor: 'pointer', transition: 'background .1s',
                      }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg)'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
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
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx1)' }}>{sec.name}</span>
                            <span style={{ fontSize: 8, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: `${pColor}15`, color: pColor }}>{sec.pillar}</span>
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--tx3)', marginTop: 3, display: 'flex', gap: 8 }}>
                            <span>{sec.total} parameters</span>
                            <span>{sec.reported} reported</span>
                            {sec.description && <span>{sec.description}</span>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="pbar-bg" style={{ flex: 1, height: 4 }}>
                            <div className="pbar-fill" style={{ width: `${pct}%`, background: pct === 100 ? 'var(--grn)' : pct > 50 ? 'var(--t500)' : pct > 0 ? 'var(--amb)' : 'var(--bdr)' }} />
                          </div>
                          <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'var(--fm)', color: pct === 100 ? 'var(--grn)' : pct > 50 ? 'var(--t700)' : 'var(--red)', minWidth: 28, textAlign: 'right' }}>{pct}%</span>
                        </div>
                      </div>
                    );
                  })}
                  {/* Template sections are always shown as fallback when no rendered data */}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Detect framework from report name (fallback) ── */
function detectFramework(name: string): string {
  const n = name.toUpperCase();
  if (n.includes('BRSR')) return 'BRSR';
  if (n.includes('GRI')) return 'GRI';
  if (n.includes('ESRS') || n.includes('CSRD')) return 'ESRS';
  if (n.includes('IFRS') || n.includes('S2')) return 'IFRS_S2';
  return 'BRSR';
}

/* ── Owner & dept options ── */
const USER_OPTIONS = ['Priya Sharma \u2014 ESG Lead', 'Rajan Mehta \u2014 EHS Manager', 'Kavya Reddy \u2014 HR Lead', 'Ankit Patel \u2014 Finance', 'Board ESG Committee'];
const DEPT_OPTIONS = ['ESG & Sustainability', 'EHS', 'HR', 'Finance', 'Operations', 'Legal & Compliance', 'CSR / Sustainability', 'Secretarial'];

/* ── Section owner auto-assignment by section code ── */
function getSectionOwner(code: string): { owner: string; dept: string } {
  if (/P3|401|405|S1/.test(code)) return { owner: 'Kavya Reddy', dept: 'HR' };
  if (/P6|302|303|305|306|E1|E2|E3|E4|E5|MET/.test(code)) return { owner: 'Rajan Mehta', dept: 'EHS' };
  if (/P8|P4|413|S2/.test(code)) return { owner: 'CSR Team', dept: 'CSR / Sustainability' };
  if (/P1|P9|GOV|G1|SEC-B/.test(code)) return { owner: 'Legal Team', dept: 'Legal & Compliance' };
  if (/P7|C12/.test(code)) return { owner: 'Govt Affairs', dept: 'Secretarial' };
  return { owner: 'Priya Sharma', dept: 'ESG & Sustainability' };
}

/* ── Fallback questions for sections without API data ── */
interface FallbackQuestion {
  id: string; code: string; name: string; unit: string; dataType: string;
  status: 'not_reported'; verified: false; value: null; valueText: null; displayValue: string;
}

function getQuestionsForSection(sectionCode: string, pillar: string): FallbackQuestion[] {
  // Match template section to find question count
  for (const tmpl of Object.values(RP_TEMPLATES)) {
    const sec = tmpl.sections.find(s => s.code === sectionCode);
    if (sec) {
      return generatePillarQuestions(sectionCode, sec.title, pillar, sec.questions);
    }
  }
  return generatePillarQuestions(sectionCode, sectionCode, pillar, 5);
}

function generatePillarQuestions(code: string, title: string, pillar: string, count: number): FallbackQuestion[] {
  const pillarQuestions: Record<string, string[]> = {
    Environmental: [
      'Total direct GHG emissions (Scope 1)',
      'Total indirect GHG emissions (Scope 2)',
      'Total energy consumption within the organization',
      'Energy intensity per unit of revenue',
      'Total water withdrawal by source',
      'Total water recycled and reused',
      'Total waste generated',
      'Waste diverted from disposal',
      'Hazardous waste generated',
      'NOx, SOx, and other significant air emissions',
      'Reduction of energy consumption',
      'Materials used by weight or volume',
      'Percentage of recycled input materials',
      'Total renewable energy consumed',
      'GHG emissions intensity ratio',
      'Reduction in GHG emissions achieved',
      'Land remediated or restored',
      'Biodiversity impact assessment',
      'Water discharge by quality and destination',
      'Ozone-depleting substances used',
    ],
    Social: [
      'Total number of employees by category',
      'New employee hires during reporting period',
      'Employee turnover rate',
      'Average training hours per employee',
      'Occupational health and safety incidents',
      'Lost Time Injury Frequency Rate (LTIFR)',
      'Fatalities due to work-related incidents',
      'Diversity ratio in governance bodies',
      'Gender pay gap ratio',
      'Return to work after parental leave',
      'Minimum notice period for operational changes',
      'Workers covered by collective agreements',
      'Human rights assessment coverage',
      'Community investment programs',
      'Local hiring percentage',
      'Employee benefits coverage',
      'Workers in hazardous conditions',
      'Child labor risk assessment',
      'Supplier social assessment',
      'Grievances filed and resolved',
    ],
    Governance: [
      'Board composition and independence',
      'Board diversity by gender and age',
      'Anti-corruption policies and procedures',
      'Confirmed incidents of corruption',
      'Legal actions for anti-competitive behavior',
      'Political contributions and lobbying expenditure',
      'Data privacy breaches reported',
      'Stakeholder engagement process',
      'Sustainability governance structure',
      'Executive compensation linked to ESG',
      'Risk management framework',
      'Code of conduct compliance rate',
      'Whistleblower cases reported',
      'Regulatory compliance violations',
      'Tax transparency disclosures',
      'Intellectual property management',
      'Business continuity planning',
      'Cybersecurity incidents',
      'Ethics training completion rate',
      'Third-party audit findings',
    ],
  };

  const questions = pillarQuestions[pillar] ?? pillarQuestions.Governance;
  const result: FallbackQuestion[] = [];
  for (let i = 0; i < Math.min(count, questions.length); i++) {
    result.push({
      id: `${code}-fallback-${i}`,
      code: `${code}.${i + 1}`,
      name: questions[i],
      unit: pillar === 'Environmental' ? 'tCO2e' : pillar === 'Social' ? 'count' : 'text',
      dataType: pillar === 'Environmental' ? 'numeric' : pillar === 'Social' ? 'numeric' : 'text',
      status: 'not_reported',
      verified: false,
      value: null,
      valueText: null,
      displayValue: '',
    });
  }
  return result;
}

/* ── Section detail view with real parameter data ── */
function SectionDetail({ sectionId, renderedReport, template, framework, fwColor, onBack }: {
  sectionId: string;
  renderedReport: RenderedReport | undefined;
  template: { name: string; color: string; sections: TemplateSection[] };
  framework: string;
  fwColor: string;
  onBack: () => void;
}) {
  const [aiEnabled, setAiEnabled] = useState(true);

  // Auto-assign owner/dept based on section code
  const autoOwner = getSectionOwner(sectionId);
  const [owner, setOwner] = useState(autoOwner.owner);
  const [dept, setDept] = useState(autoOwner.dept);

  const section = renderedReport?.sections.find(s => s.id === sectionId);
  if (!section) {
    return (
      <div>
        <button onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--tx2)', padding: 0, marginBottom: 14 }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Back to Report Builder
        </button>
        <div style={{ background: 'var(--surf)', border: '.5px solid var(--bdr)', borderRadius: 12, padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: 'var(--tx2)' }}>Section data not available. Generate content first.</div>
        </div>
      </div>
    );
  }

  const pct = section.total > 0 ? Math.round((section.reported / section.total) * 100) : 0;
  const pColor = PILLAR_COLOR[section.pillar ?? ''] ?? '#6366f1';

  // Flatten all parameters from all disclosures in this section
  const allParams: Array<{ param: RenderedParameter; disclosure: RenderedDisclosure; idx: number }> = [];
  let pIdx = 0;
  for (const disc of section.disclosures) {
    for (const param of disc.parameters) {
      allParams.push({ param, disclosure: disc, idx: pIdx++ });
    }
  }

  const sectionIdx = renderedReport?.sections.findIndex(s => s.id === sectionId) ?? -1;
  const nextSectionId = renderedReport?.sections[sectionIdx + 1]?.id;

  return (
    <div>
      <button onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--tx2)', padding: 0, marginBottom: 14 }}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        Back to Report Builder
      </button>

      {/* Section header */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 16, alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 5, background: `${pColor}18`, color: pColor }}>{section.id}</span>
            <div style={{ fontSize: 21, fontWeight: 700, color: 'var(--tx1)' }}>{section.name}</div>
          </div>
          {section.description && <div style={{ fontSize: 13, color: 'var(--tx2)', lineHeight: 1.5 }}>{section.description}</div>}
        </div>
        <div style={{ background: 'var(--surf)', border: '.5px solid var(--bdr)', borderRadius: 12, padding: 14, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: pColor, lineHeight: 1 }}>{pct}%</div>
          <div style={{ fontSize: 11, color: 'var(--tx3)', marginBottom: 8 }}>Complete</div>
          <div style={{ height: 5, background: 'var(--bdr2)', borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}><div style={{ height: '100%', background: pColor, width: `${pct}%`, borderRadius: 3 }} /></div>
          <div style={{ fontSize: 11, color: 'var(--tx2)' }}>{section.reported}/{section.total} parameters</div>
        </div>
      </div>

      {/* Owner + dept + AI toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surf)', border: '.5px solid var(--bdr)', borderRadius: 7, padding: '6px 10px' }}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.3" /><path d="M3 13c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
          <span style={{ fontSize: 11, color: 'var(--tx3)' }}>Owner:</span>
          <select value={owner} onChange={e => setOwner(e.target.value)} style={{ border: 'none', outline: 'none', fontSize: 11, fontWeight: 600, color: 'var(--tx1)', background: 'transparent', cursor: 'pointer' }}>
            {USER_OPTIONS.map(u => <option key={u} value={u.split(' \u2014 ')[0]}>{u}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surf)', border: '.5px solid var(--bdr)', borderRadius: 7, padding: '6px 10px' }}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><rect x="2" y="4" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3" /><path d="M5 4V3a1 1 0 011-1h4a1 1 0 011 1v1" stroke="currentColor" strokeWidth="1.3" /></svg>
          <span style={{ fontSize: 11, color: 'var(--tx3)' }}>Dept:</span>
          <select value={dept} onChange={e => setDept(e.target.value)} style={{ border: 'none', outline: 'none', fontSize: 11, fontWeight: 600, color: 'var(--tx1)', background: 'transparent', cursor: 'pointer' }}>
            {DEPT_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surf)', border: '.5px solid var(--bdr)', borderRadius: 7, padding: '6px 12px', marginLeft: 'auto' }}>
          <div style={{ width: 26, height: 26, background: 'var(--t700)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 2l2 7h7l-5.5 4 2 7L12 16l-5.5 4 2-7L3 9h7z" fill="white" /></svg>
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx1)' }}>AI Assistance</span>
          <div onClick={() => setAiEnabled(!aiEnabled)} style={{ position: 'relative', width: 36, height: 20, cursor: 'pointer', flexShrink: 0 }}>
            <div style={{ width: 36, height: 20, borderRadius: 10, background: aiEnabled ? 'var(--t600)' : 'var(--bdr)', transition: 'background .2s' }} />
            <div style={{ position: 'absolute', top: 2, left: aiEnabled ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, color: aiEnabled ? 'var(--t700)' : 'var(--tx3)' }}>{aiEnabled ? 'Enabled' : 'Disabled'}</span>
        </div>
      </div>

      {/* Disclosures & Parameters */}
      {section.disclosures.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 80 }}>
          {section.disclosures.map(disc => (
            <DisclosureCard key={disc.id} disclosure={disc} pColor={pColor} aiEnabled={aiEnabled} />
          ))}
        </div>
      ) : (() => {
        // Fallback: generate pillar-specific placeholder questions
        const fallbackParams = getQuestionsForSection(sectionId, section.pillar ?? 'Governance');
        if (fallbackParams.length === 0) return (
          <div style={{ background: 'var(--surf)', border: '.5px solid var(--bdr)', borderRadius: 12, padding: '40px 20px', textAlign: 'center', marginBottom: 80 }}>
            <div style={{ fontSize: 13, color: 'var(--tx2)', marginBottom: 8 }}>No disclosures defined for this section.</div>
            <div style={{ fontSize: 11, color: 'var(--tx3)' }}>This section may not have KPI parameters mapped yet.</div>
          </div>
        );
        const fallbackDisc: RenderedDisclosure = {
          id: `${sectionId}-draft`,
          name: `${section.name} — Draft Questions`,
          description: 'These are recommended disclosure questions for this section. Fill in responses to build your report.',
          parameters: fallbackParams as unknown as RenderedParameter[],
          reported: 0,
          total: fallbackParams.length,
        };
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 80 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, fontSize: 11, color: '#92400e' }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 2l6 12H2L8 2z" stroke="#f59e0b" strokeWidth="1.3" fill="none" /><path d="M8 7v3M8 11.5v.5" stroke="#f59e0b" strokeWidth="1.3" strokeLinecap="round" /></svg>
              No KPI parameters are mapped for this section yet. Showing recommended disclosure questions based on the section&apos;s pillar.
            </div>
            <DisclosureCard disclosure={fallbackDisc} pColor={pColor} aiEnabled={aiEnabled} />
          </div>
        );
      })()}

      {/* Sticky footer */}
      <div style={{ position: 'fixed', bottom: 0, left: 'var(--sbw, 220px)', right: 0, background: 'var(--surf)', borderTop: '.5px solid var(--bdr)', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 100 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx1)' }}>Progress Status</div>
          <div style={{ fontSize: 11, color: 'var(--tx3)' }}>{section.total - section.reported} parameters remaining</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" onClick={onBack}>Save as Draft</button>
          <button className="btn-primary" onClick={onBack}>
            {nextSectionId ? 'Continue to Next Section' : 'Back to Builder'}
            {nextSectionId && <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ marginLeft: 6, verticalAlign: 'middle' }}><path d="M6 4l4 4-4 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Disclosure card with expandable parameters ── */
function DisclosureCard({ disclosure, pColor, aiEnabled }: {
  disclosure: RenderedDisclosure;
  pColor: string;
  aiEnabled: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  const pct = disclosure.total > 0 ? Math.round((disclosure.reported / disclosure.total) * 100) : 0;

  return (
    <div style={{ background: 'var(--surf)', border: '.5px solid var(--bdr)', borderRadius: 12, overflow: 'hidden' }}>
      {/* Disclosure header */}
      <div onClick={() => setExpanded(!expanded)} style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer',
        borderBottom: expanded ? '.5px solid var(--bdr2)' : 'none',
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'var(--fm)', color: pColor }}>{disclosure.id}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx1)' }}>{disclosure.name}</span>
          </div>
          {disclosure.description && (
            <div style={{ fontSize: 10, color: 'var(--tx3)', marginTop: 3 }}>{disclosure.description}</div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: pct === 100 ? 'var(--grn)' : 'var(--tx3)' }}>{disclosure.reported}/{disclosure.total}</span>
          <div className="pbar-bg" style={{ width: 60, height: 4 }}>
            <div className="pbar-fill" style={{ width: `${pct}%`, background: pct === 100 ? 'var(--grn)' : 'var(--t500)' }} />
          </div>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s', color: 'var(--tx3)' }}><path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
      </div>

      {/* Parameters list */}
      {expanded && disclosure.parameters.length > 0 && (
        <div>
          {disclosure.parameters.map((param, i) => (
            <ParameterCard key={param.paramId} param={param} idx={i} total={disclosure.parameters.length} aiEnabled={aiEnabled} disclosureDescription={disclosure.description} />
          ))}
        </div>
      )}
      {expanded && disclosure.parameters.length === 0 && (
        <div style={{ padding: '16px', fontSize: 11, color: 'var(--tx3)', textAlign: 'center' }}>No parameters mapped to this disclosure.</div>
      )}
    </div>
  );
}

/* ── Individual parameter/question card ── */
function ParameterCard({ param, idx, total, aiEnabled, disclosureDescription }: {
  param: RenderedParameter;
  idx: number;
  total: number;
  aiEnabled: boolean;
  disclosureDescription?: string;
}) {
  const [expanded, setExpanded] = useState(param.status !== 'reported');
  const [activeTab, setActiveTab] = useState<'response' | 'prev' | 'ai'>('response');

  const isReported = param.status === 'reported';
  const isNA = param.status === 'not_applicable';
  // Border colors matching reference: red (#fecaca) for reported/answered, indigo (#c7d2fe) for draft/NA, gray (#e5e7eb) for pending
  const borderColor = isReported ? '#fecaca' : isNA ? '#c7d2fe' : '#e5e7eb';
  const stCircleColor = isReported ? '#22c55e' : isNA ? '#6366f1' : '#e5e7eb';
  const stCircleBg = isReported ? '#f0fdf4' : isNA ? '#eef2ff' : '#f8fafb';
  const statusLabel = isReported ? 'Reported' : isNA ? 'N/A' : 'Not Reported';
  const statusColor = isReported ? '#22c55e' : isNA ? '#6366f1' : '#94a3b8';
  const isQuantitative = param.dataType === 'numeric' || param.dataType === 'percentage' || param.dataType === 'currency';
  // First 60% of parameters are required, rest optional (matching reference)
  const isRequired = idx < Math.ceil(total * 0.6);

  return (
    <div style={{ borderBottom: idx < total - 1 ? '.5px solid var(--bdr2)' : 'none', borderLeft: `3px solid ${borderColor}` }}>
      {/* Collapsible header */}
      <div onClick={() => setExpanded(!expanded)} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', cursor: 'pointer' }}>
        <div style={{ width: 24, height: 24, borderRadius: '50%', border: `2px solid ${stCircleColor}`, background: stCircleBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
          {isReported && <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M3 8l3.5 3.5L13 5" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
          {isNA && <span style={{ fontSize: 8, fontWeight: 700, color: '#6366f1' }}>NA</span>}
          {!isReported && !isNA && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#e5e7eb' }} />}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'var(--fm)', color: 'var(--tx3)' }}>{param.code}</span>
            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20, background: `${statusColor}15`, color: statusColor }}>{statusLabel}</span>
            <span style={{ fontSize: 10, color: 'var(--tx3)' }}>{isQuantitative ? 'Quantitative' : 'Qualitative'}</span>
            {param.verified && <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 3, background: '#dcfce7', color: '#16a34a' }}>Verified</span>}
            <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 3, background: isRequired ? '#fef2f2' : '#f0fdf4', color: isRequired ? '#dc2626' : '#16a34a' }}>{isRequired ? 'Required' : 'Optional'}</span>
            <span style={{ fontSize: 10, color: 'var(--tx3)' }}>Parameter {idx + 1} of {total}</span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx1)', lineHeight: 1.4 }}>{param.name}</div>
          {!expanded && param.displayValue && param.status !== 'not_reported' && (
            <div style={{ marginTop: 5, fontSize: 11, color: 'var(--tx2)', background: 'var(--bg)', borderRadius: 6, padding: '6px 10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {param.displayValue}{param.unit && isQuantitative ? ` ${param.unit}` : ''}
            </div>
          )}
        </div>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s', color: 'var(--tx3)' }}><path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ borderTop: '.5px solid var(--bdr2)' }}>
          {/* Guidance block */}
          {disclosureDescription && (
            <div style={{ margin: '12px 16px 0', padding: '10px 14px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="#3b82f6" strokeWidth="1.3" /><path d="M8 7v4M8 5.5v0" stroke="#3b82f6" strokeWidth="1.3" strokeLinecap="round" /></svg>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 3 }}>Guidance</div>
                <div style={{ fontSize: 11, color: '#1e3a5f', lineHeight: 1.5 }}>{disclosureDescription}</div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0, margin: '12px 16px', background: 'var(--bg)', borderRadius: 8, padding: 3, width: 'fit-content' }}>
            {([['response', 'Response'], ['prev', 'Previous Year'], ['ai', 'AI Assist']] as [string, string][]).map(([k, l]) => (
              <button key={k} onClick={e => { e.stopPropagation(); setActiveTab(k as any); }} style={{ padding: '6px 13px', border: 'none', cursor: 'pointer', borderRadius: 6, fontSize: 11, fontWeight: activeTab === k ? 700 : 500, color: activeTab === k ? 'var(--tx1)' : 'var(--tx2)', background: activeTab === k ? 'var(--surf)' : 'transparent', boxShadow: activeTab === k ? '0 1px 3px rgba(0,0,0,.1)' : 'none', transition: 'all .15s' }}>{l}</button>
            ))}
          </div>

          {/* Response tab */}
          {activeTab === 'response' && (
            <div style={{ padding: '0 16px 14px' }}>
              {isQuantitative ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 10, marginBottom: 12 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx2)', display: 'block', marginBottom: 5 }}>Value</label>
                    <input style={{ width: '100%', padding: '10px 12px', border: '.5px solid var(--bdr)', borderRadius: 8, fontSize: 16, fontWeight: 600, outline: 'none', fontFamily: 'var(--fm)' }} defaultValue={param.value ?? ''} placeholder="Enter value..." />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx2)', display: 'block', marginBottom: 5 }}>Unit</label>
                    <input style={{ width: '100%', padding: '10px 12px', border: '.5px solid var(--bdr)', borderRadius: 8, fontSize: 14, fontWeight: 600, outline: 'none', fontFamily: 'var(--fm)' }} defaultValue={param.unit} readOnly />
                  </div>
                </div>
              ) : (
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx2)', display: 'block', marginBottom: 5 }}>Response</label>
                  <textarea style={{ width: '100%', padding: '10px 12px', border: '.5px solid var(--bdr)', borderRadius: 8, fontSize: 12, resize: 'vertical', outline: 'none', minHeight: 90, fontFamily: 'var(--ff)', lineHeight: 1.6 }} defaultValue={param.valueText ?? param.value ?? ''} placeholder="Enter your response..." />
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={e => e.stopPropagation()} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '9px 16px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  Save Answer
                </button>
                <button onClick={e => e.stopPropagation()} style={{ padding: '9px 14px', border: '.5px solid var(--bdr)', background: 'var(--surf)', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', color: 'var(--tx2)' }}>Save as Draft</button>
                <button onClick={e => e.stopPropagation()} style={{ padding: '9px 14px', border: '.5px solid var(--bdr)', background: 'var(--surf)', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', color: 'var(--tx2)' }}>Mark N/A</button>
              </div>
            </div>
          )}

          {/* Previous Year tab */}
          {activeTab === 'prev' && (
            <div style={{ padding: '0 16px 14px' }}>
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, marginBottom: 12 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="5.5" stroke="#dc2626" strokeWidth="1.3" /><path d="M8 5v3.5l2.5 1.5" stroke="#dc2626" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#991b1b' }}>Previous Year Data</div>
                    <div style={{ fontSize: 11, color: '#b91c1c' }}>FY {new Date().getFullYear() - 2}&ndash;{new Date().getFullYear() - 1} reported value</div>
                  </div>
                </div>
                {param.status === 'reported' ? (
                  <>
                    <div style={{ padding: '10px 0', borderTop: '1px solid #fecaca', borderBottom: '1px solid #fecaca', marginBottom: 10 }}>
                      <span style={{ fontSize: 26, fontWeight: 700, color: '#dc2626', fontFamily: 'var(--fm)' }}>{param.displayValue}</span>
                      {param.unit && <span style={{ fontSize: 14, color: '#b91c1c', marginLeft: 6 }}>{param.unit}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#991b1b', marginBottom: 10 }}>
                      <span>Data type: {param.dataType}</span>
                      <span>Verified: {param.verified ? 'Yes' : 'No'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <span style={{ fontSize: 10, color: '#991b1b' }}>YoY Change:</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#dc2626' }}>--</span>
                      <span style={{ fontSize: 10, color: '#b91c1c' }}>(prior year comparison unavailable)</span>
                    </div>
                    <button onClick={e => e.stopPropagation()} style={{ padding: '6px 12px', border: '1px solid #fecaca', background: '#fff', borderRadius: 6, fontSize: 11, cursor: 'pointer', color: '#dc2626', fontWeight: 600 }}>Use as reference &rarr;</button>
                  </>
                ) : param.status === 'not_applicable' ? (
                  <div style={{ fontSize: 11, color: '#6366f1', fontStyle: 'italic' }}>Marked as Not Applicable</div>
                ) : (
                  <div style={{ fontSize: 11, color: '#991b1b' }}>No previous year data available for this parameter. Enter values in the KPI console or use the Response tab.</div>
                )}
              </div>
            </div>
          )}

          {/* AI Assist tab */}
          {activeTab === 'ai' && aiEnabled && (
            <div style={{ padding: '0 16px 14px' }}>
              <div style={{ background: 'linear-gradient(135deg,var(--t50),#eef2ff)', border: '.5px solid var(--t200)', borderRadius: 10, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, marginBottom: 12 }}>
                  <div style={{ width: 32, height: 32, background: 'var(--t700)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2l2 7h7l-5.5 4 2 7L12 16l-5.5 4 2-7L3 9h7z" fill="white" /></svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx1)' }}>AI Suggestion</div>
                    <div style={{ fontSize: 11, color: 'var(--tx2)', marginTop: 2 }}>Based on your platform data and industry benchmarks</div>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--tx1)', lineHeight: 1.7, marginBottom: 12 }}>
                  {param.status === 'reported'
                    ? `Current value: ${param.displayValue} ${param.unit}. Consider adding context about methodology and year-over-year trends to strengthen this disclosure.`
                    : `This parameter has no data yet. Check your KPI data entries or use the response tab to provide a value. ${isQuantitative ? `Expected unit: ${param.unit}.` : 'Provide a qualitative narrative response.'}`
                  }
                </div>
                <button onClick={e => e.stopPropagation()} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '9px 16px', background: 'var(--t700)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 2l2 7h7l-5.5 4 2 7L12 16l-5.5 4 2-7L3 9h7z" fill="white" /></svg>
                  Apply Suggestion
                </button>
              </div>
            </div>
          )}
          {activeTab === 'ai' && !aiEnabled && (
            <div style={{ padding: '14px 16px', fontSize: 11, color: 'var(--tx3)' }}>AI assistance is disabled. Enable the toggle above to use AI suggestions.</div>
          )}
        </div>
      )}
    </div>
  );
}
