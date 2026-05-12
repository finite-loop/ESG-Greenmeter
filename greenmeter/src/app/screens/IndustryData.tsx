"use client";
import { useState, useEffect, useRef, useMemo } from "react";

type Props = { navigate:(s:any)=>void; [k:string]:any };

/* ── Company pool ───────────────────────────────────────────── */
type Company = { id:string; name:string; industry:string; standards:string[] };

const COMPANIES: Company[] = [
  { id:'infosys',  name:'Infosys Ltd',              industry:'IT / Technology',    standards:['BRSR','GRI','ESRS'] },
  { id:'hul',      name:'HUL (Hindustan Unilever)', industry:'FMCG',              standards:['BRSR','GRI'] },
  { id:'tatasteel',name:'Tata Steel',               industry:'Steel / Metals',     standards:['BRSR','GRI','ESRS'] },
  { id:'dabur',    name:'Dabur India',              industry:'FMCG',              standards:['BRSR'] },
  { id:'wipro',    name:'Wipro Ltd',                industry:'IT / Technology',    standards:['BRSR','GRI','ESRS'] },
  { id:'sail',     name:'SAIL',                     industry:'Steel / Metals',     standards:['BRSR'] },
  { id:'vedanta',  name:'Vedanta Ltd',              industry:'Mining / Resources', standards:['BRSR','GRI'] },
  { id:'reliance', name:'Reliance Industries',      industry:'Conglomerate',       standards:['BRSR','GRI','ESRS'] },
  { id:'tcs',      name:'TCS',                      industry:'IT / Technology',    standards:['BRSR','GRI','ESRS'] },
  { id:'itc',      name:'ITC Ltd',                  industry:'FMCG',              standards:['BRSR','GRI'] },
  { id:'mahindra', name:'Mahindra & Mahindra',      industry:'Auto / Manufacturing',standards:['BRSR','GRI'] },
  { id:'hdfc',     name:'HDFC Bank',                industry:'Banking / Finance',  standards:['BRSR'] },
  { id:'lt',       name:'Larsen & Toubro',          industry:'Engineering',        standards:['BRSR','GRI','ESRS'] },
  { id:'ntpc',     name:'NTPC Ltd',                 industry:'Power / Energy',     standards:['BRSR','GRI'] },
  { id:'jsw',      name:'JSW Steel',                industry:'Steel / Metals',     standards:['BRSR','GRI','ESRS'] },
];

/* ── Metric definitions ─────────────────────────────────────── */
type MetricDef = { id:string; name:string; unit:string; pillar:'E'|'S'|'G'; abbr?:string };

const ENV_METRICS: MetricDef[] = [
  { id:'total_ghg',       name:'Total GHG Emissions',   unit:'tCO2e',  pillar:'E' },
  { id:'ghg_scope1',      name:'GHG Scope 1',           unit:'tCO2e',  pillar:'E' },
  { id:'ghg_scope2',      name:'GHG Scope 2',           unit:'tCO2e',  pillar:'E' },
  { id:'energy_intensity', name:'Energy Intensity',      unit:'GJ/₹cr', pillar:'E' },
  { id:'renewable_pct',   name:'Renewable Energy %',    unit:'%',      pillar:'E' },
  { id:'water_consumption',name:'Water Consumption',    unit:'kL',     pillar:'E' },
  { id:'waste_landfill',  name:'Waste to Landfill',     unit:'MT',     pillar:'E' },
];

const SOC_METRICS: MetricDef[] = [
  { id:'women_workforce', name:'Women in Workforce', unit:'%',     pillar:'S' },
  { id:'women_mgmt',      name:'Women in Mgmt',     unit:'%',     pillar:'S' },
  { id:'ltifr',           name:'LTIFR',              unit:'rate',  pillar:'S' },
  { id:'training_hrs',    name:'Training Hours/Emp', unit:'hrs/yr',pillar:'S' },
  { id:'gender_pay',      name:'Gender Pay Ratio',   unit:'ratio', pillar:'S' },
];

const GOV_METRICS: MetricDef[] = [
  { id:'board_independence', name:'Board Independence', unit:'%', pillar:'G' },
  { id:'women_board',        name:'Women on Board',     unit:'%', pillar:'G' },
  { id:'anticorr_training',  name:'Anti-corruption Training', unit:'%', pillar:'G' },
];

const ALL_METRICS = [...ENV_METRICS, ...SOC_METRICS, ...GOV_METRICS];

const YEARS = ['FY 2021-22','FY 2022-23','FY 2023-24','FY 2024-25'] as const;
type Year = typeof YEARS[number];

/* ── Seed-based deterministic data generator ─────────────────── */
function seededRand(seed: number) {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
}

function generateCompanyData(company: Company) {
  const rand = seededRand(company.id.split('').reduce((a,c)=>a+c.charCodeAt(0),0));
  const r = () => rand();

  const isIT = company.industry.includes('IT');
  const isSteel = company.industry.includes('Steel') || company.industry.includes('Mining');
  const isFMCG = company.industry.includes('FMCG');

  // Base multipliers by industry
  const ghgBase = isIT ? 70000 : isSteel ? 280000 : isFMCG ? 45000 : 140000;
  const waterBase = isIT ? 180000 : isSteel ? 420000 : isFMCG ? 310000 : 260000;
  const wasteBase = isIT ? 400 : isSteel ? 4200 : isFMCG ? 1800 : 1300;

  const data: Record<string, Record<string, number>> = {};

  ALL_METRICS.forEach(m => {
    const yearValues: Record<string, number> = {};
    let base: number;

    switch(m.id) {
      case 'total_ghg':       base = ghgBase * (0.8 + r() * 0.4); break;
      case 'ghg_scope1':      base = ghgBase * (0.4 + r() * 0.2); break;
      case 'ghg_scope2':      base = ghgBase * (0.3 + r() * 0.2); break;
      case 'energy_intensity': base = 3.0 + r() * 3.5; break;
      case 'renewable_pct':   base = isIT ? 30 + r() * 20 : 10 + r() * 25; break;
      case 'water_consumption': base = waterBase * (0.7 + r() * 0.6); break;
      case 'waste_landfill':  base = wasteBase * (0.6 + r() * 0.8); break;
      case 'women_workforce': base = isIT ? 30 + r() * 8 : 18 + r() * 12; break;
      case 'women_mgmt':      base = 16 + r() * 14; break;
      case 'ltifr':           base = isSteel ? 0.4 + r() * 0.5 : 0.2 + r() * 0.6; break;
      case 'training_hrs':    base = 30 + r() * 40; break;
      case 'gender_pay':      base = 0.82 + r() * 0.16; break;
      case 'board_independence': base = 40 + r() * 25; break;
      case 'women_board':     base = 15 + r() * 20; break;
      case 'anticorr_training': base = 70 + r() * 25; break;
      default: base = 50;
    }

    // Generate 4 years of data with trends
    const improving = ['total_ghg','ghg_scope1','ghg_scope2','energy_intensity','waste_landfill','ltifr'].includes(m.id);
    const increasing = ['renewable_pct','women_workforce','women_mgmt','training_hrs','gender_pay','board_independence','women_board','anticorr_training'].includes(m.id);

    YEARS.forEach((yr, i) => {
      const trend = improving ? -0.04 - r() * 0.06 : increasing ? 0.02 + r() * 0.05 : -0.01 + r() * 0.04;
      const yearFactor = 1 + trend * (i - 1);
      const noise = 1 + (r() - 0.5) * 0.04;
      let val = base * yearFactor * noise;

      // Clamp percentages
      if (['renewable_pct','women_workforce','women_mgmt','board_independence','women_board','anticorr_training'].includes(m.id)) {
        val = Math.max(5, Math.min(95, val));
      }
      if (m.id === 'gender_pay') val = Math.max(0.7, Math.min(1.05, val));
      if (m.id === 'ltifr') val = Math.max(0.05, Math.min(1.5, val));

      yearValues[yr] = val;
    });

    data[m.id] = yearValues;
  });

  return data;
}

/* Pre-generate all company data */
const COMPANY_DATA: Record<string, Record<string, Record<string, number>>> = {};
COMPANIES.forEach(c => { COMPANY_DATA[c.id] = generateCompanyData(c); });

/* ── Format helpers ──────────────────────────────────────────── */
function fmtVal(val: number, unit: string): string {
  if (unit === 'tCO2e' || unit === 'kL') {
    if (val >= 1000000) return `${(val/1000000).toFixed(1)}M`;
    if (val >= 1000) return `${Math.round(val/1000)}K`;
    return Math.round(val).toString();
  }
  if (unit === 'MT') return val >= 1000 ? `${(val/1000).toFixed(1)}K` : Math.round(val).toString();
  if (unit === 'GJ/₹cr') return val.toFixed(1);
  if (unit === 'rate') return val.toFixed(1);
  if (unit === 'ratio') return val.toFixed(2);
  if (unit === '%') return Math.round(val).toString();
  if (unit === 'hrs/yr') return Math.round(val).toString();
  return val.toFixed(1);
}

function fmtChange(curr: number, prev: number, unit: string): { text: string; good: boolean; arrow: string } {
  const diff = curr - prev;
  const pctChange = prev !== 0 ? ((curr - prev) / prev) * 100 : 0;

  const isLowerBetter = ['tCO2e','MT','GJ/₹cr','rate','kL'].includes(unit);
  const isAbsolute = ['%','ratio'].includes(unit);

  if (isAbsolute) {
    const pp = diff;
    const good = unit === 'ratio' ? diff > 0 : diff > 0; // higher % is generally better for social/gov metrics
    return { text: `${diff > 0 ? '+' : ''}${pp.toFixed(1)}${unit === '%' ? 'pp' : ''} YoY`, good, arrow: diff > 0 ? '▲' : '▼' };
  }

  const good = isLowerBetter ? diff < 0 : diff > 0;
  return { text: `${pctChange > 0 ? '+' : ''}${pctChange.toFixed(1)}% YoY`, good, arrow: diff > 0 ? '▲' : '▼' };
}

/* ── Mini sparkline SVG ──────────────────────────────────────── */
const YEAR_LABELS = ['FY22', 'FY23', 'FY24', 'FY25'];

function Sparkline({ values, color, width = 80, height = 40, showYears = false }: { values: number[]; color: string; width?: number; height?: number; showYears?: boolean }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const padding = 4;
  const labelH = showYears ? 12 : 0;
  const w = width - padding * 2;
  const h = height - padding * 2 - labelH;

  const points = values.map((v, i) => {
    const x = padding + (i / (values.length - 1)) * w;
    const y = padding + h - ((v - min) / range) * h;
    return `${x},${y}`;
  });

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {showYears && values.map((_, i) => {
        const x = padding + (i / (values.length - 1)) * w;
        return (
          <text key={i} x={x} y={height - 1} textAnchor="middle" fill="#94a3b8" fontSize="7" fontFamily="var(--fm)">
            {YEAR_LABELS[i] ?? ''}
          </text>
        );
      })}
    </svg>
  );
}

/* ── Rollup levels ───────────────────────────────────────────── */
const VIEW_LEVELS = [
  { id: 'employee', label: 'Employee', color: '#94a3b8' },
  { id: 'department', label: 'Department', color: '#94a3b8' },
  { id: 'facility', label: 'Facility', color: '#6366f1' },
  { id: 'subsidiary', label: 'Subsidiary', color: '#14b8a6' },
  { id: 'organization', label: 'Organization', color: '#0f766e' },
  { id: 'sector', label: 'Sector', color: '#94a3b8' },
  { id: 'region', label: 'Region', color: '#94a3b8' },
  { id: 'country', label: 'Country', color: '#94a3b8' },
];

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════ */
export default function IndustryDataScreen({ navigate }: Props) {
  const [year, setYear] = useState<Year>('FY 2023-24');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState('trends');
  const [viewLevel, setViewLevel] = useState('organization');
  const [metricSearch, setMetricSearch] = useState('');
  const [metricMode, setMetricMode] = useState('Absolute');
  const [showAllCompanies, setShowAllCompanies] = useState(false);

  const company = selectedId ? COMPANIES.find(c => c.id === selectedId) ?? null : null;
  const data = selectedId ? COMPANY_DATA[selectedId] : null;

  const filteredCompanies = COMPANIES.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
  );

  const TABS = [
    ['trends', 'Trends & KPIs'], ['peer', 'Peer benchmarking'], ['rollup', 'Rollup drill-down'],
    ['forecast', 'Forecasting'], ['correlation', 'Correlations'], ['anomaly', 'Anomaly detection'],
  ];

  /* ── Empty state ─────────────────────────────────────────── */
  if (!company || !data) {
    return (
      <div>
        <div className="ph" style={{ alignItems: 'flex-start' }}>
          <div>
            <div className="ptitle">Industry data</div>
            <div className="psub">Browse ESG data from any peer organisation · multi-year trends · peer benchmarking · anomaly detection</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--tx3)', marginBottom: 3 }}>Year</div>
              <select className="sel" style={{ fontSize: 12, padding: '6px 10px', width: 140 }} value={year} onChange={e => setYear(e.target.value as Year)}>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--tx3)', marginBottom: 3 }}>Organisation</div>
              <input style={{ padding: '6px 10px', border: '.5px solid var(--bdr)', borderRadius: 7, fontSize: 12, outline: 'none', background: 'var(--surf)', width: 200 }} placeholder="Search organisation…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--surf)', border: '.5px solid var(--bdr)', borderRadius: 14, padding: '60px 40px', textAlign: 'center', marginTop: 8 }}>
          <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.7 }}>🏭</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--tx1)', marginBottom: 8 }}>Select an organisation to explore industry data</div>
          <div style={{ fontSize: 12, color: 'var(--tx2)', maxWidth: 500, margin: '0 auto 20px', lineHeight: 1.6 }}>
            Choose a year and search for any organisation from the corpus of {COMPANIES.length} indexed companies. ESG metrics, trends, benchmarks, and anomalies will appear here.
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
            {(showAllCompanies ? filteredCompanies : filteredCompanies.slice(0, 8)).map(c => (
              <button key={c.id} onClick={() => { setSelectedId(c.id); setTab('trends'); }}
                style={{ padding: '6px 14px', border: '.5px solid var(--bdr)', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer', background: 'var(--surf)', color: 'var(--tx1)', transition: 'all .12s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--t50)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--t400)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surf)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--bdr)'; }}>
                {c.name}
              </button>
            ))}
            {!showAllCompanies && filteredCompanies.length > 8 && (
              <button onClick={() => setShowAllCompanies(true)}
                style={{ padding: '6px 14px', border: '.5px solid var(--t400)', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: 'var(--t50)', color: 'var(--t700)', transition: 'all .12s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--t100)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--t50)'; }}>
                + {filteredCompanies.length - 8} more
              </button>
            )}
            {showAllCompanies && filteredCompanies.length > 8 && (
              <button onClick={() => setShowAllCompanies(false)}
                style={{ padding: '6px 14px', border: '.5px solid var(--bdr)', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer', background: 'var(--surf)', color: 'var(--tx3)', transition: 'all .12s' }}>
                Show less
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ── KPI summary values ────────────────────────────────────── */
  const yearIdx = YEARS.indexOf(year);
  const prevYear = yearIdx > 0 ? YEARS[yearIdx - 1] : null;

  const kpiSummary = [
    { label: 'GHG Scope 1+2', id: 'total_ghg', unit: 'tCO2e' },
    { label: 'Energy Intensity', id: 'energy_intensity', unit: 'GJ/₹cr' },
    { label: 'Water Intensity', id: 'water_consumption', unit: 'kL/₹cr' },
    { label: 'ESG Score', id: '_esg_score', unit: '/100' },
    { label: 'Renewable Mix', id: 'renewable_pct', unit: '%' },
    { label: 'Women in Mgmt', id: 'women_mgmt', unit: '%' },
  ];

  function getKpiVal(id: string): { val: string; change: string; good: boolean; prior: string } {
    if (id === '_esg_score') {
      // Derive an ESG score from other metrics
      const rand = seededRand(company!.id.length * 7 + yearIdx * 13);
      const score = 55 + Math.round(rand() * 30);
      const priorScore = score - 2 - Math.round(rand() * 4);
      return { val: String(score), change: `+${score - priorScore} pts`, good: true, prior: `Prior yr: ${priorScore}` };
    }
    const curr = data![id]?.[year] ?? 0;
    const prev = prevYear ? data![id]?.[prevYear] ?? curr : curr;
    const change = fmtChange(curr, prev, ALL_METRICS.find(m => m.id === id)?.unit ?? '');
    return {
      val: fmtVal(curr, ALL_METRICS.find(m => m.id === id)?.unit ?? ''),
      change: change.text.replace(' YoY', ''),
      good: change.good,
      prior: prevYear ? `Prior yr: ${fmtVal(prev, ALL_METRICS.find(m => m.id === id)?.unit ?? '')}` : '',
    };
  }

  /* ── Selected state ──────────────────────────────────────── */
  return (
    <div>
      {/* Header */}
      <div className="ph" style={{ alignItems: 'flex-start' }}>
        <div>
          <div className="ptitle">Industry data</div>
          <div className="psub">Browse ESG data from any peer organisation · multi-year trends · peer benchmarking · anomaly detection</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--tx3)', marginBottom: 3 }}>Year</div>
            <select className="sel" style={{ fontSize: 12, padding: '6px 10px', width: 140 }} value={year} onChange={e => setYear(e.target.value as Year)}>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--tx3)', marginBottom: 3 }}>Organisation</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <select className="sel" style={{ fontSize: 12, padding: '6px 10px', width: 180 }} value={selectedId ?? ''} onChange={e => { setSelectedId(e.target.value); setTab('trends'); }}>
                {COMPANIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button onClick={() => setSelectedId(null)} style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: 'var(--tx3)', padding: '0 2px' }}>×</button>
            </div>
          </div>
          <div style={{ fontSize: 10, color: 'var(--tx3)', paddingTop: 16 }}>Showing: {company.name} · {year}</div>
        </div>
      </div>

      {/* Viewing at bar */}
      <div className="rollup-bar">
        <span className="rb-label">Viewing at:</span>
        {VIEW_LEVELS.map(l => (
          <span key={l.id} style={{ display: 'contents' }}>
            <span className={`rb-item ${l.id === viewLevel ? 'active' : 'inactive'}`} onClick={() => setViewLevel(l.id)}>
              <div className="rb-dot" style={{ background: l.color }} />
              {l.label}
            </span>
            {l.id !== 'country' && <span className="rb-sep">›</span>}
          </span>
        ))}
      </div>

      {/* AI query bar */}
      <div style={{ background: 'var(--surf)', border: '.5px solid var(--bdr)', borderRadius: 10, padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 24, height: 24, background: 'var(--t700)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M13 8A5 5 0 113 8a5 5 0 0110 0zM8 5v3l2 2" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <input style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, background: 'transparent', color: 'var(--tx1)' }} placeholder={`Ask anything about ${company.name}'s ESG data…`} />
        <button className="btn-primary" style={{ padding: '5px 12px', fontSize: 11 }}>Ask AI</button>
      </div>

      {/* KPI summary strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 8, marginBottom: 14 }}>
        {kpiSummary.map(kpi => {
          const v = getKpiVal(kpi.id);
          return (
            <div key={kpi.label} style={{ background: 'var(--surf)', border: '.5px solid var(--bdr)', borderRadius: 10, padding: '11px 12px' }}>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--tx3)', marginBottom: 3 }}>{kpi.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--fm)', color: 'var(--tx1)', lineHeight: 1 }}>
                {v.val}<span style={{ fontSize: 10, fontWeight: 400, color: 'var(--tx3)', marginLeft: 2 }}>{kpi.unit}</span>
              </div>
              <div style={{ fontSize: 10, marginTop: 3 }}>
                <span style={{ fontWeight: 600, color: v.good ? 'var(--grn)' : 'var(--red)' }}>{v.good ? '▲' : '▼'} {v.change}</span>{' '}
                <span style={{ color: 'var(--tx3)' }}>{v.prior}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, border: '.5px solid var(--bdr)', borderRadius: '9px 9px 0 0', overflow: 'hidden', background: 'var(--surf)' }}>
        {TABS.map(([k, l]) => (
          <div key={k} onClick={() => setTab(k)} style={{
            flex: 1, padding: '9px 10px', textAlign: 'center', cursor: 'pointer', fontSize: 11,
            fontWeight: tab === k ? 700 : 500, color: tab === k ? 'var(--t800)' : 'var(--tx2)',
            background: tab === k ? 'var(--t50)' : 'var(--surf)',
            borderRight: '.5px solid var(--bdr)',
            borderBottom: tab === k ? '2px solid var(--t700)' : '.5px solid var(--bdr)',
            whiteSpace: 'nowrap', transition: 'background .12s',
          }}>{l}</div>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ background: 'var(--surf)', border: '.5px solid var(--bdr)', borderTop: 'none', borderRadius: '0 0 12px 12px', padding: 16 }}>
        {tab === 'trends' && <TrendsKpiTab data={data} year={year} metricSearch={metricSearch} setMetricSearch={setMetricSearch} metricMode={metricMode} setMetricMode={setMetricMode} />}
        {tab === 'peer' && <PeerBenchmarkTab company={company} year={year} />}
        {tab === 'rollup' && <RollupDrillTab data={data} year={year} company={company} />}
        {tab === 'forecast' && <ForecastTab data={data} company={company} />}
        {tab === 'correlation' && <CorrelationTab data={data} />}
        {tab === 'anomaly' && <AnomalyTab data={data} company={company} />}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   TRENDS & KPIs TAB
   ══════════════════════════════════════════════════════════════ */
function TrendsKpiTab({ data, year, metricSearch, setMetricSearch, metricMode, setMetricMode }: {
  data: Record<string, Record<string, number>>;
  year: Year;
  metricSearch: string;
  setMetricSearch: (s: string) => void;
  metricMode: string;
  setMetricMode: (s: string) => void;
}) {
  const yearIdx = YEARS.indexOf(year);
  const prevYear = yearIdx > 0 ? YEARS[yearIdx - 1] : null;

  function renderGroup(label: string, metrics: MetricDef[], pillarColor: string, dotColor: string) {
    const filtered = metrics.filter(m => !metricSearch || m.name.toLowerCase().includes(metricSearch.toLowerCase()));
    if (filtered.length === 0) return null;

    // Count improving / worsening
    let improving = 0, worsening = 0;
    filtered.forEach(m => {
      const curr = data[m.id]?.[year] ?? 0;
      const prev = prevYear ? data[m.id]?.[prevYear] ?? curr : curr;
      const chg = fmtChange(curr, prev, m.unit);
      if (chg.good) improving++; else worsening++;
    });

    return (
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" fill={dotColor} /></svg>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx1)' }}>{label}</span>
            <span style={{ fontSize: 11, color: 'var(--tx3)' }}>{filtered.length} metrics</span>
          </div>
          <div style={{ display: 'flex', gap: 8, fontSize: 11 }}>
            <span style={{ color: 'var(--grn)', fontWeight: 600 }}>{improving} improving</span>
            <span style={{ color: 'var(--red)', fontWeight: 600 }}>{worsening} worsening</span>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {filtered.map(m => {
            const curr = data[m.id]?.[year] ?? 0;
            const prev = prevYear ? data[m.id]?.[prevYear] ?? curr : curr;
            const change = fmtChange(curr, prev, m.unit);
            const sparkValues = YEARS.map(y => data[m.id]?.[y] ?? 0);
            const firstVal = sparkValues[0];
            const lastVal = sparkValues[sparkValues.length - 1];
            const overallChange = firstVal !== 0 ? ((lastVal - firstVal) / firstVal * 100) : 0;

            return (
              <div key={m.id} style={{ background: 'var(--surf)', border: '.5px solid var(--bdr)', borderRadius: 10, padding: '12px 14px', transition: 'border-color .12s' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--t400)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--bdr)'}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx1)' }}>{m.name}</span>
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 700, color: pillarColor, background: `${pillarColor}15`, padding: '1px 5px', borderRadius: 3 }}>{m.pillar}</span>
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--fm)', color: 'var(--tx1)', lineHeight: 1 }}>
                  {fmtVal(curr, m.unit)}<span style={{ fontSize: 10, fontWeight: 400, color: 'var(--tx3)', marginLeft: 3 }}>{m.unit}</span>
                </div>
                <div style={{ fontSize: 10, marginTop: 4, color: change.good ? 'var(--grn)' : 'var(--red)', fontWeight: 600 }}>
                  {change.arrow} {change.text} <span style={{ color: 'var(--tx3)', fontWeight: 400 }}>{year}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 8 }}>
                  <Sparkline values={sparkValues} color={change.good ? '#10b981' : '#ef4444'} showYears />
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 9, color: 'var(--tx3)' }}>{YEARS.length} years of data</div>
                    <div style={{ fontSize: 10, fontWeight: 600, fontFamily: 'var(--fm)', color: overallChange < 0 ? 'var(--t700)' : overallChange > 0 ? 'var(--red)' : 'var(--tx3)', marginTop: 1 }}>
                      {overallChange > 0 ? '+' : ''}{overallChange.toFixed(1)}% overall
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Filter row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <select className="sel" style={{ fontSize: 11, padding: '5px 10px', width: 130 }} value={year} disabled>
          <option>{year}</option>
        </select>
        <select className="sel" style={{ fontSize: 11, padding: '5px 10px', width: 120 }} value={metricMode} onChange={e => setMetricMode(e.target.value)}>
          <option>Absolute</option><option>Intensity</option><option>YoY change</option>
        </select>
        <div style={{ position: 'relative', flex: '0 0 200px' }}>
          <input style={{ width: '100%', padding: '5px 10px', border: '.5px solid var(--bdr)', borderRadius: 7, fontSize: 11, outline: 'none', background: 'var(--surf)' }}
            placeholder="Search metrics…" value={metricSearch} onChange={e => setMetricSearch(e.target.value)} />
        </div>
      </div>

      {renderGroup('Environmental', ENV_METRICS, 'var(--t700)', '#0f766e')}
      {renderGroup('Social', SOC_METRICS, 'var(--ind)', '#6366f1')}
      {renderGroup('Governance', GOV_METRICS, 'var(--amb)', '#f59e0b')}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   PEER BENCHMARKING TAB
   ══════════════════════════════════════════════════════════════ */
function PeerBenchmarkTab({ company, year }: { company: Company; year: Year }) {
  const peers = useMemo(() => {
    return COMPANIES.filter(c =>
      c.id !== company.id && c.industry === company.industry
    );
  }, [company]);

  const allInIndustry = [company, ...peers];

  // Radar chart
  const radarRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let chart: any;
    (async () => {
      const { Chart, registerables } = await import('chart.js');
      Chart.register(...registerables);
      if (!radarRef.current) return;

      const radarMetrics = ['total_ghg', 'energy_intensity', 'renewable_pct', 'women_workforce', 'ltifr', 'board_independence'];
      const radarLabels = ['GHG', 'Energy', 'Renewable', 'Diversity', 'Safety', 'Board'];

      // Normalize values to 0-100 scale for radar
      const allVals = radarMetrics.map(mid => {
        const vals = allInIndustry.map(c => COMPANY_DATA[c.id]?.[mid]?.[year] ?? 0);
        return { min: Math.min(...vals), max: Math.max(...vals) };
      });

      function normalize(compId: string) {
        return radarMetrics.map((mid, i) => {
          const raw = COMPANY_DATA[compId]?.[mid]?.[year] ?? 0;
          const range = allVals[i].max - allVals[i].min || 1;
          const isLowerBetter = ['total_ghg', 'energy_intensity', 'ltifr'].includes(mid);
          const norm = ((raw - allVals[i].min) / range) * 100;
          return isLowerBetter ? 100 - norm : norm;
        });
      }

      const datasets = [
        { label: company.name, data: normalize(company.id), borderColor: '#0f766e', backgroundColor: 'rgba(20,184,166,.15)', pointBackgroundColor: '#0f766e', borderWidth: 2 },
      ];

      // Add up to 3 peers
      const peerColors = [['#6366f1', 'rgba(99,102,241,.1)'], ['#f59e0b', 'rgba(245,158,11,.1)'], ['#ef4444', 'rgba(239,68,68,.1)']];
      peers.slice(0, 3).forEach((p, i) => {
        datasets.push({ label: p.name, data: normalize(p.id), borderColor: peerColors[i][0], backgroundColor: peerColors[i][1], pointBackgroundColor: peerColors[i][0], borderWidth: 1.5 });
      });

      chart = new Chart(radarRef.current, {
        type: 'radar',
        data: { labels: radarLabels, datasets },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: true, position: 'top', labels: { font: { family: 'DM Sans', size: 10 }, color: '#64748b', boxWidth: 10 } } },
          scales: { r: { grid: { color: '#f3f4f6' }, ticks: { display: false }, pointLabels: { font: { family: 'DM Sans', size: 10 } }, min: 0, max: 100 } },
        },
      });
    })();
    return () => chart?.destroy();
  }, [company.id, year, peers.length]);

  // Comparison table metrics
  const compareMetrics = [
    { id: 'total_ghg', label: 'GHG Scope 1+2 (tCO2e)', unit: 'tCO2e', lowerBetter: true },
    { id: 'energy_intensity', label: 'Energy intensity (GJ/₹cr)', unit: 'GJ/₹cr', lowerBetter: true },
    { id: 'renewable_pct', label: 'Renewable energy %', unit: '%', lowerBetter: false },
    { id: 'water_consumption', label: 'Water consumption (kL)', unit: 'kL', lowerBetter: true },
    { id: 'women_workforce', label: 'Women in workforce %', unit: '%', lowerBetter: false },
    { id: 'ltifr', label: 'LTIFR', unit: 'rate', lowerBetter: true },
    { id: 'board_independence', label: 'Board independence %', unit: '%', lowerBetter: false },
    { id: 'women_mgmt', label: 'Women in management %', unit: '%', lowerBetter: false },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: 'var(--tx3)' }}>Peers from same industry:</span>
        <span className="badge b-teal" style={{ fontSize: 10 }}>{company.industry}</span>
        <span style={{ fontSize: 11, color: 'var(--tx3)' }}>·</span>
        <span style={{ fontSize: 11, color: 'var(--tx3)' }}>Standards:</span>
        {company.standards.map(s => <span key={s} className="badge b-gray" style={{ fontSize: 9 }}>{s}</span>)}
        <span style={{ fontSize: 11, color: 'var(--tx3)' }}>·</span>
        <span className="badge b-teal" style={{ fontSize: 9 }}>{peers.length} peers found</span>
      </div>

      {peers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--tx3)' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>No peers found in this industry</div>
          <div style={{ fontSize: 12 }}>Try selecting a company with more industry peers in the corpus.</div>
        </div>
      ) : (
        <>
          {/* Radar chart */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx1)', marginBottom: 8 }}>ESG positioning — {company.name} vs peers</div>
              <div style={{ height: 260, position: 'relative' }}><canvas ref={radarRef} /></div>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx1)', marginBottom: 8 }}>Peer companies</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {peers.map(p => {
                  const pData = COMPANY_DATA[p.id];
                  const esgScore = Math.round(50 + (pData?.renewable_pct?.[year] ?? 20) * 0.5 + (pData?.women_workforce?.[year] ?? 25) * 0.3 + (pData?.board_independence?.[year] ?? 45) * 0.2);
                  return (
                    <div key={p.id} style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx1)' }}>{p.name}</div>
                        <div style={{ fontSize: 10, color: 'var(--tx3)', marginTop: 2 }}>
                          {p.industry} · {p.standards.join(', ')}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--fm)', color: 'var(--t700)' }}>{Math.min(esgScore, 95)}</div>
                        <div style={{ fontSize: 9, color: 'var(--tx3)' }}>ESG score</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Comparison table */}
          <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx2)', marginBottom: 10 }}>Detailed peer comparison — {year}</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: '.5px solid var(--bdr)' }}>
                  <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--tx3)' }}>Metric</th>
                  <th style={{ padding: '6px 10px', textAlign: 'right', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--tx3)' }}>{company.name}</th>
                  {peers.slice(0, 4).map(p => (
                    <th key={p.id} style={{ padding: '6px 10px', textAlign: 'right', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--tx3)' }}>{p.name}</th>
                  ))}
                  <th style={{ padding: '6px 10px', textAlign: 'right', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--tx3)' }}>Rank</th>
                </tr>
              </thead>
              <tbody>
                {compareMetrics.map(cm => {
                  const compVal = COMPANY_DATA[company.id]?.[cm.id]?.[year] ?? 0;
                  const allVals = allInIndustry.map(c => ({ id: c.id, val: COMPANY_DATA[c.id]?.[cm.id]?.[year] ?? 0 }));
                  allVals.sort((a, b) => cm.lowerBetter ? a.val - b.val : b.val - a.val);
                  const rank = allVals.findIndex(v => v.id === company.id) + 1;

                  return (
                    <tr key={cm.id} style={{ borderBottom: '.5px solid var(--bdr2)' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surf)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                      <td style={{ padding: '7px 10px', fontWeight: 500, color: 'var(--tx1)' }}>{cm.label}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'right', fontFamily: 'var(--fm)', fontWeight: 700, color: 'var(--t700)' }}>{fmtVal(compVal, cm.unit)}</td>
                      {peers.slice(0, 4).map(p => (
                        <td key={p.id} style={{ padding: '7px 10px', textAlign: 'right', fontFamily: 'var(--fm)', color: 'var(--tx2)' }}>
                          {fmtVal(COMPANY_DATA[p.id]?.[cm.id]?.[year] ?? 0, cm.unit)}
                        </td>
                      ))}
                      <td style={{ padding: '7px 10px', textAlign: 'right' }}>
                        <span className={`badge b-${rank <= 2 ? 'green' : rank <= Math.ceil(allInIndustry.length / 2) ? 'amber' : 'red'}`} style={{ fontSize: 9 }}>
                          #{rank}/{allInIndustry.length}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   ROLLUP DRILL-DOWN TAB
   ══════════════════════════════════════════════════════════════ */
function RollupDrillTab({ data, year, company }: { data: Record<string, Record<string, number>>; year: Year; company: Company }) {
  const [kpi, setKpi] = useState('total_ghg');
  const total = data[kpi]?.[year] ?? 100000;

  const subs = useMemo(() => {
    const rand = seededRand(company.id.length * 3);
    const r = () => rand();
    const pct1 = 0.35 + r() * 0.15;
    const pct2 = 1 - pct1;
    return [
      { name: `${company.name} — Division A`, level: 'Subsidiary', val: total * pct1, pct: Math.round(pct1 * 100), indent: '14px', yoy: `↓ ${(6 + r() * 8).toFixed(1)}%`, good: true },
      { name: 'Plant — Unit 1', level: 'Facility', val: total * pct1 * 0.6, pct: Math.round(pct1 * 60), indent: '28px', yoy: `↓ ${(5 + r() * 10).toFixed(1)}%`, good: true },
      { name: 'Plant — Unit 2', level: 'Facility', val: total * pct1 * 0.4, pct: Math.round(pct1 * 40), indent: '28px', yoy: `↓ ${(3 + r() * 6).toFixed(1)}%`, good: true },
      { name: `${company.name} — Division B`, level: 'Subsidiary', val: total * pct2, pct: Math.round(pct2 * 100), indent: '14px', yoy: `↓ ${(4 + r() * 7).toFixed(1)}%`, good: true },
      { name: 'Plant — Main', level: 'Facility', val: total * pct2 * 0.7, pct: Math.round(pct2 * 70), indent: '28px', yoy: `↓ ${(5 + r() * 8).toFixed(1)}%`, good: true },
      { name: 'Operations Dept', level: 'Department', val: total * pct2 * 0.3, pct: Math.round(pct2 * 30), indent: '42px', yoy: `↓ ${(2 + r() * 12).toFixed(1)}%`, good: true },
    ];
  }, [company.id, kpi, total]);

  const met = ALL_METRICS.find(m => m.id === kpi);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 11, color: 'var(--tx3)' }}>KPI:</span>
        <select className="sel" style={{ fontSize: 11, padding: '4px 8px', width: 180 }} value={kpi} onChange={e => setKpi(e.target.value)}>
          {ALL_METRICS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <span style={{ fontSize: 11, color: 'var(--tx3)' }}>Period:</span>
        <select className="sel" style={{ fontSize: 11, padding: '4px 8px', width: 120 }}><option>{year}</option></select>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, background: 'var(--bg)', borderRadius: 8, overflow: 'hidden' }}>
        <thead>
          <tr style={{ borderBottom: '.5px solid var(--bdr)' }}>
            {['Entity', 'Level', `${met?.name ?? 'Value'} (${met?.unit ?? ''})`, '% of total', 'YoY change', 'Contribution'].map(h => (
              <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--tx3)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Org row */}
          <tr style={{ borderBottom: '.5px solid var(--bdr2)' }}>
            <td style={{ padding: '7px 12px', fontWeight: 700, color: 'var(--tx1)' }}>{company.name}</td>
            <td style={{ padding: '7px 10px' }}><span className="badge b-dark" style={{ fontSize: 9 }}>Organization</span></td>
            <td style={{ padding: '7px 10px', textAlign: 'right', fontFamily: 'var(--fm)', fontWeight: 600 }}>{fmtVal(total, met?.unit ?? '')}</td>
            <td style={{ padding: '7px 10px', textAlign: 'right', fontFamily: 'var(--fm)', color: 'var(--tx2)' }}>100%</td>
            <td style={{ padding: '7px 10px', fontSize: 10, fontWeight: 600, color: 'var(--grn)' }}>↓ 9.4%</td>
            <td style={{ padding: '7px 10px' }}><div style={{ height: 5, background: 'var(--bdr2)', borderRadius: 2, overflow: 'hidden', width: 120 }}><div style={{ height: '100%', background: 'var(--t500)', width: '100%' }} /></div></td>
          </tr>
          {subs.map(s => (
            <tr key={s.name} style={{ borderBottom: '.5px solid var(--bdr2)' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surf)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
              <td style={{ padding: '7px 12px', paddingLeft: `calc(12px + ${s.indent})`, fontWeight: s.level === 'Subsidiary' ? 600 : 400, color: 'var(--tx1)' }}>{s.name}</td>
              <td style={{ padding: '7px 10px' }}><span className={`badge b-${s.level === 'Subsidiary' ? 'teal' : s.level === 'Facility' ? 'ind' : 'gray'}`} style={{ fontSize: 9 }}>{s.level}</span></td>
              <td style={{ padding: '7px 10px', textAlign: 'right', fontFamily: 'var(--fm)', fontWeight: 600 }}>{fmtVal(s.val, met?.unit ?? '')}</td>
              <td style={{ padding: '7px 10px', textAlign: 'right', fontFamily: 'var(--fm)', color: 'var(--tx2)' }}>{s.pct}%</td>
              <td style={{ padding: '7px 10px', fontSize: 10, fontWeight: 600, color: s.good ? 'var(--grn)' : 'var(--red)' }}>{s.yoy}</td>
              <td style={{ padding: '7px 10px' }}><div style={{ height: 5, background: 'var(--bdr2)', borderRadius: 2, overflow: 'hidden', width: 120 }}><div style={{ height: '100%', background: 'var(--t500)', width: `${s.pct}%` }} /></div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   FORECAST TAB
   ══════════════════════════════════════════════════════════════ */
function ForecastTab({ data, company }: { data: Record<string, Record<string, number>>; company: Company }) {
  const fRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let c: any;
    (async () => {
      const { Chart, registerables } = await import('chart.js');
      Chart.register(...registerables);
      if (!fRef.current) return;
      const ghgVals = YEARS.map(y => Math.round((data.total_ghg?.[y] ?? 100000) / 1000));
      c = new Chart(fRef.current, {
        type: 'line',
        data: {
          labels: ['FY22', 'FY23', 'FY24', 'FY25', 'FY27', 'FY30', 'FY33', 'FY35'],
          datasets: [
            { label: 'Historical', data: [ghgVals[0], ghgVals[1], ghgVals[2], ghgVals[3], null, null, null, null], borderColor: '#0f766e', fill: false, borderWidth: 2.5, tension: 0.3, pointRadius: 4 },
            { label: 'BAU', data: [null, null, null, ghgVals[3], ghgVals[3] * 0.85, ghgVals[3] * 0.55, ghgVals[3] * 0.3, ghgVals[3] * 0.15], borderColor: '#f59e0b', borderDash: [6, 3], fill: false, borderWidth: 2, tension: 0.4, pointRadius: 2 },
            { label: 'Moderate', data: [null, null, null, ghgVals[3], ghgVals[3] * 0.78, ghgVals[3] * 0.42, ghgVals[3] * 0.15, ghgVals[3] * 0.05], borderColor: '#6366f1', borderDash: [4, 4], fill: false, borderWidth: 2, tension: 0.4, pointRadius: 2 },
            { label: 'Aggressive', data: [null, null, null, ghgVals[3], ghgVals[3] * 0.7, ghgVals[3] * 0.3, ghgVals[3] * 0.05, 0], borderColor: '#10b981', fill: false, borderWidth: 2, tension: 0.4, pointRadius: 2 },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: true, position: 'top', labels: { font: { family: 'DM Sans', size: 10 }, color: '#94a3b8', boxWidth: 10 } } },
          scales: {
            x: { grid: { color: '#f3f4f6' }, border: { display: false }, ticks: { font: { family: 'DM Sans', size: 10 }, color: '#94a3b8' } },
            y: { grid: { color: '#f3f4f6' }, border: { display: false }, ticks: { font: { family: 'DM Mono', size: 10 }, color: '#94a3b8', callback: (v: any) => v + 'k' } },
          },
        },
      });
    })();
    return () => c?.destroy();
  }, [company.id]);

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx1)', marginBottom: 8 }}>GHG Scope 1+2 forecast — {company.name}</div>
          <div style={{ height: 220, position: 'relative' }}><canvas ref={fRef} /></div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {([['Business as usual', 'Current trajectory', 'Reaches near-zero ~2039', 'amb'], ['Moderate intervention', 'Renewable + efficiency', 'Reaches target by 2035', 'grn'], ['Aggressive', 'Full RE + carbon credits', 'Reaches target by 2033', 't700']] as [string, string, string, string][]).map(([t, s1, s2, col]) => (
            <div key={t} style={{ background: `var(--${col === 'grn' ? 'grnbg' : col === 'amb' ? 'ambbg' : 't50'})`, borderRadius: 8, padding: '10px 12px', border: `.5px solid var(--${col === 'grn' ? 'grn' : col === 'amb' ? 'amb' : 't300'})30` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: `var(--${col})` }}>{t}</div>
              <div style={{ fontSize: 10, color: 'var(--tx2)', marginTop: 3 }}>{s1}</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: `var(--${col})`, marginTop: 3 }}>{s2}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   CORRELATION TAB
   ══════════════════════════════════════════════════════════════ */
function CorrelationTab({ data }: { data: Record<string, Record<string, number>> }) {
  const kpis = ['GHG', 'Energy', 'Water', 'Waste', 'LTIFR', 'Women'];
  const matrix = [[1, .87, .41, .29, -.12, .03], [.87, 1, .38, .21, -.09, .01], [.41, .38, 1, .62, -.18, .07], [.29, .21, .62, 1, -.14, .11], [-.12, -.09, -.18, -.14, 1, -.31], [.03, .01, .07, .11, -.31, 1]];

  const getCellBg = (v: number, isDiag: boolean) => {
    if (isDiag) return 'var(--t900)';
    if (v > .7) return '#0f766e'; if (v > .4) return '#5eead4'; if (v > .2) return '#ccfbf1';
    if (v < -.7) return '#991b1b'; if (v < -.4) return '#ef4444'; if (v < -.2) return '#fca5a5';
    return 'var(--bdr2)';
  };
  const getCellCol = (v: number, isDiag: boolean) => {
    if (isDiag) return '#fff';
    const abs = Math.abs(v);
    if (abs > .4) return '#fff'; if (abs > .2) return 'var(--t800)'; return 'var(--tx3)';
  };

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
        {([['Strong correlations', '8', '|r| > 0.7'], ['Moderate correlations', '18', '|r| 0.4–0.7'], ['Total pairs', '15', 'All metric pairs']] as [string, string, string][]).map(([l, v, s]) => (
          <div key={l} style={{ background: 'var(--bg)', borderRadius: 10, padding: '12px 14px', border: '.5px solid var(--bdr)' }}>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--fm)', color: 'var(--tx1)', lineHeight: 1 }}>{v}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx1)', marginTop: 4 }}>{l}</div>
            <div style={{ fontSize: 10, color: 'var(--tx3)', marginTop: 2 }}>{s}</div>
          </div>
        ))}
      </div>
      <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '12px 14px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx1)', marginBottom: 8 }}>Correlation heatmap — key KPIs</div>
        <div style={{ display: 'grid', gridTemplateColumns: `110px repeat(${kpis.length},1fr)`, gap: 2, fontSize: 9 }}>
          <div />{kpis.map(k => <div key={k} style={{ padding: '4px 2px', fontWeight: 700, color: 'var(--t700)', textAlign: 'center', fontSize: 9 }}>{k}</div>)}
          {kpis.map((k, i) => (
            <div key={k} style={{ display: 'contents' }}>
              <div style={{ padding: '4px 6px', fontWeight: 600, color: 'var(--tx2)', fontSize: 9, display: 'flex', alignItems: 'center' }}>{k}</div>
              {matrix[i].map((v, j) => {
                const isDiag = i === j;
                return <div key={j} style={{ padding: '6px 4px', background: getCellBg(v, isDiag), color: getCellCol(v, isDiag), borderRadius: 4, textAlign: 'center', fontFamily: 'var(--fm)', fontWeight: isDiag ? 700 : 400, fontSize: 9 }}>{v === 1 ? '1.00' : v.toFixed(2)}</div>;
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   ANOMALY DETECTION TAB
   ══════════════════════════════════════════════════════════════ */
function AnomalyTab({ data, company }: { data: Record<string, Record<string, number>>; company: Company }) {
  const aRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let c: any;
    (async () => {
      const { Chart, registerables } = await import('chart.js');
      Chart.register(...registerables);
      if (!aRef.current) return;
      const baseEnergy = (data.energy_intensity?.['FY 2023-24'] ?? 4) * 1000;
      c = new Chart(aRef.current, {
        type: 'line',
        data: {
          labels: ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
          datasets: [
            { label: 'Energy GJ', data: [baseEnergy * 0.9, baseEnergy * 0.95, baseEnergy * 0.92, baseEnergy * 1.35, baseEnergy * 0.98, baseEnergy * 0.93], borderColor: '#0f766e', backgroundColor: 'rgba(20,184,166,.1)', fill: true, tension: 0.4, borderWidth: 2, pointRadius: [4, 4, 4, 10, 4, 4], pointBackgroundColor: ['#0f766e', '#0f766e', '#0f766e', '#ef4444', '#0f766e', '#0f766e'] },
            { label: 'Expected range', data: Array(6).fill(baseEnergy * 1.05), borderColor: '#f59e0b', borderDash: [6, 3], fill: false, borderWidth: 1.5, pointRadius: 0 },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: true, position: 'top', labels: { font: { family: 'DM Sans', size: 10 }, color: '#94a3b8', boxWidth: 10 } } },
          scales: {
            x: { grid: { color: '#f3f4f6' }, border: { display: false }, ticks: { font: { family: 'DM Sans', size: 10 }, color: '#94a3b8' } },
            y: { grid: { color: '#f3f4f6' }, border: { display: false }, ticks: { font: { family: 'DM Mono', size: 10 }, color: '#94a3b8' } },
          },
        },
      });
    })();
    return () => c?.destroy();
  }, [company.id]);

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 14 }}>
        {([['Critical anomalies', '2', 'Require action', 'red'], ['Warnings', '4', 'Outside range', 'amb'], ['Data gaps', '6', 'Missing data', 'gray'], ['Auto-resolved', '3', 'Verified & closed', 'grn']] as [string, string, string, string][]).map(([l, v, s, c]) => (
          <div key={l} style={{ background: 'var(--surf)', border: '.5px solid var(--bdr)', borderRadius: 10, padding: '11px 13px', borderLeft: `3px solid var(--${c === 'grn' ? 'grn' : c === 'red' ? 'red' : c === 'amb' ? 'amb' : 'tx3'})` }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--tx3)', marginBottom: 3 }}>{l}</div>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--fm)', color: `var(--${c === 'grn' ? 'grn' : c === 'red' ? 'red' : c === 'amb' ? 'amb' : 'tx2'})` }}>{v}</div>
            <div style={{ fontSize: 10, color: 'var(--tx3)', marginTop: 2 }}>{s}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx1)', marginBottom: 8 }}>{company.name} — energy anomaly detected (Oct)</div>
          <div style={{ height: 200, position: 'relative' }}><canvas ref={aRef} /></div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ background: 'var(--redbg)', borderRadius: 8, padding: '11px 12px', border: '.5px solid var(--red)30' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>Critical — Energy spike</div>
            <div style={{ fontSize: 11, color: 'var(--tx1)', lineHeight: 1.5 }}>Oct energy consumption 35% above 3-month moving average. Z-score: 3.2 sigma.</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <button style={{ fontSize: 10, padding: '4px 9px', background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontWeight: 600 }}>Investigate</button>
              <button style={{ fontSize: 10, padding: '4px 9px', background: 'var(--surf)', border: '.5px solid var(--bdr)', borderRadius: 5, cursor: 'pointer' }}>Dismiss</button>
            </div>
          </div>
          <div style={{ background: 'var(--ambbg)', borderRadius: 8, padding: '11px 12px', border: '.5px solid var(--amb)30' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--amb)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>Warning — Water data gap</div>
            <div style={{ fontSize: 11, color: 'var(--tx1)', lineHeight: 1.5 }}>Q3 water withdrawal data missing for 2 facilities. Expected quarterly submission.</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <button style={{ fontSize: 10, padding: '4px 9px', background: 'var(--amb)', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontWeight: 600 }}>Send reminder</button>
              <button style={{ fontSize: 10, padding: '4px 9px', background: 'var(--surf)', border: '.5px solid var(--bdr)', borderRadius: 5, cursor: 'pointer' }}>Dismiss</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
