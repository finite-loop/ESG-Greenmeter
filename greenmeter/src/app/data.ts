// ─── Shared constants & data used across screens ───

export const ROLLUP_LEVELS = [
  {id:'employee',label:'Employee',color:'#5eead4',parent:'department'},
  {id:'department',label:'Department',color:'#14b8a6',parent:'facility'},
  {id:'facility',label:'Facility',color:'#0d9488',parent:'subsidiary'},
  {id:'subsidiary',label:'Subsidiary',color:'#0f766e',parent:'organization'},
  {id:'organization',label:'Organization',color:'#0d3d3c',parent:'sector'},
  {id:'sector',label:'Sector',color:'#6366f1',parent:'region'},
  {id:'region',label:'Region',color:'#818cf8',parent:'country'},
  {id:'country',label:'Country',color:'#94a3b8',parent:null},
];

export const STD_META: Record<string,{label:string;color:string;bg:string;params:number;covered:number;sections:number}> = {
  all:  {label:'All standards', color:'#0f766e', bg:'#f0fdfa', params:115, covered:97, sections:62},
  brsr: {label:'BRSR Core',     color:'#ef4444', bg:'#fef2f2', params:45,  covered:38, sections:26},
  gri:  {label:'GRI 2021',      color:'#14b8a6', bg:'#f0fdfa', params:38,  covered:34, sections:18},
  esrs: {label:'ESRS (CSRD)',   color:'#f59e0b', bg:'#fffbeb', params:32,  covered:25, sections:12},
  ifrs: {label:'IFRS S1+S2',    color:'#6366f1', bg:'#eef2ff', params:28,  covered:20, sections:8},
};

export const STD_PARAMS: Record<string, [string,string,string,string][]> = {
  all:  [['GHG intensity','4.2 t/cr','4.8','green'],['Energy use','1.84 PJ','1.91','green'],['Renewable','18%','31%','red'],['Water','31 kL/cr','28','amber'],['Waste landfill','12%','18%','green'],['LTIFR','0.42','0.61','green']],
  brsr: [['GHG Scope 1+2','142k tCO2e','—','green'],['Energy intensity','4.12 GJ/cr','4.31','green'],['Water withdrawal','312k kL','—','amber'],['Women in workforce','28%','—','green'],['Board independence','58%','≥51%','green'],['LTIFR','0.42','—','green']],
  gri:  [['GRI 305-1 Scope 1','74,200 tCO2e','82k median','green'],['GRI 305-2 Scope 2','68,100 tCO2e','74.5k median','green'],['GRI 303-3 Water','312k kL','280k median','amber'],['GRI 405-1 Women mgmt','22%','19% median','green'],['GRI 306-3 Waste','1,240 MT','1,820 median','green'],['GRI 403-9 LTIFR','0.42','0.61 median','green']],
  esrs: [['E1-6 GHG Scope 1','74,200 tCO2e','—','green'],['E1-5 Energy intensity','4.12 GJ/cr','—','green'],['E3-4 Water','312k kL','—','amber'],['S1-7 Gender pay gap','0.88 ratio','1.0 target','amber'],['G1-1 Anti-corruption','94% trained','—','green'],['E2-4 Air pollutants','142 MT NOx','—','green']],
  ifrs: [['S2 Scope 1 absolute','74,200 tCO2e','—','green'],['S2 Scope 2 (location)','68,100 tCO2e','—','green'],['S2 Scope 2 (market)','— tCO2e','—','red'],['S2 Climate transition','Low risk','—','green'],['S1 Governance process','Disclosed','—','green'],['S2 Physical risk','Moderate','—','amber']],
};

export const DC_PARAMS: Record<string, {
  code:string;name:string;cat:string;unit:string;current:string;target:string;ytd:string;
  source:string;srcIcon:string;updated:string;st:string;method:string;evidence:string;
}[]> = {
  E:[
    {code:'E-P6-01',name:'GHG Emissions (Scope 1)',cat:'Environmental',unit:'tCO2e',current:'74,200',target:'82,000',ytd:'198,400',source:'SAP',srcIcon:'S',updated:'2024-03-19 09:00',st:'alert',method:'GHG Protocol',evidence:'meter-log.pdf'},
    {code:'E-P6-02',name:'GHG Emissions (Scope 2)',cat:'Environmental',unit:'tCO2e',current:'68,100',target:'74,500',ytd:'182,300',source:'SAP',srcIcon:'S',updated:'2024-03-18 14:30',st:'on-track',method:'IEA grid factors',evidence:'grid-bill-q4.pdf'},
    {code:'E-P6-03',name:'GHG Scope 2 (market-based)',cat:'Environmental',unit:'tCO2e',current:'',target:'68,000',ytd:'—',source:'Manual',srcIcon:'M',updated:'—',st:'pending',method:'RE Certificates',evidence:'—'},
    {code:'E-P6-04',name:'Total energy consumed',cat:'Environmental',unit:'GJ',current:'1,840,000',target:'1,910,000',ytd:'4,920,000',source:'SAP',srcIcon:'S',updated:'2024-03-19 08:00',st:'on-track',method:'Direct metering',evidence:'monthly-log.pdf'},
    {code:'E-P6-05',name:'Renewable energy %',cat:'Environmental',unit:'%',current:'18',target:'31',ytd:'18',source:'Manual',srcIcon:'M',updated:'2024-03-15 11:00',st:'alert',method:'RE generation log',evidence:'audit-cert.pdf'},
    {code:'E-P6-06',name:'Energy intensity (revenue)',cat:'Environmental',unit:'GJ/₹cr',current:'4.12',target:'4.31',ytd:'4.12',source:'SAP',srcIcon:'S',updated:'2024-03-18 10:00',st:'on-track',method:'Revenue normalised',evidence:'finance-report.pdf'},
    {code:'E-W-01',name:'Water withdrawal',cat:'Environmental',unit:'kL',current:'1,250',target:'1,000',ytd:'5,100',source:'Azure IoT',srcIcon:'Az',updated:'2024-03-17 11:20',st:'at-risk',method:'Flow meters',evidence:'water-bill.pdf'},
    {code:'E-W-02',name:'Water recycled / reused',cat:'Environmental',unit:'kL',current:'96,720',target:'112,000',ytd:'258,400',source:'Manual',srcIcon:'M',updated:'2024-03-10 09:00',st:'at-risk',method:'Plant log',evidence:'—'},
    {code:'E-WS-01',name:'Waste to landfill',cat:'Environmental',unit:'MT',current:'1,240',target:'1,820',ytd:'3,310',source:'Manual',srcIcon:'M',updated:'2024-03-14 10:00',st:'on-track',method:'Waste manifest',evidence:'manifest-q4.pdf'},
    {code:'E-A-01',name:'NOx emissions',cat:'Environmental',unit:'MT',current:'142',target:'160',ytd:'380',source:'SAP',srcIcon:'S',updated:'2024-03-19 07:00',st:'on-track',method:'CEMS',evidence:'cems-report.pdf'},
  ],
  S:[
    {code:'S-P3-01',name:'Total employees',cat:'Social',unit:'count',current:'12,480',target:'—',ytd:'12,480',source:'Darwinbox',srcIcon:'D',updated:'2024-03-19 06:00',st:'on-track',method:'HRMS direct pull',evidence:'headcount.pdf'},
    {code:'S-P3-02',name:'Women in workforce',cat:'Social',unit:'%',current:'28',target:'24 (median)',ytd:'28',source:'Darwinbox',srcIcon:'D',updated:'2024-03-19 06:00',st:'on-track',method:'Headcount ratio',evidence:'headcount.pdf'},
    {code:'S-P3-03',name:'Women in senior mgmt',cat:'Social',unit:'%',current:'22',target:'19 (median)',ytd:'22',source:'Darwinbox',srcIcon:'D',updated:'2024-03-19 06:00',st:'on-track',method:'Headcount ratio',evidence:'headcount.pdf'},
    {code:'S-P3-04',name:'Gender pay ratio (F/M)',cat:'Social',unit:'ratio',current:'0.88',target:'1.00',ytd:'0.88',source:'SAP',srcIcon:'S',updated:'2024-03-15 12:00',st:'at-risk',method:'Payroll analysis',evidence:'—'},
    {code:'S-P3-05',name:'LTIFR (lost time injury rate)',cat:'Social',unit:'rate',current:'0.42',target:'<0.50',ytd:'0.42',source:'Manual',srcIcon:'M',updated:'2024-03-18 16:00',st:'on-track',method:'Incident log',evidence:'safety-report.pdf'},
    {code:'S-P3-06',name:'Training hours / employee',cat:'Social',unit:'hrs/yr',current:'42',target:'38',ytd:'42',source:'Darwinbox',srcIcon:'D',updated:'2024-03-19 06:00',st:'on-track',method:'LMS records',evidence:'training-log.pdf'},
    {code:'S-P3-07',name:'Employee turnover rate',cat:'Social',unit:'%',current:'8.4',target:'<12%',ytd:'8.4',source:'Darwinbox',srcIcon:'D',updated:'2024-03-19 06:00',st:'on-track',method:'Attrition analysis',evidence:'hr-report.pdf'},
    {code:'S-P4-01',name:'Community investment (CSR)',cat:'Social',unit:'₹ Cr',current:'18.4',target:'15 (min)',ytd:'18.4',source:'Manual',srcIcon:'M',updated:'2024-03-10 10:00',st:'on-track',method:'Finance records',evidence:'csr-report.pdf'},
  ],
  G:[
    {code:'G-P1-01',name:'Board independence %',cat:'Governance',unit:'%',current:'58',target:'≥51%',ytd:'58',source:'Manual',srcIcon:'M',updated:'2024-03-01 09:00',st:'on-track',method:'Board records',evidence:'board-minutes.pdf'},
    {code:'G-P1-02',name:'Women on board',cat:'Governance',unit:'%',current:'22',target:'≥33%',ytd:'22',source:'Manual',srcIcon:'M',updated:'2024-03-01 09:00',st:'at-risk',method:'Board records',evidence:'board-minutes.pdf'},
    {code:'G-P1-03',name:'Board meetings held',cat:'Governance',unit:'count',current:'6',target:'≥5',ytd:'6',source:'Manual',srcIcon:'M',updated:'2024-03-15 10:00',st:'on-track',method:'AGM records',evidence:'agm-minutes.pdf'},
    {code:'G-P1-04',name:'Anti-corruption training %',cat:'Governance',unit:'%',current:'94',target:'≥85%',ytd:'94',source:'Darwinbox',srcIcon:'D',updated:'2024-03-19 06:00',st:'on-track',method:'LMS completion',evidence:'training-log.pdf'},
    {code:'G-P1-05',name:'Whistleblower complaints',cat:'Governance',unit:'count',current:'2',target:'—',ytd:'2',source:'Manual',srcIcon:'M',updated:'2024-02-28 11:00',st:'on-track',method:'Ethics hotline',evidence:'whistle-report.pdf'},
    {code:'G-P1-06',name:'ESG-linked executive pay',cat:'Governance',unit:'yes/no',current:'No',target:'Yes',ytd:'No',source:'Manual',srcIcon:'M',updated:'—',st:'alert',method:'Remuneration report',evidence:'—'},
  ]
};

export const GOALS_DATA = [
  {
    name:'Net zero Scope 1+2 emissions', pillar:'E', type:'Absolute reduction',
    owner:'Priya Sharma', role:'ESG Lead', targetDate:'Mar 2035', baselineDate:'FY2023',
    baseline:'142,000 tCO2e', target:'0 tCO2e', pct:62, status:'on-track',
    scope:['Organisation (all entities)'],
    standards:['BRSR Core','IFRS S2','GRI 305','SBTi 1.5°C'],
    aiNote:'89% probability of achieving by 2035 at current ↓9.4%/yr pace. Estimated actual: 2033.',
    params:[
      {name:'GHG Scope 1 absolute',current:'74,200',target:'0',unit:'tCO2e',pct:48,st:'on-track'},
      {name:'GHG Scope 2 (location-based)',current:'68,100',target:'0',unit:'tCO2e',pct:54,st:'on-track'},
      {name:'GHG Scope 2 (market-based)',current:'—',target:'0',unit:'tCO2e',pct:0,st:'pending'},
      {name:'GHG intensity / revenue',current:'4.12',target:'0',unit:'t/₹cr',pct:38,st:'on-track'},
      {name:'Renewable energy %',current:'18%',target:'100%',unit:'%',pct:18,st:'at-risk'},
    ],
    milestones:[
      {date:'Mar 2025',desc:'Complete Scope 1+2 baseline audit across all 3 facilities',owner:'Priya Sharma',st:'done',evidence:'Audit report attached'},
      {date:'Sep 2025',desc:'Procure renewable energy tariff for Plant Site A — target 40% RE',owner:'Rajan Mehta',st:'in-progress',evidence:'Pending PPA sign-off'},
      {date:'Mar 2026',desc:'Achieve 25% absolute Scope 1 reduction vs FY2023 baseline',owner:'Rajan Mehta',st:'pending',evidence:'—'},
      {date:'Mar 2028',desc:'Commission 15MW solar at Plant Site B',owner:'Rajan Mehta',st:'pending',evidence:'—'},
      {date:'Mar 2030',desc:'Scope 1+2 down 60% vs baseline · all plants RE certified',owner:'Priya Sharma',st:'pending',evidence:'—'},
      {date:'Mar 2035',desc:'Net zero Scope 1+2 · remaining offset via verified carbon credits',owner:'Priya Sharma',st:'pending',evidence:'—'},
    ]
  },
  {
    name:'50% renewable energy', pillar:'E', type:'% renewable / circular',
    owner:'Rajan Mehta', role:'EHS Manager', targetDate:'Mar 2030', baselineDate:'FY2023',
    baseline:'18%', target:'50%', pct:36, status:'at-risk',
    scope:['Organisation (all)'],
    standards:['BRSR Core','GRI 302','RE100'],
    aiNote:'Will reach ~32% by 2030 at current pace — 18pp short. Recommend: PPA agreement for Plant 3.',
    params:[
      {name:'Renewable energy %',current:'18%',target:'50%',unit:'%',pct:36,st:'at-risk'},
      {name:'Energy from solar (own)',current:'0 GJ',target:'180,000 GJ',unit:'GJ',pct:0,st:'pending'},
      {name:'RE certificates purchased',current:'0',target:'Annual',unit:'RECs',pct:0,st:'pending'},
    ],
    milestones:[
      {date:'Jun 2025',desc:'Sign PPA for Plant Site A rooftop solar (5MW)',owner:'Rajan Mehta',st:'in-progress',evidence:'Term sheet signed'},
      {date:'Mar 2026',desc:'Reach 25% renewable across all facilities',owner:'Rajan Mehta',st:'pending',evidence:'—'},
      {date:'Mar 2028',desc:'Commission Plant Site B solar (15MW)',owner:'Rajan Mehta',st:'pending',evidence:'—'},
      {date:'Mar 2030',desc:'50% renewable milestone · RE100 submission',owner:'Priya Sharma',st:'pending',evidence:'—'},
    ]
  },
  {
    name:'Zero waste to landfill', pillar:'E', type:'Absolute reduction',
    owner:'Rajan Mehta', role:'EHS Manager', targetDate:'Mar 2027', baselineDate:'FY2023',
    baseline:'1,820 MT to landfill', target:'0 MT', pct:78, status:'on-track',
    scope:['Electrical Division','Machinery Division'],
    standards:['BRSR Core','GRI 306'],
    aiNote:'97% probability of achieving ahead of schedule — estimated mid-2026.',
    params:[
      {name:'Waste diverted from landfill',current:'88%',target:'100%',unit:'%',pct:88,st:'on-track'},
      {name:'Waste to landfill (absolute)',current:'1,240 MT',target:'0 MT',unit:'MT',pct:32,st:'on-track'},
      {name:'Waste recycled / composted',current:'68%',target:'80%',unit:'%',pct:85,st:'on-track'},
    ],
    milestones:[
      {date:'Sep 2025',desc:'Zero landfill at Plant Site A — composting + recycling program complete',owner:'Rajan Mehta',st:'done',evidence:'Certificate attached'},
      {date:'Mar 2026',desc:'Plant Site B waste segregation at source — 95% diversion',owner:'Rajan Mehta',st:'in-progress',evidence:'Monthly report'},
      {date:'Mar 2027',desc:'All facilities zero landfill · GRI 306 disclosure complete',owner:'Priya Sharma',st:'pending',evidence:'—'},
    ]
  },
  {
    name:'40% women in workforce', pillar:'S', type:'Headcount / diversity %',
    owner:'Kavya Reddy', role:'HR Lead', targetDate:'Mar 2027', baselineDate:'FY2023',
    baseline:'28%', target:'40%', pct:24, status:'critical',
    scope:['Organisation (all)'],
    standards:['BRSR Core','GRI 405','SEBI mandate'],
    aiNote:'Likely 32% by 2027 at current pace — 8pp short. Immediate structured hiring policy change needed.',
    params:[
      {name:'Women in total workforce',current:'28%',target:'40%',unit:'%',pct:24,st:'critical'},
      {name:'Women in senior mgmt',current:'22%',target:'33%',unit:'%',pct:38,st:'at-risk'},
      {name:'Women on board',current:'22%',target:'33%',unit:'%',pct:67,st:'at-risk'},
      {name:'Gender pay ratio (F/M)',current:'0.88',target:'1.00',unit:'ratio',pct:88,st:'at-risk'},
    ],
    milestones:[
      {date:'Jun 2025',desc:'Introduce structured diversity hiring: 40% of new hires must be women',owner:'Kavya Reddy',st:'in-progress',evidence:'Policy doc uploaded'},
      {date:'Mar 2026',desc:'Women in workforce reach 31% — mid-year review checkpoint',owner:'Kavya Reddy',st:'pending',evidence:'—'},
      {date:'Mar 2027',desc:'40% women in workforce — BRSR P5 disclosure complete',owner:'Priya Sharma',st:'pending',evidence:'—'},
    ]
  },
  {
    name:'LTIFR below 0.3', pillar:'S', type:'Rating / index score',
    owner:'Rajan Mehta', role:'EHS Manager', targetDate:'Mar 2026', baselineDate:'FY2023',
    baseline:'0.42', target:'<0.30', pct:58, status:'on-track',
    scope:['All facilities'],
    standards:['BRSR Core','GRI 403'],
    aiNote:'On track to reach 0.28 by mid-2026 — ahead of target.',
    params:[
      {name:'LTIFR (Lost time injury rate)',current:'0.42',target:'<0.30',unit:'rate',pct:58,st:'on-track'},
      {name:'Total recordable incidents',current:'8',target:'<4',unit:'count',pct:50,st:'on-track'},
      {name:'Fatalities',current:'0',target:'0',unit:'count',pct:100,st:'on-track'},
      {name:'Safety training completion',current:'94%',target:'100%',unit:'%',pct:94,st:'on-track'},
    ],
    milestones:[
      {date:'Dec 2024',desc:'Deploy behavior-based safety program at all 3 facilities',owner:'Rajan Mehta',st:'done',evidence:'Training records'},
      {date:'Jun 2025',desc:'LTIFR ≤ 0.35 mid-year check',owner:'Rajan Mehta',st:'done',evidence:'H1 report'},
      {date:'Mar 2026',desc:'LTIFR below 0.30 — GRI 403 disclosure',owner:'Priya Sharma',st:'pending',evidence:'—'},
    ]
  },
];
