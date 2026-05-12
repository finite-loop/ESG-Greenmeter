"use client";
type Props = { navigate:(s:any)=>void; rollupLevel:string; setRollupLevel:(l:string)=>void; RollupBar:any; [k:string]:any };

export default function RollupScreen({ navigate, rollupLevel, setRollupLevel, RollupBar }: Props) {
  return (
    <div>
      <div className="ph">
        <div>
          <div className="ptitle">Rollup view</div>
          <div className="psub">ESG data aggregated across your full hierarchy — click any level to drill in</div>
        </div>
        <div className="ph-acts">
          <button className="btn-secondary">Export rollup</button>
          <button className="btn-primary" onClick={()=>navigate('entity')}>Configure hierarchy</button>
        </div>
      </div>
      <RollupBar active={rollupLevel} onSet={setRollupLevel}/>

      {/* Hierarchy tree visual */}
      <div className="card" style={{marginBottom:12}}>
        <div className="card-head">
          <div><div className="ctitle">Hierarchy rollup — GHG Scope 1+2</div><div className="csub">Data flows upward: Employee → Department → Facility → Subsidiary → Organization → Sector → Region → Country</div></div>
          <select className="sel" style={{width:160,fontSize:11,padding:'4px 8px'}}><option>GHG Scope 1+2</option><option>Energy intensity</option><option>Water withdrawal</option><option>Women in workforce %</option><option>ESG score</option></select>
        </div>
        <div className="cbody" style={{overflowX:'auto'}}>
          <div style={{minWidth:700}}>
            {/* Country */}
            <div style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
              <div style={{display:'flex',alignItems:'center',gap:6,background:'var(--bg)',border:'.5px solid var(--bdr)',borderRadius:8,padding:'8px 14px',cursor:'pointer',width:'fit-content'}} onClick={()=>setRollupLevel('country')}>
                <div style={{width:8,height:8,borderRadius:'50%',background:'#94a3b8'}}/>
                <span style={{fontSize:11,fontWeight:600,color:'var(--tx1)'}}>India</span>
                <span style={{fontFamily:'var(--fm)',fontSize:11,fontWeight:700,color:'var(--t700)'}}>142k tCO2e</span>
                <span className="badge b-teal" style={{fontSize:9}}>Country</span>
              </div>
              <div style={{width:'1.5px',height:14,background:'var(--t300)'}}/>
              {/* Organization */}
              <div style={{display:'flex',alignItems:'center',gap:6,background:'var(--t900)',borderRadius:8,padding:'8px 14px',cursor:'pointer',width:'fit-content'}} onClick={()=>setRollupLevel('organization')}>
                <div style={{width:8,height:8,borderRadius:'50%',background:'var(--t300)'}}/>
                <span style={{fontSize:11,fontWeight:600,color:'#fff'}}>Organisation (Group)</span>
                <span style={{fontFamily:'var(--fm)',fontSize:11,fontWeight:700,color:'var(--t300)'}}>142k tCO2e</span>
                <span className="badge b-dark" style={{fontSize:9}}>Organization</span>
              </div>
              <div style={{width:'1.5px',height:14,background:'var(--t300)'}}/>
              {/* Subsidiaries */}
              <div style={{display:'flex',gap:40,position:'relative'}}>
                <div style={{position:'absolute',top:0,left:50,right:50,height:'1.5px',background:'var(--t200)'}}/>
                {([['Electrical Division','61k tCO2e',72,'E: 72 · S: 81 · G: 70',[['Plant Site A','34k'],['Plant Site B','27k']]],['Machinery Division','81k tCO2e',64,'E: 64 · S: 77 · G: 73',[['Plant Site C','81k']]]] as [string,string,number,string,[string,string][]][]).map(([n,v,sc,detail,plants]) => (
                  <div key={n} style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
                    <div style={{width:'1.5px',height:14,background:'var(--t200)'}}/>
                    <div style={{background:'var(--surf)',border:'.5px solid var(--t300)',borderRadius:8,padding:'8px 12px',cursor:'pointer',textAlign:'center',width:'fit-content'}} onClick={()=>setRollupLevel('subsidiary')}>
                      <div style={{fontSize:10,fontWeight:600,color:'var(--t700)',fontFamily:'var(--fm)'}}>{v}</div>
                      <div style={{fontSize:11,fontWeight:600,color:'var(--tx1)'}}>{n}</div>
                      <div style={{fontSize:9,color:'var(--tx3)'}}>{detail}</div>
                    </div>
                    <div style={{width:'1.5px',height:14,background:'var(--t200)'}}/>
                    <div style={{display:'flex',gap:12}}>
                      {plants.map(([p,pv]) => (
                        <div key={p} style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
                          <div style={{background:'var(--t50)',border:'.5px solid var(--t200)',borderRadius:7,padding:'6px 10px',cursor:'pointer',textAlign:'center'}} onClick={()=>setRollupLevel('facility')}>
                            <div style={{fontSize:10,fontWeight:700,color:'var(--t700)',fontFamily:'var(--fm)'}}>{pv} tCO2e</div>
                            <div style={{fontSize:10,fontWeight:600,color:'var(--tx1)'}}>{p}</div>
                          </div>
                          <div style={{width:'1.5px',height:10,background:'var(--t200)'}}/>
                          <div style={{display:'flex',gap:6}}>
                            {['EHS','Ops','Fac'].map(d => (
                              <div key={d} style={{background:'var(--bg)',border:'.5px solid var(--bdr)',borderRadius:5,padding:'4px 7px',fontSize:9,fontWeight:500,color:'var(--tx2)',cursor:'pointer'}} onClick={()=>setRollupLevel('department')}>{d}</div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabular rollup */}
      <div className="card">
        <div className="card-head">
          <div><div className="ctitle">ESG summary — Organization level</div><div className="csub">All subsidiaries consolidated · FY 2023–24</div></div>
          <select className="sel" style={{width:180,fontSize:11,padding:'4px 8px'}}><option>Organization view</option><option>Subsidiary view</option><option>Facility view</option><option>Department view</option></select>
        </div>
        <table className="tbl">
          <thead><tr><th>Entity</th><th>Level</th><th>E score</th><th>S score</th><th>G score</th><th>GHG (tCO2e)</th><th>Water (kL)</th><th>Women %</th><th>Completeness</th></tr></thead>
          <tbody>
            <tr style={{background:'var(--t50)'}}>
              <td style={{fontWeight:700}}>Organisation (Group)</td>
              <td><span className="badge b-dark" style={{fontSize:9}}>Org</span></td>
              <td style={{fontFamily:'var(--fm)',color:'var(--t700)',fontWeight:600}}>68</td>
              <td style={{fontFamily:'var(--fm)',color:'var(--ind)',fontWeight:600}}>79</td>
              <td style={{fontFamily:'var(--fm)',color:'var(--amb)',fontWeight:600}}>71</td>
              <td style={{fontFamily:'var(--fm)'}}>142,000</td>
              <td style={{fontFamily:'var(--fm)'}}>312,000</td>
              <td style={{fontFamily:'var(--fm)'}}>28%</td>
              <td><div style={{display:'flex',alignItems:'center',gap:6}}><div className="pbar-bg" style={{width:60}}><div className="pbar-fill" style={{width:'84%',background:'var(--t500)'}}/></div><span style={{fontSize:10,fontFamily:'var(--fm)'}}>84%</span></div></td>
            </tr>
            {([['Electrical Division','Subsidiary',72,81,70,'61,000','128,000','31%',91,'teal'],['Machinery Division','Subsidiary',64,77,73,'81,000','184,000','25%',77,'teal'],['Plant — Site A','Facility',74,82,71,'34,000','72,000','33%',94,'ind'],['Plant — Site B','Facility',70,80,69,'27,000','56,000','29%',88,'ind'],['Plant — Site C','Facility',64,77,73,'81,000','184,000','25%',72,'ind'],['EHS Dept','Department','-','-','-','12,000','18,000','-',95,'gray'],['Operations Dept','Department','-','-','-','19,000','42,000','-',82,'gray']] as [string,string,any,any,any,string,string,string,number,string][]).map(([n,lv,e,s,g,ghg,water,women,comp,bc]) => (
              <tr key={n}>
                <td style={{fontWeight:500,paddingLeft:lv==='Department'?28:lv==='Facility'?18:10}}>{n}</td>
                <td><span className={`badge b-${bc}`} style={{fontSize:9}}>{lv}</span></td>
                <td style={{fontFamily:'var(--fm)'}}>{e}</td><td style={{fontFamily:'var(--fm)'}}>{s}</td><td style={{fontFamily:'var(--fm)'}}>{g}</td>
                <td style={{fontFamily:'var(--fm)'}}>{ghg}</td><td style={{fontFamily:'var(--fm)'}}>{water}</td><td style={{fontFamily:'var(--fm)'}}>{women}</td>
                <td><div style={{display:'flex',alignItems:'center',gap:6}}><div className="pbar-bg" style={{width:50}}><div className="pbar-fill" style={{width:`${comp}%`,background:comp>85?'var(--t500)':comp>70?'var(--amb)':'var(--red)'}}/></div><span style={{fontSize:10,fontFamily:'var(--fm)'}}>{comp}%</span></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
