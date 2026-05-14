"use client";
import { useEffect, useRef } from "react";
import { STD_META, STD_PARAMS } from "../data";
import { InsightPanel } from "@/components/dashboard/InsightPanel";

type Props = {
  navigate: (s: any) => void;
  rollupLevel: string;
  setRollupLevel: (l: string) => void;
  dashStd: string;
  setDashStd: (s: string) => void;
  RollupBar: any;
};

export default function DashboardScreen({ navigate, rollupLevel, setRollupLevel, dashStd, setDashStd, RollupBar }: Props) {
  const trendRef = useRef<HTMLCanvasElement>(null);
  const donutRef = useRef<HTMLCanvasElement>(null);
  const std = dashStd;
  const sm = STD_META[std];
  const params = STD_PARAMS[std];

  useEffect(() => {
    let trendChart: any, donutChart: any;
    const loadCharts = async () => {
      const { Chart, registerables } = await import('chart.js');
      Chart.register(...registerables);
      if (trendRef.current) {
        trendChart = new Chart(trendRef.current, {
          type:'bar',
          data:{
            labels:['FY20','FY21','FY22','FY23','FY24'],
            datasets:[
              {label:'Scope 1',data:[98,91,87,82,74],backgroundColor:'#0f766e',borderRadius:4,barPercentage:.55,categoryPercentage:.7},
              {label:'Scope 2',data:[84,79,80,75,68],backgroundColor:'#5eead4',borderRadius:4,barPercentage:.55,categoryPercentage:.7}
            ]
          },
          options:{
            responsive:true,maintainAspectRatio:false,
            plugins:{
              legend:{display:true,position:'top',align:'end',labels:{font:{family:'DM Sans',size:10},color:'#94a3b8',boxWidth:10,boxHeight:10,padding:8}},
              tooltip:{backgroundColor:'#0f172a',cornerRadius:6,bodyFont:{family:'DM Mono',size:11}}
            },
            scales:{
              x:{stacked:true,grid:{display:false},border:{display:false},ticks:{font:{family:'DM Sans',size:10},color:'#94a3b8'}},
              y:{stacked:true,grid:{color:'#f3f4f6',lineWidth:.5},border:{display:false},ticks:{font:{family:'DM Mono',size:10},color:'#94a3b8',callback:(v:any)=>v+'k'}}
            }
          }
        });
      }
      if (donutRef.current) {
        donutChart = new Chart(donutRef.current, {
          type:'doughnut',
          data:{
            labels:['BRSR','GRI','ESRS','IFRS'],
            datasets:[{data:[45,38,32,28],backgroundColor:['#ef4444','#14b8a6','#f59e0b','#6366f1'],borderWidth:0,borderRadius:3}]
          },
          options:{responsive:false,cutout:'62%',plugins:{legend:{display:false},tooltip:{enabled:false}}}
        });
      }
    };
    loadCharts();
    return () => { trendChart?.destroy(); donutChart?.destroy(); };
  }, []);

  const stColor = (s:string) => s==='green'?'var(--grn)':s==='red'?'var(--red)':'var(--amb)';
  const stLabel = (s:string) => s==='green'?'On track':s==='red'?'Below':'Review';
  const stClass = (s:string) => s==='green'?'b-green':s==='red'?'b-red':'b-amber';

  return (
    <div>
      <div className="ph">
        <div>
          <div className="ptitle">ESG Overview</div>
          <div className="psub">Your organisation · FY 2023–24 · viewing against: <strong style={{color:sm.color}}>{sm.label}</strong></div>
        </div>
        <div className="ph-acts">
          <div style={{fontSize:11,border:'.5px solid var(--bdr)',borderRadius:6,padding:'5px 10px',color:'var(--tx2)',background:'var(--surf)',cursor:'pointer',display:'flex',alignItems:'center',gap:5}}>📅 Apr 2023 – Mar 2024 ▾</div>
          <button className="btn-secondary" onClick={()=>navigate('analytics')}>Analytics</button>
          <button className="btn-primary" onClick={()=>navigate('reports')}>Generate report</button>
        </div>
      </div>

      <RollupBar active={rollupLevel} onSet={setRollupLevel}/>

      {/* Standard filter bar */}
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12,background:'var(--surf)',border:'.5px solid var(--bdr)',borderRadius:10,padding:'10px 14px'}}>
        <span style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'.07em',color:'var(--tx3)',flexShrink:0}}>Filter by standard:</span>
        {Object.entries(STD_META).map(([k,m]) => (
          <button key={k} onClick={()=>setDashStd(k)} style={{
            display:'inline-flex',alignItems:'center',gap:5,padding:'5px 11px',borderRadius:20,fontSize:11,fontWeight:600,cursor:'pointer',transition:'all .15s',
            border:`1.5px solid ${k===std?m.color:'var(--bdr)'}`,
            background:k===std?m.bg:'transparent',
            color:k===std?m.color:'var(--tx2)'
          }}>
            <div style={{width:7,height:7,borderRadius:'50%',background:m.color,flexShrink:0}}/>
            {m.label}
            <span style={{fontSize:9,fontWeight:700,background:k===std?m.color+'22':'var(--bdr2)',color:k===std?m.color:'var(--tx3)',padding:'1px 5px',borderRadius:3,marginLeft:2}}>{m.params}</span>
          </button>
        ))}
      </div>

      {/* Score strip */}
      <div style={{display:'grid',gridTemplateColumns:'200px repeat(3,1fr) 1fr',gap:10,marginBottom:12}}>
        <div style={{background:'var(--t900)',borderRadius:12,padding:15,color:'#fff',display:'flex',flexDirection:'column',justifyContent:'space-between'}}>
          <div>
            <div style={{fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'.07em',color:'var(--t300)',marginBottom:4}}>ESG Score</div>
            <div style={{fontSize:40,fontWeight:700,fontFamily:'var(--fm)',lineHeight:1}}>72</div>
            <div style={{fontSize:10,color:'var(--t400)',marginTop:2}}>out of 100</div>
          </div>
          <div style={{display:'inline-flex',alignItems:'center',background:'rgba(255,255,255,.1)',borderRadius:5,padding:'2px 8px',fontSize:10,color:'var(--t200)',marginTop:8,width:'fit-content'}}>↑ +4 pts vs FY23</div>
        </div>
        {([['E · Environment','Climate & resources','68','↑ +6','#14b8a6',63.8],['S · Social','People & community','79','↑ +2','#6366f1',74.6],['G · Governance','Ethics & oversight','71','↓ −1','#f59e0b',66.9]] as [string,string,string,string,string,number][]).map(([lbl,nm,val,trend,hex,dash]) => (
          <div key={lbl} style={{background:'var(--surf)',border:'.5px solid var(--bdr)',borderRadius:12,padding:13,position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:hex}}/>
            <div style={{fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'.07em',color:'var(--tx3)'}}>{lbl}</div>
            <div style={{fontSize:11,fontWeight:600,color:'var(--tx1)',margin:'2px 0 6px'}}>{nm}</div>
            <div style={{fontSize:26,fontWeight:700,fontFamily:'var(--fm)',color:hex}}>{val}</div>
            <div style={{fontSize:10,color:'var(--tx3)',marginTop:2}}>{trend} vs prior year</div>
            <svg style={{position:'absolute',bottom:10,right:12,width:36,height:36}} viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15" fill="none" stroke="#f3f4f6" strokeWidth="3"/>
              <circle cx="18" cy="18" r="15" fill="none" stroke={hex} strokeWidth="3" strokeDasharray={`${dash} 94.2`} strokeDashoffset="23.6" strokeLinecap="round"/>
            </svg>
          </div>
        ))}
        {/* Frameworks donut */}
        <div style={{background:'var(--surf)',border:'.5px solid var(--bdr)',borderRadius:12,padding:13,overflow:'hidden'}}>
          <div style={{fontSize:11,fontWeight:600,color:'var(--tx1)',marginBottom:2}}>Reporting frameworks</div>
          <div style={{fontSize:10,color:'var(--tx3)',marginBottom:10}}>Active parameter coverage</div>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
            <div style={{position:'relative',width:68,height:68,flexShrink:0}}>
              <canvas ref={donutRef} width={68} height={68}/>
              <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
                <div style={{fontSize:15,fontWeight:700,fontFamily:'var(--fm)',color:'var(--tx1)',lineHeight:1}}>{sm.params}</div>
                <div style={{fontSize:8,color:'var(--tx3)'}}>total</div>
              </div>
            </div>
            <div style={{flex:1,display:'flex',flexDirection:'column',gap:5}}>
              {([['BRSR','#ef4444',45,38],['GRI','#14b8a6',38,34],['ESRS','#f59e0b',32,25]] as [string,string,number,number][]).map(([name,col,total,done]) => (
                <div key={name} style={{display:'flex',alignItems:'center',gap:5}}>
                  <div style={{width:7,height:7,borderRadius:'50%',background:col,flexShrink:0}}/>
                  <span style={{fontSize:10,color:'var(--tx2)',width:30}}>{name}</span>
                  <div style={{flex:1,height:4,background:'var(--bdr2)',borderRadius:2,overflow:'hidden'}}>
                    <div style={{height:'100%',borderRadius:2,background:col,width:`${Math.round(done/total*100)}%`}}/>
                  </div>
                  <span style={{fontSize:10,fontWeight:700,fontFamily:'var(--fm)',color:'var(--tx1)',minWidth:18,textAlign:'right'}}>{done}</span>
                  <div style={{width:7,height:7,borderRadius:'50%',background:'var(--grn)'}}/>
                </div>
              ))}
            </div>
          </div>
          <button onClick={()=>navigate('reports')} style={{width:'100%',border:'.5px solid var(--bdr)',background:'var(--surf)',borderRadius:7,padding:6,fontSize:11,fontWeight:500,cursor:'pointer',color:'var(--tx1)',display:'flex',alignItems:'center',justifyContent:'center',gap:5}}>View Report Builder →</button>
        </div>
      </div>

      {/* Peer strip */}
      <div style={{background:'var(--surf)',border:'.5px solid var(--bdr)',borderRadius:12,marginBottom:12,overflow:'hidden'}}>
        <div className="card-head">
          <div>
            <div className="ctitle">Peer benchmark</div>
            <div className="csub">47 reports ingested · Indian manufacturing · filtered to {sm.label}</div>
          </div>
          <span className="badge b-teal" style={{fontSize:9,cursor:'pointer'}}>● Live corpus</span>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)'}}>
          {([['GHG intensity','4.2','4.8 sector','13% better','t/cr',false],['Water intensity','31','28 sector','9% below','kL/cr',true],['Women in mgmt','28%','24% sector','4pp above','',false],['Renewable energy','18%','31% sector','13pp below','',true],['ESG disclosure','84%','71% sector','Top quartile','',false]] as [string,string,string,string,string,boolean][]).map(([l,o,p,d,u,isBad]) => (
            <div key={l} style={{padding:'9px 13px',borderRight:'.5px solid var(--bdr2)'}}>
              <div style={{fontSize:9,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'.05em',fontWeight:600,marginBottom:3}}>{l}</div>
              <div><span style={{fontSize:15,fontWeight:700,fontFamily:'var(--fm)'}}>{o}</span><span style={{fontSize:10,color:'var(--tx3)',marginLeft:4}}>{u} · {p}</span></div>
              <div style={{fontSize:10,fontWeight:600,marginTop:1,color:isBad?'var(--red)':'var(--grn)'}}>{isBad?'↓':'↑'} {d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Mid row */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 290px',gap:12,marginBottom:12}}>
        {/* GHG trend */}
        <div className="card">
          <div className="card-head">
            <div><div className="ctitle">GHG trend</div><div className="csub">Scope 1+2 · tCO2e</div></div>
            <span className="badge b-e">E</span>
          </div>
          <div className="chart-wrap"><canvas ref={trendRef}/></div>
        </div>

        {/* Key params */}
        <div className="card">
          <div className="card-head">
            <div><div className="ctitle">Key parameters</div><div className="csub">{sm.label} · current period vs benchmark</div></div>
            <div style={{display:'flex',gap:4}}>
              <span className="badge b-e" style={{cursor:'pointer'}}>E</span>
              <span className="badge b-gray" style={{cursor:'pointer'}} onClick={()=>navigate('console')}>S</span>
              <span className="badge b-gray" style={{cursor:'pointer'}}>G</span>
            </div>
          </div>
          <table className="tbl">
            <thead><tr><th>Parameter</th><th>Value</th><th>Benchmark</th><th>Status</th></tr></thead>
            <tbody>
              {params.map(([n,v,b,s]) => (
                <tr key={n} onClick={()=>navigate('console')} style={{cursor:'pointer'}}>
                  <td style={{fontWeight:500}}>{n}</td>
                  <td style={{fontFamily:'var(--fm)'}}>{v}</td>
                  <td style={{color:'var(--tx3)'}}>{b}</td>
                  <td><span className={`badge ${stClass(s)}`}>{stLabel(s)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* AI Recommendations */}
        <div className="card">
          <div className="card-head">
            <div><div className="ctitle">AI recommendations</div><div className="csub">3 high · 4 medium</div></div>
            <span style={{fontSize:11,color:'var(--t700)',cursor:'pointer'}} onClick={()=>navigate('analytics')}>All →</span>
          </div>
          {([
            ['high','Switch Plant 3 to renewable tariff — closes 8% Scope 2','est. ₹12L/yr','e'],
            ['high','Water reuse 4% below median — 3 peers use closed-loop','high impact','e'],
            ['high','BRSR Core due in 47 days — 12 sections in draft','deadline','amber'],
            ['med','Board diversity 22% — SEBI recommends ≥33%','compliance','g'],
            ['med','14 of 38 suppliers missing Scope 3 data','data gap','e'],
          ] as [string,string,string,string][]).map(([p,t,m,tag]) => (
            <div key={t} className="ai-item" onClick={()=>navigate(tag==='amber'?'reports':'console')}>
              <div className="ai-dot" style={{background:p==='high'?'var(--t500)':'var(--amb)'}}/>
              <div style={{flex:1}}>
                <div className="ai-title">{t}</div>
                <div className="ai-meta">
                  <span>{m}</span>
                  <span className={`badge b-${tag}`} style={{fontSize:9}}>{tag.toUpperCase()}</span>
                </div>
              </div>
              <span style={{color:'var(--tx3)'}}>›</span>
            </div>
          ))}
        </div>
      </div>

      {/* Standard coverage panel */}
      {std !== 'all' && (
        <div style={{background:sm.bg,border:`1px solid ${sm.color}22`,borderRadius:12,padding:'14px 16px',marginBottom:12,display:'flex',alignItems:'center',gap:20}}>
          <div style={{flexShrink:0,width:44,height:44,borderRadius:'50%',background:`${sm.color}18`,border:`2px solid ${sm.color}33`,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 2L3 6v6c0 3.5 3 6.5 7 7 4-.5 7-3.5 7-7V6L10 2z" stroke={sm.color} strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M7 10l2.5 2.5L13 8" stroke={sm.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:700,color:sm.color}}>{sm.label} — coverage summary</div>
            <div style={{fontSize:11,color:'var(--tx2)',marginTop:2}}>{sm.covered} of {sm.params} parameters disclosed · {sm.sections} reporting sections · <span style={{color:sm.color,fontWeight:600}}>{Math.round(sm.covered/sm.params*100)}% complete</span></div>
          </div>
          <div style={{display:'flex',gap:10,flexShrink:0}}>
            {([['Disclosed',sm.covered,sm.color],['Pending',sm.params-sm.covered,'var(--amb)'],['Sections',sm.sections,'var(--tx1)']] as [string,number,string][]).map(([l,v,c]) => (
              <div key={l} style={{textAlign:'center'}}>
                <div style={{fontSize:20,fontWeight:700,fontFamily:'var(--fm)',color:c}}>{v}</div>
                <div style={{fontSize:9,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'.05em'}}>{l}</div>
              </div>
            ))}
          </div>
          <button onClick={()=>navigate('reports')} className="btn-primary" style={{background:sm.color,flexShrink:0}}>View {sm.label} report →</button>
        </div>
      )}

      {/* Standards & compliance — per-standard breakdown with entity lists */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:12}}>
        {(['brsr','gri','esrs','ifrs'] as const).map(k => {
          const m = STD_META[k];
          const pct = Math.round(m.covered / m.params * 100);
          const r = 20; const circ = 2 * Math.PI * r;
          const entities: Record<string,{name:string;level:string;badge:string}[]> = {
            brsr:[
              {name:'Organisation (Group)',level:'Org',badge:'dark'},
              {name:'Electrical Division',level:'Subsidiary',badge:'teal'},
              {name:'Machinery Division',level:'Subsidiary',badge:'teal'},
              {name:'Plant — Site A',level:'Facility',badge:'ind'},
              {name:'Plant — Site B',level:'Facility',badge:'ind'},
              {name:'Plant — Site C',level:'Facility',badge:'ind'},
            ],
            gri:[
              {name:'Organisation (Group)',level:'Org',badge:'dark'},
              {name:'Electrical Division',level:'Subsidiary',badge:'teal'},
              {name:'Machinery Division',level:'Subsidiary',badge:'teal'},
              {name:'Plant — Site A',level:'Facility',badge:'ind'},
              {name:'Plant — Site C',level:'Facility',badge:'ind'},
            ],
            esrs:[
              {name:'Organisation (Group)',level:'Org',badge:'dark'},
              {name:'Electrical Division',level:'Subsidiary',badge:'teal'},
              {name:'Plant — Site A',level:'Facility',badge:'ind'},
            ],
            ifrs:[
              {name:'Organisation (Group)',level:'Org',badge:'dark'},
              {name:'Electrical Division',level:'Subsidiary',badge:'teal'},
              {name:'Machinery Division',level:'Subsidiary',badge:'teal'},
            ],
          };
          const ents = entities[k];
          return (
            <div key={k} className="card" style={{padding:0,overflow:'hidden'}}>
              <div style={{padding:'14px 14px 10px',borderBottom:'.5px solid var(--bdr2)'}}>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <div style={{position:'relative',width:52,height:52,flexShrink:0}}>
                    <svg viewBox="0 0 52 52" width="52" height="52" style={{transform:'rotate(-90deg)'}}>
                      <circle cx="26" cy="26" r={r} fill="none" stroke="#f3f4f6" strokeWidth="4"/>
                      <circle cx="26" cy="26" r={r} fill="none" stroke={m.color} strokeWidth="4" strokeDasharray={`${Math.round(circ*pct/100)} ${Math.round(circ)}`} strokeLinecap="round"/>
                    </svg>
                    <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
                      <div style={{fontSize:13,fontWeight:700,fontFamily:'var(--fm)',color:m.color}}>{pct}%</div>
                    </div>
                  </div>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:'var(--tx1)'}}>{m.label}</div>
                    <div style={{fontSize:10,color:'var(--tx3)',marginTop:2}}>{m.covered}/{m.params} params · {m.sections} sections</div>
                    <div style={{display:'flex',alignItems:'center',gap:4,marginTop:3}}>
                      <div className="pbar-bg" style={{width:60,height:4}}><div className="pbar-fill" style={{width:`${pct}%`,height:4,background:m.color}}/></div>
                      <span style={{fontSize:9,fontFamily:'var(--fm)',color:'var(--tx3)'}}>{pct}%</span>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{padding:'8px 14px 12px'}}>
                <div style={{fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'.07em',color:'var(--tx3)',marginBottom:6}}>Reporting entities ({ents.length})</div>
                {ents.map(e => (
                  <div key={e.name} style={{display:'flex',alignItems:'center',gap:6,padding:'5px 0',borderBottom:'.5px solid var(--bdr2)'}}>
                    <div style={{width:6,height:6,borderRadius:'50%',background:m.color,flexShrink:0}}/>
                    <span style={{fontSize:11,fontWeight:500,color:'var(--tx1)',flex:1}}>{e.name}</span>
                    <span className={`badge b-${e.badge}`} style={{fontSize:8}}>{e.level}</span>
                  </div>
                ))}
              </div>
              <div style={{padding:'6px 14px 12px'}}>
                <button onClick={()=>navigate('reports')} style={{width:'100%',border:'.5px solid var(--bdr)',background:'var(--surf)',borderRadius:7,padding:6,fontSize:10,fontWeight:500,cursor:'pointer',color:m.color,display:'flex',alignItems:'center',justifyContent:'center',gap:4}}>
                  View {m.label} report →
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Insight briefing */}
      <div style={{marginBottom:12}}>
        <InsightPanel />
      </div>

      {/* Bottom row */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        {/* Goals snapshot */}
        <div className="card">
          <div className="card-head">
            <div><div className="ctitle">Goals snapshot</div><div className="csub">6 on track · 2 at risk · 1 critical</div></div>
            <span style={{fontSize:11,color:'var(--t700)',cursor:'pointer'}} onClick={()=>navigate('goals')}>Manage →</span>
          </div>
          {([['Net zero Scope 1+2','2035',62,'teal'],['50% renewable energy','2030',36,'amb'],['Zero waste to landfill','2027',78,'teal'],['40% women in workforce','2027',24,'red']] as [string,string,number,string][]).map(([n,y,p,c]) => (
            <div key={n} style={{padding:'10px 14px',borderBottom:'.5px solid var(--bdr2)',cursor:'pointer'}} onClick={()=>navigate('goals')}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                <span style={{fontSize:12,fontWeight:500}}>{n}</span>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:10,color:'var(--tx3)'}}>{y}</div>
                  <div style={{fontSize:10,fontWeight:600,color:c==='teal'?'var(--t700)':c==='amb'?'var(--amb)':'var(--red)'}}>{c==='teal'?'On track':c==='amb'?'At risk':'Critical'}</div>
                </div>
              </div>
              <div className="pbar-bg"><div className="pbar-fill" style={{width:`${p}%`,background:c==='teal'?'var(--t500)':c==='amb'?'var(--amb)':'var(--red)'}}/></div>
              <div style={{fontSize:10,color:'var(--tx3)',marginTop:2,fontFamily:'var(--fm)'}}>{p}%</div>
            </div>
          ))}
        </div>

        {/* Alerts */}
        <div className="card">
          <div className="card-head">
            <div><div className="ctitle">Alerts &amp; anomalies</div><div className="csub">2 need action</div></div>
          </div>
          {([
            ['red','Plant 2 energy +34% vs prior month','Anomaly · blocks BRSR §3','2h ago'],
            ['red','Vendor reported 0 tCO2e Scope 1','Implausible · verification sent','Yesterday'],
            ['amb','Board diversity data missing Q3','HR sync incomplete','2d ago'],
            ['amb','SEBI BRSR expanded to top 1000','9 new KPIs added','3d ago'],
            ['t500','12 peer reports ingested','Benchmarks updated','4d ago'],
          ] as [string,string,string,string][]).map(([c,t,s,time]) => (
            <div key={t} className="ai-item">
              <div className="ai-dot" style={{background:`var(--${c})`}}/>
              <div style={{flex:1}}>
                <div className="ai-title">{t}</div>
                <div className="ai-meta">{s}</div>
              </div>
              <div style={{fontSize:10,color:'var(--tx3)',whiteSpace:'nowrap'}}>{time}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
