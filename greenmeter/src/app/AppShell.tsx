"use client";
import { useState, useCallback } from "react";
import { ROLLUP_LEVELS } from "./data";
import DashboardScreen from "./screens/Dashboard";
import ConsoleScreen from "./screens/Console";
import RollupScreen from "./screens/Rollup";
import AnalyticsScreen from "./screens/Analytics";
import GoalsScreen from "./screens/Goals";
import ReportsScreen from "./screens/Reports";
import SupplyChainScreen from "./screens/SupplyChain";
import SettingsScreen from "./screens/Settings";
import ParamsScreen from "./screens/Params";
import KnowledgeScreen from "./screens/Knowledge";

type Screen = 'dashboard'|'console'|'rollup'|'analytics'|'goals'|'reports'|'supplychain'|'settings'|'params'|'knowledge'|'entity'|'materiality'|'audit'|'industrydata';

const NAV_ITEMS: {id:string;label:string}[] = [
  {id:'dashboard',label:'Dashboard'},
  {id:'console',label:'Console'},
  {id:'rollup',label:'Rollup view'},
  {id:'analytics',label:'Analytics'},
  {id:'reports',label:'Reports'},
  {id:'goals',label:'Goals'},
  {id:'supplychain',label:'Supply chain'},
];

const SIDEBAR_GROUPS = [
  {
    label:'Overview',
    items:[
      {id:'dashboard',label:'Dashboard',icon:<svg viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor"/><rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".4"/><rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".4"/><rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".4"/></svg>,badge:null},
      {id:'rollup',label:'Rollup view',icon:<svg viewBox="0 0 16 16" fill="none"><path d="M8 2v3M4 8v3M12 8v3M2 14h4M6 14h4M10 14h4M6 5h4M4 11h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,badge:null},
      {id:'console',label:'Console',icon:<svg viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.3"/><path d="M8 5v6M5 8h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,badge:'38'},
    ]
  },
  {
    label:'Configuration',
    items:[
      {id:'entity',label:'Org & hierarchy',icon:<svg viewBox="0 0 16 16" fill="none"><rect x="6" y="1" width="4" height="3" rx="1" stroke="currentColor" strokeWidth="1.3"/><rect x="1" y="12" width="4" height="3" rx="1" stroke="currentColor" strokeWidth="1.3"/><rect x="6" y="12" width="4" height="3" rx="1" stroke="currentColor" strokeWidth="1.3"/><rect x="11" y="12" width="4" height="3" rx="1" stroke="currentColor" strokeWidth="1.3"/><path d="M8 4v5M4 12V10H8M12 12V10H8" stroke="currentColor" strokeWidth="1.3"/></svg>,badge:null},
      {id:'params',label:'Parameters & KPIs',icon:<svg viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h8M2 12h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,badge:null},
      {id:'materiality',label:'Materiality',icon:<svg viewBox="0 0 16 16" fill="none"><path d="M2 14L8 2l6 12H2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>,badge:null},
      {id:'goals',label:'Goals',icon:<svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3"/><circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.3"/><circle cx="8" cy="8" r="1" fill="currentColor"/></svg>,badge:null},
    ]
  },
  {
    label:'Intelligence',
    items:[
      {id:'analytics',label:'Analytics',icon:<svg viewBox="0 0 16 16" fill="none"><path d="M2 12l3-4 3 2 3-5 3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>,badge:null},
      {id:'industrydata',label:'Industry data',icon:<svg viewBox="0 0 16 16" fill="none"><rect x="2" y="10" width="3" height="4" rx="1" stroke="currentColor" strokeWidth="1.3"/><rect x="6.5" y="6" width="3" height="8" rx="1" stroke="currentColor" strokeWidth="1.3"/><rect x="11" y="2" width="3" height="12" rx="1" stroke="currentColor" strokeWidth="1.3"/><path d="M1 14h14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,badge:null},
    ]
  },
  {
    label:'Reporting',
    items:[
      {id:'reports',label:'Report builder',icon:<svg viewBox="0 0 16 16" fill="none"><path d="M4 1h5l4 4v10H4V1z" stroke="currentColor" strokeWidth="1.3"/><path d="M9 1v4h4M6 8h4M6 11h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,badge:null},
      {id:'supplychain',label:'Supply chain',icon:<svg viewBox="0 0 16 16" fill="none"><path d="M8 1a6 6 0 100 12A6 6 0 008 1zM2 8h12" stroke="currentColor" strokeWidth="1.3"/><path d="M8 2c-2 2-3 4-3 6s1 4 3 6M8 2c2 2 3 4 3 6s-1 4-3 6" stroke="currentColor" strokeWidth="1.3"/></svg>,badge:null},
      {id:'knowledge',label:'Knowledge base',icon:<svg viewBox="0 0 16 16" fill="none"><path d="M2 2h9l3 3v9H2V2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/><path d="M11 2v3h3M5 7h6M5 10h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,badge:null},
    ]
  },
  {
    label:'Governance',
    items:[
      {id:'audit',label:'Audit & assurance',icon:<svg viewBox="0 0 16 16" fill="none"><path d="M8 1L2 4v5c0 3 2.5 5.5 6 6 3.5-.5 6-3 6-6V4L8 1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/><path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>,badge:null},
      {id:'settings',label:'Settings & admin',icon:<svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.42 1.42M11.53 11.53l1.42 1.42M3.05 12.95l1.42-1.42M11.53 4.47l1.42-1.42" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,badge:null},
    ]
  },
];

function RollupBar({active,onSet}:{active:string,onSet:(id:string)=>void}) {
  return (
    <div className="rollup-bar">
      <span className="rb-label">Viewing at:</span>
      {ROLLUP_LEVELS.map((l,i) => (
        <span key={l.id} style={{display:'contents'}}>
          <span
            className={`rb-item ${l.id===active?'active':'inactive'}`}
            onClick={() => onSet(l.id)}
          >
            <div className="rb-dot" style={{background:l.color}}/>
            {l.label}
          </span>
          {l.parent && <span className="rb-sep">›</span>}
        </span>
      ))}
    </div>
  );
}

export default function AppShell() {
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [rollupLevel, setRollupLevel] = useState('organization');
  const [dashStd, setDashStd] = useState('all');

  const navigate = useCallback((s: Screen) => setScreen(s), []);

  const navProps = { navigate, rollupLevel, setRollupLevel, dashStd, setDashStd, RollupBar };

  function renderScreen() {
    switch(screen) {
      case 'dashboard': return <DashboardScreen {...navProps}/>;
      case 'console': return <ConsoleScreen {...navProps}/>;
      case 'rollup': return <RollupScreen {...navProps}/>;
      case 'analytics': return <AnalyticsScreen {...navProps}/>;
      case 'goals': return <GoalsScreen {...navProps}/>;
      case 'reports': return <ReportsScreen {...navProps}/>;
      case 'supplychain': return <SupplyChainScreen {...navProps}/>;
      case 'settings': return <SettingsScreen {...navProps}/>;
      case 'params': return <ParamsScreen {...navProps}/>;
      case 'knowledge': return <KnowledgeScreen {...navProps}/>;
      default: return (
        <div style={{padding:'40px',textAlign:'center',color:'var(--tx3)'}}>
          <div style={{fontSize:'32px',marginBottom:'12px'}}>🚧</div>
          <div style={{fontSize:'14px',fontWeight:600}}>Coming soon</div>
          <div style={{fontSize:'12px',marginTop:'6px'}}>This screen is in development</div>
        </div>
      );
    }
  }

  const topNavMap: Record<string,number> = {dashboard:0,console:1,rollup:2,analytics:3,reports:4,goals:5,supplychain:6};
  const settingsScreens: Screen[] = ['settings','params','entity','materiality','audit'];

  return (
    <div className="shell">
      {/* TOPBAR */}
      <div className="topbar">
        <div className="logo-wrap">
          <div className="logomark">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <path d="M8 2C5 2 2 5 2 8c0 2.2 1.2 4.1 3 5.2V11c0-1.7 1.3-3 3-3s3 1.3 3 3v2.2C12.8 12.1 14 10.2 14 8c0-3-2.5-6-6-6z" fill="white" opacity=".9"/>
              <circle cx="8" cy="8" r="2" fill="white"/>
            </svg>
          </div>
          <div className="appname">GreenMeter <em>AI</em></div>
        </div>
        <div className="top-nav">
          {NAV_ITEMS.map((item,i) => (
            <div
              key={item.id}
              className={`tni ${topNavMap[screen]===i?'on':''}`}
              onClick={() => navigate(item.id as Screen)}
            >
              {item.label}
            </div>
          ))}
        </div>
        <div className="top-right">
          <div className="cmdk">⌘ K</div>
          <div className="notif-btn">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <path d="M8 1a5 5 0 00-5 5v2.5L1.5 10.5h13L13 8.5V6a5 5 0 00-5-5zM6 12.5a2 2 0 004 0" stroke="#64748b" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            <div className="ndot"/>
          </div>
          <div className="ava">RK</div>
        </div>
      </div>

      <div className="app-body">
        {/* SIDEBAR */}
        <div className="sidebar">
          {SIDEBAR_GROUPS.map(group => (
            <div key={group.label}>
              <div className="sg">{group.label}</div>
              {group.items.map(item => (
                <div
                  key={item.id}
                  className={`si ${(screen===item.id||(settingsScreens.includes(screen as Screen)&&item.id==='settings'))?'on':''}`}
                  onClick={() => navigate(item.id as Screen)}
                >
                  {item.icon}
                  {item.label}
                  {item.badge && <span className="si-badge">{item.badge}</span>}
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="main">
          <div className="anim" key={screen}>
            {renderScreen()}
          </div>
        </div>
      </div>
    </div>
  );
}
