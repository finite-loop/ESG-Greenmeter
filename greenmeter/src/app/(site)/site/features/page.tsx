"use client";

import Link from "next/link";

export default function FeaturesPage() {
  return (
    <div style={{ paddingTop: 56 }}>
      {/* Hero */}
      <div style={{ padding: "52px 32px 0", background: "#fff", borderBottom: "1px solid var(--s-bdr)" }}>
        <div className="w">
          <h1
            style={{
              fontSize: "clamp(22px, 2.5vw, 36px)",
              fontWeight: 300,
              lineHeight: 1.25,
              letterSpacing: "-.01em",
              color: "var(--tx1)",
              borderLeft: "3px solid var(--t500)",
              paddingLeft: 20,
            }}
          >
            Every metric.<br />Every framework.<br /><em style={{ fontStyle: "normal", color: "var(--t600)" }}>One platform.</em>
          </h1>
          <p style={{ fontSize: 16, color: "var(--tx2)", lineHeight: 1.7, maxWidth: 480, margin: "28px 0 0", paddingLeft: 32 }}>
            From data ingestion to compliance reporting — intelligent automation across BRSR, GRI, and ESRS standards.
          </p>

          {/* Stats */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              borderTop: "1px solid var(--s-bdr)",
              marginTop: 56,
              marginLeft: 32,
            }}
          >
            {[
              { v: "200+", l: "GRI indicators" },
              { v: "3", l: "Frameworks unified" },
              { v: "12", l: "ESRS standards" },
              { v: "9", l: "BRSR principles" },
            ].map((stat) => (
              <div key={stat.l} style={{ padding: "28px 28px 28px 0", borderRight: "1px solid var(--s-bdr)" }}>
                <div style={{ fontSize: 42, fontWeight: 300, color: "var(--t600)", letterSpacing: "-.05em", lineHeight: 1 }}>{stat.v}</div>
                <div style={{ fontSize: 11, color: "var(--tx2)", marginTop: 6, textTransform: "uppercase", letterSpacing: ".05em" }}>{stat.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Framework Coverage */}
      <div className="section">
        <div className="w">
          <div className="sec-label">
            <div className="sec-label-n">1</div>COMPLETE FRAMEWORK COVERAGE
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 0, borderTop: "1px solid var(--s-bdr)", marginTop: 0 }}>
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
              Purpose-built<br />for every<br />major standard
            </div>
            <div style={{ padding: "40px 0 40px 56px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {[
              {
                badge: "INDIA COMPLIANCE",
                badgeColor: "#ef4444",
                badgeBg: "#fef2f2",
                title: "BRSR Core",
                items: [
                  "9 Principles covered end-to-end",
                  "Section A, B, C reporting structure",
                  "Essential & Leadership indicators",
                  "SEBI filing requirement compliance",
                  "Automated cross-referencing with GRI",
                  "Board-ready disclosure format",
                ],
              },
              {
                badge: "GLOBAL STANDARD",
                badgeColor: "var(--t700)",
                badgeBg: "var(--t50)",
                title: "GRI Standards 2021",
                items: [
                  "200+ indicators tracked automatically",
                  "Universal Standards 2021 compliance",
                  "Topic-specific standards coverage",
                  "Sector-specific guidance integration",
                  "Stakeholder engagement tracking",
                  "Impact assessment frameworks",
                ],
              },
              {
                badge: "EUROPEAN REPORTING",
                badgeColor: "#f59e0b",
                badgeBg: "#fffbeb",
                title: "ESRS (CSRD)",
                items: [
                  "12 ESRS standards supported",
                  "CSRD compliance readiness",
                  "Double materiality assessment",
                  "Supply chain disclosure requirements",
                  "Taxonomy alignment tracking",
                  "EU taxonomy KPI reporting",
                ],
              },
            ].map((fw) => (
              <div
                key={fw.title}
                style={{
                  background: "var(--surf)",
                  border: "1.5px solid var(--s-bdr)",
                  borderRadius: 16,
                  padding: 28,
                  transition: "all .25s",
                  boxShadow: "var(--s-shadow-sm)",
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    letterSpacing: ".1em",
                    textTransform: "uppercase",
                    padding: "4px 10px",
                    border: `1.5px solid ${fw.badgeColor}`,
                    borderRadius: 8,
                    display: "inline-block",
                    marginBottom: 14,
                    fontWeight: 600,
                    color: fw.badgeColor,
                    background: fw.badgeBg,
                  }}
                >
                  {fw.badge}
                </span>
                <h3 style={{ fontSize: 18, fontWeight: 500, color: "var(--tx1)", marginBottom: 16, letterSpacing: "-.01em" }}>{fw.title}</h3>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {fw.items.map((item) => (
                    <li
                      key={item}
                      style={{
                        fontSize: 13,
                        color: "var(--tx2)",
                        padding: "7px 0",
                        borderBottom: "1px solid var(--s-bdr2)",
                        display: "flex",
                        gap: 10,
                        lineHeight: 1.4,
                      }}
                    >
                      <span style={{ color: "var(--t500)", flexShrink: 0, fontSize: 11, fontWeight: 700 }}>✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Features */}
      <div className="section" style={{ borderTop: "1.5px solid var(--s-bdr)", background: "linear-gradient(180deg, var(--t50) 0%, var(--s-bg2) 100%)" }}>
        <div className="w">
          <div className="sec-label">
            <div className="sec-label-n">2</div>AI-POWERED FEATURES
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 48 }}>
            {[
              {
                icon: "🧠",
                title: "Intelligent Extraction",
                desc: "Upload any document — annual reports, audit certificates, meter logs. GreenMeter reads them automatically and pulls ESG metrics without templates or manual mapping.",
              },
              {
                icon: "🗺️",
                title: "Cross-Framework Mapping",
                desc: "Enter data once — GreenMeter maps it across BRSR, GRI, and ESRS simultaneously. Identifies overlaps, fills gaps, and flags inconsistencies across all three standards.",
              },
              {
                icon: "✍️",
                title: "Narrative Generation",
                desc: "AI drafts compliant report narratives based on your data. Collaborative editing with version control. Built-in greenwashing checks flag unsupported claims.",
              },
            ].map((feat) => (
              <div
                key={feat.title}
                style={{
                  background: "var(--surf)",
                  border: "1.5px solid var(--s-bdr)",
                  borderRadius: 16,
                  padding: 32,
                  transition: "all .25s",
                  boxShadow: "var(--s-shadow-sm)",
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 16 }}>{feat.icon}</div>
                <h3 style={{ fontSize: 18, fontWeight: 500, color: "var(--tx1)", marginBottom: 10, letterSpacing: "-.01em" }}>{feat.title}</h3>
                <p style={{ fontSize: 13, color: "var(--tx2)", lineHeight: 1.7 }}>{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: "80px 0", background: "var(--tx1)" }}>
        <div className="w">
          <div style={{ maxWidth: 600 }}>
            <h2 style={{ fontSize: "clamp(20px, 2.5vw, 32px)", fontWeight: 400, color: "#fff", letterSpacing: "-.01em", marginBottom: 14, lineHeight: 1.3 }}>
              Ready to see every feature <em style={{ fontStyle: "normal", color: "var(--t400)" }}>in action?</em>
            </h2>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,.6)", lineHeight: 1.72, marginBottom: 28, maxWidth: 440 }}>
              Request a demo and see how GreenMeter can transform your ESG reporting workflow.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" as const }}>
              <button style={{ fontSize: 13, color: "var(--t700)", background: "#fff", border: "1.5px solid var(--t300)", padding: "10px 22px", borderRadius: 8, cursor: "pointer", fontFamily: "var(--s-ff)" }}>
                Request a Demo
              </button>
              <Link href="/site/pricing" style={{ fontSize: 13, color: "#fff", background: "linear-gradient(135deg, var(--t600), var(--t500))", border: "none", padding: "10px 22px", borderRadius: 8, display: "flex", alignItems: "center", gap: 8, textDecoration: "none", boxShadow: "0 2px 12px rgba(13,148,136,.28)", fontFamily: "var(--s-ff)" }}>
                View Pricing →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
