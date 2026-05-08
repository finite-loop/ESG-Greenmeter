"use client";
import { useState } from "react";
type Props = { navigate:(s:any)=>void; [k:string]:any };

const PARAMS_DATA = [
  {code:'E-P6-01',name:'GHG Emissions (Scope 1)',pillar:'E',cat:'Climate',unit:'tCO2e',standards:['BRSR','GRI','ESRS','IFRS'],globalBm:'82,000 median',threshRed:'>120,000',threshAmb:'>95,000',threshGrn:'<80,000',src:'system',status:'active'},
  {code:'E-P6-02',name:'GHG Emissions (Scope 2)',pillar:'E',cat:'Climate',unit:'tCO2e',standards:['BRSR','GRI','ESRS','IFRS'],globalBm:'74,500 median',threshRed:'>100,000',threshAmb:'>80,000',threshGrn:'<70,000',src:'system',status:'active'},
  {code:'E-P6-03',name:'GHG Scope 2 (market-based)',pillar:'E',cat:'Climate',unit:'tCO2e',standards:['GRI','ESRS','IFRS'],globalBm:'68,000 median',threshRed:'>90,000',threshAmb:'>70,000',threshGrn:'<60,000',src:'system',status:'active'},
  {code:'E-P6-04',name:'Total energy consumed',pillar:'E',cat:'Energy',unit:'GJ',standards:['BRSR','GRI','ESRS'],globalBm:'1.91M GJ median',threshRed:'>2.5M',threshAmb:'>2.0M',threshGrn:'<1.8M',src:'system',status:'active'},
  {code:'E-P6-05',name:'Renewable energy %',pillar:'E',cat:'Energy',unit:'%',standards:['BRSR','GRI','ESRS'],globalBm:'31% median',threshRed:'<15%',threshAmb:'<25%',threshGrn:'>35%',src:'system',status:'active'},
  {code:'E-W-01',name:'Water withdrawal (total)',pillar:'E',cat:'Water',unit:'kL',standards:['BRSR','GRI','ESRS'],globalBm:'280,000 kL median',threshRed:'>380,000',threshAmb:'>320,000',threshGrn:'<280,000',src:'system',status:'active'},
  {code:'E-WS-01',name:'Waste to landfill',pillar:'E',cat:'Waste',unit:'MT',standards:['BRSR','GRI','ESRS'],globalBm:'1,820 MT median',threshRed:'>2,500',threshAmb:'>1,800',threshGrn:'<1,200',src:'system',status:'active'},
  {code:'S-P3-01',name:'Women in total workforce',pillar:'S',cat:'Diversity',unit:'%',standards:['BRSR','GRI','ESRS'],globalBm:'24% median',threshRed:'<20%',threshAmb:'<25%',threshGrn:'>30%',src:'system',status:'active'},
  {code:'S-P3-02',name:'LTIFR (Lost time injury rate)',pillar:'S',cat:'Safety',unit:'rate',standards:['BRSR','GRI','ESRS'],globalBm:'0.61 median',threshRed:'>0.8',threshAmb:'>0.5',threshGrn:'<0.3',src:'system',status:'active'},
  {code:'S-P3-03',name:'Gender pay ratio (F/M)',pillar:'S',cat:'Diversity',unit:'ratio',standards:['BRSR','GRI','ESRS'],globalBm:'0.91 median',threshRed:'<0.80',threshAmb:'<0.90',threshGrn:'>0.95',src:'system',status:'active'},
  {code:'G-P1-01',name:'Board independence %',pillar:'G',cat:'Board',unit:'%',standards:['BRSR','GRI','ESRS'],globalBm:'50% median',threshRed:'<33%',threshAmb:'<50%',threshGrn:'>51%',src:'system',status:'active'},
  {code:'G-P1-02',name:'Women on board',pillar:'G',cat:'Board',unit:'%',standards:['BRSR','GRI','ESRS'],globalBm:'24% median',threshRed:'<15%',threshAmb:'<25%',threshGrn:'>33%',src:'system',status:'active'},
  {code:'G-P1-03',name:'Anti-corruption training %',pillar:'G',cat:'Ethics',unit:'%',standards:['BRSR','GRI','ESRS'],globalBm:'85% median',threshRed:'<70%',threshAmb:'<85%',threshGrn:'>95%',src:'system',status:'active'},
  {code:'C-01',name:'Supplier ESG score (avg)',pillar:'S',cat:'Supply chain',unit:'score',standards:['Custom'],globalBm:'—',threshRed:'<40',threshAmb:'<60',threshGrn:'>70',src:'custom',status:'active'},
];

const STD_COLORS: Record<string,{bg:string;col:string}> = {
  BRSR:{bg:'#fef2f2',col:'#991b1b'},GRI:{bg:'#f0fdfa',col:'#0f766e'},ESRS:{bg:'#fffbeb',col:'#92400e'},
  IFRS:{bg:'#eef2ff',col:'#3730a3'},Custom:{bg:'#f8fafb',col:'#64748b'},
};

export default function ParamsScreen({ navigate }: Props) {
  const [search, setSearch] = useState('');
  const [pillar, setPillar] = useState('all');
  const [selStd, setSelStd] = useState('all');
  const [selParam, setSelParam] = useState<typeof PARAMS_DATA[0]|null>(null);

  const filtered = PARAMS_DATA.filter(p => {
    const q = search.toLowerCase();
    const matchQ = !q || p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || p.cat.toLowerCase().includes(q);
    const matchP = pillar==='all' || p.pillar===pillar;
    const matchS = selStd==='all' || p.standards.includes(selStd.toUpperCase()) || (selStd==='custom'&&p.src==='custom');
    return matchQ && matchP && matchS;
  });

  return (
    <div>
      <div className="ph">
        <div><div className="ptitle">Parameters &amp; KPI library</div><div className="psub">All standards · system · HSN overlay · custom · with measurement methods and thresholds</div></div>
        <div className="ph-acts">
          <button className="btn-secondary">Import standard</button>
          <button className="btn-primary">+ Add parameter</button>
        </div>
      </div>
      {/* Filter bar */}
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12,flexWrap:'wrap'}}>
        <div style={{position:'relative',flex:1,minWidth:200}}>
          <svg style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)'}} width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4" stroke="#94a3b8" strokeWidth="1.3"/><path d="M10 10l3 3" stroke="#94a3b8" strokeWidth="1.3" strokeLinecap="round"/></svg>
          <input style={{width:'100%',padding:'8px 12px 8px 30px',border:'.5px solid var(--bdr)',borderRadius:7,fontSize:12,outline:'none',background:'var(--surf)'}} placeholder="Search parameters by name, code or category…" value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        {(['all','BRSR','GRI','ESRS','IFRS','custom'] as const).map(k=>(
          <button key={k} onClick={()=>{setSelStd(k);setSelParam(null);}} style={{padding:'5px 11px',borderRadius:20,fontSize:11,fontWeight:600,cursor:'pointer',border:`1.5px solid ${selStd===k?'#0f766e':'var(--bdr)'}`,background:selStd===k?'#f0fdfa':'var(--surf)',color:selStd===k?'#0f766e':'var(--tx2)',transition:'all .12s'}}>{k==='all'?'All':k}</button>
        ))}
        <select className="sel" style={{fontSize:11,padding:'6px 10px',width:130}} value={pillar} onChange={e=>{setPillar(e.target.value);setSelParam(null);}}>
          <option value="all">All pillars</option><option value="E">Environment</option><option value="S">Social</option><option value="G">Governance</option>
        </select>
      </div>
      {/* Split pane */}
      <div style={{display:'grid',gridTemplateColumns:selParam?'1fr 380px':'1fr',gap:12,alignItems:'flex-start'}}>
        <div style={{background:'var(--surf)',border:'.5px solid var(--bdr)',borderRadius:12,overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr style={{background:'var(--bg)',borderBottom:'.5px solid var(--bdr)'}}>
                {['Parameter','Standards','Unit','Global benchmark','Thresholds (R/A/G)','Type','Status',''].map(h=>(
                  <th key={h} style={{padding:'9px 10px',textAlign:'left',fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'.07em',color:'var(--tx3)'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p,idx) => {
                const pCol = p.pillar==='E'?'var(--t700)':p.pillar==='S'?'var(--ind)':'var(--amb)';
                const pBg = p.pillar==='E'?'var(--t50)':p.pillar==='S'?'var(--indbg)':'var(--ambbg)';
                const isSel = selParam?.code===p.code;
                return (
                  <tr key={p.code} style={{borderBottom:'.5px solid var(--bdr2)',background:isSel?'var(--t50)':'var(--surf)',cursor:'pointer',transition:'background .1s'}}
                    onClick={()=>setSelParam(isSel?null:p)}
                    onMouseEnter={e=>{if(!isSel)(e.currentTarget as HTMLElement).style.background='var(--bg)'}}
                    onMouseLeave={e=>{if(!isSel)(e.currentTarget as HTMLElement).style.background=isSel?'var(--t50)':'var(--surf)'}}>
                    <td style={{padding:'11px 10px 11px 14px'}}>
                      <div style={{display:'flex',alignItems:'flex-start',gap:8}}>
                        <span style={{fontSize:9,fontFamily:'var(--fm)',fontWeight:700,color:pCol,background:pBg,padding:'2px 6px',borderRadius:4,flexShrink:0,marginTop:1}}>{p.pillar}</span>
                        <div>
                          <div style={{fontSize:12,fontWeight:600,color:'var(--tx1)'}}>{p.name}</div>
                          <div style={{fontSize:10,color:'var(--tx3)',marginTop:1}}>{p.code} · {p.cat}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{padding:'11px 10px'}}><div style={{display:'flex',flexWrap:'wrap',gap:3}}>{p.standards.map(s=><span key={s} style={{fontSize:9,padding:'2px 6px',borderRadius:3,fontWeight:600,background:STD_COLORS[s]?.bg||'#f3f4f6',color:STD_COLORS[s]?.col||'#64748b'}}>{s}</span>)}</div></td>
                    <td style={{padding:'11px 10px',fontSize:11,fontFamily:'var(--fm)',color:'var(--tx3)'}}>{p.unit}</td>
                    <td style={{padding:'11px 10px',fontSize:11,fontFamily:'var(--fm)',color:'var(--t700)'}}>{p.globalBm}</td>
                    <td style={{padding:'11px 10px'}}>
                      <div style={{display:'flex',flexDirection:'column',gap:2}}>
                        {([[p.threshRed,'var(--red)'],[p.threshAmb,'var(--amb)'],[p.threshGrn,'var(--grn)']] as [string,string][]).map(([v,c])=>(
                          <div key={c} style={{display:'flex',alignItems:'center',gap:4}}><div style={{width:8,height:8,borderRadius:'50%',background:c,flexShrink:0}}/><span style={{fontSize:10,fontFamily:'var(--fm)',color:'var(--tx2)'}}>{v}</span></div>
                        ))}
                      </div>
                    </td>
                    <td style={{padding:'11px 10px'}}><span className={`badge b-${p.src==='custom'?'amber':'teal'}`} style={{fontSize:9}}>{p.src==='custom'?'Custom':'System'}</span></td>
                    <td style={{padding:'11px 10px'}}><span className="badge b-green" style={{fontSize:9}}>{p.status}</span></td>
                    <td style={{padding:'11px 10px 11px 6px',whiteSpace:'nowrap'}}><button onClick={e=>{e.stopPropagation();setSelParam(isSel?null:p);}} style={{background:'none',border:'.5px solid var(--bdr)',borderRadius:5,padding:'4px 8px',fontSize:10,fontWeight:500,cursor:'pointer',color:'var(--tx2)'}}>Details</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {selParam && (
          <div style={{background:'var(--surf)',border:'.5px solid var(--t300)',borderRadius:12,overflow:'hidden',position:'sticky',top:60,maxHeight:'calc(100vh - 80px)',overflowY:'auto'}}>
            <div style={{padding:16}}>
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:14}}>
                <div>
                  <div style={{fontSize:10,fontFamily:'var(--fm)',fontWeight:700,color:selParam.pillar==='E'?'var(--t700)':selParam.pillar==='S'?'var(--ind)':'var(--amb)',marginBottom:3}}>{selParam.code} · {selParam.cat}</div>
                  <div style={{fontSize:15,fontWeight:700,color:'var(--tx1)'}}>{selParam.name}</div>
                  <div style={{fontSize:11,color:'var(--tx2)',marginTop:3}}>Unit: {selParam.unit}</div>
                </div>
                <button onClick={()=>setSelParam(null)} style={{background:'none',border:'none',fontSize:18,cursor:'pointer',color:'var(--tx3)',padding:0}}>×</button>
              </div>
              {([['How to measure','var(--t50)','var(--t700)','Collect data from primary sources — installed meters, sensors, and direct instrument readings at each facility intake point.'],['How to compute','var(--indbg)','var(--ind)','Apply the relevant emission factor or conversion factor to the activity data. Follow GHG Protocol or sector-specific methodology.'],['How to report','var(--ambbg)','var(--amb)','Report the absolute value plus any normalised intensity metric. State the methodology, data quality, and any estimations used.']] as [string,string,string,string][]).map(([title,bg,col,text])=>(
                <div key={title} style={{background:bg,borderRadius:7,padding:'10px 12px',marginBottom:8}}>
                  <div style={{fontSize:10,fontWeight:700,color:col,textTransform:'uppercase',letterSpacing:'.05em',marginBottom:4}}>{title}</div>
                  <div style={{fontSize:11,color:'var(--tx1)',lineHeight:1.6}}>{text}</div>
                </div>
              ))}
              <div style={{borderTop:'.5px solid var(--bdr2)',paddingTop:12,marginBottom:12}}>
                <div style={{fontSize:11,fontWeight:700,color:'var(--tx1)',marginBottom:8}}>Threshold configuration</div>
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  {([[selParam.threshRed,'Alert (Red)','var(--red)','var(--redbg)'],[selParam.threshAmb,'Review (Amber)','var(--amb)','var(--ambbg)'],[selParam.threshGrn,'On track (Green)','var(--grn)','var(--grnbg)']] as [string,string,string,string][]).map(([val,label,col,bg])=>(
                    <div key={label} style={{display:'flex',alignItems:'center',gap:8,background:bg,borderRadius:6,padding:'7px 10px'}}>
                      <div style={{width:9,height:9,borderRadius:'50%',background:col,flexShrink:0}}/>
                      <span style={{fontSize:11,fontWeight:600,color:'var(--tx1)',width:120}}>{label}</span>
                      <input defaultValue={val} style={{flex:1,padding:'4px 8px',border:`.5px solid ${col}50`,borderRadius:5,fontFamily:'var(--fm)',fontSize:11,outline:'none',background:'#fff'}}/>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:'var(--tx1)',marginBottom:8}}>Department assignment</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                  {['Operations','Manufacturing','Human Resources','Supply Chain','Finance','EHS','Legal & Compliance','CSR / Sustainability'].map(dept=>(
                    <label key={dept} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',border:'.5px solid var(--bdr)',borderRadius:7,cursor:'pointer'}}>
                      <input type="checkbox" defaultChecked={['Operations','EHS','Finance'].includes(dept)} style={{accentColor:'var(--t700)',width:14,height:14,flexShrink:0}}/>
                      <span style={{fontSize:11,fontWeight:500,color:'var(--tx1)'}}>{dept}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
