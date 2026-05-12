"use client";
import { useEffect, useRef } from "react";
type Props = { navigate:(s:any)=>void; [k:string]:any };

export default function SupplyChainScreen({ navigate }: Props) {
  const donutRef = useRef<HTMLCanvasElement>(null);

  const suppliers = [
    { name: 'Tata Steel Ltd', sector: 'Steel', tier: 1, score: 72, scope3: '124k', completion: 91, risk: 'low', status: 'Complete' },
    { name: 'Mahindra Logistics', sector: 'Logistics', tier: 1, score: 58, scope3: '89k', completion: 78, risk: 'medium', status: 'Complete' },
    { name: 'Asian Paints', sector: 'Chemicals', tier: 1, score: 81, scope3: '42k', completion: 85, risk: 'low', status: 'Complete' },
    { name: 'CEAT Tyres', sector: 'Auto components', tier: 1, score: 44, scope3: '67k', completion: 54, risk: 'high', status: 'Partial' },
    { name: 'Bajaj Electricals', sector: 'Electrical', tier: 1, score: 39, scope3: '38k', completion: 46, risk: 'high', status: 'Partial' },
    { name: 'Premier Industries', sector: 'Electronics', tier: 2, score: 28, scope3: '55k', completion: 32, risk: 'high', status: 'Pending' },
    { name: 'Thermax Ltd', sector: 'Energy', tier: 1, score: 69, scope3: '33k', completion: 88, risk: 'low', status: 'Complete' },
  ];

  useEffect(() => {
    let chart: any;
    (async () => {
      const { Chart, registerables } = await import('chart.js');
      Chart.register(...registerables);
      if (!donutRef.current) return;
      chart = new Chart(donutRef.current, {
        type: 'doughnut',
        data: {
          labels: ['Cat 1: Purchased goods', 'Cat 4: Transport', 'Cat 11: Use of products', 'Cat 6: Travel', 'Other'],
          datasets: [{
            data: [420, 180, 150, 80, 60],
            backgroundColor: ['#0f766e', '#5eead4', '#6366f1', '#f59e0b', '#e5e7eb'],
            borderWidth: 0,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: true, cutout: '60%',
          plugins: {
            legend: { display: true, position: 'bottom', labels: { font: { family: 'DM Sans', size: 9 }, color: '#64748b', boxWidth: 10, padding: 6 } },
            tooltip: { backgroundColor: '#0f172a', bodyFont: { family: 'DM Mono', size: 11 } },
          },
        },
      });
    })();
    return () => chart?.destroy();
  }, []);

  return (
    <div>
      <div className="ph">
        <div><div className="ptitle">Supply chain ESG</div><div className="psub">Scope 3 · 38 Tier-1 suppliers · vendor portal</div></div>
        <div className="ph-acts">
          <button className="btn-secondary">Send survey</button>
          <button className="btn-primary">+ Add supplier</button>
        </div>
      </div>

      {/* Summary strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 14 }}>
        {([
          ['Total Suppliers', '38', 'Tier-1 active', 'var(--tx1)'],
          ['Data Submitted', '24', '63% response rate', 'var(--t700)'],
          ['High Risk', '6', 'ESG score <40', 'var(--red)'],
          ['Scope 3 Cat 1', '890k tCO2e', 'Purchased goods', 'var(--tx1)'],
        ] as [string, string, string, string][]).map(([l, v, s, c]) => (
          <div key={l} className="stat-card"><div className="slbl">{l}</div><div className="sval" style={{ color: c }}>{v}</div><div className="ssub">{s}</div></div>
        ))}
      </div>

      {/* Main layout: table + chart */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 12 }}>
        {/* Supplier table */}
        <div className="card">
          <div className="card-head">
            <div><div className="ctitle">Supplier ESG scorecards</div></div>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Supplier</th>
                <th style={{ textAlign: 'right' }}>ESG Score</th>
                <th style={{ textAlign: 'right' }}>Scope 3</th>
                <th>Completion</th>
                <th>Risk</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map(s => (
                <tr key={s.name}>
                  <td style={{ fontWeight: 500 }}>{s.name}</td>
                  <td style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--fm)', color: s.score >= 60 ? 'var(--t700)' : s.score >= 40 ? 'var(--amb)' : 'var(--red)' }}>{s.score}</span>
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--fm)', fontSize: 11 }}>{s.scope3}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div className="pbar-bg" style={{ width: 60 }}><div className="pbar-fill" style={{ width: `${s.completion}%`, background: s.completion >= 80 ? 'var(--t500)' : s.completion >= 60 ? 'var(--amb)' : 'var(--red)' }} /></div>
                    </div>
                  </td>
                  <td><span className={`badge b-${s.risk === 'low' ? 'green' : s.risk === 'medium' ? 'amber' : 'red'}`} style={{ fontSize: 9 }}>{s.risk === 'low' ? 'Low' : s.risk === 'medium' ? 'Medium' : 'High'}</span></td>
                  <td><span className={`badge b-${s.status === 'Complete' ? 'green' : s.status === 'Partial' ? 'amber' : 'gray'}`} style={{ fontSize: 9 }}>{s.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Scope 3 donut */}
        <div className="card" style={{ padding: 16 }}>
          <div className="card-head" style={{ paddingBottom: 10 }}>
            <div className="ctitle">Scope 3 by category</div>
          </div>
          <div style={{ position: 'relative', width: '100%', maxWidth: 240, margin: '0 auto' }}>
            <canvas ref={donutRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
