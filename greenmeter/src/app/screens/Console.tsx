"use client";
import { useState } from "react";
import { DC_PARAMS } from "../data";

type Props = { navigate:(s:any)=>void; rollupLevel:string; setRollupLevel:(l:string)=>void; RollupBar:any; [k:string]:any };

const STATUS_CFG: Record<string,{label:string;bg:string;col:string;dot:string}> = {
  'on-track':{label:'On Track',bg:'#ecfdf5',col:'#15803d',dot:'#10b981'},
  'at-risk':{label:'At Risk',bg:'#fffbeb',col:'#b45309',dot:'#f59e0b'},
  'alert':{label:'Alert',bg:'#fef2f2',col:'#b91c1c',dot:'#ef4444'},
  'pending':{label:'Pending',bg:'#f8fafb',col:'#64748b',dot:'#94a3b8'},
};
const SRC_CFG: Record<string,{bg:string;col:string;label:string}> = {
  S:{bg:'#e8f4fd',col:'#1565c0',label:'SAP'},
  D:{bg:'#ecfdf5',col:'#065f46',label:'Darwinbox'},
  M:{bg:'#f8fafb',col:'#64748b',label:'Manual'},
  Az:{bg:'#eff6ff',col:'#1d4ed8',label:'Azure'},
};

export default function ConsoleScreen({ navigate, rollupLevel, setRollupLevel, RollupBar }: Props) {
  const [tab, setTab] = useState<'E'|'S'|'G'>('E');
  const [search, setSearch] = useState('');
  const completePct = {E:83,S:90,G:78}[tab]||83;
  const pillCol = {E:'var(--t500)',S:'var(--ind)',G:'var(--amb)'}[tab];

  const rows = DC_PARAMS[tab].filter(r => !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.code.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="ph">
        <div>
          <div className="ptitle">Console</div>
          <div className="psub">FY 2024–25 · 84% complete · data rolls up: Department → Facility → Subsidiary → Organization</div>
        </div>
        <div className="ph-acts">
          <button className="btn-secondary">Integrations</button>
          <button className="btn-primary">Save &amp; submit for review</button>
        </div>
      </div>
      <RollupBar active="department" onSet={setRollupLevel}/>

      {/* Filter bar */}
      <div style={{background:'var(--surf)',border:'.5px solid var(--bdr)',borderRadius:10,padding:'10px 14px',marginBottom:12,display:'flex',alignItems:'center',gap:10}}>
        <div style={{position:'relative',flex:1}}>
          <svg style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)'}} width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4" stroke="#94a3b8" strokeWidth="1.3"/><path d="M10 10l3 3" stroke="#94a3b8" strokeWidth="1.3" strokeLinecap="round"/></svg>
          <input style={{width:'100%',padding:'8px 12px 8px 30px',border:'.5px solid var(--bdr)',borderRadius:7,fontSize:12,outline:'none',background:'var(--surf)'}} placeholder="Search parameters…" value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <select className="sel" style={{width:140,fontSize:12,padding:'7px 10px'}}><option>FY 2024-25</option><option>FY 2023-24</option><option>FY 2022-23</option></select>
        <select className="sel" style={{width:120,fontSize:12,padding:'7px 10px'}}><option>BRSR</option><option>GRI 2021</option><option>ESRS</option><option>IFRS S2</option><option>All standards</option></select>
        <select className="sel" style={{width:150,fontSize:12,padding:'7px 10px'}}><option>All categories</option><option>Environmental</option><option>Social</option><option>Governance</option></select>
        <select className="sel" style={{width:180,fontSize:12,padding:'7px 10px'}}><option>Plant — Site A (Facility)</option><option>Plant — Site B</option><option>Electrical Division</option><option>Organisation (Org)</option></select>
      </div>

      {/* Completeness strip */}
      <div style={{display:'grid',gridTemplateColumns:'auto 1fr 1fr 1fr',gap:10,alignItems:'center',background:'var(--surf)',border:'.5px solid var(--bdr)',borderRadius:10,padding:'12px 16px',marginBottom:12}}>
        <div style={{position:'relative',width:52,height:52,flexShrink:0}}>
          <svg viewBox="0 0 52 52" width="52" height="52" style={{transform:'rotate(-90deg)'}}>
            <circle cx="26" cy="26" r="22" fill="none" stroke="#f3f4f6" strokeWidth="4"/>
            <circle cx="26" cy="26" r="22" fill="none" stroke="#14b8a6" strokeWidth="4" strokeDasharray={`${Math.round(2*Math.PI*22*.84)} ${Math.round(2*Math.PI*22)}`} strokeLinecap="round"/>
          </svg>
          <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,fontFamily:'var(--fm)'}}>84%</div>
        </div>
        {([['Environment','20/24','var(--t500)',83],['Social','18/20','var(--ind)',90],['Governance','14/18','var(--amb)',78]] as [string,string,string,number][]).map(([l,c,col,p]) => (
          <div key={l}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:4}}>
              <span style={{color:'var(--tx2)',fontWeight:500}}>{l}</span>
              <span style={{fontFamily:'var(--fm)',fontWeight:700}}>{c}</span>
            </div>
            <div className="pbar-bg" style={{height:5}}><div className="pbar-fill" style={{width:`${p}%`,height:5,background:col}}/></div>
            <div style={{fontSize:10,color:'var(--tx3)',marginTop:3}}>{p}% complete</div>
          </div>
        ))}
      </div>

      {/* Pillar tabs */}
      <div style={{display:'flex',gap:0,marginBottom:0,border:'.5px solid var(--bdr)',borderRadius:'9px 9px 0 0',overflow:'hidden',background:'var(--surf)'}}>
        {([['E','Environment','20 / 24 KPIs'],['S','Social','18 / 20 KPIs'],['G','Governance','14 / 18 KPIs']] as [string,string,string][]).map(([k,lbl,sub]) => (
          <div key={k} onClick={()=>setTab(k as any)} style={{flex:1,padding:'10px 14px',cursor:'pointer',background:tab===k?'var(--t50)':'var(--surf)',borderRight:'.5px solid var(--bdr)',borderBottom:tab===k?'2px solid var(--t700)':'.5px solid var(--bdr)',transition:'background .12s'}}>
            <div style={{fontSize:12,fontWeight:tab===k?700:500,color:tab===k?'var(--t800)':'var(--tx2)'}}>
              <span className={`badge b-${k.toLowerCase()==='e'?'e':k.toLowerCase()==='s'?'s':'g'}`} style={{fontSize:9,marginRight:5}}>{k}</span>{lbl}
            </div>
            <div style={{fontSize:10,color:'var(--tx3)',marginTop:2}}>{sub}</div>
          </div>
        ))}
        <div style={{flex:1,padding:'10px 14px',background:'var(--surf)'}}/>
      </div>

      {/* Parameter table */}
      <div style={{background:'var(--surf)',border:'.5px solid var(--bdr)',borderTop:'none',borderRadius:'0 0 10px 10px',overflow:'hidden'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead>
            <tr style={{background:'var(--bg)',borderBottom:'.5px solid var(--bdr)'}}>
              {['Parameter','Current value','Target','YTD total','Status','Source','Last updated',''].map(h => (
                <th key={h} style={{padding:'10px 10px',textAlign:'left',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'.07em',color:'var(--tx3)'}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const stCfg = STATUS_CFG[r.st] || STATUS_CFG.pending;
              const srcCfg = SRC_CFG[r.srcIcon] || SRC_CFG.M;
              const hasVal = r.current && r.current !== '';
              const tabBg = tab==='E'?'#f0fdfa':tab==='S'?'#eef2ff':'#fffbeb';
              const tabCol = tab==='E'?'#0f766e':tab==='S'?'#6366f1':'#d97706';
              return (
                <tr key={r.code} style={{borderBottom:'.5px solid var(--bdr2)',transition:'background .1s'}}
                  onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='#f8fafb'}
                  onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=''}>
                  <td style={{padding:'14px 10px 14px 14px',verticalAlign:'top'}}>
                    <div style={{display:'flex',alignItems:'flex-start',gap:10}}>
                      <div style={{width:32,height:32,borderRadius:8,background:tabBg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:1}}>
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 2C5 2 2 5 2 8c0 2.2 1.2 4.1 3 5.2V11c0-1.7 1.3-3 3-3s3 1.3 3 3v2.2C12.8 12.1 14 10.2 14 8c0-3-2.5-6-6-6z" fill={tabCol} opacity=".7"/><circle cx="8" cy="8" r="2" fill={tabCol}/></svg>
                      </div>
                      <div>
                        <div style={{fontSize:13,fontWeight:600,color:'var(--tx1)',lineHeight:1.3}}>{r.name}</div>
                        <div style={{fontSize:10,color:'var(--tx3)',marginTop:3}}>{r.code} · {r.cat}</div>
                        <div style={{fontSize:10,color:'var(--tx3)',marginTop:1,fontStyle:'italic'}}>{r.method}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{padding:'14px 10px',verticalAlign:'top',minWidth:120}}>
                    <div style={{display:'flex',alignItems:'baseline',gap:5}}>
                      <span style={{fontSize:hasVal?16:13,fontWeight:700,fontFamily:'var(--fm)',color:hasVal?'var(--tx1)':'var(--tx3)'}}>{hasVal?r.current:'—'}</span>
                      <span style={{fontSize:10,color:'var(--tx3)',fontWeight:400}}>{r.unit}</span>
                    </div>
                    <div style={{marginTop:6,height:3,width:80,background:'var(--bdr2)',borderRadius:2,overflow:'hidden'}}>
                      <div style={{height:'100%',borderRadius:2,background:stCfg.dot,width:hasVal?'60%':'0%'}}/>
                    </div>
                  </td>
                  <td style={{padding:'14px 10px',verticalAlign:'top'}}>
                    <div style={{display:'flex',alignItems:'center',gap:4}}>
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="#94a3b8" strokeWidth="1.3"/><circle cx="8" cy="8" r="2.5" stroke="#94a3b8" strokeWidth="1.3"/></svg>
                      <span style={{fontSize:12,fontFamily:'var(--fm)',color:'var(--tx2)'}}>{r.target}</span>
                      <span style={{fontSize:10,color:'var(--tx3)'}}>{r.unit}</span>
                    </div>
                  </td>
                  <td style={{padding:'14px 10px',verticalAlign:'top'}}>
                    <span style={{fontSize:12,fontFamily:'var(--fm)',color:'var(--tx2)'}}>{r.ytd}</span>
                  </td>
                  <td style={{padding:'14px 10px',verticalAlign:'top'}}>
                    <div style={{display:'inline-flex',alignItems:'center',gap:5,background:stCfg.bg,borderRadius:20,padding:'4px 10px',border:`.5px solid ${stCfg.dot}30`}}>
                      <div style={{width:6,height:6,borderRadius:'50%',background:stCfg.dot}}/>
                      <span style={{fontSize:11,fontWeight:600,color:stCfg.col}}>{stCfg.label}</span>
                    </div>
                  </td>
                  <td style={{padding:'14px 10px',verticalAlign:'top'}}>
                    <div style={{display:'inline-flex',alignItems:'center',gap:5,background:srcCfg.bg,borderRadius:6,padding:'4px 9px',border:`.5px solid ${srcCfg.bg}`}}>
                      <div style={{width:7,height:7,borderRadius:'50%',background:srcCfg.col,flexShrink:0}}/>
                      <span style={{fontSize:11,fontWeight:600,color:srcCfg.col}}>{srcCfg.label}</span>
                    </div>
                  </td>
                  <td style={{padding:'14px 10px',verticalAlign:'top'}}>
                    <div style={{display:'flex',alignItems:'center',gap:4,fontSize:11,color:'var(--tx3)'}}>
                      <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="#94a3b8" strokeWidth="1.3"/><path d="M8 5v3l2 2" stroke="#94a3b8" strokeWidth="1.3" strokeLinecap="round"/></svg>
                      {r.updated !== '—' ? (
                        <div><div style={{fontSize:10}}>{r.updated.split(' ')[0]}</div><div style={{fontSize:10}}>{r.updated.split(' ')[1]||''}</div></div>
                      ) : <span style={{color:'var(--bdr)'}}>—</span>}
                    </div>
                  </td>
                  <td style={{padding:'14px 10px 14px 6px',verticalAlign:'top',whiteSpace:'nowrap'}}>
                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                      <button style={{display:'inline-flex',alignItems:'center',gap:4,background:'none',border:'.5px solid var(--bdr)',borderRadius:6,padding:'5px 9px',fontSize:11,fontWeight:500,color:'var(--tx2)',cursor:'pointer',whiteSpace:'nowrap'}}>
                        History
                      </button>
                      <button style={{display:'inline-flex',alignItems:'center',gap:4,background:'var(--t700)',border:'none',borderRadius:6,padding:'5px 10px',fontSize:11,fontWeight:600,color:'#fff',cursor:'pointer',whiteSpace:'nowrap'}}>
                        <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8h12" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
                        Log Data
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
