"use client";
import React, { useState, useEffect, useCallback } from "react";
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
      { id: 'requests', label: 'Access requests' },
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
          {activeSection === 'requests' && <RequestsContent />}
          {activeSection === 'audit-logs' && <AuditLogsContent />}
          {activeSection === 'documents' && <DocumentsContent />}
          {activeSection === 'organization' && <OrganizationContent />}
          {activeSection === 'industry' && <IndustryContent />}
          {activeSection === 'rollup-hierarchy' && <RollupHierarchyContent />}
          {activeSection === 'standards' && <StandardsContent />}
          {activeSection === 'notifications' && <NotificationsContent />}
          {activeSection === 'integrations' && <IntegrationsContent />}
          {activeSection === 'data-residency' && <DataResidencyContent />}
          {activeSection === 'billing' && <BillingContent />}
          {activeSection === 'overview' && <OverviewContent />}
          {activeSection === 'data-quality' && <DataQualityContent />}
          {activeSection === 'processing-queue' && <ProcessingQueueContent />}
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
    { name: 'Priya Sharma', email: 'priya@company.com', role: 'Admin', dept: 'ESG Lead (all)', lastActive: 'Today, 2:14 PM', status: 'active' },
    { name: 'Rajan Mehta', email: 'rajan@company.com', role: 'Analyst', dept: 'EHS · Plant Operations', lastActive: 'Today, 11:30 AM', status: 'active' },
    { name: 'Kavya Reddy', email: 'kavya@company.com', role: 'Department', dept: 'HR Department', lastActive: 'Yesterday', status: 'active' },
    { name: 'Ankit Patel', email: 'ankit@company.com', role: 'Viewer', dept: 'Electrical Division', lastActive: '3 days ago', status: 'active' },
    { name: 'Sanjay Kumar', email: 'sanjay@company.com', role: 'Department', dept: 'Finance · Operations', lastActive: '—', status: 'pending' },
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

/* ── Access Requests ─────────────────────────────────────────── */
interface AccessRequest {
  requestId: string;
  fullName: string;
  email: string;
  company: string;
  industry: string | null;
  jobTitle: string | null;
  status: string;
  createdAt: string;
}
interface TenantOption {
  tenantId: string;
  name: string;
}

function RequestsContent() {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [approving, setApproving] = useState<string | null>(null);
  const [approveForm, setApproveForm] = useState<{ tenantId: string; role: string }>({ tenantId: '', role: 'viewer' });
  const [actionLoading, setActionLoading] = useState(false);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/access-requests?status=${statusFilter}&pageSize=50`);
      if (res.ok) {
        const json = await res.json();
        setRequests(json.data ?? []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/industry/companies');
        if (res.ok) {
          const json = await res.json();
          setTenants((json.data ?? []).map((t: TenantOption & { isCurrent?: boolean }) => ({ tenantId: t.tenantId, name: t.name })));
        }
      } catch { /* ignore */ }
    })();
  }, []);

  async function handleReview(requestId: string, action: 'approve' | 'reject') {
    setActionLoading(true);
    try {
      const body: Record<string, string> = { action };
      if (action === 'approve') {
        body.tenantId = approveForm.tenantId;
        body.role = approveForm.role;
      }
      const res = await fetch(`/api/access-requests/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setApproving(null);
        fetchRequests();
      }
    } catch { /* ignore */ }
    setActionLoading(false);
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx1)' }}>
          Access requests
          <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--tx3)', marginLeft: 8 }}>
            {requests.length} {statusFilter}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['pending', 'approved', 'rejected'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} style={{
              fontSize: 10, padding: '4px 10px', borderRadius: 5, cursor: 'pointer', fontWeight: 600,
              border: statusFilter === s ? '1px solid var(--t700)' : '.5px solid var(--bdr)',
              background: statusFilter === s ? 'var(--t50)' : 'var(--surf)',
              color: statusFilter === s ? 'var(--t700)' : 'var(--tx2)',
            }}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--tx3)', fontSize: 12 }}>Loading...</div>
      ) : requests.length === 0 ? (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--tx3)', fontSize: 12, background: 'var(--bg)', borderRadius: 10 }}>
          No {statusFilter} requests
        </div>
      ) : (
        <div className="card">
          <table className="tbl">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Company</th>
                <th>Industry</th>
                <th>Job Title</th>
                <th>Submitted</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {requests.map(r => (
                <React.Fragment key={r.requestId}>
                  <tr>
                    <td style={{ fontWeight: 500 }}>{r.fullName}</td>
                    <td style={{ fontSize: 11, color: 'var(--tx2)' }}>{r.email}</td>
                    <td style={{ color: 'var(--tx2)' }}>{r.company}</td>
                    <td style={{ fontSize: 11, color: 'var(--tx3)' }}>{r.industry || '—'}</td>
                    <td style={{ fontSize: 11, color: 'var(--tx3)' }}>{r.jobTitle || '—'}</td>
                    <td style={{ fontSize: 11, color: 'var(--tx3)' }}>
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      {r.status === 'pending' && (
                        <div style={{ display: 'flex', gap: 5 }}>
                          <button onClick={() => { setApproving(approving === r.requestId ? null : r.requestId); setApproveForm({ tenantId: '', role: 'viewer' }); }}
                            style={{ fontSize: 10, padding: '3px 8px', background: 'var(--t700)', border: 'none', borderRadius: 5, cursor: 'pointer', color: '#fff', fontWeight: 600 }}>
                            Approve
                          </button>
                          <button onClick={() => handleReview(r.requestId, 'reject')}
                            style={{ fontSize: 10, padding: '3px 8px', background: 'none', border: '.5px solid var(--bdr)', borderRadius: 5, cursor: 'pointer', color: 'var(--tx2)' }}>
                            Reject
                          </button>
                        </div>
                      )}
                      {r.status !== 'pending' && (
                        <span className={`badge b-${r.status === 'approved' ? 'green' : 'red'}`} style={{ fontSize: 9 }}>
                          {r.status}
                        </span>
                      )}
                    </td>
                  </tr>
                  {approving === r.requestId && (
                    <tr>
                      <td colSpan={7} style={{ background: 'var(--t50)', padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div>
                            <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--tx2)', display: 'block', marginBottom: 3 }}>Tenant</label>
                            <select value={approveForm.tenantId} onChange={e => setApproveForm(f => ({ ...f, tenantId: e.target.value }))}
                              style={{ fontSize: 11, padding: '4px 8px', border: '.5px solid var(--bdr)', borderRadius: 5, minWidth: 180 }}>
                              <option value="">Select tenant...</option>
                              {tenants.map(t => <option key={t.tenantId} value={t.tenantId}>{t.name}</option>)}
                            </select>
                          </div>
                          <div>
                            <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--tx2)', display: 'block', marginBottom: 3 }}>Role</label>
                            <select value={approveForm.role} onChange={e => setApproveForm(f => ({ ...f, role: e.target.value }))}
                              style={{ fontSize: 11, padding: '4px 8px', border: '.5px solid var(--bdr)', borderRadius: 5, minWidth: 120 }}>
                              <option value="viewer">Viewer</option>
                              <option value="department">Department</option>
                              <option value="analyst">Analyst</option>
                              <option value="admin">Admin</option>
                            </select>
                          </div>
                          <button onClick={() => handleReview(r.requestId, 'approve')}
                            disabled={!approveForm.tenantId || actionLoading}
                            style={{
                              fontSize: 10, padding: '5px 14px', background: approveForm.tenantId ? 'var(--t700)' : 'var(--tx3)',
                              border: 'none', borderRadius: 5, cursor: approveForm.tenantId ? 'pointer' : 'not-allowed',
                              color: '#fff', fontWeight: 600, marginTop: 14,
                            }}>
                            {actionLoading ? 'Processing...' : 'Confirm approval'}
                          </button>
                          <button onClick={() => setApproving(null)}
                            style={{ fontSize: 10, padding: '5px 10px', background: 'none', border: '.5px solid var(--bdr)', borderRadius: 5, cursor: 'pointer', color: 'var(--tx2)', marginTop: 14 }}>
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
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

/* ── Organization ─────────────────────────────────────────────── */
function OrganizationContent() {
  const fields = [
    ['Legal name', 'Your Organisation Ltd'],
    ['CIN', 'L99999MH1946PLC004768'],
    ['Registered address', 'L&T House, Ballard Estate, Mumbai 400 001'],
    ['Website', 'www.company.com'],
    ['Email', 'sustainability@company.com'],
    ['Financial year', 'April – March'],
    ['Reporting currency', 'INR (₹)'],
  ];
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx1)' }}>Organization profile</div>
        <button className="btn-secondary" style={{ fontSize: 11 }}>Edit</button>
      </div>
      <div className="card" style={{ padding: 0 }}>
        <table className="tbl">
          <tbody>
            {fields.map(([l, v]) => (
              <tr key={l}>
                <td style={{ width: 200, fontWeight: 600, color: 'var(--tx2)', fontSize: 12 }}>{l}</td>
                <td style={{ color: 'var(--tx1)' }}>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx1)', marginBottom: 8 }}>Branding</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
          {(['Company logo', 'Report header', 'Favicon'] as string[]).map(t => (
            <div key={t} style={{ border: '1.5px dashed var(--bdr)', borderRadius: 10, padding: '28px 16px', textAlign: 'center', background: 'var(--bg)' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx2)', marginBottom: 4 }}>{t}</div>
              <div style={{ fontSize: 10, color: 'var(--tx3)' }}>Drop image or click to upload</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Industry & HSN ──────────────────────────────────────────── */
function IndustryContent() {
  const rows = [
    { code: 'NIC 2512', desc: 'Manufacture of builders hardware', active: true },
    { code: 'NIC 4290', desc: 'Construction of other civil engineering projects', active: true },
    { code: 'HSN 8402', desc: 'Steam boilers & super-heated water boilers', active: true },
    { code: 'HSN 8905', desc: 'Light-vessels, dredgers, floating cranes', active: true },
    { code: 'SIC 1542', desc: 'General industrial machinery', active: false },
  ];
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div><div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx1)' }}>Industry & HSN codes</div><div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 2 }}>Used for BRSR Section A and regulatory filings</div></div>
        <button className="btn-primary" style={{ fontSize: 11 }}>+ Add code</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
        {([['Primary sector', 'Engineering & Construction', 'b-teal'], ['SEBI industry', 'Capital goods', 'b-ind'], ['GICS sub-industry', 'Construction & Engineering', 'b-gray']] as [string, string, string][]).map(([l, v, b]) => (
          <div key={l} className="stat-card"><div className="slbl">{l}</div><div className="sval" style={{ fontSize: 12 }}><span className={`badge ${b}`}>{v}</span></div></div>
        ))}
      </div>
      <div className="card">
        <table className="tbl">
          <thead><tr><th>Code</th><th>Description</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.code}>
                <td style={{ fontFamily: 'var(--fm)', fontWeight: 600 }}>{r.code}</td>
                <td style={{ color: 'var(--tx2)' }}>{r.desc}</td>
                <td><span className={`badge b-${r.active ? 'green' : 'gray'}`} style={{ fontSize: 9 }}>{r.active ? 'Active' : 'Inactive'}</span></td>
                <td><button style={{ fontSize: 10, padding: '3px 8px', background: 'none', border: '.5px solid var(--bdr)', borderRadius: 5, cursor: 'pointer', color: 'var(--tx2)' }}>Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Rollup Hierarchy ────────────────────────────────────────── */
function RollupHierarchyContent() {
  type Node = { name: string; type: string; badge: string; children?: Node[] };
  const tree: Node[] = [
    { name: 'Organisation (Group)', type: 'Organization', badge: 'b-dark', children: [
      { name: 'Manufacturing Division', type: 'Subsidiary', badge: 'b-teal', children: [
        { name: 'Plant — Site A', type: 'Facility', badge: 'b-ind' },
        { name: 'Plant — Site B', type: 'Facility', badge: 'b-ind' },
        { name: 'Plant — Site C', type: 'Facility', badge: 'b-ind' },
      ]},
      { name: 'Technology Services', type: 'Subsidiary', badge: 'b-teal', children: [
        { name: 'Office — Vadodara', type: 'Facility', badge: 'b-ind' },
        { name: 'Office — Mysore', type: 'Facility', badge: 'b-ind' },
      ]},
      { name: 'Electrical & Automation', type: 'Subsidiary', badge: 'b-teal', children: [
        { name: 'HQ Office', type: 'Facility', badge: 'b-ind' },
      ]},
    ]},
  ];
  function renderNode(node: Node, depth: number): React.JSX.Element {
    return (
      <div key={node.name}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', paddingLeft: 12 + depth * 24, borderBottom: '.5px solid var(--bdr2)' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
          {node.children && <span style={{ fontSize: 10, color: 'var(--tx3)' }}>▼</span>}
          {!node.children && <span style={{ width: 10 }} />}
          <span style={{ fontSize: 12, fontWeight: depth === 0 ? 700 : depth === 1 ? 600 : 400, color: 'var(--tx1)' }}>{node.name}</span>
          <span className={`badge ${node.badge}`} style={{ fontSize: 8 }}>{node.type}</span>
        </div>
        {node.children?.map(c => renderNode(c, depth + 1))}
      </div>
    );
  }
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div><div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx1)' }}>Rollup hierarchy</div><div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 2 }}>Define how data aggregates from facilities → subsidiaries → organization</div></div>
        <button className="btn-primary" style={{ fontSize: 11 }}>+ Add node</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 14 }}>
        {([['Organizations', '1'], ['Subsidiaries', '3'], ['Facilities', '6'], ['Departments', '12']] as [string, string][]).map(([l, v]) => (
          <div key={l} className="stat-card"><div className="slbl">{l}</div><div className="sval">{v}</div></div>
        ))}
      </div>
      <div className="card" style={{ padding: 0 }}>
        {tree.map(n => renderNode(n, 0))}
      </div>
    </div>
  );
}

/* ── Standards & Periods ─────────────────────────────────────── */
function StandardsContent() {
  const standards = [
    { name: 'BRSR Core', ver: 'SEBI 2023', enabled: true, sections: 11, color: '#ef4444' },
    { name: 'GRI Universal 2021', ver: 'GRI 2021', enabled: true, sections: 10, color: '#0f766e' },
    { name: 'ESRS (CSRD)', ver: 'EFRAG 2023', enabled: true, sections: 10, color: '#f59e0b' },
    { name: 'IFRS S2', ver: 'ISSB 2023', enabled: false, sections: 4, color: '#6366f1' },
    { name: 'CDP Climate', ver: 'CDP 2024', enabled: false, sections: 8, color: '#0d9488' },
  ];
  const periods = [
    { label: 'FY 2024-25', from: 'Apr 1 2024', to: 'Mar 31 2025', status: 'active' },
    { label: 'FY 2023-24', from: 'Apr 1 2023', to: 'Mar 31 2024', status: 'closed' },
    { label: 'FY 2022-23', from: 'Apr 1 2022', to: 'Mar 31 2023', status: 'closed' },
  ];
  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx1)', marginBottom: 12 }}>Reporting standards</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8, marginBottom: 20 }}>
        {standards.map(s => (
          <div key={s.name} style={{ background: s.enabled ? 'var(--surf)' : 'var(--bg)', border: s.enabled ? `1.5px solid ${s.color}30` : '.5px solid var(--bdr)', borderRadius: 10, padding: '14px 12px', opacity: s.enabled ? 1 : 0.6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx1)' }}>{s.name}</span>
            </div>
            <div style={{ fontSize: 10, color: 'var(--tx3)', marginBottom: 6 }}>{s.ver} · {s.sections} sections</div>
            <span className={`badge b-${s.enabled ? 'green' : 'gray'}`} style={{ fontSize: 9 }}>{s.enabled ? 'Enabled' : 'Disabled'}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx1)' }}>Reporting periods</div>
        <button className="btn-primary" style={{ fontSize: 11 }}>+ Add period</button>
      </div>
      <div className="card">
        <table className="tbl">
          <thead><tr><th>Period</th><th>Start</th><th>End</th><th>Status</th></tr></thead>
          <tbody>
            {periods.map(p => (
              <tr key={p.label}>
                <td style={{ fontWeight: 600 }}>{p.label}</td>
                <td style={{ fontFamily: 'var(--fm)', color: 'var(--tx3)' }}>{p.from}</td>
                <td style={{ fontFamily: 'var(--fm)', color: 'var(--tx3)' }}>{p.to}</td>
                <td><span className={`badge b-${p.status === 'active' ? 'green' : 'gray'}`} style={{ fontSize: 9 }}>{p.status === 'active' ? 'Active' : 'Closed'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Notifications ───────────────────────────────────────────── */
function NotificationsContent() {
  const channels = [
    { name: 'Data submission reminders', email: true, inApp: true, slack: false, freq: 'Weekly' },
    { name: 'Anomaly alerts', email: true, inApp: true, slack: true, freq: 'Real-time' },
    { name: 'Report generation complete', email: true, inApp: true, slack: false, freq: 'On event' },
    { name: 'Approval workflow', email: true, inApp: true, slack: true, freq: 'On event' },
    { name: 'Goal milestone reached', email: false, inApp: true, slack: false, freq: 'On event' },
    { name: 'Document processing updates', email: false, inApp: true, slack: false, freq: 'On event' },
    { name: 'System maintenance', email: true, inApp: true, slack: false, freq: 'As needed' },
  ];
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div><div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx1)' }}>Notification preferences</div><div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 2 }}>Configure alerts across email, in-app, and Slack channels</div></div>
        <button className="btn-secondary" style={{ fontSize: 11 }}>Save changes</button>
      </div>
      <div className="card">
        <table className="tbl">
          <thead><tr><th>Notification</th><th style={{ textAlign: 'center' }}>Email</th><th style={{ textAlign: 'center' }}>In-app</th><th style={{ textAlign: 'center' }}>Slack</th><th>Frequency</th></tr></thead>
          <tbody>
            {channels.map(c => (
              <tr key={c.name}>
                <td style={{ fontWeight: 500 }}>{c.name}</td>
                <td style={{ textAlign: 'center' }}><input type="checkbox" defaultChecked={c.email} /></td>
                <td style={{ textAlign: 'center' }}><input type="checkbox" defaultChecked={c.inApp} /></td>
                <td style={{ textAlign: 'center' }}><input type="checkbox" defaultChecked={c.slack} /></td>
                <td><span className="badge b-gray" style={{ fontSize: 9 }}>{c.freq}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Integrations ────────────────────────────────────────────── */
function IntegrationsContent() {
  const integrations = [
    { name: 'SAP S/4HANA', type: 'ERP', status: 'connected', lastSync: '2 hours ago', records: '14,200', icon: '🔗' },
    { name: 'Darwinbox HRMS', type: 'HR', status: 'connected', lastSync: '3 hours ago', records: '12,480', icon: '👥' },
    { name: 'Azure Blob Storage', type: 'Storage', status: 'connected', lastSync: 'Continuous', records: '47 docs', icon: '☁️' },
    { name: 'SEBI Filing API', type: 'Regulatory', status: 'ready', lastSync: 'Not synced', records: '—', icon: '📋' },
    { name: 'Slack', type: 'Messaging', status: 'disconnected', lastSync: '—', records: '—', icon: '💬' },
    { name: 'Power BI', type: 'BI', status: 'disconnected', lastSync: '—', records: '—', icon: '📊' },
  ];
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div><div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx1)' }}>Integrations</div><div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 2 }}>Connect external data sources, ERPs, and APIs</div></div>
        <button className="btn-primary" style={{ fontSize: 11 }}>+ Connect new</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
        {integrations.map(ig => (
          <div key={ig.name} style={{ background: ig.status === 'connected' ? 'var(--surf)' : 'var(--bg)', border: ig.status === 'connected' ? '1px solid var(--grn)20' : '.5px solid var(--bdr)', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>{ig.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx1)' }}>{ig.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--tx3)' }}>{ig.type}</div>
                </div>
              </div>
              <span className={`badge b-${ig.status === 'connected' ? 'green' : ig.status === 'ready' ? 'amber' : 'gray'}`} style={{ fontSize: 9 }}>
                {ig.status === 'connected' ? 'Connected' : ig.status === 'ready' ? 'Ready' : 'Not connected'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--tx3)', marginBottom: 10 }}>
              <span>Last sync: {ig.lastSync}</span>
              <span>{ig.records}</span>
            </div>
            <button style={{ width: '100%', padding: '5px 10px', fontSize: 10, fontWeight: 600, border: '.5px solid var(--bdr)', borderRadius: 6, cursor: 'pointer', background: ig.status === 'disconnected' ? 'var(--t700)' : 'var(--surf)', color: ig.status === 'disconnected' ? '#fff' : 'var(--tx2)' }}>
              {ig.status === 'connected' ? 'Configure' : ig.status === 'ready' ? 'Activate' : 'Connect'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Data Residency ──────────────────────────────────────────── */
function DataResidencyContent() {
  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx1)', marginBottom: 12 }}>Data residency & compliance</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
        {([['Primary region', 'Asia Pacific — Mumbai', 'ap-south-1'], ['Backup region', 'Asia Pacific — Hyderabad', 'ap-south-2'], ['DR region', 'Europe — Frankfurt', 'eu-central-1']] as [string, string, string][]).map(([l, v, s]) => (
          <div key={l} className="stat-card">
            <div className="slbl">{l}</div>
            <div className="sval" style={{ fontSize: 13 }}>{v}</div>
            <div className="ssub" style={{ fontFamily: 'var(--fm)' }}>{s}</div>
          </div>
        ))}
      </div>
      <div className="card" style={{ padding: '16px 20px' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx1)', marginBottom: 12 }}>Compliance settings</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {([['Data encryption at rest', 'AES-256, Azure Storage Service Encryption', true], ['Data encryption in transit', 'TLS 1.3 enforced', true], ['Backup retention', '90 days, cross-region replication', true], ['Data processing agreement', 'DPA v2.1 signed', true], ['Right to erasure', 'GDPR Article 17 compliant', true], ['Audit logging', 'All access and modifications tracked', true]] as [string, string, boolean][]).map(([l, s, en]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '.5px solid var(--bdr2)' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx1)' }}>{l}</div>
                <div style={{ fontSize: 10, color: 'var(--tx3)', marginTop: 2 }}>{s}</div>
              </div>
              <span className={`badge b-${en ? 'green' : 'gray'}`} style={{ fontSize: 9 }}>{en ? 'Enabled' : 'Disabled'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Billing ─────────────────────────────────────────────────── */
function BillingContent() {
  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx1)', marginBottom: 12 }}>Billing & subscription</div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={{ background: 'linear-gradient(135deg, var(--t700), #0d9488)', borderRadius: 12, padding: '20px 24px', color: '#fff' }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', opacity: 0.8, marginBottom: 4 }}>Current plan</div>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Enterprise</div>
          <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 12 }}>Unlimited users · all frameworks · priority support · custom integrations</div>
          <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
            <div><span style={{ fontWeight: 700 }}>5</span> active users</div>
            <div><span style={{ fontWeight: 700 }}>3</span> frameworks</div>
            <div><span style={{ fontWeight: 700 }}>47</span> documents</div>
          </div>
        </div>
        <div style={{ background: 'var(--surf)', border: '.5px solid var(--bdr)', borderRadius: 12, padding: '20px 24px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--tx3)', marginBottom: 4 }}>Billing cycle</div>
          <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--fm)', color: 'var(--tx1)' }}>Annual</div>
          <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 4, marginBottom: 12 }}>Next renewal: Apr 1, 2027</div>
          <button className="btn-secondary" style={{ fontSize: 11 }}>Manage subscription</button>
        </div>
      </div>
      <div className="card">
        <div className="card-head"><div className="ctitle">Usage this period</div></div>
        <table className="tbl">
          <thead><tr><th>Feature</th><th>Used</th><th>Limit</th><th>Usage</th></tr></thead>
          <tbody>
            {([['API calls', '24,391', '100,000', 24], ['Document processing', '47', '500', 9], ['AI content generation', '128', '1,000', 13], ['Storage', '2.4 GB', '50 GB', 5], ['Report exports', '12', 'Unlimited', 0]] as [string, string, string, number][]).map(([f, u, l, pct]) => (
              <tr key={f}>
                <td style={{ fontWeight: 500 }}>{f}</td>
                <td style={{ fontFamily: 'var(--fm)', fontWeight: 600, color: 'var(--tx1)' }}>{u}</td>
                <td style={{ fontFamily: 'var(--fm)', color: 'var(--tx3)' }}>{l}</td>
                <td style={{ minWidth: 120 }}>
                  {pct > 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="pbar-bg" style={{ flex: 1, height: 5 }}><div className="pbar-fill" style={{ width: `${pct}%` }} /></div>
                      <span style={{ fontSize: 10, fontFamily: 'var(--fm)', color: 'var(--tx3)' }}>{pct}%</span>
                    </div>
                  ) : <span style={{ fontSize: 10, color: 'var(--tx3)' }}>—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Overview (Operations) ───────────────────────────────────── */
function OverviewContent() {
  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx1)', marginBottom: 12 }}>Operations overview</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 14 }}>
        {([['Active tenants', '1', 'Single-tenant deployment', 'var(--t700)'], ['Total parameters', '2,841', 'Across all frameworks', 'var(--tx1)'], ['Data completeness', '72%', 'FY 2024-25', 'var(--t700)'], ['Last backup', '6 min ago', 'Automated daily + continuous', 'var(--grn)']] as [string, string, string, string][]).map(([l, v, s, c]) => (
          <div key={l} className="stat-card"><div className="slbl">{l}</div><div className="sval" style={{ color: c }}>{v}</div><div className="ssub">{s}</div></div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx1)', marginBottom: 10 }}>Recent activity</div>
          {([['Priya Sharma updated GHG Scope 1 data', '14 min ago'], ['System completed BRSR report generation', '2 hours ago'], ['Rajan Mehta verified 3 water metrics', '4 hours ago'], ['Document processed: HUL_Report.pdf', '6 hours ago'], ['Goal milestone reached: Renewable 20%', 'Yesterday']] as [string, string][]).map(([t, ago]) => (
            <div key={t} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '.5px solid var(--bdr2)', fontSize: 11 }}>
              <span style={{ color: 'var(--tx1)' }}>{t}</span>
              <span style={{ color: 'var(--tx3)', fontSize: 10, flexShrink: 0, marginLeft: 8 }}>{ago}</span>
            </div>
          ))}
        </div>
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx1)', marginBottom: 10 }}>Quick actions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(['Run data validation', 'Trigger backup now', 'Clear processing queue', 'Export audit logs', 'Refresh API connections'] as string[]).map(a => (
              <button key={a} style={{ width: '100%', padding: '8px 12px', textAlign: 'left', border: '.5px solid var(--bdr)', borderRadius: 7, fontSize: 11, fontWeight: 500, cursor: 'pointer', background: 'var(--surf)', color: 'var(--tx1)', transition: 'background .1s' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--surf)'}>
                {a}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Data Quality ────────────────────────────────────────────── */
function DataQualityContent() {
  const metrics = [
    { name: 'GHG Scope 1', completeness: 98, accuracy: 94, timeliness: 100, status: 'good' },
    { name: 'GHG Scope 2', completeness: 96, accuracy: 91, timeliness: 100, status: 'good' },
    { name: 'Energy consumption', completeness: 92, accuracy: 89, timeliness: 85, status: 'warning' },
    { name: 'Water withdrawal', completeness: 78, accuracy: 82, timeliness: 60, status: 'warning' },
    { name: 'Waste generation', completeness: 85, accuracy: 76, timeliness: 70, status: 'warning' },
    { name: 'Women in workforce', completeness: 100, accuracy: 98, timeliness: 100, status: 'good' },
    { name: 'LTIFR', completeness: 88, accuracy: 85, timeliness: 90, status: 'good' },
    { name: 'Board composition', completeness: 100, accuracy: 100, timeliness: 100, status: 'good' },
  ];
  const avgComplete = Math.round(metrics.reduce((s, m) => s + m.completeness, 0) / metrics.length);
  const avgAccuracy = Math.round(metrics.reduce((s, m) => s + m.accuracy, 0) / metrics.length);
  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx1)', marginBottom: 12 }}>Data quality dashboard</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 14 }}>
        {([['Overall score', `${Math.round((avgComplete + avgAccuracy) / 2)}%`, 'Composite score', 'var(--t700)'], ['Completeness', `${avgComplete}%`, 'Parameters filled', 'var(--grn)'], ['Accuracy', `${avgAccuracy}%`, 'Validated entries', 'var(--t700)'], ['Issues', '4', 'Require attention', 'var(--amb)']] as [string, string, string, string][]).map(([l, v, s, c]) => (
          <div key={l} className="stat-card"><div className="slbl">{l}</div><div className="sval" style={{ color: c }}>{v}</div><div className="ssub">{s}</div></div>
        ))}
      </div>
      <div className="card">
        <div className="card-head"><div className="ctitle">Metric quality breakdown</div></div>
        <table className="tbl">
          <thead><tr><th>Metric</th><th>Completeness</th><th>Accuracy</th><th>Timeliness</th><th>Status</th></tr></thead>
          <tbody>
            {metrics.map(m => (
              <tr key={m.name}>
                <td style={{ fontWeight: 500 }}>{m.name}</td>
                <td><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div className="pbar-bg" style={{ flex: 1, height: 5 }}><div className="pbar-fill" style={{ width: `${m.completeness}%`, background: m.completeness >= 90 ? 'var(--grn)' : 'var(--amb)' }} /></div><span style={{ fontSize: 10, fontFamily: 'var(--fm)', color: 'var(--tx2)' }}>{m.completeness}%</span></div></td>
                <td><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div className="pbar-bg" style={{ flex: 1, height: 5 }}><div className="pbar-fill" style={{ width: `${m.accuracy}%`, background: m.accuracy >= 90 ? 'var(--grn)' : 'var(--amb)' }} /></div><span style={{ fontSize: 10, fontFamily: 'var(--fm)', color: 'var(--tx2)' }}>{m.accuracy}%</span></div></td>
                <td><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div className="pbar-bg" style={{ flex: 1, height: 5 }}><div className="pbar-fill" style={{ width: `${m.timeliness}%`, background: m.timeliness >= 80 ? 'var(--grn)' : 'var(--amb)' }} /></div><span style={{ fontSize: 10, fontFamily: 'var(--fm)', color: 'var(--tx2)' }}>{m.timeliness}%</span></div></td>
                <td><span className={`badge b-${m.status === 'good' ? 'green' : 'amber'}`} style={{ fontSize: 9 }}>{m.status === 'good' ? 'Good' : 'Warning'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Processing Queue ────────────────────────────────────────── */
function ProcessingQueueContent() {
  const jobs = [
    { id: 'JOB-0247', type: 'report_generation', entity: 'BRSR FY24-25 Report', status: 'running', started: '2 min ago', progress: 64 },
    { id: 'JOB-0246', type: 'document_ocr', entity: 'HUL_Sustainability_Report.pdf', status: 'running', started: '8 min ago', progress: 78 },
    { id: 'JOB-0245', type: 'data_sync', entity: 'SAP S/4HANA — emissions pull', status: 'queued', started: '—', progress: 0 },
    { id: 'JOB-0244', type: 'ai_content', entity: 'BRSR P6 — AI draft generation', status: 'queued', started: '—', progress: 0 },
    { id: 'JOB-0243', type: 'report_generation', entity: 'GRI Q4 Performance Report', status: 'completed', started: '1 hour ago', progress: 100 },
    { id: 'JOB-0242', type: 'document_ocr', entity: 'Wipro_ESG_2024.pdf', status: 'completed', started: '3 hours ago', progress: 100 },
    { id: 'JOB-0241', type: 'data_validation', entity: 'FY24-25 data quality check', status: 'completed', started: '6 hours ago', progress: 100 },
    { id: 'JOB-0240', type: 'document_ocr', entity: 'SAIL_BRSR_FY24.pdf', status: 'failed', started: '1 day ago', progress: 23 },
  ];
  const running = jobs.filter(j => j.status === 'running').length;
  const queued = jobs.filter(j => j.status === 'queued').length;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div><div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx1)' }}>Processing queue</div><div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 2 }}>Background jobs — report generation, OCR, AI, data sync</div></div>
        <button className="btn-secondary" style={{ fontSize: 11 }}>Clear completed</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 14 }}>
        {([['Running', String(running), 'var(--t700)'], ['Queued', String(queued), 'var(--amb)'], ['Completed today', '3', 'var(--grn)'], ['Failed', '1', 'var(--red)']] as [string, string, string][]).map(([l, v, c]) => (
          <div key={l} className="stat-card"><div className="slbl">{l}</div><div className="sval" style={{ color: c }}>{v}</div></div>
        ))}
      </div>
      <div className="card">
        <table className="tbl">
          <thead><tr><th>Job ID</th><th>Type</th><th>Entity</th><th>Status</th><th>Progress</th><th>Started</th><th></th></tr></thead>
          <tbody>
            {jobs.map(j => (
              <tr key={j.id}>
                <td style={{ fontFamily: 'var(--fm)', fontSize: 11, fontWeight: 600 }}>{j.id}</td>
                <td><span className="badge b-gray" style={{ fontSize: 9, fontFamily: 'var(--fm)' }}>{j.type}</span></td>
                <td style={{ color: 'var(--tx2)', maxWidth: 220 }}><div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.entity}</div></td>
                <td><span className={`badge b-${j.status === 'running' ? 'teal' : j.status === 'completed' ? 'green' : j.status === 'failed' ? 'red' : 'gray'}`} style={{ fontSize: 9 }}>{j.status}</span></td>
                <td style={{ minWidth: 100 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div className="pbar-bg" style={{ flex: 1, height: 5 }}>
                      <div className="pbar-fill" style={{ width: `${j.progress}%`, background: j.status === 'failed' ? 'var(--red)' : j.status === 'completed' ? 'var(--grn)' : 'var(--t500)' }} />
                    </div>
                    <span style={{ fontSize: 10, fontFamily: 'var(--fm)', color: 'var(--tx3)' }}>{j.progress}%</span>
                  </div>
                </td>
                <td style={{ fontSize: 11, color: 'var(--tx3)' }}>{j.started}</td>
                <td>
                  {j.status === 'running' && <button style={{ fontSize: 10, padding: '3px 8px', background: 'none', border: '.5px solid var(--bdr)', borderRadius: 5, cursor: 'pointer', color: 'var(--tx2)' }}>Cancel</button>}
                  {j.status === 'failed' && <button style={{ fontSize: 10, padding: '3px 8px', background: 'var(--t700)', border: 'none', borderRadius: 5, cursor: 'pointer', color: '#fff', fontWeight: 600 }}>Retry</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
