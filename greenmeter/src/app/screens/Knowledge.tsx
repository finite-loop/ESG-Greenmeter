"use client";
import { useState } from "react";
type Props = { navigate:(s:any)=>void; [k:string]:any };

/* ── Parameter definitions data ──────────────────────────────── */
type Param = { code:string; name:string; description:string; standard:'BRSR'|'GRI'|'ESRS'; type:'Mandatory'|'Essential'|'Forward-Looking'; principle:string; pillar:'E'|'S'|'G' };

const PARAMS: Param[] = [
  // BRSR
  { code:'SEC-A-01', name:'Corporate Identity Number (CIN)', description:'Corporate Identity Number, registered name, office address, website, email, and financial year.', standard:'BRSR', type:'Mandatory', principle:'Section A', pillar:'G' },
  { code:'SEC-A-02', name:'Nature of business activities', description:'Principal products/services, NIC codes, and % contribution to turnover.', standard:'BRSR', type:'Mandatory', principle:'Section A', pillar:'G' },
  { code:'P6-I-01', name:'GHG Scope 1 emissions', description:'Direct GHG emissions from owned/controlled sources — stationary combustion, process, mobile, fugitive.', standard:'BRSR', type:'Essential', principle:'Principle 6', pillar:'E' },
  { code:'P6-I-02', name:'GHG Scope 2 emissions (location)', description:'Indirect GHG from purchased electricity using grid emission factor for the state/region.', standard:'BRSR', type:'Essential', principle:'Principle 6', pillar:'E' },
  { code:'P6-I-03', name:'Energy intensity per rupee of turnover', description:'Total energy consumed per rupee of turnover — normalised intensity metric.', standard:'BRSR', type:'Essential', principle:'Principle 6', pillar:'E' },
  { code:'P6-I-04', name:'Water withdrawal (total)', description:'Total water withdrawn from all sources: groundwater, surface water, municipal supply, rainwater.', standard:'BRSR', type:'Essential', principle:'Principle 6', pillar:'E' },
  { code:'P3-I-01', name:'Lost time injury frequency rate (LTIFR)', description:'Number of lost-time injuries per million hours worked — primary safety performance indicator.', standard:'BRSR', type:'Essential', principle:'Principle 3', pillar:'S' },
  { code:'P6-I-01', name:'Women in total workforce', description:'Percentage of female permanent employees in the organisation.', standard:'BRSR', type:'Essential', principle:'Principle 6', pillar:'S' },
  { code:'P1-I-01', name:'Anti-corruption policy coverage', description:'Percentage of operations assessed for corruption risks and policies implemented.', standard:'BRSR', type:'Essential', principle:'Principle 1', pillar:'G' },
  { code:'P3-I-02', name:'Employee training hours', description:'Average hours of training per employee per year, disaggregated by category.', standard:'BRSR', type:'Essential', principle:'Principle 3', pillar:'S' },
  { code:'P2-I-01', name:'Sustainable sourcing %', description:'Percentage of inputs sourced sustainably including recycled/reused materials.', standard:'BRSR', type:'Essential', principle:'Principle 2', pillar:'E' },
  { code:'P8-I-01', name:'CSR expenditure', description:'Amount spent on CSR activities as percentage of average net profit.', standard:'BRSR', type:'Mandatory', principle:'Principle 8', pillar:'S' },
  // GRI
  { code:'GRI-305-1', name:'Direct GHG emissions (Scope 1)', description:'Gross direct GHG emissions in metric tons of CO2 equivalent.', standard:'GRI', type:'Essential', principle:'GRI 305', pillar:'E' },
  { code:'GRI-305-2', name:'Energy indirect GHG (Scope 2)', description:'Gross location-based and market-based energy indirect GHG emissions.', standard:'GRI', type:'Essential', principle:'GRI 305', pillar:'E' },
  { code:'GRI-303-3', name:'Water withdrawal', description:'Total water withdrawal from all areas by source type.', standard:'GRI', type:'Essential', principle:'GRI 303', pillar:'E' },
  { code:'GRI-306-3', name:'Waste generated', description:'Total weight of waste generated and composition by type.', standard:'GRI', type:'Essential', principle:'GRI 306', pillar:'E' },
  { code:'GRI-405-1', name:'Diversity of governance bodies', description:'Percentage of individuals within governance bodies by gender, age group, minority.', standard:'GRI', type:'Essential', principle:'GRI 405', pillar:'G' },
  { code:'GRI-403-9', name:'Work-related injuries', description:'Rate and number of work-related injuries including fatalities.', standard:'GRI', type:'Essential', principle:'GRI 403', pillar:'S' },
  { code:'GRI-302-1', name:'Energy consumption within org', description:'Total fuel consumption, electricity, heating, cooling, steam, and sold energy.', standard:'GRI', type:'Essential', principle:'GRI 302', pillar:'E' },
  { code:'GRI-302-3', name:'Energy intensity', description:'Energy intensity ratio calculated as energy per unit of activity/output/revenue.', standard:'GRI', type:'Essential', principle:'GRI 302', pillar:'E' },
  { code:'GRI-401-1', name:'New employee hires and turnover', description:'Total number and rate of new hires and turnover by age, gender, region.', standard:'GRI', type:'Essential', principle:'GRI 401', pillar:'S' },
  { code:'GRI-205-2', name:'Communication on anti-corruption', description:'Total number and percentage of governance body members and employees trained.', standard:'GRI', type:'Essential', principle:'GRI 205', pillar:'G' },
  // ESRS
  { code:'ESRS-E1-4', name:'GHG emission reduction targets', description:'Climate change mitigation targets including base year, target year, and reduction pathway.', standard:'ESRS', type:'Forward-Looking', principle:'ESRS E1', pillar:'E' },
  { code:'ESRS-E1-6', name:'Gross GHG emissions', description:'Gross Scope 1, 2, and 3 GHG emissions.', standard:'ESRS', type:'Essential', principle:'ESRS E1', pillar:'E' },
  { code:'ESRS-E2-4', name:'Pollution of air, water and soil', description:'Amounts of pollutants emitted to air, water and soil.', standard:'ESRS', type:'Essential', principle:'ESRS E2', pillar:'E' },
  { code:'ESRS-E3-4', name:'Water consumption', description:'Total water consumption and water consumption in areas of water stress.', standard:'ESRS', type:'Essential', principle:'ESRS E3', pillar:'E' },
  { code:'ESRS-S1-6', name:'Characteristics of employees', description:'Total number of employees by gender, country, employment type.', standard:'ESRS', type:'Mandatory', principle:'ESRS S1', pillar:'S' },
  { code:'ESRS-S1-14', name:'Health and safety metrics', description:'Percentage of workers covered by H&S management system, work-related incidents.', standard:'ESRS', type:'Essential', principle:'ESRS S1', pillar:'S' },
  { code:'ESRS-G1-1', name:'Business conduct policies', description:'Policies related to business ethics, anti-corruption, whistleblowing, and political engagement.', standard:'ESRS', type:'Mandatory', principle:'ESRS G1', pillar:'G' },
  { code:'ESRS-E1-1', name:'Transition plan for climate change', description:'Transition plan for climate change mitigation aligned with 1.5 degree pathway.', standard:'ESRS', type:'Forward-Looking', principle:'ESRS E1', pillar:'E' },
  { code:'ESRS-E4-1', name:'Biodiversity transition plan', description:'Transition plan and actions for biodiversity and ecosystem protection.', standard:'ESRS', type:'Forward-Looking', principle:'ESRS E4', pillar:'E' },
];

const STD_BADGE_COLORS: Record<string, { bg: string; col: string }> = {
  BRSR: { bg: '#fef2f2', col: '#991b1b' },
  GRI:  { bg: '#f0fdfa', col: '#0f766e' },
  ESRS: { bg: '#fffbeb', col: '#92400e' },
};

const TYPE_BADGE_COLORS: Record<string, { bg: string; col: string }> = {
  Mandatory:       { bg: '#fef2f2', col: '#991b1b' },
  Essential:       { bg: '#f0fdfa', col: '#0f766e' },
  'Forward-Looking': { bg: '#eef2ff', col: '#3730a3' },
};

const PILLAR_ICONS: Record<string, { emoji: string; bg: string; col: string }> = {
  E: { emoji: '🌍', bg: '#f0fdfa', col: '#0f766e' },
  S: { emoji: '👥', bg: '#eef2ff', col: '#4f46e5' },
  G: { emoji: '⚖️', bg: '#fffbeb', col: '#b45309' },
};

/* ── Sub-tabs ────────────────────────────────────────────────── */
const SUB_TABS = [
  ['definitions', 'Parameter definitions'],
  ['training', 'Training & courses'],
  ['regulatory', 'Regulatory updates'],
  ['interventions', 'Interventions library'],
];

/* ── Main component ─────────────────────────────────────────── */
export default function KnowledgeScreen({ navigate }: Props) {
  const [stdFilter, setStdFilter] = useState<'All'|'BRSR'|'GRI'|'ESRS'>('All');
  const [subTab, setSubTab] = useState('definitions');
  const [search, setSearch] = useState('');
  const [principleFilter, setPrincipleFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const filteredByStd = stdFilter === 'All' ? PARAMS : PARAMS.filter(p => p.standard === stdFilter);
  const filtered = filteredByStd.filter(p => {
    const q = search.toLowerCase();
    const matchQ = !q || p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
    const matchP = principleFilter === 'all' || p.principle === principleFilter;
    const matchT = typeFilter === 'all' || p.type === typeFilter;
    const matchC = categoryFilter === 'all' || p.pillar === categoryFilter;
    return matchQ && matchP && matchT && matchC;
  });

  // Stats
  const totalParams = PARAMS.length;
  const brsr = PARAMS.filter(p => p.standard === 'BRSR').length;
  const gri = PARAMS.filter(p => p.standard === 'GRI').length;
  const esrs = PARAMS.filter(p => p.standard === 'ESRS').length;
  const mandatory = PARAMS.filter(p => p.type === 'Mandatory').length;
  const forwardLooking = PARAMS.filter(p => p.type === 'Forward-Looking').length;
  const essential = PARAMS.filter(p => p.type === 'Essential').length;

  // Unique principles for filter
  const principles = [...new Set(filteredByStd.map(p => p.principle))].sort();

  return (
    <div>
      {/* Header */}
      <div className="ph">
        <div>
          <div className="ptitle">Knowledge base</div>
          <div className="psub">Comprehensive ESG parameter definitions, methodologies, and standard interventions</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#991b1b' }}>{brsr} BRSR Parameters</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#0f766e' }}>{gri} GRI Parameters</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#92400e' }}>{esrs} ESRS Parameters</span>
          </div>
        </div>
        <div className="ph-acts">
          <button className="btn-primary">Suggest addition</button>
        </div>
      </div>

      {/* Stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 14 }}>
        {([
          ['Total Parameters', totalParams, 'All standards combined', '📊'],
          ['Mandatory', mandatory, 'Required disclosures', '📋'],
          ['Forward-Looking', forwardLooking, 'Trend & forecast KPIs', '📈'],
          ['Essential', essential, 'Core subset', '🎯'],
        ] as [string, number, string, string][]).map(([label, val, sub, icon]) => (
          <div key={label} style={{ background: 'var(--surf)', border: '.5px solid var(--bdr)', borderRadius: 12, padding: '16px 18px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--tx3)', marginBottom: 6 }}>{label}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 24 }}>{icon}</span>
              <div>
                <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--fm)', color: 'var(--tx1)', lineHeight: 1 }}>{val}</div>
                <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 2 }}>{sub}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Standard tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 0 }}>
        {(['All', 'BRSR', 'GRI', 'ESRS'] as const).map(s => {
          const cnt = s === 'All' ? totalParams : s === 'BRSR' ? brsr : s === 'GRI' ? gri : esrs;
          return (
            <div key={s} onClick={() => setStdFilter(s)} style={{
              padding: '10px 20px', cursor: 'pointer', fontSize: 12, fontWeight: stdFilter === s ? 700 : 500,
              color: stdFilter === s ? 'var(--t800)' : 'var(--tx2)',
              borderBottom: stdFilter === s ? '2px solid var(--t700)' : '1px solid var(--bdr)',
              background: stdFilter === s ? 'var(--t50)' : 'transparent',
              transition: 'all .12s',
            }}>
              {s} ({cnt})
            </div>
          );
        })}
        <div style={{ flex: 1, borderBottom: '1px solid var(--bdr)' }} />
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 14, background: 'var(--surf)', borderBottom: '.5px solid var(--bdr)' }}>
        {SUB_TABS.map(([k, l]) => (
          <div key={k} onClick={() => setSubTab(k)} style={{
            padding: '8px 16px', cursor: 'pointer', fontSize: 11, fontWeight: subTab === k ? 700 : 500,
            color: subTab === k ? 'var(--t700)' : 'var(--tx2)',
            background: subTab === k ? 'var(--t50)' : 'transparent',
            borderRadius: subTab === k ? '6px 6px 0 0' : 0,
            transition: 'all .12s',
          }}>{l}</div>
        ))}
      </div>

      {subTab === 'definitions' && (
        <>
          {/* Search & filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 250 }}>
              <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4" stroke="#94a3b8" strokeWidth="1.3" /><path d="M10 10l3 3" stroke="#94a3b8" strokeWidth="1.3" strokeLinecap="round" /></svg>
              <input style={{ width: '100%', padding: '8px 12px 8px 30px', border: '.5px solid var(--bdr)', borderRadius: 7, fontSize: 12, outline: 'none', background: 'var(--surf)' }}
                placeholder="Search parameters…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="sel" style={{ width: 150, fontSize: 11, padding: '6px 10px' }} value={principleFilter} onChange={e => setPrincipleFilter(e.target.value)}>
              <option value="all">All Principles</option>
              {principles.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select className="sel" style={{ width: 130, fontSize: 11, padding: '6px 10px' }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <option value="all">All Types</option>
              <option value="Mandatory">Mandatory</option>
              <option value="Essential">Essential</option>
              <option value="Forward-Looking">Forward-Looking</option>
            </select>
            <select className="sel" style={{ width: 140, fontSize: 11, padding: '6px 10px' }} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
              <option value="all">All Categories</option>
              <option value="E">Environmental</option>
              <option value="S">Social</option>
              <option value="G">Governance</option>
            </select>
          </div>

          {/* Count */}
          <div style={{ fontSize: 11, color: 'var(--tx3)', marginBottom: 10, fontWeight: 600 }}>{filtered.length} parameters</div>

          {/* Parameter list */}
          <div style={{ background: 'var(--surf)', border: '.5px solid var(--bdr)', borderRadius: 12, overflow: 'hidden' }}>
            {filtered.map((p, i) => {
              const pi = PILLAR_ICONS[p.pillar];
              const sb = STD_BADGE_COLORS[p.standard];
              const tb = TYPE_BADGE_COLORS[p.type];
              return (
                <div key={`${p.code}-${i}`} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px',
                  borderBottom: i < filtered.length - 1 ? '.5px solid var(--bdr2)' : 'none',
                  cursor: 'pointer', transition: 'background .1s',
                }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                  {/* Pillar icon */}
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: pi.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0, marginTop: 2 }}>
                    {pi.emoji}
                  </div>
                  {/* Content */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: 10, fontFamily: 'var(--fm)', fontWeight: 600, color: 'var(--tx3)' }}>{p.code}</span>
                      <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 3, fontWeight: 700, background: sb.bg, color: sb.col }}>{p.standard}</span>
                      <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 3, fontWeight: 600, background: tb.bg, color: tb.col }}>{p.type}</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx1)', marginBottom: 3 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--tx2)', lineHeight: 1.5 }}>{p.description}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {subTab === 'training' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
          {[
            { title: 'BRSR Reporting Fundamentals', type: 'Course', duration: '4 hours', level: 'Beginner', desc: 'Introduction to SEBI BRSR framework — mandatory disclosures, principles, and filing requirements.' },
            { title: 'GHG Protocol — Corporate Standard', type: 'Certification', duration: '8 hours', level: 'Intermediate', desc: 'Complete guide to Scope 1, 2, and 3 emissions calculation, data collection, and reporting methodology.' },
            { title: 'ESRS Double Materiality Assessment', type: 'Workshop', duration: '6 hours', level: 'Advanced', desc: 'How to conduct double materiality assessment under EU CSRD — impact and financial materiality.' },
            { title: 'ESG Data Quality Management', type: 'Course', duration: '3 hours', level: 'Intermediate', desc: 'Data governance, audit trails, verification methods, and confidence scoring for ESG metrics.' },
            { title: 'Water Balance Methodology', type: 'Module', duration: '2 hours', level: 'Beginner', desc: 'GRI 303-compliant water withdrawal, consumption, and discharge measurement techniques.' },
            { title: 'Board ESG Governance', type: 'Course', duration: '2 hours', level: 'Beginner', desc: 'Board-level ESG oversight responsibilities, committee structures, and reporting frameworks.' },
          ].map(c => (
            <div key={c.title} style={{ background: 'var(--surf)', border: '.5px solid var(--bdr)', borderRadius: 10, padding: 16, transition: 'border-color .12s' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--t400)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--bdr)'}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                <span className="badge b-teal" style={{ fontSize: 9 }}>{c.type}</span>
                <span className="badge b-gray" style={{ fontSize: 9 }}>{c.level}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx1)', marginBottom: 4 }}>{c.title}</div>
              <div style={{ fontSize: 11, color: 'var(--tx2)', lineHeight: 1.5, marginBottom: 8 }}>{c.desc}</div>
              <div style={{ fontSize: 10, color: 'var(--tx3)' }}>{c.duration}</div>
            </div>
          ))}
        </div>
      )}

      {subTab === 'regulatory' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { date: 'Jan 2025', title: 'SEBI BRSR Core — Reasonable assurance mandate', desc: 'Top 150 companies by market cap must obtain reasonable assurance on BRSR Core KPIs from FY 2025-26.', impact: 'High', standard: 'BRSR' },
            { date: 'Mar 2025', title: 'EU CSRD — First ESRS filings due', desc: 'Large EU public-interest entities with >500 employees must file first sustainability statements under ESRS.', impact: 'High', standard: 'ESRS' },
            { date: 'Jun 2025', title: 'ISSB S1/S2 adoption by IOSCO members', desc: 'Multiple jurisdictions expected to adopt IFRS S1 and S2 sustainability disclosure standards.', impact: 'Medium', standard: 'GRI' },
            { date: 'Sep 2025', title: 'India Taxonomy — Green finance classification', desc: 'RBI expected to publish India green taxonomy aligning with EU and ASEAN taxonomies.', impact: 'Medium', standard: 'BRSR' },
          ].map(r => (
            <div key={r.title} style={{ background: 'var(--surf)', border: '.5px solid var(--bdr)', borderRadius: 10, padding: '14px 16px', display: 'flex', gap: 14 }}>
              <div style={{ width: 70, flexShrink: 0, textAlign: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t700)' }}>{r.date}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx1)' }}>{r.title}</span>
                  <span className={`badge b-${r.impact === 'High' ? 'red' : 'amber'}`} style={{ fontSize: 9 }}>{r.impact} impact</span>
                  <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 3, fontWeight: 700, background: STD_BADGE_COLORS[r.standard]?.bg, color: STD_BADGE_COLORS[r.standard]?.col }}>{r.standard}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--tx2)', lineHeight: 1.5 }}>{r.desc}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {subTab === 'interventions' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
          {[
            { title: 'Rooftop solar installation', pillar: 'E', impact: 'High', kpis: ['Renewable %', 'GHG Scope 2', 'Energy cost'], payback: '4-5 years', desc: 'Install rooftop solar PV across owned facilities to increase renewable energy share and reduce Scope 2 emissions.' },
            { title: 'LED lighting retrofit', pillar: 'E', impact: 'Medium', kpis: ['Energy intensity', 'GHG Scope 2'], payback: '1-2 years', desc: 'Replace conventional lighting with LED across all facilities — typical 40-60% reduction in lighting energy.' },
            { title: 'Zero liquid discharge (ZLD)', pillar: 'E', impact: 'High', kpis: ['Water withdrawal', 'Water recycled %'], payback: '3-4 years', desc: 'Implement ZLD systems to maximize water recycling and eliminate discharge to external water bodies.' },
            { title: 'Women in STEM hiring program', pillar: 'S', impact: 'Medium', kpis: ['Women %', 'Women in mgmt'], payback: 'Ongoing', desc: 'Structured pipeline for hiring, mentoring, and promoting women in technical and leadership roles.' },
            { title: 'Safety behavior observation program', pillar: 'S', impact: 'High', kpis: ['LTIFR', 'Near-miss ratio'], payback: '6 months', desc: 'Peer observation and coaching program to identify unsafe behaviors before incidents occur.' },
            { title: 'Independent director onboarding', pillar: 'G', impact: 'Medium', kpis: ['Board independence %', 'ESG score'], payback: 'Immediate', desc: 'Structured program to recruit and onboard independent directors with ESG expertise.' },
          ].map(i => (
            <div key={i.title} style={{ background: 'var(--surf)', border: '.5px solid var(--bdr)', borderRadius: 10, padding: 16 }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                <span className={`badge b-${i.pillar === 'E' ? 'e' : i.pillar === 'S' ? 's' : 'g'}`} style={{ fontSize: 9 }}>{i.pillar === 'E' ? 'Environment' : i.pillar === 'S' ? 'Social' : 'Governance'}</span>
                <span className={`badge b-${i.impact === 'High' ? 'green' : 'amber'}`} style={{ fontSize: 9 }}>{i.impact} impact</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx1)', marginBottom: 4 }}>{i.title}</div>
              <div style={{ fontSize: 11, color: 'var(--tx2)', lineHeight: 1.5, marginBottom: 8 }}>{i.desc}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                {i.kpis.map(k => <span key={k} style={{ fontSize: 9, padding: '2px 7px', background: 'var(--bg)', border: '.5px solid var(--bdr)', borderRadius: 20, color: 'var(--tx3)' }}>{k}</span>)}
              </div>
              <div style={{ fontSize: 10, color: 'var(--tx3)' }}>Payback: {i.payback}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
