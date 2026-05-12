"use client";
import { useState } from "react";
type Props = { navigate:(s:any)=>void; [k:string]:any };

/* ── Sidebar navigation config ───────────────────────────────── */
const SETTINGS_NAV = [
  {
    group: 'Configuration',
    items: [
      { id: 'organization', label: 'Organization' },
      { id: 'industry', label: 'Industry & HSN' },
      { id: 'rollup-hierarchy', label: 'Rollup hierarchy' },
      { id: 'standards', label: 'Standards & periods' },
    ],
  },
  {
    group: 'Access',
    items: [
      { id: 'users', label: 'Users & roles' },
      { id: 'notifications', label: 'Notifications' },
    ],
  },
  {
    group: 'System',
    items: [
      { id: 'documents', label: 'Document management' },
      { id: 'integrations', label: 'Integrations' },
      { id: 'data-residency', label: 'Data residency' },
      { id: 'billing', label: 'Billing' },
    ],
  },
  {
    group: 'Operations',
    badge: 'Admin',
    items: [
      { id: 'overview', label: 'Overview' },
      { id: 'data-quality', label: 'Data quality' },
      { id: 'processing-queue', label: 'Processing queue' },
      { id: 'audit-logs', label: 'Audit logs' },
      { id: 'system-health', label: 'System health' },
    ],
  },
];

/* ── Service health data ─────────────────────────────────────── */
type Service = { name: string; desc: string; status: 'Healthy'|'Degraded'|'Live'|'Ready'; latency: string; detail: string };

const SERVICES: Service[] = [
  { name: 'PostgreSQL', desc: 'Primary DB', status: 'Healthy', latency: '181ms', detail: 'Connected' },
  { name: 'Redis Cache', desc: 'Optional cache', status: 'Degraded', latency: '0ms', detail: 'Not configured' },
  { name: 'ML Extraction', desc: 'LLM processing', status: 'Healthy', latency: '224ms', detail: 'Azure OCR v1.0.0' },
  { name: 'SAP Connector', desc: 'ERP sync', status: 'Live', latency: '82ms', detail: 'Last 2h' },
  { name: 'Darwinbox HRMS', desc: 'HR sync', status: 'Live', latency: '64ms', detail: 'Last 3h' },
  { name: 'SEBI Filing API', desc: 'Regulatory', status: 'Ready', latency: '320ms', detail: 'XBRL ready' },
];

const STATUS_STYLES: Record<string, { bg: string; col: string; dot: string }> = {
  Healthy:  { bg: 'var(--grnbg)', col: 'var(--grn)', dot: 'var(--grn)' },
  Degraded: { bg: '#fffbeb', col: 'var(--amb)', dot: 'var(--amb)' },
  Live:     { bg: 'var(--grnbg)', col: 'var(--grn)', dot: 'var(--grn)' },
  Ready:    { bg: 'var(--grnbg)', col: 'var(--grn)', dot: 'var(--grn)' },
};

/* ── Main component ─────────────────────────────────────────── */
export default function SettingsScreen({ navigate }: Props) {
  const [activeSection, setActiveSection] = useState('system-health');

  return (
    <div>
      {/* Header */}
      <div className="ph">
        <div>
          <div className="ptitle">Settings &amp; admin</div>
          <div className="psub">Organization · configuration · users · integrations · operations · system health</div>
        </div>
      </div>

      {/* Admin banner */}
      <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, padding: '8px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>⚙️</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#92400e' }}>Administration Area</span>
          <span style={{ fontSize: 11, color: '#a16207' }}>System operations — changes affect all users</span>
        </div>
        <span className="badge b-red" style={{ fontSize: 9 }}>Admin only</span>
      </div>

      {/* Layout: sidebar + content */}
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16 }}>
        {/* Settings sidebar */}
        <div style={{ background: 'var(--surf)', border: '.5px solid var(--bdr)', borderRadius: 12, padding: '12px 0', overflow: 'hidden' }}>
          {SETTINGS_NAV.map(group => (
            <div key={group.group}>
              <div style={{ padding: '10px 16px 4px', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--tx3)', display: 'flex', alignItems: 'center', gap: 6 }}>
                {group.group}
                {group.badge && <span className="badge b-red" style={{ fontSize: 8 }}>{group.badge}</span>}
              </div>
              {group.items.map(item => (
                <div key={item.id} onClick={() => setActiveSection(item.id)} style={{
                  padding: '7px 16px', cursor: 'pointer', fontSize: 12, fontWeight: activeSection === item.id ? 600 : 400,
                  color: activeSection === item.id ? 'var(--t700)' : 'var(--tx2)',
                  background: activeSection === item.id ? 'var(--t50)' : 'transparent',
                  borderLeft: activeSection === item.id ? '3px solid var(--t700)' : '3px solid transparent',
                  transition: 'all .1s',
                }}
                  onMouseEnter={e => { if (activeSection !== item.id) (e.currentTarget as HTMLElement).style.background = 'var(--bg)'; }}
                  onMouseLeave={e => { if (activeSection !== item.id) (e.currentTarget as HTMLElement).style.background = ''; }}>
                  {item.label}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Content area */}
        <div>
          {activeSection === 'system-health' && <SystemHealthContent />}
          {activeSection === 'users' && <UsersContent />}
          {activeSection === 'audit-logs' && <AuditLogsContent />}
          {activeSection === 'documents' && <DocumentsContent />}
          {!['system-health', 'users', 'audit-logs', 'documents'].includes(activeSection) && (
            <PlaceholderContent section={SETTINGS_NAV.flatMap(g => g.items).find(i => i.id === activeSection)?.label ?? activeSection} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ── System Health ───────────────────────────────────────────── */
function SystemHealthContent() {
  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 14 }}>
        {([
          ['System Health', '94%', 'Operational · 134ms', 'var(--t700)'],
          ['Uptime', '99.97%', 'Last 30 days', 'var(--t700)'],
          ['Memory', '58 MB', '91% of 64 MB heap', 'var(--amb)'],
          ['Documents', '47', '0 processing', 'var(--tx1)'],
        ] as [string, string, string, string][]).map(([l, v, s, c]) => (
          <div key={l} className="stat-card">
            <div className="slbl">{l}</div>
            <div className="sval" style={{ color: c }}>{v}</div>
            <div className="ssub">{s}</div>
          </div>
        ))}
      </div>

      {/* Environment info */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 14 }}>
        {([
          ['Environment', 'Node.js', 'v18.20.8'],
          ['App version', '', '1.0.0'],
          ['Environment', '', 'Production'],
          ['Region', '', 'ap-south-1 (Mumbai)'],
        ] as [string, string, string][]).map(([l, sub, v]) => (
          <div key={l + v} style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--tx3)', marginBottom: 2 }}>{l}</div>
            {sub && <div style={{ fontSize: 10, color: 'var(--tx3)', marginBottom: 2 }}>{sub}</div>}
            <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--fm)', color: 'var(--tx1)' }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Service cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
        {SERVICES.map(svc => {
          const st = STATUS_STYLES[svc.status];
          return (
            <div key={svc.name} style={{
              background: svc.status === 'Degraded' ? '#fffbeb' : 'var(--surf)',
              border: svc.status === 'Degraded' ? '1px solid #fcd34d' : '.5px solid var(--bdr)',
              borderRadius: 10, padding: '14px 16px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx1)' }}>{svc.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--tx3)', marginTop: 1 }}>{svc.desc}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: st.dot }} />
                  <span style={{ fontSize: 10, fontWeight: 600, color: st.col }}>{svc.status}</span>
                </div>
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--fm)', color: svc.status === 'Degraded' ? 'var(--amb)' : 'var(--t700)' }}>{svc.latency}</div>
              <div style={{ fontSize: 10, color: 'var(--tx3)', marginTop: 2 }}>{svc.detail}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Users ────────────────────────────────────────────────────── */
function UsersContent() {
  const users = [
    { name: 'Priya Sharma', email: 'priya@larsentoubro.com', role: 'Admin', dept: 'ESG Lead (all)', lastActive: 'Today, 2:14 PM', status: 'active' },
    { name: 'Rajan Mehta', email: 'rajan@larsentoubro.com', role: 'Analyst', dept: 'EHS · Plant Pune', lastActive: 'Today, 11:30 AM', status: 'active' },
    { name: 'Kavya Reddy', email: 'kavya@larsentoubro.com', role: 'Department', dept: 'HR Department', lastActive: 'Yesterday', status: 'active' },
    { name: 'Ankit Patel', email: 'ankit@larsentoubro.com', role: 'Viewer', dept: 'L&T Electrical', lastActive: '3 days ago', status: 'active' },
    { name: 'Sanjay Kumar', email: 'sanjay@larsentoubro.com', role: 'Department', dept: 'Finance · Operations', lastActive: '—', status: 'pending' },
  ];
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx1)' }}>Team members <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--tx3)' }}>5 members · 1 pending</span></div>
        <button className="btn-primary" style={{ fontSize: 11 }}>+ Invite user</button>
      </div>
      <div className="card">
        <table className="tbl">
          <thead><tr><th>Name</th><th>Role</th><th>Department / scope</th><th>Last active</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.email}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--t700)', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {u.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                    </div>
                    <div><div style={{ fontWeight: 500 }}>{u.name}</div><div style={{ fontSize: 10, color: 'var(--tx3)' }}>{u.email}</div></div>
                  </div>
                </td>
                <td><span className={`badge b-${u.role === 'Admin' ? 'dark' : u.role === 'Analyst' ? 'teal' : u.role === 'Department' ? 'ind' : 'gray'}`} style={{ fontSize: 9 }}>{u.role}</span></td>
                <td style={{ color: 'var(--tx2)' }}>{u.dept}</td>
                <td style={{ fontSize: 11, color: 'var(--tx3)' }}>{u.lastActive}</td>
                <td><span className={`badge b-${u.status === 'active' ? 'green' : 'amber'}`} style={{ fontSize: 9 }}>{u.status === 'active' ? 'Active' : 'Pending'}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: 5 }}>
                    <button style={{ fontSize: 10, padding: '3px 8px', background: 'none', border: '.5px solid var(--bdr)', borderRadius: 5, cursor: 'pointer', color: 'var(--tx2)' }}>Edit</button>
                    {u.status === 'pending' && <button style={{ fontSize: 10, padding: '3px 8px', background: 'var(--t700)', border: 'none', borderRadius: 5, cursor: 'pointer', color: '#fff', fontWeight: 600 }}>Approve</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Audit logs ───────────────────────────────────────────────── */
function AuditLogsContent() {
  const logs = [
    { time: 'Today 14:23', user: 'Priya Sharma', action: 'DATA_UPDATED', entity: 'GHG Scope 1', old: '74,500', new: '74,200' },
    { time: 'Today 11:08', user: 'Rajan Mehta', action: 'PARAM_VERIFIED', entity: 'Water withdrawal', old: '—', new: 'Verified' },
    { time: 'Today 09:14', user: 'System', action: 'API_SYNC', entity: 'Darwinbox HRMS', old: '—', new: '12,480 records synced' },
    { time: 'Yesterday 16:30', user: 'Kavya Reddy', action: 'DATA_UPDATED', entity: 'Women in workforce', old: '27%', new: '28%' },
    { time: 'Yesterday 09:00', user: 'System', action: 'DOCUMENT_PROCESSED', entity: 'Tata Steel BRSR', old: '—', new: '42 metrics extracted' },
    { time: '2d ago', user: 'Priya Sharma', action: 'GOAL_UPDATED', entity: 'Net zero goal', old: 'pct:58', new: 'pct:62' },
  ];
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 12 }}>
        {([['Today', '14', 'Changes logged'], ['This week', '89', 'Across all entities'], ['Total logs', '2,841', 'All time'], ['Active users', '4', 'Last 7 days']] as [string, string, string][]).map(([l, v, s]) => (
          <div key={l} className="stat-card"><div className="slbl">{l}</div><div className="sval">{v}</div><div className="ssub">{s}</div></div>
        ))}
      </div>
      <div className="card">
        <div className="card-head"><div className="ctitle">Audit trail</div><button className="btn-secondary" style={{ fontSize: 11 }}>Export CSV</button></div>
        <table className="tbl">
          <thead><tr><th>Timestamp</th><th>User</th><th>Action</th><th>Entity</th><th>Previous value</th><th>New value</th></tr></thead>
          <tbody>
            {logs.map((l, i) => (
              <tr key={i}>
                <td style={{ fontFamily: 'var(--fm)', fontSize: 11, color: 'var(--tx3)' }}>{l.time}</td>
                <td style={{ fontWeight: 500 }}>{l.user}</td>
                <td><span className="badge b-gray" style={{ fontSize: 9, fontFamily: 'var(--fm)' }}>{l.action}</span></td>
                <td style={{ color: 'var(--tx2)' }}>{l.entity}</td>
                <td style={{ fontFamily: 'var(--fm)', color: 'var(--tx3)' }}>{l.old}</td>
                <td style={{ fontFamily: 'var(--fm)', color: 'var(--t700)', fontWeight: 500 }}>{l.new}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Documents ────────────────────────────────────────────────── */
function DocumentsContent() {
  const docs = [
    { name: 'Tata_Steel_BRSR_FY2024.pdf', org: 'Tata Steel Ltd', period: 'FY 2023-24', status: 'completed', progress: 100, confidence: 87, metrics: 42 },
    { name: 'HUL_Sustainability_Report.pdf', org: 'Hindustan Unilever Ltd', period: 'FY 2023-24', status: 'processing', progress: 64, confidence: null as number | null, metrics: null as number | null },
    { name: 'Wipro_ESG_2024.pdf', org: 'Wipro Ltd', period: 'FY 2023-24', status: 'completed', progress: 100, confidence: 92, metrics: 38 },
    { name: 'ITC_Sustainability_FY24.pdf', org: 'ITC Ltd', period: 'FY 2023-24', status: 'pending', progress: 0, confidence: null, metrics: null },
    { name: 'SAIL_BRSR_FY24.pdf', org: 'Steel Authority of India', period: 'FY 2023-24', status: 'failed', progress: 0, confidence: null, metrics: null },
  ];
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 12 }}>
        {([['Completed', '3', 'b-green'], ['Processing', '1', 'b-teal'], ['Pending', '1', 'b-gray'], ['Failed', '1', 'b-red']] as [string, string, string][]).map(([l, v, b]) => (
          <div key={l} className="stat-card"><div className="slbl">{l}</div><div className="sval"><span className={`badge ${b}`}>{v}</span></div></div>
        ))}
      </div>
      <div className="card">
        <div className="card-head"><div className="ctitle">Document processing queue</div><button className="btn-secondary" style={{ fontSize: 11 }}>Upload PDF</button></div>
        <table className="tbl">
          <thead><tr><th>Document</th><th>Organisation</th><th>Period</th><th>Status</th><th>Progress</th><th>Confidence</th><th>Metrics</th></tr></thead>
          <tbody>
            {docs.map(d => (
              <tr key={d.name}>
                <td style={{ fontWeight: 500, maxWidth: 200 }}><div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</div></td>
                <td style={{ color: 'var(--tx2)' }}>{d.org}</td>
                <td style={{ fontSize: 11, color: 'var(--tx3)' }}>{d.period}</td>
                <td><span className={`badge b-${d.status === 'completed' ? 'green' : d.status === 'processing' ? 'teal' : d.status === 'failed' ? 'red' : 'gray'}`} style={{ fontSize: 9 }}>{d.status}</span></td>
                <td style={{ minWidth: 100 }}><div className="pbar-bg"><div className="pbar-fill" style={{ width: `${d.progress}%`, background: d.status === 'failed' ? 'var(--red)' : d.status === 'processing' ? 'var(--t500)' : 'var(--grn)' }} /></div></td>
                <td style={{ fontFamily: 'var(--fm)' }}>{d.confidence != null ? `${d.confidence}%` : '—'}</td>
                <td style={{ fontFamily: 'var(--fm)' }}>{d.metrics != null ? d.metrics : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Placeholder ──────────────────────────────────────────────── */
function PlaceholderContent({ section }: { section: string }) {
  return (
    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--tx3)' }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>⚙️</div>
      <div style={{ fontSize: 14, fontWeight: 600 }}>{section}</div>
      <div style={{ fontSize: 12, marginTop: 4 }}>Configuration panel ready for implementation</div>
    </div>
  );
}
