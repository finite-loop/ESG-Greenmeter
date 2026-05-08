"use client";
import { useState } from "react";
import { GOALS_DATA } from "../data";

type Props = { navigate:(s:any)=>void; RollupBar:any; rollupLevel:string; setRollupLevel:(l:string)=>void; [k:string]:any };

export default function GoalsScreen({ navigate, RollupBar, rollupLevel, setRollupLevel }: Props) {
  const [selGoal, setSelGoal] = useState(0);
  const [goalTab, setGoalTab] = useState(1);
  const g = GOALS_DATA[selGoal];
  const stColor = g.status==='on-track'?'var(--t700)':g.status==='at-risk'?'var(--amb)':'var(--red)';
  const stBg = g.status==='on-track'?'var(--t50)':g.status==='at-risk'?'var(--ambbg)':'var(--redbg)';
  const stLabel = g.status==='on-track'?'On track':g.status==='at-risk'?'At risk':'Critical';

  return (
    <div>
      <div className="ph">
        <div><div className="ptitle">Goals &amp; milestones</div><div className="psub">Long-term ESG targets · cascaded through rollup hierarchy · AI-forecast</div></div>
        <div className="ph-acts">
          <button className="btn-secondary" onClick={()=>navigate('reports')}>Link to report</button>
          <button className="btn-primary">+ New goal</button>
        </div>
      </div>
      <RollupBar active="organization" onSet={setRollupLevel}/>

      {/* Summary stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10,marginBottom:14}}>
        {([['Total goals','9','E, S, G pillars','var(--tx1)'],['On track','6','67% of portfolio','var(--t700)'],['At risk','2','Need intervention','var(--amb)'],['Critical','1','Significant gap','var(--red)'],['Milestones due','3','Next 90 days','var(--tx1)']] as [string,string,string,string][]).map(([l,v,s,c]) => (
          <div key={l} className="stat-card"><div className="slbl">{l}</div><div className="sval" style={{color:c}}>{v}</div><div className="ssub">{s}</div></div>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'280px 1fr',gap:12}}>
        {/* Goal list */}
        <div className="card" style={{height:'fit-content'}}>
          <div className="card-head"><div className="ctitle">All goals</div><span style={{fontSize:10,color:'var(--tx3)'}}>Click to expand</span></div>
          {GOALS_DATA.map((g2,idx) => (
            <div key={idx} onClick={()=>{setSelGoal(idx);setGoalTab(1);}} style={{padding:'11px 14px',borderBottom:'.5px solid var(--bdr2)',cursor:'pointer',background:idx===selGoal?'var(--t50)':'var(--surf)',borderLeft:`3px solid ${idx===selGoal?'var(--t700)':'transparent'}`,transition:'all .12s'}}
              onMouseEnter={e=>{if(idx!==selGoal)(e.currentTarget as HTMLElement).style.background='var(--bg)'}}
              onMouseLeave={e=>{if(idx!==selGoal)(e.currentTarget as HTMLElement).style.background='var(--surf)'}}>
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:8,marginBottom:6}}>
                <div style={{fontSize:12,fontWeight:idx===selGoal?700:500,color:'var(--tx1)',lineHeight:1.3}}>{g2.name}</div>
                <span className={`badge ${g2.status==='on-track'?'b-green':g2.status==='at-risk'?'b-amber':'b-red'}`} style={{fontSize:9,flexShrink:0}}>{g2.status==='on-track'?'On track':g2.status==='at-risk'?'At risk':'Critical'}</span>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <div className="pbar-bg" style={{flex:1,height:4}}><div className="pbar-fill" style={{width:`${g2.pct}%`,height:4,borderRadius:2,background:g2.status==='on-track'?'var(--t500)':g2.status==='at-risk'?'var(--amb)':'var(--red)'}}/></div>
                <span style={{fontSize:10,fontWeight:700,fontFamily:'var(--fm)',color:'var(--tx2)'}}>{g2.pct}%</span>
                <span className={`badge b-${g2.pillar==='E'?'e':g2.pillar==='S'?'s':'g'}`} style={{fontSize:9}}>{g2.pillar}</span>
              </div>
              <div style={{fontSize:10,color:'var(--tx3)',marginTop:4}}>{g2.owner} · Target: {g2.targetDate}</div>
            </div>
          ))}
        </div>

        {/* Goal detail */}
        <div>
          {/* Header card */}
          <div style={{background:'var(--surf)',border:'.5px solid var(--bdr)',borderRadius:12,overflow:'hidden',marginBottom:10}}>
            <div style={{background:stBg,borderBottom:'.5px solid var(--bdr)',padding:'14px 16px',display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12}}>
              <div style={{flex:1}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                  <span className={`badge b-${g.pillar==='E'?'e':g.pillar==='S'?'s':'g'}`}>{g.pillar} · {g.pillar==='E'?'Environment':g.pillar==='S'?'Social':'Governance'}</span>
                  <span className="badge" style={{background:`${stColor}18`,color:stColor,fontSize:9}}>{stLabel}</span>
                </div>
                <div style={{fontSize:16,fontWeight:700,color:'var(--tx1)'}}>{g.name}</div>
                <div style={{fontSize:11,color:'var(--tx2)',marginTop:4}}>{g.type} · Baseline: {g.baseline} ({g.baselineDate}) → Target: {g.target} by {g.targetDate}</div>
              </div>
              <div style={{textAlign:'right',flexShrink:0}}>
                <div style={{fontSize:28,fontWeight:700,fontFamily:'var(--fm)',color:stColor,lineHeight:1}}>{g.pct}%</div>
                <div style={{fontSize:10,color:'var(--tx3)'}}>of target achieved</div>
              </div>
            </div>
            {/* Meta */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',borderBottom:'.5px solid var(--bdr)'}}>
              {([['Overall owner',`${g.owner} · ${g.role}`],['Target date',g.targetDate],['Scope',g.scope[0]],['Standards',g.standards.join(' · ')]] as [string,string][]).map(([l,v]) => (
                <div key={l} style={{padding:'9px 14px',borderRight:'.5px solid var(--bdr2)'}}>
                  <div style={{fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'.06em',color:'var(--tx3)',marginBottom:2}}>{l}</div>
                  <div style={{fontSize:11,fontWeight:500,color:'var(--tx1)',lineHeight:1.4}}>{v}</div>
                </div>
              ))}
            </div>
            {/* Progress bar */}
            <div style={{padding:'10px 16px',display:'flex',alignItems:'center',gap:12}}>
              <div style={{fontSize:10,color:'var(--tx3)',flexShrink:0}}>{g.baseline}</div>
              <div style={{flex:1,height:8,background:'var(--bdr2)',borderRadius:4,overflow:'hidden'}}>
                <div style={{height:'100%',borderRadius:4,background:stColor,width:`${g.pct}%`,transition:'width .4s'}}/>
              </div>
              <div style={{fontSize:10,color:'var(--tx3)',flexShrink:0}}>{g.target}</div>
              <div style={{fontSize:10,background:'var(--t50)',color:'var(--t700)',borderRadius:5,padding:'3px 8px',fontWeight:500,flexShrink:0}}>🤖 {g.aiNote.split('.')[0]}</div>
            </div>
          </div>

          {/* 3-part tabs */}
          <div style={{display:'flex',gap:0,border:'.5px solid var(--bdr)',borderRadius:9,overflow:'hidden',marginBottom:10,background:'var(--surf)'}}>
            {([[1,'Part 1','Goal definition'],[2,'Part 2','Parameters & KPIs'],[3,'Part 3','Milestones & owners']] as [number,string,string][]).map(([n,lbl,sub]) => (
              <div key={n} onClick={()=>setGoalTab(n)} style={{flex:1,padding:'9px 12px',textAlign:'center',cursor:'pointer',background:goalTab===n?'var(--t50)':'var(--surf)',borderRight:n<3?'.5px solid var(--bdr)':'none',transition:'background .12s'}}>
                <div style={{fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'.06em',color:goalTab===n?'var(--t700)':'var(--tx3)',marginBottom:1}}>{lbl}</div>
                <div style={{fontSize:12,fontWeight:goalTab===n?700:500,color:goalTab===n?'var(--t800)':'var(--tx2)'}}>{sub}</div>
              </div>
            ))}
          </div>

          {/* Part 1: Definition */}
          {goalTab===1 && (
            <div className="card">
              <div className="card-head"><div><div className="ctitle">Goal definition</div><div className="csub">Core goal attributes · owner · scope · standards alignment</div></div><button className="btn-secondary" style={{fontSize:11}}>Edit goal</button></div>
              <div className="cbody">
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
                  {([['Goal name',g.name],['Type',g.type],['ESG pillar',g.pillar==='E'?'Environment':g.pillar==='S'?'Social':'Governance'],['Overall owner',`${g.owner} — ${g.role}`],['Baseline',`${g.baseline} (${g.baselineDate})`],['Target',g.target],['Target date',g.targetDate],['Review frequency','Annual checkpoint + quarterly tracking']] as [string,string][]).map(([l,v]) => (
                    <div key={l}><div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'.06em',color:'var(--tx3)',marginBottom:3}}>{l}</div><div style={{fontSize:13,fontWeight:500,color:'var(--tx1)'}}>{v}</div></div>
                  ))}
                </div>
                <div style={{borderTop:'.5px solid var(--bdr2)',paddingTop:12,marginBottom:12}}>
                  <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'.06em',color:'var(--tx3)',marginBottom:8}}>Scope — applies to</div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                    {['Larsen & Toubro Ltd','L&T Electrical & Automation Ltd','L&T Machinery Ltd','Plant — Pune','Plant — Nashik','Plant — Aurangabad'].map(e => (
                      <span key={e} style={{padding:'4px 10px',borderRadius:20,fontSize:11,fontWeight:500,background:'var(--t50)',color:'var(--t800)',border:'.5px solid var(--t200)'}}>{e}</span>
                    ))}
                  </div>
                </div>
                <div style={{borderTop:'.5px solid var(--bdr2)',paddingTop:12}}>
                  <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'.06em',color:'var(--tx3)',marginBottom:8}}>Standards alignment</div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                    {g.standards.map(s => <span key={s} className="badge b-teal" style={{fontSize:11}}>{s}</span>)}
                  </div>
                </div>
                <div style={{marginTop:12,padding:'10px 12px',background:'var(--t50)',borderRadius:8,fontSize:11,color:'var(--t800)',border:'.5px solid var(--t200)'}}>
                  <strong>🤖 AI forecast:</strong> {g.aiNote}
                </div>
              </div>
            </div>
          )}

          {/* Part 2: Parameters */}
          {goalTab===2 && (
            <div className="card">
              <div className="card-head"><div><div className="ctitle">Parameters &amp; KPIs</div><div className="csub">{g.params.length} parameters tracking progress toward this goal</div></div><button className="btn-secondary" style={{fontSize:11}}>Edit parameters</button></div>
              <table className="tbl">
                <thead><tr><th>Parameter</th><th>Current value</th><th>Target</th><th>Progress</th><th>Status</th></tr></thead>
                <tbody>
                  {g.params.map(p => (
                    <tr key={p.name} onClick={()=>navigate('console')} style={{cursor:'pointer'}}>
                      <td style={{fontWeight:500}}>{p.name}<div style={{fontSize:9,color:'var(--tx3)',fontFamily:'var(--fm)'}}>{p.unit}</div></td>
                      <td style={{fontFamily:'var(--fm)',fontWeight:600}}>{p.current}</td>
                      <td style={{fontFamily:'var(--fm)',color:'var(--tx3)'}}>{p.target}</td>
                      <td style={{minWidth:100}}>
                        <div style={{display:'flex',alignItems:'center',gap:7}}>
                          <div className="pbar-bg" style={{flex:1,height:5}}><div className="pbar-fill" style={{width:`${p.pct}%`,height:5,borderRadius:'2.5px',background:p.st==='on-track'?'var(--t500)':p.st==='at-risk'?'var(--amb)':p.st==='critical'?'var(--red)':'var(--bdr)'}}/></div>
                          <span style={{fontSize:10,fontFamily:'var(--fm)',fontWeight:600,color:'var(--tx2)'}}>{p.pct}%</span>
                        </div>
                      </td>
                      <td><span className={`badge ${p.st==='on-track'?'b-green':p.st==='at-risk'?'b-amber':p.st==='critical'?'b-red':'b-gray'}`}>{p.st==='on-track'?'On track':p.st==='at-risk'?'At risk':p.st==='critical'?'Critical':p.st==='pending'?'Pending':'—'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{padding:'10px 14px',borderTop:'.5px solid var(--bdr2)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <span style={{fontSize:11,color:'var(--tx3)'}}>Data updates quarterly · last synced from platform data</span>
                <button className="btn-ghost" style={{fontSize:11}} onClick={()=>navigate('console')}>Enter data →</button>
              </div>
            </div>
          )}

          {/* Part 3: Milestones */}
          {goalTab===3 && (
            <div className="card">
              <div className="card-head"><div><div className="ctitle">Milestones &amp; owners</div><div className="csub">{g.milestones.length} milestones · {g.milestones.filter(m=>m.st==='done').length} completed</div></div><button className="btn-secondary" style={{fontSize:11}}>Edit milestones</button></div>
              <div style={{padding:14,position:'relative'}}>
                <div style={{position:'absolute',left:32,top:24,bottom:24,width:'1.5px',background:'linear-gradient(to bottom,var(--t300),var(--bdr2))'}}/>
                <div style={{display:'flex',flexDirection:'column',gap:0}}>
                  {g.milestones.map((m,idx) => (
                    <div key={idx} style={{display:'flex',gap:14,alignItems:'flex-start',padding:'10px 0',borderBottom:idx<g.milestones.length-1?'.5px solid var(--bdr2)':'none'}}>
                      <div style={{flexShrink:0,width:18,height:18,borderRadius:'50%',border:`2px solid ${m.st==='done'?'var(--grn)':m.st==='in-progress'?'var(--t500)':'var(--bdr)'}`,background:m.st==='done'?'var(--grn)':m.st==='in-progress'?'var(--t50)':'var(--surf)',display:'flex',alignItems:'center',justifyContent:'center',marginTop:2,zIndex:1,position:'relative'}}>
                        {m.st==='done' ? <svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        : m.st==='in-progress' ? <div style={{width:6,height:6,borderRadius:'50%',background:'var(--t500)'}}/>
                        : <div style={{width:6,height:6,borderRadius:'50%',background:'var(--bdr)'}}/>}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:10,marginBottom:4}}>
                          <div>
                            <div style={{fontSize:10,fontFamily:'var(--fm)',fontWeight:600,color:'var(--tx3)',marginBottom:2}}>{m.date}</div>
                            <div style={{fontSize:12,fontWeight:500,color:'var(--tx1)',lineHeight:1.4}}>{m.desc}</div>
                          </div>
                          <span className={`badge ${m.st==='done'?'b-green':m.st==='in-progress'?'b-teal':'b-gray'}`} style={{fontSize:9,flexShrink:0}}>{m.st==='done'?'Done':m.st==='in-progress'?'In progress':'Pending'}</span>
                        </div>
                        <div style={{display:'flex',alignItems:'center',gap:10,marginTop:4}}>
                          <div style={{width:20,height:20,borderRadius:'50%',background:'var(--t700)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,color:'#fff',flexShrink:0}}>{m.owner.split(' ').map((w:string)=>w[0]).join('').slice(0,2)}</div>
                          <span style={{fontSize:11,color:'var(--tx2)'}}>{m.owner}</span>
                          {m.evidence !== '—' ? <span style={{fontSize:10,background:'var(--grnbg)',color:'var(--grntx)',padding:'1px 6px',borderRadius:4,fontWeight:500}}>📎 {m.evidence}</span> : <span style={{fontSize:10,color:'var(--tx3)'}}>No evidence yet</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{padding:'10px 14px',borderTop:'.5px solid var(--bdr2)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <span style={{fontSize:10,background:'var(--t50)',color:'var(--t700)',borderRadius:5,padding:'4px 9px',fontWeight:500}}>🤖 {g.aiNote}</span>
                <button className="btn-ghost" style={{fontSize:11}}>+ Add milestone</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
