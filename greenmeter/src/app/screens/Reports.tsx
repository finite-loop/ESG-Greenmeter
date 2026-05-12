"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";

type Props = { navigate:(s:any)=>void; [k:string]:any };

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
  metadata: unknown;
  generatedBy: string | null;
  generatedAt: string | null;
  createdAt: string;
}

interface CoverageSection {
  standardSection: string;
  totalParams: number;
  hasValue: number;
  verified: number;
  notApplicable: number;
  percentComplete: number;
}

interface CoverageResponse {
  framework: string;
  periodId: string;
  totalParams: number;
  hasValue: number;
  verified: number;
  notApplicable: number;
  percentComplete: number;
  warningThreshold: number;
  belowThreshold: boolean;
  sections: CoverageSection[];
}

/* ── Helpers ── */

const FRAMEWORK_META: Record<string, { color: string; label: string }> = {
  BRSR:    { color: '#991b1b', label: 'BRSR' },
  GRI:     { color: '#0f766e', label: 'GRI' },
  ESRS:    { color: '#92400e', label: 'ESRS' },
  IFRS_S2: { color: '#3730a3', label: 'IFRS S2' },
  CDP:     { color: '#6366f1', label: 'CDP' },
  Custom:  { color: '#64748b', label: 'Custom' },
};

const STATUS_BADGE: Record<string, string> = {
  pending: 'b-gray', generating: 'b-amber', complete: 'b-green', failed: 'b-red',
};

function statusLabel(s: string | null): string {
  if (!s) return 'Unknown';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function extractFramework(name: string): string {
  if (name.includes('BRSR')) return 'BRSR';
  if (name.includes('GRI')) return 'GRI';
  if (name.includes('ESRS')) return 'ESRS';
  if (name.includes('IFRS')) return 'IFRS_S2';
  if (name.includes('CDP')) return 'CDP';
  return 'Custom';
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

/* ── Hooks ── */

function useReports() {
  return useQuery<{ data: GeneratedReport[] }>({
    queryKey: queryKeys.reports.list({}),
    queryFn: () => fetchJson('/api/reports'),
  });
}

function useCoverage(framework: string, periodId: string, enabled: boolean) {
  return useQuery<{ data: CoverageResponse }>({
    queryKey: queryKeys.reports.coverage({ framework, periodId }),
    queryFn: () => fetchJson(`/api/reports/coverage?framework=${framework}&periodId=${periodId}`),
    enabled,
  });
}

/* ── Component ── */

export default function ReportsScreen({ navigate }: Props) {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [showGenModal, setShowGenModal] = useState(false);
  const [genFramework, setGenFramework] = useState('BRSR');
  const donutRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<any>(null);

  /* Fetch reports list */
  const { data: reportsResp, isLoading: reportsLoading } = useReports();
  const reports = reportsResp?.data ?? [];

  /* Auto-select first report */
  const activeId = selectedId ?? reports[0]?.reportId ?? null;
  const report = reports.find(r => r.reportId === activeId) ?? null;

  /* Derive framework from report name for coverage lookup */
  const framework = report ? extractFramework(report.name) : null;

  /* Fetch coverage for selected report */
  const { data: coverageResp, isLoading: coverageLoading } = useCoverage(
    framework ?? 'BRSR',
    report?.periodId ?? '',
    !!report && !!framework && framework !== 'Custom' && framework !== 'CDP',
  );
  const coverage = coverageResp?.data ?? null;

  /* Stats */
  const inProgress = reports.filter(r => r.status === 'generating').length;
  const completed = reports.filter(r => r.status === 'complete').length;
  const failed = reports.filter(r => r.status === 'failed').length;
  const pending = reports.filter(r => r.status === 'pending').length;

  const progress = coverage?.percentComplete ?? 0;
  const totalSections = coverage?.sections?.length ?? 0;
  const sectionsDone = coverage?.sections?.filter(s => s.percentComplete === 100).length ?? 0;
  const questionsAnswered = coverage?.hasValue ?? 0;

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
          datasets: [{
            data: [progress, 100 - progress],
            backgroundColor: ['#0f766e', '#f3f4f6'],
            borderWidth: 0,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: true, cutout: '72%',
          plugins: { legend: { display: false }, tooltip: { enabled: false } },
        },
      });
      chartRef.current = chart;
    })();
    return () => { chartRef.current?.destroy(); chartRef.current = null; };
  }, [activeId, progress]);

  /* Generate handler */
  async function handleGenerate(fw: string) {
    setGenerating(true);
    setGenError(null);
    try {
      // Need a periodId — use the first report's period or prompt
      const periodId = reports[0]?.periodId;
      if (!periodId) {
        setGenError('No reporting period available. Create a reporting period first.');
        return;
      }
      await fetchJson('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ framework: fw, periodId }),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.all });
      setShowGenModal(false);
    } catch (err: unknown) {
      setGenError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  }

  /* Download handler */
  async function handleDownload(reportId: string) {
    try {
      const resp = await fetchJson<{ data: { downloadUrl: string } }>(`/api/reports/${reportId}/download`);
      window.open(resp.data.downloadUrl, '_blank');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Download failed');
    }
  }

  const fwMeta = framework ? (FRAMEWORK_META[framework] ?? FRAMEWORK_META.Custom) : FRAMEWORK_META.Custom;

  return (
    <div>
      {/* Header */}
      <div className="ph">
        <div><div className="ptitle">Report builder</div><div className="psub">Framework templates · BRSR · GRI 2021 · ESRS · IFRS S2 · auto-generate PDF &amp; XBRL</div></div>
        <div className="ph-acts">
          {report?.status === 'complete' && (
            <button className="btn-secondary" onClick={() => handleDownload(report.reportId)}>Export</button>
          )}
          <button className="btn-primary" onClick={() => setShowGenModal(true)}>+ New report</button>
        </div>
      </div>

      {/* Generate modal */}
      {showGenModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setShowGenModal(false)}>
          <div style={{ background: 'var(--surf)', borderRadius: 12, padding: 24, width: 400, maxWidth: '90vw' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--tx1)', marginBottom: 16 }}>Generate new report</div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx2)', marginBottom: 5 }}>Framework</div>
              <select className="sel" style={{ fontSize: 12, padding: '6px 10px', width: '100%' }}
                value={genFramework} onChange={e => setGenFramework(e.target.value)}>
                <option value="BRSR">BRSR Core</option>
                <option value="GRI">GRI 2021</option>
                <option value="ESRS">ESRS (CSRD)</option>
                <option value="IFRS_S2">IFRS S2</option>
              </select>
            </div>
            {genError && (
              <div style={{ fontSize: 11, color: 'var(--red)', marginBottom: 12, padding: 8, background: 'var(--redbg)', borderRadius: 6 }}>{genError}</div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setShowGenModal(false)}>Cancel</button>
              <button className="btn-primary" disabled={generating} onClick={() => handleGenerate(genFramework)}>
                {generating ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 14 }}>
        {([
          [reports.length, 'Total Reports', 'var(--tx1)'],
          [pending + inProgress, 'In Progress', 'var(--t700)'],
          [completed, 'Completed', 'var(--grn)'],
          [failed, 'Failed', 'var(--red)'],
          [reports.filter(r => r.status === 'pending').length, 'Pending', 'var(--tx3)'],
        ] as [number, string, string][]).map(([val, label, c]) => (
          <div key={label} className="stat-card">
            <div className="slbl">{label}</div>
            <div className="sval" style={{ color: c }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Loading state */}
      {reportsLoading && (
        <div style={{ padding: 48, textAlign: 'center', fontSize: 11, color: 'var(--tx3)' }}>Loading reports...</div>
      )}

      {/* Empty state */}
      {!reportsLoading && reports.length === 0 && (
        <div style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: 'var(--tx2)', marginBottom: 8 }}>No reports generated yet</div>
          <div style={{ fontSize: 11, color: 'var(--tx3)', marginBottom: 16 }}>Generate your first ESG report to get started.</div>
          <button className="btn-primary" onClick={() => setShowGenModal(true)}>+ Generate report</button>
        </div>
      )}

      {!reportsLoading && reports.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 12 }}>
          {/* Left - Report list */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--tx3)', marginBottom: 8 }}>Active Reports</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {reports.map(r => {
                const fw = extractFramework(r.name);
                const meta = FRAMEWORK_META[fw] ?? FRAMEWORK_META.Custom;
                const isSel = r.reportId === activeId;
                return (
                  <div key={r.reportId} onClick={() => setSelectedId(r.reportId)} style={{
                    background: isSel ? 'var(--t50)' : 'var(--surf)',
                    border: isSel ? '1.5px solid var(--t400)' : '.5px solid var(--bdr)',
                    borderRadius: 10, padding: '12px 14px', cursor: 'pointer', transition: 'all .12s',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 6, background: `${meta.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: meta.color }}>{meta.label.charAt(0)}</span>
                        </div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx1)', lineHeight: 1.3 }}>{r.name}</div>
                          <div style={{ display: 'flex', gap: 4, marginTop: 3 }}>
                            <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 3, fontWeight: 700, background: `${meta.color}15`, color: meta.color }}>{meta.label}</span>
                            <span className={`badge ${STATUS_BADGE[r.status ?? ''] ?? 'b-gray'}`} style={{ fontSize: 8 }}>{statusLabel(r.status)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: 9, color: 'var(--tx3)', marginTop: 4 }}>
                      {r.format ? r.format.toUpperCase() : 'PDF'} · Created {new Date(r.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right - Report detail */}
          {report ? (
            <div>
              {/* Report header card */}
              <div style={{ background: 'var(--surf)', border: '.5px solid var(--bdr)', borderRadius: 12, padding: '20px 24px', marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--tx1)', marginBottom: 4 }}>{report.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--tx2)' }}>
                      <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, fontWeight: 700, background: `${fwMeta.color}15`, color: fwMeta.color }}>{fwMeta.label}</span>
                      <span className={`badge ${STATUS_BADGE[report.status ?? ''] ?? 'b-gray'}`} style={{ fontSize: 9 }}>{statusLabel(report.status)}</span>
                      <span>Format: {(report.format ?? 'pdf').toUpperCase()}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {report.status === 'complete' && (
                      <button className="btn-secondary" style={{ fontSize: 11 }} onClick={() => handleDownload(report.reportId)}>Download</button>
                    )}
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
                    <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--fm)', color: 'var(--tx1)' }}>{sectionsDone}/{totalSections}</div>
                    <div style={{ fontSize: 10, color: 'var(--tx3)' }}>Sections complete</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--fm)', color: 'var(--tx1)' }}>{questionsAnswered}</div>
                    <div style={{ fontSize: 10, color: 'var(--tx3)' }}>Parameters entered</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--fm)', color: 'var(--tx1)' }}>
                      {report.generatedAt ? new Date(report.generatedAt).toLocaleDateString() : '—'}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--tx3)' }}>Generated at</div>
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
                    onClick={() => handleGenerate(framework ?? 'BRSR')}>Generate Content</button>
                </div>
              </div>

              {/* Coverage sections */}
              {coverageLoading && (
                <div style={{ padding: 32, textAlign: 'center', fontSize: 11, color: 'var(--tx3)' }}>Loading coverage data...</div>
              )}

              {coverage && coverage.sections.length > 0 && (
                <div style={{ background: 'var(--surf)', border: '.5px solid var(--bdr)', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 18px', borderBottom: '.5px solid var(--bdr)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx1)' }}>Report sections</span>
                      <span style={{ fontSize: 11, color: 'var(--tx3)', marginLeft: 8 }}>{totalSections} sections · {fwMeta.label} template</span>
                    </div>
                    {coverage.belowThreshold && (
                      <span className="badge b-amber" style={{ fontSize: 9 }}>Below {coverage.warningThreshold}% threshold</span>
                    )}
                  </div>
                  {coverage.sections.map((s, i) => (
                    <div key={s.standardSection} style={{
                      display: 'grid', gridTemplateColumns: '40px 1fr 160px', alignItems: 'center', gap: 12,
                      padding: '12px 18px', borderBottom: i < coverage.sections.length - 1 ? '.5px solid var(--bdr2)' : 'none',
                      cursor: 'pointer', transition: 'background .1s',
                    }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                      {/* Status icon */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {s.percentComplete === 100 ? (
                          <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--grn)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M4 8l3 3 5-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          </div>
                        ) : s.percentComplete > 0 ? (
                          <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--t100)', border: '2px solid var(--t400)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--t600)' }} />
                          </div>
                        ) : (
                          <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--bdr2)', border: '2px solid var(--bdr)' }} />
                        )}
                      </div>
                      {/* Section info */}
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx1)' }}>{s.standardSection}</div>
                        <div style={{ fontSize: 10, color: 'var(--tx3)', marginTop: 3, display: 'flex', gap: 8 }}>
                          <span>{s.hasValue}/{s.totalParams} parameters</span>
                          <span>{s.verified} verified</span>
                          {s.notApplicable > 0 && <span>{s.notApplicable} N/A</span>}
                        </div>
                      </div>
                      {/* Progress */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="pbar-bg" style={{ flex: 1, height: 4 }}>
                          <div className="pbar-fill" style={{ width: `${s.percentComplete}%`, background: s.percentComplete === 100 ? 'var(--grn)' : s.percentComplete > 50 ? 'var(--t500)' : s.percentComplete > 0 ? 'var(--amb)' : 'var(--bdr)' }} />
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'var(--fm)', color: s.percentComplete === 100 ? 'var(--grn)' : s.percentComplete > 50 ? 'var(--t700)' : 'var(--red)' }}>{s.percentComplete}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!coverageLoading && (!coverage || coverage.sections.length === 0) && framework !== 'Custom' && framework !== 'CDP' && (
                <div style={{ padding: 32, textAlign: 'center', fontSize: 11, color: 'var(--tx3)', background: 'var(--surf)', border: '.5px solid var(--bdr)', borderRadius: 12 }}>
                  No coverage data available for this report. Enter KPI data to see section progress.
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: 48, textAlign: 'center', fontSize: 11, color: 'var(--tx3)' }}>Select a report to view details</div>
          )}
        </div>
      )}
    </div>
  );
}
