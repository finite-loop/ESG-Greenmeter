"use client";
import { useState, useEffect, useRef } from "react";
import { useSuppliers, useScope3Summary } from "@/hooks/useSuppliers";

type Props = { navigate:(s:any)=>void; [k:string]:any };

export default function SupplyChainScreen({ navigate }: Props) {
  const donutRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<any>(null);

  const { data: suppliersResp, isLoading: suppLoading } = useSuppliers({});
  const { data: scope3Resp, isLoading: scope3Loading } = useScope3Summary();

  const suppliers = suppliersResp?.data ?? [];
  const scope3 = scope3Resp?.data ?? null;

  const totalSuppliers = suppliersResp?.meta?.total ?? suppliers.length;
  const highRiskCount = suppliers.filter(s => s.riskLevel === 'high').length;
  const activeCount = suppliers.filter(s => s.active !== false).length;
  const totalScope3 = scope3 ? scope3.totalScope3Cat1 : 0;

  useEffect(() => {
    if (!scope3 && !scope3Loading) return;
    let chart: any;
    (async () => {
      const { Chart, registerables } = await import('chart.js');
      Chart.register(...registerables);
      if (!donutRef.current) return;

      // Destroy previous chart if exists
      if (chartRef.current) {
        chartRef.current.destroy();
      }

      const breakdown = scope3?.supplierBreakdown ?? [];
      const labels = breakdown.length > 0
        ? breakdown.slice(0, 5).map(b => b.supplierName).concat(breakdown.length > 5 ? ['Other'] : [])
        : ['Cat 1: Purchased goods', 'Cat 4: Transport', 'Cat 11: Use of products', 'Cat 6: Travel', 'Other'];
      const dataVals = breakdown.length > 0
        ? breakdown.slice(0, 5).map(b => b.scope3Contribution).concat(breakdown.length > 5 ? [breakdown.slice(5).reduce((a, b2) => a + b2.scope3Contribution, 0)] : [])
        : [420, 180, 150, 80, 60];

      chart = new Chart(donutRef.current, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data: dataVals,
            backgroundColor: ['#0f766e', '#5eead4', '#6366f1', '#f59e0b', '#e5e7eb', '#94a3b8'],
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
      chartRef.current = chart;
    })();
    return () => { chartRef.current?.destroy(); chartRef.current = null; };
  }, [scope3, scope3Loading]);

  return (
    <div>
      <div className="ph">
        <div><div className="ptitle">Supply chain ESG</div><div className="psub">Scope 3 · {totalSuppliers} suppliers · vendor portal</div></div>
        <div className="ph-acts">
          <button className="btn-secondary">Send survey</button>
          <button className="btn-primary">+ Add supplier</button>
        </div>
      </div>

      {/* Summary strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 14 }}>
        {([
          ['Total Suppliers', String(totalSuppliers), `${activeCount} active`, 'var(--tx1)'],
          ['Data Submitted', String(suppliers.filter(s => s.contactEmail).length), `${totalSuppliers > 0 ? Math.round(suppliers.filter(s => s.contactEmail).length / totalSuppliers * 100) : 0}% response rate`, 'var(--t700)'],
          ['High Risk', String(highRiskCount), 'ESG score <40', 'var(--red)'],
          ['Scope 3 Total', totalScope3 > 0 ? `${Math.round(totalScope3 / 1000)}k tCO2e` : '—', 'All categories', 'var(--tx1)'],
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
          {suppLoading ? (
            <div style={{ padding: 32, textAlign: 'center', fontSize: 11, color: 'var(--tx3)' }}>Loading suppliers...</div>
          ) : suppliers.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', fontSize: 11, color: 'var(--tx3)' }}>No suppliers found. Add your first supplier to get started.</div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Supplier</th>
                  <th>Sector</th>
                  <th>Category</th>
                  <th>Risk</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map(s => (
                  <tr key={s.supplierId}>
                    <td style={{ fontWeight: 500 }}>{s.name}</td>
                    <td style={{ fontSize: 11, color: 'var(--tx2)' }}>{s.sector ?? '—'}</td>
                    <td style={{ fontSize: 11, color: 'var(--tx2)' }}>{s.category ?? '—'}</td>
                    <td>
                      <span className={`badge b-${s.riskLevel === 'low' ? 'green' : s.riskLevel === 'medium' ? 'amber' : s.riskLevel === 'high' ? 'red' : 'gray'}`} style={{ fontSize: 9 }}>
                        {s.riskLevel ? s.riskLevel.charAt(0).toUpperCase() + s.riskLevel.slice(1) : '—'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge b-${s.active !== false ? 'green' : 'gray'}`} style={{ fontSize: 9 }}>
                        {s.active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Scope 3 donut */}
        <div className="card" style={{ padding: 16 }}>
          <div className="card-head" style={{ paddingBottom: 10 }}>
            <div className="ctitle">Scope 3 by category</div>
          </div>
          {scope3Loading ? (
            <div style={{ padding: 24, textAlign: 'center', fontSize: 11, color: 'var(--tx3)' }}>Loading Scope 3 data...</div>
          ) : (
            <div style={{ position: 'relative', width: '100%', maxWidth: 240, margin: '0 auto' }}>
              <canvas ref={donutRef} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
