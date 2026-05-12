"use client";

import Link from "next/link";

export default function PricingPage() {
  return (
    <div style={{ paddingTop: 56 }}>
      {/* Hero */}
      <div style={{ padding: "52px 32px 0", background: "#fff", borderBottom: "1px solid var(--s-bdr)" }}>
        <div className="w">
          <h1
            style={{
              fontSize: "clamp(22px, 2.5vw, 36px)",
              fontWeight: 300,
              letterSpacing: "-.01em",
              lineHeight: 1.25,
              color: "var(--tx1)",
              borderLeft: "3px solid var(--t500)",
              paddingLeft: 20,
            }}
          >
            Simple, transparent pricing for <em style={{ fontStyle: "normal", color: "var(--t600)" }}>every organization.</em>
          </h1>
          <p style={{ fontSize: 16, color: "var(--tx2)", lineHeight: 1.7, maxWidth: 480, margin: "28px 0 0", paddingLeft: 32 }}>
            All plans include our core ESG reporting features. Scale as your needs grow. No hidden fees.
          </p>
        </div>
      </div>

      {/* Plans */}
      <div className="section">
        <div className="w">
          {/* Plan grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 0,
              border: "1.5px solid var(--s-bdr)",
              borderRadius: 20,
              overflow: "hidden",
              boxShadow: "var(--s-shadow)",
            }}
          >
            {/* Starter */}
            <div style={{ padding: 36, borderRight: "1.5px solid var(--s-bdr)", background: "var(--surf)" }}>
              <div style={{ fontSize: 20, fontWeight: 500, color: "var(--tx1)", marginBottom: 6, letterSpacing: "-.01em" }}>Starter</div>
              <div style={{ fontSize: "11.5px", color: "var(--tx3)", lineHeight: 1.5, marginBottom: 20, textTransform: "uppercase", letterSpacing: ".05em" }}>
                For small teams, up to 5 users
              </div>
              <div style={{ fontSize: 44, fontWeight: 300, color: "var(--tx1)", letterSpacing: "-.04em", lineHeight: 1 }}>₹0</div>
              <div style={{ fontSize: 11, color: "var(--tx3)", marginTop: 4, letterSpacing: ".04em", textTransform: "uppercase" }}>Free forever</div>
              <button style={{ fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", cursor: "pointer", padding: "11px 18px", borderRadius: 10, display: "block", width: "100%", textAlign: "center", marginTop: 20, color: "var(--t700)", background: "var(--t50)", border: "1.5px solid var(--t200)", fontFamily: "var(--s-ff)" }}>
                Get started free
              </button>
              <div style={{ height: 1, background: "var(--s-bdr)", margin: "20px 0" }} />
              <div style={{ fontSize: 9, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--tx3)", margin: "16px 0 8px" }}>INCLUDES</div>
              {["BRSR Core reporting", "Up to 3 data sources", "Basic dashboards", "Email support", "1 report export/month"].map((f) => (
                <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: "12.5px", color: "var(--tx2)", padding: "4px 0", lineHeight: 1.45 }}>
                  <span style={{ color: "var(--t400)", flexShrink: 0, fontSize: 10, marginTop: 1 }}>—</span>{f}
                </div>
              ))}
            </div>

            {/* Professional (Featured) */}
            <div style={{ padding: 36, borderRight: "1.5px solid var(--s-bdr)", background: "linear-gradient(160deg, var(--t800) 0%, var(--t600) 100%)" }}>
              <div style={{ fontSize: 20, fontWeight: 500, color: "#fff", marginBottom: 6, letterSpacing: "-.01em" }}>Professional</div>
              <div style={{ fontSize: "11.5px", color: "rgba(255,255,255,.45)", lineHeight: 1.5, marginBottom: 20, textTransform: "uppercase", letterSpacing: ".05em" }}>
                Billed annually
              </div>
              <div style={{ fontSize: 44, fontWeight: 300, color: "var(--t300)", letterSpacing: "-.04em", lineHeight: 1 }}>₹49K</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", marginTop: 4, letterSpacing: ".04em", textTransform: "uppercase" }}>Per month</div>
              <button style={{ fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", cursor: "pointer", padding: "11px 18px", borderRadius: 10, display: "block", width: "100%", textAlign: "center", marginTop: 20, color: "#fff", background: "linear-gradient(135deg, var(--t600), var(--t400))", border: "none", boxShadow: "0 4px 16px rgba(13,148,136,.3)", fontFamily: "var(--s-ff)" }}>
                Start 14-day trial
              </button>
              <div style={{ height: 1, background: "rgba(255,255,255,.12)", margin: "20px 0" }} />
              <div style={{ fontSize: 9, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(255,255,255,.3)", margin: "16px 0 8px" }}>EVERYTHING IN STARTER, PLUS</div>
              {["BRSR + GRI unified reporting", "Unlimited data sources", "AI narrative generation", "Priority support <24h", "Unlimited report exports", "Supply chain module"].map((f) => (
                <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: "12.5px", color: "rgba(255,255,255,.6)", padding: "4px 0", lineHeight: 1.45 }}>
                  <span style={{ color: "var(--t300)", flexShrink: 0, fontSize: 10, marginTop: 1 }}>—</span>{f}
                </div>
              ))}
            </div>

            {/* Enterprise */}
            <div style={{ padding: 36, background: "var(--surf)" }}>
              <div style={{ fontSize: 20, fontWeight: 500, color: "var(--tx1)", marginBottom: 6, letterSpacing: "-.01em" }}>Enterprise</div>
              <div style={{ fontSize: "11.5px", color: "var(--tx3)", lineHeight: 1.5, marginBottom: 20, textTransform: "uppercase", letterSpacing: ".05em" }}>
                For large enterprises
              </div>
              <div style={{ fontSize: 44, fontWeight: 300, color: "var(--tx1)", letterSpacing: "-.04em", lineHeight: 1 }}>Custom</div>
              <div style={{ fontSize: 11, color: "var(--tx3)", marginTop: 4, letterSpacing: ".04em", textTransform: "uppercase" }}>Contact sales</div>
              <button style={{ fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", cursor: "pointer", padding: "11px 18px", borderRadius: 10, display: "block", width: "100%", textAlign: "center", marginTop: 20, color: "var(--t700)", background: "var(--t50)", border: "1.5px solid var(--t200)", fontFamily: "var(--s-ff)" }}>
                Contact sales
              </button>
              <div style={{ height: 1, background: "var(--s-bdr)", margin: "20px 0" }} />
              <div style={{ fontSize: 9, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--tx3)", margin: "16px 0 8px" }}>EVERYTHING IN PROFESSIONAL, PLUS</div>
              {["BRSR + GRI + ESRS unified", "White-label reporting", "Custom integrations", "Dedicated account manager", "SLA guarantee", "On-premise deployment"].map((f) => (
                <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: "12.5px", color: "var(--tx2)", padding: "4px 0", lineHeight: 1.45 }}>
                  <span style={{ color: "var(--t400)", flexShrink: 0, fontSize: 10, marginTop: 1 }}>—</span>{f}
                </div>
              ))}
            </div>
          </div>

          {/* Guarantee strip */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              border: "1.5px solid var(--s-bdr)",
              borderTop: "none",
              borderRadius: "0 0 20px 20px",
              overflow: "hidden",
            }}
          >
            {[
              { v: "14", l: "Day free trial on Professional — no credit card" },
              { v: "99.9%", l: "Platform uptime SLA for Enterprise" },
              { v: "24h", l: "Access granted after approval" },
            ].map((item, i) => (
              <div key={item.v} style={{ padding: 28, borderRight: i < 2 ? "1px solid var(--s-bdr)" : "none", background: "var(--surf)" }}>
                <div style={{ fontSize: 34, fontWeight: 300, color: "var(--t600)", letterSpacing: "-.03em" }}>{item.v}</div>
                <div style={{ fontSize: 12, color: "var(--tx2)", marginTop: 8, lineHeight: 1.55 }}>{item.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Included in all plans */}
      <div className="section section-alt">
        <div className="w">
          <div className="sec-label"><div className="sec-label-n">+</div>INCLUDED IN ALL PLANS</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 36 }}>
            {[
              { icon: "🔒", title: "Enterprise Security", desc: "AES-256 encryption, role-based access control, MFA support, and SOC 2 Type II compliance." },
              { icon: "📊", title: "Real-time Dashboards", desc: "Live ESG score tracking, framework coverage, and KPI trend analysis with customisable widgets." },
              { icon: "🤖", title: "AI Recommendations", desc: "Proactive insights, gap detection, and improvement suggestions powered by machine learning." },
            ].map((feat) => (
              <div
                key={feat.title}
                style={{
                  background: "var(--surf)",
                  border: "1.5px solid var(--s-bdr)",
                  borderRadius: 16,
                  padding: 28,
                  boxShadow: "var(--s-shadow-sm)",
                }}
              >
                <div style={{ width: 40, height: 40, background: "var(--t50)", border: "1.5px solid var(--t200)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, marginBottom: 16 }}>
                  {feat.icon}
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--tx1)", marginBottom: 8, letterSpacing: "-.01em" }}>{feat.title}</h3>
                <p style={{ fontSize: 13, color: "var(--tx2)", lineHeight: 1.65 }}>{feat.desc}</p>
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
              Not sure which plan is <em style={{ fontStyle: "normal", color: "var(--t400)" }}>right?</em>
            </h2>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,.6)", lineHeight: 1.72, marginBottom: 28, maxWidth: 440 }}>
              Talk to our team — we&apos;ll help you find the right fit based on your organisation&apos;s size and reporting needs.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" as const }}>
              <Link href="/site/contact" style={{ fontSize: 13, color: "var(--t700)", background: "#fff", border: "1.5px solid var(--t300)", padding: "10px 22px", borderRadius: 8, textDecoration: "none", fontFamily: "var(--s-ff)" }}>
                Talk to our team
              </Link>
              <Link href="/login" style={{ fontSize: 13, color: "#fff", background: "linear-gradient(135deg, var(--t600), var(--t500))", border: "none", padding: "10px 22px", borderRadius: 8, display: "flex", alignItems: "center", gap: 8, textDecoration: "none", boxShadow: "0 2px 12px rgba(13,148,136,.28)", fontFamily: "var(--s-ff)" }}>
                Start for free →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
