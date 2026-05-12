"use client";
import { useState, useEffect, useRef } from "react";
type Props = { navigate:(s:any)=>void; [k:string]:any };

type Report = {
  id: number; name: string; standard: string; stdColor: string; type: string;
  status: 'In Progress'|'In Review'|'Completed'|'Draft';
  progress: number; fy: string; dueDate: string;
};

const REPORTS: Report[] = [
  { id: 1, name: 'Annual Sustainability Report 2025', standard: 'BRSR', stdColor: '#991b1b', type: 'Integrated ESG', status: 'In Progress', progress: 64, fy: 'FY 2024-25', dueDate: 'Due May 30, 2026' },
  { id: 2, name: 'Q4 GRI Performance Report', standard: 'GRI', stdColor: '#0f766e', type: 'Standards-based', status: 'In Review', progress: 100, fy: 'FY 2024-25', dueDate: 'Due Apr 30, 2026' },
  { id: 3, name: 'ESRS Climate & Sustainability', standard: 'ESRS', stdColor: '#92400e', type: 'Regulatory (CSRD)', status: 'Draft', progress: 34, fy: 'FY 2024-25', dueDate: 'Due Jun 30, 2026' },
  { id: 4, name: 'CDP Climate Disclosure 2025', standard: 'CDP', stdColor: '#6366f1', type: 'Investor-facing', status: 'Draft', progress: 58, fy: 'FY 2024-25', dueDate: 'Due Jul 31, 2026' },
  { id: 5, name: 'IFRS S2 Climate Disclosure', standard: 'IFRS S2', stdColor: '#3730a3', type: 'Investor-facing', status: 'Draft', progress: 18, fy: 'FY 2024-25', dueDate: 'Due Sep 30, 2026' },
  { id: 6, name: 'Board ESG Scorecard Q1', standard: 'Custom', stdColor: '#64748b', type: 'Executive report', status: 'Completed', progress: 100, fy: 'Q1 FY 2025-26', dueDate: 'Due Apr 15, 2026' },
];

type Section = { code: string; name: string; pillar: 'E'|'S'|'G'; questions: string; owner: string; dept: string; progress: number };

const REPORT_SECTIONS: Record<number, Section[]> = {
  1: [
    { code: 'SEC-A', name: 'Section A — General Disclosures', pillar: 'G', questions: '18/18 questions', owner: 'Priya Sharma', dept: 'EHS', progress: 100 },
    { code: 'SEC-B', name: 'Section B — Management & Process', pillar: 'G', questions: '12/12 questions', owner: 'Legal Team', dept: 'Legal & Compliance', progress: 100 },
    { code: 'P1', name: 'Principle 1 — Ethics & Transparency', pillar: 'G', questions: '12/12 questions', owner: 'Legal Team', dept: 'Legal & Compliance', progress: 100 },
    { code: 'P2', name: 'Principle 2 — Product Lifecycle', pillar: 'E', questions: '15/15 questions', owner: 'Priya Sharma', dept: 'EHS', progress: 100 },
    { code: 'P3', name: 'Principle 3 — Employee Wellbeing', pillar: 'S', questions: '15/18 questions', owner: 'Kavya Reddy', dept: 'Human Resources', progress: 84 },
    { code: 'P4', name: 'Principle 4 — Stakeholder Engagement', pillar: 'S', questions: '7/10 questions', owner: 'CSR Team', dept: 'CSR / Sustainability', progress: 70 },
    { code: 'P5', name: 'Principle 5 — Human Rights', pillar: 'S', questions: '5/12 questions', owner: 'Priya Sharma', dept: 'EHS', progress: 42 },
    { code: 'P6', name: 'Principle 6 — Environment', pillar: 'E', questions: '12/20 questions', owner: 'Rajan Mehta', dept: 'EHS', progress: 60 },
    { code: 'P7', name: 'Principle 7 — Policy Advocacy', pillar: 'G', questions: '0/6 questions', owner: 'Govt Affairs', dept: 'Secretarial', progress: 0 },
    { code: 'P8', name: 'Principle 8 — Inclusive Growth', pillar: 'S', questions: '6/14 questions', owner: 'CSR Team', dept: 'CSR / Sustainability', progress: 43 },
    { code: 'P9', name: 'Principle 9 — Consumer Responsibility', pillar: 'S', questions: '4/8 questions', owner: 'Quality Team', dept: 'Operations', progress: 50 },
  ],
};

const STATUS_COLORS: Record<string, string> = {
  'In Progress': 'b-teal', 'In Review': 'b-amber', 'Completed': 'b-green', 'Draft': 'b-gray',
};

const PILLAR_COLORS: Record<string, string> = { E: '#ef4444', S: '#6366f1', G: '#0f766e' };

export default function ReportsScreen({ navigate }: Props) {
  const [selectedId, setSelectedId] = useState(1);
  const donutRef = useRef<HTMLCanvasElement>(null);

  const report = REPORTS.find(r => r.id === selectedId)!;
  const sections = REPORT_SECTIONS[selectedId] ?? REPORT_SECTIONS[1]!;

  const sectionsDone = sections.filter(s => s.progress === 100).length;
  const totalSections = sections.length;
  const questionsAnswered = sections.reduce((a, s) => {
    const match = s.questions.match(/^(\d+)/);
    return a + (match ? parseInt(match[1]) : 0);
  }, 0);

  // Stats
  const inProgress = REPORTS.filter(r => r.status === 'In Progress').length;
  const inReview = REPORTS.filter(r => r.status === 'In Review').length;
  const completed = REPORTS.filter(r => r.status === 'Completed').length;
  const draft = REPORTS.filter(r => r.status === 'Draft').length;

  useEffect(() => {
    let chart: any;
    (async () => {
      const { Chart, registerables } = await import('chart.js');
      Chart.register(...registerables);
      if (!donutRef.current) return;
      chart = new Chart(donutRef.current, {
        type: 'doughnut',
        data: {
          labels: ['Done', 'Remaining'],
          datasets: [{
            data: [report.progress, 100 - report.progress],
            backgroundColor: ['#0f766e', '#f3f4f6'],
            borderWidth: 0,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: true, cutout: '72%',
          plugins: { legend: { display: false }, tooltip: { enabled: false } },
        },
      });
    })();
    return () => chart?.destroy();
  }, [selectedId, report.progress]);

  return (
    <div>
      {/* Header */}
      <div className="ph">
        <div><div className="ptitle">Report builder</div><div className="psub">Framework templates · BRSR · GRI 2021 · ESRS · IFRS S2 · auto-generate PDF &amp; XBRL</div></div>
        <div className="ph-acts">
          <button className="btn-secondary">Preview</button>
          <button className="btn-secondary">Publish</button>
          <button className="btn-primary">+ New report</button>
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 14 }}>
        {([
          [REPORTS.length, 'Total Reports', '📄'],
          [inProgress, 'In Progress', '📝'],
          [inReview, 'In Review', '🔍'],
          [completed, 'Completed', '✅'],
          [draft, 'Draft', '📋'],
        ] as [number, string, string][]).map(([val, label, icon]) => (
          <div key={label} style={{ background: 'var(--surf)', border: '.5px solid var(--bdr)', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>{icon}</span>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--fm)', color: 'var(--tx1)', lineHeight: 1 }}>{val}</div>
              <div style={{ fontSize: 10, color: 'var(--tx3)', marginTop: 2 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 12 }}>
        {/* Left - Report list */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--tx3)', marginBottom: 8 }}>Active Reports</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {REPORTS.map(r => (
              <div key={r.id} onClick={() => setSelectedId(r.id)} style={{
                background: 'var(--surf)', border: selectedId === r.id ? '1.5px solid var(--t400)' : '.5px solid var(--bdr)',
                borderRadius: 10, padding: '12px 14px', cursor: 'pointer', transition: 'all .12s',
                ...(selectedId === r.id ? { background: 'var(--t50)' } : {}),
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 6, background: `${r.stdColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 12 }}>📄</span>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx1)', lineHeight: 1.3 }}>{r.name}</div>
                      <div style={{ display: 'flex', gap: 4, marginTop: 3 }}>
                        <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 3, fontWeight: 700, background: `${r.stdColor}15`, color: r.stdColor }}>{r.standard}</span>
                        <span style={{ fontSize: 8, color: 'var(--tx3)' }}>{r.type}</span>
                        <span className={`badge ${STATUS_COLORS[r.status]}`} style={{ fontSize: 8 }}>{r.status}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 10, color: 'var(--tx3)' }}>Progress</span>
                  <div className="pbar-bg" style={{ flex: 1, height: 4 }}><div className="pbar-fill" style={{ width: `${r.progress}%`, background: r.stdColor }} /></div>
                  <span style={{ fontSize: 10, fontWeight: 600, fontFamily: 'var(--fm)', color: r.stdColor }}>{r.progress}%</span>
                </div>
                <div style={{ fontSize: 9, color: 'var(--tx3)', marginTop: 4 }}>{r.fy} · {r.dueDate}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right - Report detail */}
        <div>
          {/* Report header card */}
          <div style={{ background: 'var(--surf)', border: '.5px solid var(--bdr)', borderRadius: 12, padding: '20px 24px', marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--tx1)', marginBottom: 4 }}>{report.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--tx2)' }}>
                  <span>📅 {report.fy}</span>
                  <span>📌 {report.dueDate}</span>
                  <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, fontWeight: 700, background: `${report.stdColor}15`, color: report.stdColor }}>{report.standard}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn-secondary" style={{ fontSize: 11 }}>Preview</button>
                <button className="btn-secondary" style={{ fontSize: 11 }}>Export</button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr 1fr', gap: 16, alignItems: 'center' }}>
              {/* Donut */}
              <div style={{ position: 'relative', width: 80, height: 80 }}>
                <canvas ref={donutRef} />
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--fm)', color: 'var(--t700)' }}>{report.progress}%</div>
                  <div style={{ fontSize: 8, color: 'var(--tx3)' }}>Done</div>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--fm)', color: 'var(--tx1)' }}>{sectionsDone}/{totalSections}</div>
                <div style={{ fontSize: 10, color: 'var(--tx3)' }}>Sections done</div>
                <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--fm)', color: 'var(--tx1)', marginTop: 4 }}>{sections.filter(s => s.progress === 100).length}</div>
                <div style={{ fontSize: 10, color: 'var(--tx3)' }}>Principles done</div>
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--fm)', color: 'var(--tx1)' }}>{questionsAnswered}</div>
                <div style={{ fontSize: 10, color: 'var(--tx3)' }}>Questions answered</div>
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--fm)', color: 'var(--tx1)' }}>2 hours ago</div>
                <div style={{ fontSize: 10, color: 'var(--tx3)' }}>Last updated</div>
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
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.8)' }}>Intelligent content generation, smart suggestions from previous reports, and automated compliance checking.</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ padding: '7px 14px', background: '#fff', color: 'var(--t700)', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Generate Content</button>
              <button style={{ padding: '7px 14px', background: 'rgba(255,255,255,.15)', color: '#fff', border: '1px solid rgba(255,255,255,.3)', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>View Insights</button>
            </div>
          </div>

          {/* Sections */}
          <div style={{ background: 'var(--surf)', border: '.5px solid var(--bdr)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '.5px solid var(--bdr)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx1)' }}>Report sections</span>
                <span style={{ fontSize: 11, color: 'var(--tx3)', marginLeft: 8 }}>{totalSections} sections · {report.standard} template</span>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                {(['E', 'S', 'G'] as const).map(p => (
                  <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: PILLAR_COLORS[p] }} />
                    <span style={{ fontSize: 10, color: 'var(--tx3)' }}>{p === 'E' ? 'Env' : p === 'S' ? 'Social' : 'Gov'}</span>
                  </div>
                ))}
              </div>
            </div>
            {sections.map((s, i) => (
              <div key={s.code} style={{
                display: 'grid', gridTemplateColumns: '40px 1fr 160px', alignItems: 'center', gap: 12,
                padding: '12px 18px', borderBottom: i < sections.length - 1 ? '.5px solid var(--bdr2)' : 'none',
                cursor: 'pointer', transition: 'background .1s',
              }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                {/* Status icon */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {s.progress === 100 ? (
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--grn)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M4 8l3 3 5-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </div>
                  ) : s.progress > 0 ? (
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
                    <span style={{ fontSize: 10, fontFamily: 'var(--fm)', fontWeight: 700, color: 'var(--tx3)', background: 'var(--bg)', padding: '1px 5px', borderRadius: 3 }}>{s.code}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx1)' }}>{s.name}</span>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--tx3)', marginTop: 3, display: 'flex', gap: 8 }}>
                    <span style={{ color: PILLAR_COLORS[s.pillar], fontWeight: 600 }}>{s.pillar === 'E' ? 'Environmental' : s.pillar === 'S' ? 'Social' : 'Governance'}</span>
                    <span>{s.questions}</span>
                    <span>Owner: {s.owner}</span>
                    <span>{s.dept}</span>
                  </div>
                </div>
                {/* Progress */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 10, color: 'var(--tx3)' }}>Progress</span>
                  <div className="pbar-bg" style={{ flex: 1, height: 4 }}>
                    <div className="pbar-fill" style={{ width: `${s.progress}%`, background: s.progress === 100 ? 'var(--grn)' : s.progress > 50 ? 'var(--t500)' : s.progress > 0 ? 'var(--amb)' : 'var(--bdr)' }} />
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'var(--fm)', color: s.progress === 100 ? 'var(--grn)' : s.progress > 50 ? 'var(--t700)' : 'var(--red)' }}>{s.progress}%</span>
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="var(--tx3)" strokeWidth="1.5" strokeLinecap="round" /></svg>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
