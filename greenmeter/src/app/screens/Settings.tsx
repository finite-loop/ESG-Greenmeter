"use client";
import { useState } from "react";
type Props = { navigate:(s:any)=>void; [k:string]:any };

const SETTINGS_TABS = [['Users','users'],['Peer organisations','peers'],['Document queue','docs'],['Audit logs','audit'],['System health','sys']];

export default function SettingsScreen({ navigate }: Props) {
  const [tab, setTab] = useState('users');

  return (
    <div>
      <div className="ph">
        <div><div className="ptitle">Settings &amp; admin</div><div className="psub">User management · document ingestion · audit trail · system health</div></div>
        <div className="ph-acts">
          {tab==='users' && <button className="btn-primary">+ Invite user</button>}
        </div>
      </div>
      <div className="tabs" style={{marginBottom:16}}>
        {SETTINGS_TABS.map(([l,k])=><div key={k} className={`tab ${tab===k?'on':''}`} onClick={()=>{ if(k==='peers'){navigate('peers')} else {setTab(k)} }}>{l}</div>)}
      </div>
      {tab==='users' && <UsersTab/>}
      {tab==='docs' && <DocQueueTab/>}
      {tab==='audit' && <AuditTab/>}
      {tab==='sys' && <SysHealthTab/>}
    </div>
  );
}

function UsersTab() {
  const users = [
    {name:'Priya Sharma',email:'priya@larsentoubro.com',role:'Admin',dept:'ESG Lead (all)',lastActive:'Today, 2:14 PM',status:'active'},
    {name:'Rajan Mehta',email:'rajan@larsentoubro.com',role:'Analyst',dept:'EHS · Plant Pune',lastActive:'Today, 11:30 AM',status:'active'},
    {name:'Kavya Reddy',email:'kavya@larsentoubro.com',role:'Department',dept:'HR Department',lastActive:'Yesterday',status:'active'},
    {name:'Ankit Patel',email:'ankit@larsentoubro.com',role:'Viewer',dept:'L&T Electrical',lastActive:'3 days ago',status:'active'},
    {name:'Sanjay Kumar',email:'sanjay@larsentoubro.com',role:'Department',dept:'Finance · Operations',lastActive:'—',status:'pending'},
  ];
  return (
    <div className="card">
      <div className="card-head"><div className="ctitle">Team members</div><span style={{fontSize:10,color:'var(--tx3)'}}>5 members · 1 pending approval</span></div>
      <table className="tbl">
        <thead><tr><th>Name</th><th>Role</th><th>Department / scope</th><th>Last active</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {users.map(u => (
            <tr key={u.email}>
              <td>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <div style={{width:28,height:28,borderRadius:'50%',background:'var(--t700)',color:'#fff',fontSize:11,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{u.name.split(' ').map((w:string)=>w[0]).join('').slice(0,2)}</div>
                  <div><div style={{fontWeight:500}}>{u.name}</div><div style={{fontSize:10,color:'var(--tx3)'}}>{u.email}</div></div>
                </div>
              </td>
              <td><span className={`badge b-${u.role==='Admin'?'dark':u.role==='Analyst'?'teal':u.role==='Department'?'ind':'gray'}`} style={{fontSize:9}}>{u.role}</span></td>
              <td style={{color:'var(--tx2)'}}>{u.dept}</td>
              <td style={{fontSize:11,color:'var(--tx3)'}}>{u.lastActive}</td>
              <td><span className={`badge b-${u.status==='active'?'green':'amber'}`} style={{fontSize:9}}>{u.status==='active'?'Active':'Pending'}</span></td>
              <td><div style={{display:'flex',gap:5}}><button style={{fontSize:10,padding:'3px 8px',background:'none',border:'.5px solid var(--bdr)',borderRadius:5,cursor:'pointer',color:'var(--tx2)'}}>Edit</button>{u.status==='pending'&&<button style={{fontSize:10,padding:'3px 8px',background:'var(--t700)',border:'none',borderRadius:5,cursor:'pointer',color:'#fff',fontWeight:600}}>Approve</button>}</div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DocQueueTab() {
  const docs = [
    {name:'Tata_Steel_BRSR_FY2024.pdf',org:'Tata Steel Ltd',period:'FY 2023-24',status:'completed',progress:100,confidence:87,metrics:42},
    {name:'HUL_Sustainability_Report.pdf',org:'Hindustan Unilever Ltd',period:'FY 2023-24',status:'processing',progress:64,confidence:null,metrics:null},
    {name:'Wipro_ESG_2024.pdf',org:'Wipro Ltd',period:'FY 2023-24',status:'completed',progress:100,confidence:92,metrics:38},
    {name:'ITC_Sustainability_FY24.pdf',org:'ITC Ltd',period:'FY 2023-24',status:'pending',progress:0,confidence:null,metrics:null},
    {name:'SAIL_BRSR_FY24.pdf',org:'Steel Authority of India',period:'FY 2023-24',status:'failed',progress:0,confidence:null,metrics:null},
  ];
  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:12}}>
        {([['Completed','3','b-green'],['Processing','1','b-teal'],['Pending','1','b-gray'],['Failed','1','b-red']] as [string,string,string][]).map(([l,v,b])=>(
          <div key={l} className="stat-card"><div className="slbl">{l}</div><div className="sval"><span className={`badge ${b}`}>{v}</span></div></div>
        ))}
      </div>
      <div className="card">
        <div className="card-head"><div className="ctitle">Document processing queue</div><div style={{display:'flex',gap:6}}><button className="btn-secondary" style={{fontSize:11}}>Upload PDF</button></div></div>
        <table className="tbl">
          <thead><tr><th>Document</th><th>Organisation</th><th>Period</th><th>Status</th><th>Progress</th><th>Confidence</th><th>Metrics</th></tr></thead>
          <tbody>
            {docs.map(d => (
              <tr key={d.name}>
                <td style={{fontWeight:500,maxWidth:200}}><div style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{d.name}</div></td>
                <td style={{color:'var(--tx2)'}}>{d.org}</td>
                <td style={{fontSize:11,color:'var(--tx3)'}}>{d.period}</td>
                <td><span className={`badge b-${d.status==='completed'?'green':d.status==='processing'?'teal':d.status==='failed'?'red':'gray'}`} style={{fontSize:9}}>{d.status}</span></td>
                <td style={{minWidth:100}}><div className="pbar-bg"><div className="pbar-fill" style={{width:`${d.progress}%`,background:d.status==='failed'?'var(--red)':d.status==='processing'?'var(--t500)':'var(--grn)'}}/></div></td>
                <td style={{fontFamily:'var(--fm)'}}>{d.confidence!=null?`${d.confidence}%`:'—'}</td>
                <td style={{fontFamily:'var(--fm)'}}>{d.metrics!=null?d.metrics:'—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AuditTab() {
  const logs = [
    {time:'Today 14:23',user:'Priya Sharma',action:'DATA_UPDATED',entity:'GHG Scope 1','old':'74,500','new':'74,200'},
    {time:'Today 11:08',user:'Rajan Mehta',action:'PARAM_VERIFIED',entity:'Water withdrawal','old':'—','new':'Verified'},
    {time:'Today 09:14',user:'System',action:'API_SYNC',entity:'Darwinbox HRMS','old':'—','new':'12,480 records synced'},
    {time:'Yesterday 16:30',user:'Kavya Reddy',action:'DATA_UPDATED',entity:'Women in workforce','old':'27%','new':'28%'},
    {time:'Yesterday 09:00',user:'System',action:'DOCUMENT_PROCESSED',entity:'Tata Steel BRSR','old':'—','new':'42 metrics extracted'},
    {time:'2d ago',user:'Priya Sharma',action:'GOAL_UPDATED',entity:'Net zero goal','old':'pct:58','new':'pct:62'},
  ];
  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:12}}>
        {([['Today','14','Changes logged'],['This week','89','Across all entities'],['Total logs','2,841','All time'],['Active users','4','Last 7 days']] as [string,string,string][]).map(([l,v,s])=>(
          <div key={l} className="stat-card"><div className="slbl">{l}</div><div className="sval">{v}</div><div className="ssub">{s}</div></div>
        ))}
      </div>
      <div className="card">
        <div className="card-head"><div className="ctitle">Audit trail</div><div style={{display:'flex',gap:6}}><button className="btn-secondary" style={{fontSize:11}}>Export CSV</button></div></div>
        <table className="tbl">
          <thead><tr><th>Timestamp</th><th>User</th><th>Action</th><th>Entity</th><th>Previous value</th><th>New value</th></tr></thead>
          <tbody>
            {logs.map((l,i) => (
              <tr key={i}>
                <td style={{fontFamily:'var(--fm)',fontSize:11,color:'var(--tx3)'}}>{l.time}</td>
                <td style={{fontWeight:500}}>{l.user}</td>
                <td><span className="badge b-gray" style={{fontSize:9,fontFamily:'var(--fm)'}}>{l.action}</span></td>
                <td style={{color:'var(--tx2)'}}>{l.entity}</td>
                <td style={{fontFamily:'var(--fm)',color:'var(--tx3)'}}>{l.old}</td>
                <td style={{fontFamily:'var(--fm)',color:'var(--t700)',fontWeight:500}}>{l.new}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SysHealthTab() {
  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:12}}>
        {([['System health','94%','All services operational','var(--t700)'],['Uptime (30d)','99.8%','Last incident: 23d ago','var(--t700)'],['Memory usage','68%','4.1 GB of 6 GB','var(--amb)'],['Documents indexed','312','47 orgs · 5 years','var(--tx1)']] as [string,string,string,string][]).map(([l,v,s,c])=>(
          <div key={l} className="stat-card"><div className="slbl">{l}</div><div className="sval" style={{color:c}}>{v}</div><div className="ssub">{s}</div></div>
        ))}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <div className="card">
          <div className="card-head"><div className="ctitle">Integration connectors</div></div>
          {([['SAP S/4HANA','HR+FI module','live','Last synced 2h ago'],['Darwinbox HRMS','HR platform','live','Last synced 1h ago · 12,480 records'],['Oracle Fusion HCM','HR+Finance','live','Last synced 6h ago'],['Schneider EcoStruxure','Energy BMS','error','Last attempt failed — check API key'],['IoT / MQTT sensors','Plant floor sensors','idle','Not configured'],['SEBI filing API','Direct XBRL submit','idle','Ready to configure']] as [string,string,string,string][]).map(([n,d,st,ls]) => (
            <div key={n} style={{display:'flex',alignItems:'center',gap:11,padding:'11px 14px',borderBottom:'.5px solid var(--bdr2)'}}>
              <div style={{width:36,height:36,borderRadius:8,background:'var(--bg)',border:'.5px solid var(--bdr)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:'var(--tx2)',flexShrink:0}}>{n.slice(0,3)}</div>
              <div style={{flex:1}}><div style={{fontSize:12,fontWeight:600}}>{n}</div><div style={{fontSize:10,color:'var(--tx3)'}}>{d}</div><div style={{fontSize:10,color:'var(--tx2)',marginTop:2}}>{ls}</div></div>
              <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:5}}>
                <div style={{width:7,height:7,borderRadius:'50%',background:st==='live'?'var(--grn)':st==='error'?'var(--red)':'var(--tx3)'}}/>
                <span className={`badge b-${st==='live'?'green':st==='error'?'red':'gray'}`}>{st}</span>
                <button className="btn-secondary" style={{fontSize:10,padding:'3px 8px'}}>{st==='idle'?'Configure':st==='error'?'Fix':'Sync now'}</button>
              </div>
            </div>
          ))}
        </div>
        <div className="card">
          <div className="card-head"><div className="ctitle">Environment info</div></div>
          <div className="cbody">
            {([['App version','v2.4.1'],['Environment','Production'],['Region','ap-south-1 (Mumbai)'],['Next.js','15.3.1'],['Database','PostgreSQL 16'],['Cache','Redis 7.2'],['Build','stable-main-af12b4c'],['Last deploy','Today 08:00 UTC']] as [string,string][]).map(([k,v]) => (
              <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:'.5px solid var(--bdr2)',fontSize:11}}>
                <span style={{color:'var(--tx3)'}}>{k}</span>
                <span style={{fontFamily:'var(--fm)',fontWeight:500}}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
