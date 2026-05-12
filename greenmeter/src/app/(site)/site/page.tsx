"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

/* ─── Reveal-on-scroll observer ─── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
          }
        }
      },
      { threshold: 0.07 }
    );
    const elements = ref.current.querySelectorAll(".rv");
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
  return ref;
}

/* ─── Hero ─── */
function Hero() {
  return (
    <div style={{ padding: "80px 32px 0", background: "#fff", borderBottom: "1px solid var(--s-bdr)", textAlign: "center" }}>
      {/* Badge */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          background: "var(--t50)",
          border: "1px solid var(--t200)",
          borderRadius: 20,
          padding: "4px 12px 4px 8px",
          fontSize: 12,
          color: "var(--t700)",
          marginBottom: 24,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "var(--t500)",
            animation: "sitePulse 2s infinite",
            flexShrink: 0,
          }}
        />
        Now live — BRSR, GRI &amp; ESRS unified
      </div>

      {/* Heading */}
      <h1
        style={{
          fontSize: "clamp(32px, 4vw, 56px)",
          fontWeight: 300,
          lineHeight: 1.15,
          letterSpacing: "-.02em",
          color: "var(--tx1)",
          margin: "0 auto 20px",
          maxWidth: 760,
        }}
      >
        Your ESG data is everywhere.
        <br />
        Your reporting <em style={{ fontStyle: "normal", color: "var(--t600)" }}>shouldn&apos;t be.</em>
      </h1>

      {/* Subtitle */}
      <p style={{ fontSize: 16, color: "var(--tx2)", lineHeight: 1.7, maxWidth: 480, margin: "0 auto 32px" }}>
        One platform to collect, map, and report across BRSR, GRI, and ESRS — automatically.
      </p>

      {/* CTA buttons */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 48, flexWrap: "wrap" as const }}>
        <button
          style={{
            fontSize: 13,
            color: "var(--t700)",
            background: "#fff",
            border: "1.5px solid var(--t300)",
            padding: "10px 22px",
            borderRadius: 8,
            cursor: "pointer",
            fontFamily: "var(--s-ff)",
          }}
        >
          Request Access
        </button>
        <Link
          href="#product"
          style={{
            fontSize: 13,
            color: "#fff",
            background: "var(--t600)",
            border: "none",
            padding: "10px 22px",
            borderRadius: 8,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            textDecoration: "none",
            fontFamily: "var(--s-ff)",
          }}
        >
          See how it works →
        </Link>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginBottom: 20 }}>
        {["Collect", "Analyse", "Report"].map((tab, i) => (
          <button
            key={tab}
            style={{
              fontSize: 12,
              color: i === 2 ? "var(--t700)" : "var(--tx2)",
              background: i === 2 ? "var(--t50)" : "transparent",
              border: `1px solid ${i === 2 ? "var(--t300)" : "var(--s-bdr)"}`,
              cursor: "pointer",
              padding: "6px 16px",
              borderRadius: 20,
              opacity: i === 2 ? 1 : 0.7,
              fontFamily: "var(--s-ff)",
              transition: "all .15s",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* App screenshot preview */}
      <div
        style={{
          maxWidth: 960,
          margin: "0 auto",
          border: "1px solid var(--s-bdr)",
          borderBottom: "none",
          borderRadius: "12px 12px 0 0",
          overflow: "hidden",
          boxShadow: "0 -4px 40px rgba(13,148,136,.08)",
        }}
      >
        {/* Chrome bar */}
        <div
          style={{
            height: 32,
            background: "#f1f5f9",
            borderBottom: "1px solid var(--s-bdr)",
            display: "flex",
            alignItems: "center",
            padding: "0 12px",
            gap: 6,
          }}
        >
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#ff5f57" }} />
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#ffbd2e" }} />
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#28c840" }} />
          <span style={{ fontSize: 10, color: "rgba(0,0,0,.3)", marginLeft: 14 }}>app.greenmeter.ai</span>
        </div>
        {/* App preview body */}
        <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", height: 280 }}>
          {/* Sidebar preview */}
          <div style={{ background: "#0f172a", borderRight: "1px solid rgba(255,255,255,.06)", padding: "12px 6px", overflow: "hidden" }}>
            {[
              { section: "OVERVIEW", items: [{ name: "Dashboard", active: true }, { name: "Rollup view" }, { name: "Console" }] },
              { section: "DATA", items: [{ name: "Parameters" }, { name: "Materiality" }] },
              { section: "REPORTING", items: [{ name: "Report builder" }, { name: "Supply chain" }] },
              { section: "INTELLIGENCE", items: [{ name: "Analytics" }, { name: "Industry data" }] },
            ].map((group) => (
              <div key={group.section}>
                <div style={{ fontSize: "8.5px", letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(255,255,255,.22)", padding: "10px 10px 4px" }}>
                  {group.section}
                </div>
                {group.items.map((item) => (
                  <div
                    key={item.name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      padding: "7px 10px",
                      borderRadius: 5,
                      fontSize: 11,
                      color: item.active ? "#fff" : "rgba(255,255,255,.4)",
                      fontWeight: item.active ? 600 : 400,
                      background: item.active ? "rgba(20,184,166,.18)" : "transparent",
                      marginBottom: 1,
                    }}
                  >
                    <span
                      style={{
                        width: 4,
                        height: 4,
                        borderRadius: "50%",
                        background: item.active ? "var(--t400)" : "rgba(255,255,255,.2)",
                        flexShrink: 0,
                      }}
                    />
                    {item.name}
                  </div>
                ))}
              </div>
            ))}
          </div>
          {/* Main area preview */}
          <div style={{ background: "var(--s-bg)", padding: 16, overflow: "hidden" }}>
            {/* KPI strip */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 12 }}>
              {[
                { label: "ESG SCORE", value: "72", change: "+4.2", color: "var(--grntx)" },
                { label: "ENVIRONMENT", value: "68", change: "+6.1", color: "var(--grntx)" },
                { label: "SOCIAL", value: "78", change: "+2.3", color: "var(--grntx)" },
                { label: "GOVERNANCE", value: "71", change: "-1.8", color: "var(--redtx)" },
              ].map((kpi) => (
                <div
                  key={kpi.label}
                  style={{
                    background: "#fff",
                    border: "1.5px solid var(--s-bdr)",
                    borderRadius: 10,
                    padding: 11,
                    boxShadow: "var(--s-shadow-sm)",
                  }}
                >
                  <div style={{ fontSize: "8.5px", textTransform: "uppercase", letterSpacing: ".07em", color: "var(--tx3)", marginBottom: 4 }}>
                    {kpi.label}
                  </div>
                  <div style={{ fontSize: 19, fontWeight: 700, color: "var(--tx1)", lineHeight: 1 }}>{kpi.value}</div>
                  <div style={{ fontSize: 9, fontWeight: 600, marginTop: 3, color: kpi.color }}>{kpi.change}%</div>
                </div>
              ))}
            </div>
            {/* Chart + AI panel */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 210px", gap: 10 }}>
              <div style={{ background: "#fff", border: "1.5px solid var(--s-bdr)", borderRadius: 10, padding: 13 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: "var(--tx1)", marginBottom: 9, textTransform: "uppercase", letterSpacing: ".04em" }}>
                  Emissions trend
                </div>
                {/* Chart placeholder */}
                <svg viewBox="0 0 400 100" style={{ width: "100%", height: 80 }}>
                  <defs>
                    <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--t400)" stopOpacity=".3" />
                      <stop offset="100%" stopColor="var(--t400)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M0,80 L50,65 L100,70 L150,55 L200,50 L250,35 L300,30 L350,25 L400,20 L400,100 L0,100Z" fill="url(#cg)" />
                  <path d="M0,80 L50,65 L100,70 L150,55 L200,50 L250,35 L300,30 L350,25 L400,20" fill="none" stroke="var(--t500)" strokeWidth="2" />
                </svg>
              </div>
              <div style={{ background: "#fff", border: "1.5px solid var(--s-bdr)", borderRadius: 10, padding: 13 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--t700)", marginBottom: 9, display: "flex", alignItems: "center", gap: 5, textTransform: "uppercase", letterSpacing: ".04em" }}>
                  ✦ AI Recommendations
                </div>
                {[
                  { text: "Scope 2 market-based data missing — 3 entities", badge: "BRSR" },
                  { text: "RE% at 18% vs 31% target — off track", badge: "GRI" },
                  { text: "Water intensity improved 11% QoQ", badge: "ESRS" },
                ].map((item, i) => (
                  <div key={i} style={{ padding: "7px 0", borderBottom: i < 2 ? "1px solid var(--s-bdr2)" : "none" }}>
                    <div style={{ fontSize: 10, color: "var(--tx1)", lineHeight: 1.35 }}>{item.text}</div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: "var(--t600)", marginTop: 2 }}>{item.badge}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Challenges ─── */
function Challenges() {
  const challenges = [
    {
      n: "01",
      title: "Scattered Information",
      desc: "ESG data lives in spreadsheets, ERPs, HR systems, IoT sensors, and manual logs — scattered across teams and formats.",
      tag: "Data fragmentation",
    },
    {
      n: "02",
      title: "Multiple Frameworks",
      desc: "BRSR, GRI, ESRS, IFRS S2 — each standard has different metrics, boundaries, and disclosure requirements. Mapping manually is error-prone.",
      tag: "Compliance complexity",
    },
    {
      n: "03",
      title: "Manual Reporting",
      desc: "Teams spend weeks collecting, validating, and formatting data into reports — only to repeat the cycle every quarter.",
      tag: "Operational overhead",
    },
  ];

  return (
    <div className="section section-alt">
      <div className="w">
        <div className="sec-label">
          <div className="sec-label-n">1</div>THE CHALLENGES
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 0, borderTop: "1px solid var(--s-bdr)" }}>
          <div
            style={{
              padding: "40px 40px 40px 0",
              fontSize: 20,
              fontWeight: 400,
              color: "var(--tx1)",
              lineHeight: 1.4,
              letterSpacing: "-.01em",
              position: "sticky",
              top: 56,
              height: "fit-content",
              borderRight: "1px solid var(--s-bdr)",
            }}
          >
            We understand the challenges you face in ESG reporting today.
          </div>
          <div style={{ padding: "40px 0 40px 56px" }}>
            <p style={{ fontSize: 15, color: "var(--tx2)", lineHeight: 1.78, maxWidth: 560, marginBottom: 32 }}>
              Your team works hard to meet BRSR, GRI, and ESRS requirements. We&apos;ve seen how much effort goes into gathering data, ensuring accuracy, and meeting deadlines. You&apos;re doing important work — it just shouldn&apos;t be this difficult.
            </p>
            {challenges.map((ch) => (
              <div
                key={ch.n}
                className="rv"
                style={{
                  background: "var(--surf)",
                  border: "1px solid var(--s-bdr)",
                  borderRadius: 10,
                  padding: "24px 28px",
                  marginBottom: 10,
                  transition: "all .2s",
                }}
              >
                <div style={{ fontSize: 10, letterSpacing: ".08em", color: "var(--t500)", marginBottom: 8, fontWeight: 500 }}>{ch.n}</div>
                <div style={{ fontSize: 17, fontWeight: 500, color: "var(--tx1)", marginBottom: 8, letterSpacing: "-.01em", lineHeight: 1.3 }}>{ch.title}</div>
                <p style={{ fontSize: 14, color: "var(--tx2)", lineHeight: 1.7, maxWidth: 560 }}>{ch.desc}</p>
                <div
                  style={{
                    display: "inline-block",
                    marginTop: 12,
                    fontSize: 11,
                    color: "var(--t700)",
                    border: "1px solid var(--t200)",
                    background: "var(--t50)",
                    padding: "3px 10px",
                    borderRadius: 4,
                    letterSpacing: ".02em",
                  }}
                >
                  {ch.tag}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Solution ─── */
function Solution() {
  return (
    <div className="section" id="product" style={{ background: "linear-gradient(180deg, var(--t50) 0%, var(--s-bg2) 100%)", borderTop: "1.5px solid var(--s-bdr)" }}>
      <div className="w">
        <div className="sec-label">
          <div className="sec-label-n">2</div>THE SOLUTION
        </div>
        {/* Solution header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 48,
            padding: "48px 0 36px",
            borderBottom: "1px solid var(--s-bdr)",
            alignItems: "end",
          }}
        >
          <h2
            style={{
              fontSize: "clamp(22px, 2.5vw, 32px)",
              fontWeight: 400,
              letterSpacing: "-.01em",
              lineHeight: 1.25,
              color: "var(--tx1)",
            }}
          >
            One platform. Every framework. <em style={{ fontStyle: "normal", color: "var(--t600)" }}>AI-powered.</em>
          </h2>
          <p style={{ fontSize: 15, color: "var(--tx2)", lineHeight: 1.72, maxWidth: 400, marginLeft: "auto" }}>
            GreenMeter automates the heavy lifting — from data collection to cross-framework mapping to board-ready reports.
          </p>
        </div>

        {/* Feature 1 */}
        <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 0, borderBottom: "1px solid var(--s-bdr)", padding: "48px 0", alignItems: "start" }}>
          <div style={{ paddingRight: 48, color: "var(--tx2)", lineHeight: 1.6 }}>
            <strong style={{ display: "block", fontSize: 17, fontWeight: 500, letterSpacing: "-.01em", marginBottom: 10, color: "var(--tx1)" }}>
              Unified data collection
            </strong>
            <p style={{ fontSize: 14, color: "var(--tx2)", lineHeight: 1.7 }}>
              Connect SAP, IoT sensors, HR systems, and manual inputs into a single normalised pipeline. Every metric tracked, every source auditable.
            </p>
          </div>
          <div className="rv" style={{ background: "var(--s-bg)", padding: 20, border: "1px solid var(--s-bdr)", borderRadius: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {[
                { label: "DATA SOURCES", value: "12", sub: "Connected" },
                { label: "PARAMETERS", value: "223", sub: "Tracked" },
                { label: "COVERAGE", value: "86%", sub: "Complete" },
              ].map((card) => (
                <div key={card.label} style={{ background: "#fff", border: "1.5px solid var(--s-bdr)", borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--tx3)", marginBottom: 6 }}>{card.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "var(--tx1)", lineHeight: 1 }}>{card.value}</div>
                  <div style={{ fontSize: 10, color: "var(--t700)", fontWeight: 600, marginTop: 3 }}>{card.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Feature 2 */}
        <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 0, borderBottom: "1px solid var(--s-bdr)", padding: "48px 0", alignItems: "start" }}>
          <div style={{ paddingRight: 48, color: "var(--tx2)", lineHeight: 1.6 }}>
            <strong style={{ display: "block", fontSize: 17, fontWeight: 500, letterSpacing: "-.01em", marginBottom: 10, color: "var(--tx1)" }}>
              Cross-framework mapping
            </strong>
            <p style={{ fontSize: 14, color: "var(--tx2)", lineHeight: 1.7 }}>
              One metric, multiple standards. GreenMeter maps your data to BRSR, GRI, ESRS, and IFRS S2 simultaneously — no duplication, no drift.
            </p>
          </div>
          <div className="rv" style={{ background: "var(--s-bg)", padding: 20, border: "1px solid var(--s-bdr)", borderRadius: 10 }}>
            {[
              { framework: "BRSR Core", params: "45 parameters", pct: 84, color: "#ef4444" },
              { framework: "GRI 2021", params: "38 parameters", pct: 89, color: "var(--t500)" },
              { framework: "ESRS (CSRD)", params: "32 parameters", pct: 78, color: "#f59e0b" },
              { framework: "IFRS S1+S2", params: "28 parameters", pct: 71, color: "#6366f1" },
            ].map((fw) => (
              <div key={fw.framework} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid var(--s-bdr2)" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: fw.color, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: "var(--tx1)", flex: 1 }}>{fw.framework}</span>
                <span style={{ fontSize: 10, color: "var(--tx3)" }}>{fw.params}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: "var(--t700)" }}>{fw.pct}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Feature 3 */}
        <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 0, padding: "48px 0", alignItems: "start" }}>
          <div style={{ paddingRight: 48, color: "var(--tx2)", lineHeight: 1.6 }}>
            <strong style={{ display: "block", fontSize: 17, fontWeight: 500, letterSpacing: "-.01em", marginBottom: 10, color: "var(--tx1)" }}>
              AI-powered reporting
            </strong>
            <p style={{ fontSize: 14, color: "var(--tx2)", lineHeight: 1.7 }}>
              Generate board-ready ESG reports with AI analysis, gap detection, and improvement recommendations — all in minutes, not weeks.
            </p>
          </div>
          <div className="rv" style={{ background: "var(--s-bg)", padding: 20, border: "1px solid var(--s-bdr)", borderRadius: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { label: "REPORT PROGRESS", value: "Draft", bar: 65 },
                { label: "AI CONFIDENCE", value: "92%", bar: 92 },
              ].map((item) => (
                <div key={item.label} style={{ background: "#fff", border: "1.5px solid var(--s-bdr)", borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--tx3)", marginBottom: 6 }}>{item.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "var(--tx1)", lineHeight: 1 }}>{item.value}</div>
                  <div style={{ height: 5, background: "var(--s-bdr)", borderRadius: 3, marginTop: 8, overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 3, background: "linear-gradient(90deg, var(--t600), var(--t400))", width: `${item.bar}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── How It Works ─── */
function HowItWorks() {
  const steps = [
    {
      n: "STEP 01",
      badge: "Collect",
      title: "Connect your data sources",
      desc: "Plug in SAP, HRMS, IoT, or upload spreadsheets. GreenMeter normalises everything into a unified parameter library.",
    },
    {
      n: "STEP 02",
      badge: "Analyse",
      title: "Map, validate, score",
      desc: "AI maps each metric to the relevant framework disclosures, validates data quality, and computes your ESG scores in real time.",
    },
    {
      n: "STEP 03",
      badge: "Report",
      title: "Generate and submit",
      desc: "One-click generation of board-ready reports in BRSR, GRI, or ESRS format — with full audit trail and version control.",
    },
  ];

  return (
    <div className="section section-alt">
      <div className="w">
        <div className="sec-label">
          <div className="sec-label-n">3</div>HOW IT WORKS
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 56,
            padding: "48px 0 36px",
            borderBottom: "1px solid var(--s-bdr)",
            alignItems: "end",
          }}
        >
          <h2 style={{ fontSize: "clamp(22px, 2.5vw, 32px)", fontWeight: 400, letterSpacing: "-.01em", lineHeight: 1.25, color: "var(--tx1)" }}>
            Three steps to <em style={{ fontStyle: "normal", color: "var(--t600)" }}>unified reporting.</em>
          </h2>
          <p style={{ fontSize: 15, color: "var(--tx2)", lineHeight: 1.72, maxWidth: 400, marginLeft: "auto" }}>
            From raw data to regulatory submission — fully automated, fully auditable.
          </p>
        </div>

        <div style={{ background: "var(--surf)", border: "1px solid var(--s-bdr)", borderRadius: 12, padding: 32, marginTop: 36 }}>
          <div style={{ fontSize: 9, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--t500)", textAlign: "center", marginBottom: 24 }}>
            GREENMETER WORKFLOW
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0 }}>
            {steps.map((step, i) => (
              <div key={step.n} style={{ position: "relative" }}>
                <div
                  className="rv"
                  style={{
                    border: "1px solid var(--s-bdr)",
                    borderRadius: 10,
                    padding: 24,
                    background: "#fff",
                    margin: 12,
                    transition: "all .2s",
                  }}
                >
                  <div style={{ fontSize: 11, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--t500)", marginBottom: 8, fontWeight: 500 }}>
                    {step.n}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--t700)",
                      background: "var(--t50)",
                      border: "1px solid var(--t200)",
                      padding: "2px 8px",
                      borderRadius: 4,
                      display: "inline-block",
                      marginBottom: 10,
                    }}
                  >
                    {step.badge}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 500, color: "var(--tx1)", marginBottom: 6, letterSpacing: "-.01em" }}>{step.title}</div>
                  <p style={{ fontSize: 13, color: "var(--tx2)", lineHeight: 1.65 }}>{step.desc}</p>
                </div>
                {i < steps.length - 1 && (
                  <div style={{ position: "absolute", right: -14, top: "50%", transform: "translateY(-50%)", fontSize: 20, color: "var(--t400)", zIndex: 2 }}>
                    →
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── CTA Band ─── */
function CtaBand() {
  return (
    <div style={{ padding: "80px 0", background: "var(--tx1)" }}>
      <div className="w">
        <div style={{ maxWidth: 600 }}>
          <h2
            style={{
              fontSize: "clamp(20px, 2.5vw, 32px)",
              fontWeight: 400,
              color: "#fff",
              letterSpacing: "-.01em",
              marginBottom: 14,
              lineHeight: 1.3,
            }}
          >
            Transform your ESG reporting from a <em style={{ fontStyle: "normal", color: "var(--t400)" }}>compliance burden</em> to a{" "}
            <em style={{ fontStyle: "normal", color: "var(--t400)" }}>strategic advantage.</em>
          </h2>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,.6)", lineHeight: 1.72, marginBottom: 28, maxWidth: 440 }}>
            Join leading organisations that trust GreenMeter for automated, AI-powered ESG intelligence.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" as const }}>
            <button
              style={{
                fontSize: 13,
                color: "var(--t700)",
                background: "#fff",
                border: "1.5px solid var(--t300)",
                padding: "10px 22px",
                borderRadius: 8,
                cursor: "pointer",
                fontFamily: "var(--s-ff)",
              }}
            >
              Request a Demo
            </button>
            <Link
              href="/login"
              style={{
                fontSize: 13,
                color: "#fff",
                background: "linear-gradient(135deg, var(--t600), var(--t500))",
                border: "none",
                padding: "10px 22px",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                gap: 8,
                textDecoration: "none",
                boxShadow: "0 2px 12px rgba(13,148,136,.28)",
                fontFamily: "var(--s-ff)",
              }}
            >
              Get Started Free →
            </Link>
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.3)", marginTop: 16, letterSpacing: ".02em" }}>
            No credit card required · 14-day free trial · Cancel anytime
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Landing Page ─── */
export default function SitePage() {
  const containerRef = useReveal();

  return (
    <div ref={containerRef} style={{ paddingTop: 56 }}>
      <Hero />
      <Challenges />
      <Solution />
      <HowItWorks />
      <CtaBand />
    </div>
  );
}
