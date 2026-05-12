"use client";
import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useMds } from "@/hooks/useMds";
import { useCorrelations } from "@/hooks/useCorrelations";
import BenchmarkView from "@/components/analytics/BenchmarkView";
import CorrelationMatrix from "@/components/analytics/CorrelationMatrix";

const MdsScatterPlot = dynamic(() => import("@/components/charts/MdsScatterPlot"), { ssr: false });

type Props = { navigate:(s:any)=>void; RollupBar:any; rollupLevel:string; setRollupLevel:(l:string)=>void; [k:string]:any };

const ANA_TABS = [
  ['trends','Trends & KPIs'],['peer','Peer benchmarking'],['rollup','Rollup drill-down'],
  ['forecast','Forecasting'],['correlation','Correlations'],['anomaly','Anomaly detection'],
];

export default function AnalyticsScreen({ navigate, RollupBar, rollupLevel, setRollupLevel }: Props) {
  const [tab, setTab] = useState('peer');

  return (
    <div>
      <div className="ph">
        <div><div className="ptitle">Analytics &amp; intelligence</div><div className="psub">Multi-year trends · peer benchmarking · forecasting · anomaly detection · correlation · rollup drill-down</div></div>
        <div className="ph-acts">
          <button className="btn-secondary">Export</button>
          <button className="btn-primary" onClick={()=>navigate('reports')}>Build report →</button>
        </div>
      </div>
      <RollupBar active="organization" onSet={setRollupLevel}/>

      {/* NL Query bar */}
      <div style={{background:'var(--surf)',border:'.5px solid var(--bdr)',borderRadius:10,padding:'12px 14px',marginBottom:14}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
          <div style={{width:24,height:24,background:'var(--t700)',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M13 8A5 5 0 113 8a5 5 0 0110 0zM8 5v3l2 2" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <input style={{flex:1,border:'none',outline:'none',fontSize:13,background:'transparent',color:'var(--tx1)'}} placeholder="Ask anything about your ESG data — queries run across internal data + peer corpus…"/>
          <button className="btn-primary" style={{padding:'5px 12px',fontSize:11}}>Ask AI</button>
        </div>
        <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
          {['How does our water intensity compare to sector peers over 3 years?','Which subsidiary contributes most to our Scope 1 emissions?','Show correlation between energy intensity and GHG intensity','Forecast our GHG trajectory to 2035 at current pace'].map(q => (
            <span key={q} style={{fontSize:10,padding:'3px 9px',background:'var(--bg)',border:'.5px solid var(--bdr)',borderRadius:20,cursor:'pointer',color:'var(--tx2)',transition:'all .12s'}}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background='var(--t50)';(e.currentTarget as HTMLElement).style.color='var(--t700)'}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='var(--bg)';(e.currentTarget as HTMLElement).style.color='var(--tx2)'}}>{q}</span>
          ))}
        </div>
      </div>

      {/* KPI summary strip */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:8,marginBottom:14}}>
        {([['GHG Scope 1+2','142k','tCO2e','↓ 9.4%',true,'FY23: 156k'],['Energy intensity','4.12','GJ/₹cr','↓ 4.2%',true,'FY23: 4.30'],['Water intensity','31','kL/₹cr','↑ 2.1%',false,'FY23: 30.4'],['ESG score','72','/100','↑ +4 pts',true,'FY23: 68'],['Renewable mix','18','%','↑ +2pp',true,'FY23: 16%'],['Women in mgmt','22','%','↑ +1pp',true,'FY23: 21%']] as [string,string,string,string,boolean,string][]).map(([l,v,u,t,good,sub]) => (
          <div key={l} style={{background:'var(--surf)',border:'.5px solid var(--bdr)',borderRadius:10,padding:'11px 12px'}}>
            <div style={{fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'.07em',color:'var(--tx3)',marginBottom:3}}>{l}</div>
            <div style={{fontSize:18,fontWeight:700,fontFamily:'var(--fm)',color:'var(--tx1)',lineHeight:1}}>{v}<span style={{fontSize:10,fontWeight:400,color:'var(--tx3)',marginLeft:2}}>{u}</span></div>
            <div style={{fontSize:10,marginTop:3}}><span style={{fontWeight:600,color:good?'var(--grn)':'var(--red)'}}>{t}</span> <span style={{color:'var(--tx3)'}}>{sub}</span></div>
          </div>
        ))}
      </div>

      {/* Analytics tabs */}
      <div style={{display:'flex',gap:0,border:'.5px solid var(--bdr)',borderRadius:'9px 9px 0 0',overflow:'hidden',background:'var(--surf)'}}>
        {ANA_TABS.map(([k,l]) => (
          <div key={k} onClick={()=>setTab(k)} style={{flex:1,padding:'9px 10px',textAlign:'center',cursor:'pointer',fontSize:11,fontWeight:tab===k?700:500,color:tab===k?'var(--t800)':'var(--tx2)',background:tab===k?'var(--t50)':'var(--surf)',borderRight:'.5px solid var(--bdr)',borderBottom:tab===k?'2px solid var(--t700)':'.5px solid var(--bdr)',whiteSpace:'nowrap',transition:'background .12s'}}>{l}</div>
        ))}
      </div>

      <div style={{background:'var(--surf)',border:'.5px solid var(--bdr)',borderTop:'none',borderRadius:'0 0 12px 12px',padding:16}}>
        {tab==='peer' && <PeerTab/>}
        {tab==='rollup' && <RollupDrillTab/>}
        {tab==='forecast' && <ForecastTab/>}
        {tab==='correlation' && <CorrelationTab/>}
        {tab==='anomaly' && <AnomalyTab/>}
        {tab==='trends' && <TrendsTab/>}
      </div>
    </div>
  );
}

function PeerTab() {
  const [peerSet, setPeerSet] = useState('nifty-50');
  const peerRef = useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    let c1:any;
    (async()=>{
      const {Chart,registerables}=await import('chart.js');
      Chart.register(...registerables);
      if(peerRef.current) c1=new Chart(peerRef.current,{type:'bar',data:{labels:['Best in class','Top quartile','L&T','Sector median','Laggard'],datasets:[{data:[2.1,3.6,4.2,4.8,7.2],backgroundColor:['#10b981','#5eead4','#0f766e','#94a3b8','#f3f4f6'],borderRadius:6}]},options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{color:'#f3f4f6'},border:{display:false},ticks:{font:{family:'DM Mono',size:10},color:'#94a3b8'}},y:{grid:{display:false},border:{display:false},ticks:{font:{family:'DM Sans',size:11},color:'#0f172a'}}}}});
    })();
    return()=>{c1?.destroy();};
  },[]);

  return (
    <div>
      {/* Benchmarking-against selector */}
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
        <span style={{fontSize:11,color:'var(--tx2)',fontWeight:600}}>Benchmarking against:</span>
        <select className="sel" style={{fontSize:11,padding:'4px 10px',minWidth:160}} value={peerSet} onChange={e=>setPeerSet(e.target.value)}>
          <option value="nifty-50">NIFTY 50 ESG</option>
          <option value="sector">Sector peers (Engineering &amp; Construction)</option>
          <option value="custom">Custom peer set</option>
        </select>
        <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:10,background:'var(--t50)',color:'var(--t700)',border:'.5px solid var(--t200)'}}>47 peers</span>
        <span style={{fontSize:10,color:'var(--tx3)',marginLeft:4}}>FY 2023-24</span>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'3fr 2fr',gap:12,marginBottom:12}}>
        <div>
          <div style={{fontSize:12,fontWeight:600,color:'var(--tx1)',marginBottom:8}}>GHG intensity — peer comparison (FY24)</div>
          <div style={{height:220,position:'relative'}}><canvas ref={peerRef}/></div>
        </div>
        <div>
          <div style={{fontSize:12,fontWeight:600,color:'var(--tx1)',marginBottom:8}}>Positioning across KPIs</div>
          <BenchmarkView fiscalYear="2023-24" />
        </div>
      </div>
      <MdsSection />
      <div style={{background:'var(--bg)',borderRadius:10,padding:'12px 14px'}}>
        <div style={{fontSize:11,fontWeight:600,color:'var(--tx2)',marginBottom:10}}>Detailed peer comparison table — all key parameters</div>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
          <thead><tr style={{borderBottom:'.5px solid var(--bdr)'}}>
            {['Parameter','Your value','Sector median','Top quartile','Best in class','Percentile'].map((h,hi)=><th key={h} style={{padding:'6px 10px',textAlign:hi===0?'left':'right',fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'.06em',color:'var(--tx3)'}}>{h}</th>)}
          </tr></thead>
          <tbody>
            {([['GHG intensity (t/₹cr)','4.2','4.8','3.6','2.1','72nd',true],['Energy intensity (GJ/₹cr)','4.12','4.31','3.2','1.8','68th',true],['Renewable energy %','18%','31%','48%','82%','22nd',false],['Water intensity (kL/₹cr)','31','28','21','12','38th',false],['Women in mgmt %','22%','19%','28%','45%','61st',true],['LTIFR','0.42','0.61','0.28','0.08','74th',true],['ESG disclosure %','84%','71%','88%','96%','79th',true],['Board independence %','58%','50%','62%','75%','64th',true]] as [string,string,string,string,string,string,boolean][]).map(([n,v,med,q1,bic,pct,good]) => (
              <tr key={n} style={{borderBottom:'.5px solid var(--bdr2)'}}
                onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='var(--surf)'}
                onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=''}>
                <td style={{padding:'7px 10px',fontWeight:500,color:'var(--tx1)',textAlign:'left'}}>{n}</td>
                <td style={{padding:'7px 10px',textAlign:'right',fontFamily:'var(--fm)',fontWeight:700,color:'var(--t700)'}}>{v}</td>
                <td style={{padding:'7px 10px',textAlign:'right',fontFamily:'var(--fm)',color:'var(--tx2)'}}>{med}</td>
                <td style={{padding:'7px 10px',textAlign:'right',fontFamily:'var(--fm)',color:'var(--tx3)'}}>{q1}</td>
                <td style={{padding:'7px 10px',textAlign:'right',fontFamily:'var(--fm)',color:'var(--tx3)'}}>{bic}</td>
                <td style={{padding:'7px 10px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                    <div style={{flex:1,height:4,background:'var(--bdr2)',borderRadius:2,overflow:'hidden',width:80}}><div style={{height:'100%',background:good?'var(--grn)':'var(--red)',width:`${parseInt(pct)}%`}}/></div>
                    <span style={{fontSize:10,fontFamily:'var(--fm)',fontWeight:600,color:good?'var(--grn)':'var(--red)'}}>{pct}</span>
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

function MdsSection() {
  const { data, isLoading, error } = useMds({ fiscalYear: '2023-24' });

  return (
    <div style={{background:'var(--bg)',borderRadius:10,padding:'12px 14px',marginBottom:12}}>
      <div style={{fontSize:12,fontWeight:600,color:'var(--tx1)',marginBottom:8}}>Competitive positioning map (MDS)</div>
      {isLoading && <div style={{fontSize:11,color:'var(--tx3)',padding:'20px 0',textAlign:'center'}}>Computing competitive positioning...</div>}
      {error && <div style={{fontSize:11,color:'var(--red)',padding:'20px 0',textAlign:'center'}}>{error.message}</div>}
      {data && (
        <>
          <MdsScatterPlot points={data.data} height={280} />
          <div style={{display:'flex',gap:12,marginTop:8,fontSize:10,color:'var(--tx3)'}}>
            <span>{data.meta.peerCount} peers compared</span>
            <span>{data.meta.metricsUsed} metrics used</span>
          </div>
        </>
      )}
    </div>
  );
}

function RollupDrillTab() {
  return (
    <div>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
        <span style={{fontSize:11,color:'var(--tx3)'}}>KPI:</span>
        <select className="sel" style={{fontSize:11,padding:'4px 8px',width:180}}><option>GHG Scope 1+2</option><option>Energy intensity</option><option>Water withdrawal</option><option>Women in workforce</option></select>
        <span style={{fontSize:11,color:'var(--tx3)'}}>Period:</span>
        <select className="sel" style={{fontSize:11,padding:'4px 8px',width:120}}><option>FY 2023-24</option><option>FY 2022-23</option></select>
      </div>
      <table style={{width:'100%',borderCollapse:'collapse',fontSize:11,background:'var(--bg)',borderRadius:8,overflow:'hidden'}}>
        <thead><tr style={{borderBottom:'.5px solid var(--bdr)'}}>
          {['Entity','Level','GHG tCO2e','% of total','YoY change','Contribution bar'].map(h=><th key={h} style={{padding:'8px 12px',textAlign:'left',fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'.06em',color:'var(--tx3)'}}>{h}</th>)}
        </tr></thead>
        <tbody>
          {([['Larsen & Toubro Ltd','Organization','142,300','100%','↓ 9.4%',true,100,''],['L&T Electrical & Automation Ltd','Subsidiary','61,200','43%','↓ 11.2%',true,43,'14px'],['Plant — Pune','Facility','34,100','24%','↓ 13.1%',true,24,'28px'],['Plant — Nashik','Facility','27,100','19%','↓ 8.8%',true,19,'28px'],['L&T Machinery Ltd','Subsidiary','81,100','57%','↓ 7.9%',true,57,'14px'],['Plant — Aurangabad','Facility','81,100','57%','↓ 7.9%',true,57,'28px'],['EHS Dept (Pune)','Department','12,000','8%','↓ 6.1%',true,8,'42px'],['Operations (Pune)','Department','19,000','13%','↓ 14.2%',true,13,'42px']] as [string,string,string,string,string,boolean,number,string][]).map(([n,lv,v,pct,chg,good,w,indent]) => (
            <tr key={n} style={{borderBottom:'.5px solid var(--bdr2)'}}
              onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='var(--surf)'}
              onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=''}>
              <td style={{padding:`7px 12px`,paddingLeft:`calc(12px + ${indent})`,fontWeight:lv==='Organization'?700:lv==='Subsidiary'?600:400,color:'var(--tx1)'}}>{n}</td>
              <td style={{padding:'7px 10px'}}><span className={`badge b-${lv==='Organization'?'dark':lv==='Subsidiary'?'teal':lv==='Facility'?'ind':'gray'}`} style={{fontSize:9}}>{lv}</span></td>
              <td style={{padding:'7px 10px',textAlign:'right',fontFamily:'var(--fm)',fontWeight:600}}>{v}</td>
              <td style={{padding:'7px 10px',textAlign:'right',fontFamily:'var(--fm)',color:'var(--tx2)'}}>{pct}</td>
              <td style={{padding:'7px 10px',fontSize:10,fontWeight:600,color:good?'var(--grn)':'var(--red)'}}>{chg}</td>
              <td style={{padding:'7px 10px'}}><div style={{height:5,background:'var(--bdr2)',borderRadius:2,overflow:'hidden',width:120}}><div style={{height:'100%',background:'var(--t500)',width:`${w}%`}}/></div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ForecastTab() {
  const fRef = useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    let c:any;
    (async()=>{
      const {Chart,registerables}=await import('chart.js');
      Chart.register(...registerables);
      if(fRef.current) c=new Chart(fRef.current,{type:'line',data:{labels:['FY20','FY21','FY22','FY23','FY24','FY25','FY27','FY30','FY32','FY35'],datasets:[{label:'Historical',data:[182,170,156,142,null,null,null,null,null,null],borderColor:'#0f766e',backgroundColor:'rgba(20,184,166,.1)',fill:false,borderWidth:2.5,tension:0.3,pointRadius:4},{label:'BAU',data:[null,null,null,null,130,118,96,62,42,0],borderColor:'#f59e0b',borderDash:[6,3],fill:false,borderWidth:2,tension:0.4,pointRadius:2},{label:'Moderate',data:[null,null,null,null,128,112,84,46,26,0],borderColor:'#6366f1',borderDash:[4,4],fill:false,borderWidth:2,tension:0.4,pointRadius:2},{label:'Aggressive',data:[null,null,null,null,125,105,70,30,8,0],borderColor:'#10b981',fill:false,borderWidth:2,tension:0.4,pointRadius:2}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:true,position:'top',labels:{font:{family:'DM Sans',size:10},color:'#94a3b8',boxWidth:10,padding:8}},tooltip:{backgroundColor:'#0f172a',bodyFont:{family:'DM Mono',size:11}}},scales:{x:{grid:{color:'#f3f4f6'},border:{display:false},ticks:{font:{family:'DM Sans',size:10},color:'#94a3b8'}},y:{grid:{color:'#f3f4f6'},border:{display:false},ticks:{font:{family:'DM Mono',size:10},color:'#94a3b8',callback:(v:any)=>v+'k'}}}}});
    })();
    return()=>c?.destroy();
  },[]);

  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'3fr 1fr',gap:12,marginBottom:12}}>
        <div>
          <div style={{fontSize:12,fontWeight:600,color:'var(--tx1)',marginBottom:8}}>GHG Scope 1+2 forecast — 3 scenarios to 2035</div>
          <div style={{height:220,position:'relative'}}><canvas ref={fRef}/></div>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {([['Business as usual','PPA + efficiency programs','Reaches 0 tCO2e by 2039','amb'],['Moderate intervention','Renewable tariff switch','Reaches target by 2035 (89%)','grn'],['Aggressive','Full RE + carbon credits','Reaches target by 2032','t700']] as [string,string,string,string][]).map(([title,s1,s2,col]) => (
            <div key={title} style={{background:`var(--${col==='grn'?'grnbg':col==='amb'?'ambbg':'t50'})`,borderRadius:8,padding:'10px 12px',border:`.5px solid var(--${col==='grn'?'grn':col==='amb'?'amb':'t300'})30`}}>
              <div style={{fontSize:11,fontWeight:700,color:`var(--${col})`}}>{title}</div>
              <div style={{fontSize:10,color:'var(--tx2)',marginTop:3,lineHeight:1.4}}>{s1}</div>
              <div style={{fontSize:10,fontWeight:600,color:`var(--${col})`,marginTop:3}}>{s2}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{background:'var(--t50)',borderRadius:10,padding:'12px 14px',border:'.5px solid var(--t200)'}}>
        <div style={{fontSize:11,fontWeight:700,color:'var(--t800)',marginBottom:8}}>🤖 AI forecast summary — all active goals</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          {([['Net zero Scope 1+2','2035','On track — 89% probability','grn','Currently tracking ↓9.4%/yr. BAU reaches zero by 2033.'],['50% renewable energy','2030','At risk — 38% probability','amb','Currently 18%. Need +5.3pp/yr. Current pace: +2pp/yr.'],['Zero waste to landfill','2027','On track — 97% probability','grn','Currently 12% to landfill. Ahead of pace.'],['40% women in workforce','2027','Critical — 12% probability','red','Currently 28%. Need +4pp/yr. Current pace: +1pp/yr.']] as [string,string,string,string,string][]).map(([g,yr,prob,col,detail]) => (
            <div key={g} style={{background:'var(--surf)',borderRadius:7,padding:'9px 11px',border:'.5px solid var(--bdr)'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:4}}>
                <div style={{fontSize:11,fontWeight:600,color:'var(--tx1)'}}>{g}</div>
                <span className={`badge b-${col==='grn'?'green':col==='amb'?'amber':'red'}`} style={{fontSize:9,flexShrink:0,marginLeft:6}}>{prob}</span>
              </div>
              <div style={{fontSize:10,color:'var(--tx3)',lineHeight:1.4}}>{detail}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CorrelationTab() {
  const { data, isLoading, error } = useCorrelations({ fiscalYear: '2023-24' });

  const scatterRef = useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    let c:any;
    (async()=>{
      const {Chart,registerables}=await import('chart.js');
      Chart.register(...registerables);
      if(scatterRef.current) c=new Chart(scatterRef.current,{type:'scatter',data:{datasets:[{label:'Our facilities',data:[{x:3.8,y:3.9},{x:4.1,y:4.2},{x:4.4,y:4.6}],backgroundColor:'#0f766e',pointRadius:8},{label:'Sector peers',data:[{x:3.2,y:3.1},{x:3.5,y:3.6},{x:4.8,y:5.1},{x:5.2,y:5.4},{x:2.9,y:2.8},{x:6.1,y:6.4}],backgroundColor:'#94a3b8',pointRadius:5}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:true,position:'top',labels:{font:{family:'DM Sans',size:10},color:'#94a3b8',boxWidth:10}}},scales:{x:{title:{display:true,text:'Energy intensity (GJ/₹cr)',font:{family:'DM Sans',size:10}},grid:{color:'#f3f4f6'},border:{display:false},ticks:{font:{family:'DM Mono',size:10},color:'#94a3b8'}},y:{title:{display:true,text:'GHG intensity (t/₹cr)',font:{family:'DM Sans',size:10}},grid:{color:'#f3f4f6'},border:{display:false},ticks:{font:{family:'DM Mono',size:10},color:'#94a3b8'}}}}});
    })();
    return()=>c?.destroy();
  },[]);

  // Compute summary stats from live data
  const summaryStats = data ? computeCorrelationStats(data.data.matrix) : null;

  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:14}}>
        {([
          ['Strong correlations', summaryStats ? String(summaryStats.strong) : '—', '|r| > 0.7', '#ef4444', '#fef2f2'],
          ['Moderate correlations', summaryStats ? String(summaryStats.moderate) : '—', '|r| 0.4–0.7', '#f59e0b', '#fffbeb'],
          ['Total pairs analysed', summaryStats ? String(summaryStats.totalPairs) : '—', 'All E+S+G pairs', 'var(--tx1)', 'var(--bg)'],
          ['Metrics available', data ? String(data.meta.metricsUsed) : '—', `${data ? data.meta.peerCount : '—'} peers in dataset`, '#6366f1', '#eef2ff'],
        ] as [string,string,string,string,string][]).map(([l,v,s,col,bg]) => (
          <div key={l} style={{background:bg,borderRadius:10,padding:'12px 14px',border:'.5px solid var(--bdr)'}}>
            <div style={{fontSize:24,fontWeight:700,fontFamily:'var(--fm)',color:col,lineHeight:1}}>{v}</div>
            <div style={{fontSize:12,fontWeight:600,color:'var(--tx1)',marginTop:4}}>{l}</div>
            <div style={{fontSize:10,color:'var(--tx3)',marginTop:2}}>{s}</div>
          </div>
        ))}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:12,marginBottom:12}}>
        <div>
          <div style={{fontSize:12,fontWeight:600,color:'var(--tx1)',marginBottom:8}}>Energy intensity vs GHG intensity — facilities + sector peers</div>
          <div style={{height:240,position:'relative'}}><canvas ref={scatterRef}/></div>
        </div>
        <div style={{background:'var(--t50)',borderRadius:8,padding:12,border:'.5px solid var(--t200)'}}>
          <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'.06em',color:'var(--t700)',marginBottom:6}}>Correlation result</div>
          <div style={{fontSize:26,fontWeight:700,fontFamily:'var(--fm)',color:'var(--t700)'}}>r = 0.87</div>
          <div style={{fontSize:11,color:'var(--tx2)',marginTop:4,lineHeight:1.5}}>Strong positive correlation. Reducing energy intensity is your most effective lever for GHG reduction.</div>
          <div style={{marginTop:8,padding:'7px 9px',background:'var(--surf)',borderRadius:6,fontSize:10,color:'var(--t800)',lineHeight:1.5}}><strong>Strategy:</strong> ISO 50001 energy audit + VFD retrofit on Plant 3 compressors estimated ↓8% energy intensity by FY26.</div>
        </div>
      </div>
      {/* Heatmap */}
      <div style={{background:'var(--bg)',borderRadius:10,padding:'12px 14px'}}>
        <div style={{fontSize:11,fontWeight:600,color:'var(--tx1)',marginBottom:8}}>Correlation heatmap — key KPIs</div>
        {isLoading && <div style={{fontSize:11,color:'var(--tx3)',padding:'20px 0',textAlign:'center'}}>Computing correlations...</div>}
        {error && <div style={{fontSize:11,color:'var(--red)',padding:'20px 0',textAlign:'center'}}>{error.message}</div>}
        {data && (
          <CorrelationMatrix metrics={data.data.metrics} matrix={data.data.matrix} />
        )}
        {!data && !isLoading && !error && (
          <div style={{fontSize:11,color:'var(--tx3)',padding:'20px 0',textAlign:'center'}}>No correlation data available</div>
        )}
      </div>
    </div>
  );
}

/** Compute summary statistics from correlation matrix for summary cards */
function computeCorrelationStats(matrix: (number | null)[][]) {
  let strong = 0;
  let moderate = 0;
  let totalPairs = 0;

  for (let i = 0; i < matrix.length; i++) {
    for (let j = i + 1; j < matrix[i].length; j++) {
      totalPairs++;
      const val = matrix[i][j];
      if (val !== null) {
        const abs = Math.abs(val);
        if (abs > 0.7) strong++;
        else if (abs > 0.4) moderate++;
      }
    }
  }

  return { strong, moderate, totalPairs };
}

function AnomalyTab() {
  const aRef = useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    let c:any;
    (async()=>{
      const {Chart,registerables}=await import('chart.js');
      Chart.register(...registerables);
      if(aRef.current) c=new Chart(aRef.current,{type:'line',data:{labels:['Jul','Aug','Sep','Oct','Nov','Dec'],datasets:[{label:'Energy GJ',data:[3800,4100,3900,5600,4200,3950],borderColor:'#0f766e',backgroundColor:'rgba(20,184,166,.1)',fill:true,tension:0.4,borderWidth:2,pointRadius:[4,4,4,10,4,4],pointBackgroundColor:['#0f766e','#0f766e','#0f766e','#ef4444','#0f766e','#0f766e']},{label:'Expected range',data:[4500,4500,4500,4500,4500,4500],borderColor:'#f59e0b',borderDash:[6,3],fill:false,borderWidth:1.5,pointRadius:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:true,position:'top',labels:{font:{family:'DM Sans',size:10},color:'#94a3b8',boxWidth:10,padding:8}}},scales:{x:{grid:{color:'#f3f4f6'},border:{display:false},ticks:{font:{family:'DM Sans',size:10},color:'#94a3b8'}},y:{grid:{color:'#f3f4f6'},border:{display:false},ticks:{font:{family:'DM Mono',size:10},color:'#94a3b8'}}}}});
    })();
    return()=>c?.destroy();
  },[]);

  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:14}}>
        {([['Critical anomalies','2','Require immediate action','red'],['Warnings','5','Outside normal range','amb'],['Data gaps','8','Missing expected data','gray'],['Auto-resolved','3','Verified & closed','grn']] as [string,string,string,string][]).map(([l,v,s,c]) => (
          <div key={l} style={{background:'var(--surf)',border:'.5px solid var(--bdr)',borderRadius:10,padding:'11px 13px',borderLeft:`3px solid var(--${c==='grn'?'grn':c==='red'?'red':c==='amb'?'amb':'tx3'})`}}>
            <div style={{fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'.07em',color:'var(--tx3)',marginBottom:3}}>{l}</div>
            <div style={{fontSize:22,fontWeight:700,fontFamily:'var(--fm)',color:`var(--${c==='grn'?'grn':c==='red'?'red':c==='amb'?'amb':'tx2'})`}}>{v}</div>
            <div style={{fontSize:10,color:'var(--tx3)',marginTop:2}}>{s}</div>
          </div>
        ))}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:12,marginBottom:12}}>
        <div>
          <div style={{fontSize:12,fontWeight:600,color:'var(--tx1)',marginBottom:8}}>Plant 2 energy — anomaly detected (Oct 2024)</div>
          <div style={{height:200,position:'relative'}}><canvas ref={aRef}/></div>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          <div style={{background:'var(--redbg)',borderRadius:8,padding:'11px 12px',border:'.5px solid var(--red)30'}}>
            <div style={{fontSize:10,fontWeight:700,color:'var(--redtx)',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:4}}>🔴 Critical — Plant 2 energy</div>
            <div style={{fontSize:11,color:'var(--tx1)',lineHeight:1.5}}>Oct 2024 energy consumption was <strong>5,600 GJ</strong> — 34% above the 3-month moving average of 4,180 GJ. Z-score: 3.2σ.</div>
            <div style={{display:'flex',gap:6,marginTop:8}}>
              <button style={{fontSize:10,padding:'4px 9px',background:'var(--red)',color:'#fff',border:'none',borderRadius:5,cursor:'pointer',fontWeight:600}}>Investigate</button>
              <button style={{fontSize:10,padding:'4px 9px',background:'var(--surf)',border:'.5px solid var(--bdr)',borderRadius:5,cursor:'pointer'}}>Mark resolved</button>
            </div>
          </div>
          <div style={{background:'var(--ambbg)',borderRadius:8,padding:'11px 12px',border:'.5px solid var(--amb)30'}}>
            <div style={{fontSize:10,fontWeight:700,color:'var(--ambtx)',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:4}}>🟡 Warning — Vendor Scope 1</div>
            <div style={{fontSize:11,color:'var(--tx1)',lineHeight:1.5}}>Vendor Tata Logistics reported <strong>0 tCO2e</strong> Scope 1 — statistically implausible for fleet operations of their size.</div>
            <div style={{display:'flex',gap:6,marginTop:8}}>
              <button style={{fontSize:10,padding:'4px 9px',background:'var(--amb)',color:'#fff',border:'none',borderRadius:5,cursor:'pointer',fontWeight:600}}>Send query</button>
              <button style={{fontSize:10,padding:'4px 9px',background:'var(--surf)',border:'.5px solid var(--bdr)',borderRadius:5,cursor:'pointer'}}>Dismiss</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrendsTab() {
  const tRef = useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    let c:any;
    (async()=>{
      const {Chart,registerables}=await import('chart.js');
      Chart.register(...registerables);
      if(tRef.current) c=new Chart(tRef.current,{type:'line',data:{labels:['FY21','FY22','FY23','FY24'],datasets:[{label:'GHG Scope 1+2',data:[254,232,217,198],borderColor:'#0f766e',backgroundColor:'rgba(20,184,166,.1)',fill:true,tension:0.4,borderWidth:2},{label:'Energy (×100 GJ)',data:[200,196,191,184],borderColor:'#f59e0b',fill:false,tension:0.4,borderWidth:2,borderDash:[4,4]}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:true,position:'top',labels:{font:{family:'DM Sans',size:10},color:'#94a3b8',boxWidth:10}}},scales:{x:{grid:{color:'#f3f4f6'},border:{display:false},ticks:{font:{family:'DM Sans',size:10},color:'#94a3b8'}},y:{grid:{color:'#f3f4f6'},border:{display:false},ticks:{font:{family:'DM Mono',size:10},color:'#94a3b8'}}}}});
    })();
    return()=>c?.destroy();
  },[]);

  return (
    <div>
      <div style={{fontSize:12,fontWeight:600,color:'var(--tx1)',marginBottom:8}}>Multi-year trend — GHG &amp; Energy</div>
      <div style={{height:240,position:'relative',marginBottom:16}}><canvas ref={tRef}/></div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
        {([['GHG Scope 1+2','↓ 9.4% YoY','142k tCO2e','var(--t700)',true],['Energy intensity','↓ 4.2% YoY','4.12 GJ/₹cr','var(--t700)',true],['Renewable energy','↑ +2pp YoY','18%','var(--grn)',true],['Water withdrawal','↑ 2.3% YoY','312k kL','var(--red)',false],['LTIFR','↓ 0.08 YoY','0.42','var(--t700)',true],['Women in workforce','↑ +1pp YoY','28%','var(--t700)',true]] as [string,string,string,string,boolean][]).map(([name,trend,val,col,good]) => (
          <div key={name} style={{background:'var(--bg)',borderRadius:8,padding:'10px 12px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div><div style={{fontSize:11,fontWeight:600,color:'var(--tx1)'}}>{name}</div><div style={{fontSize:10,color:'var(--tx3)',marginTop:2}}>{val}</div></div>
            <div style={{fontSize:12,fontWeight:700,color:col}}>{trend}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
