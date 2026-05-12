"use client";

import Link from "next/link";

export default function AboutPage() {
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
            We&apos;re building the<br />future of sustainable<br /><em style={{ fontStyle: "normal", color: "var(--t600)" }}>business reporting.</em>
          </h1>
          <p style={{ fontSize: 16, color: "var(--tx2)", lineHeight: 1.7, maxWidth: 480, margin: "28px 0 0", paddingLeft: 32 }}>
            Green Meter was born from a simple frustration: ESG reporting shouldn&apos;t require an army of consultants and months of effort. We built the platform we wished existed.
          </p>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", borderTop: "1px solid var(--s-bdr)", marginTop: 56 }}>
            {[
              { v: "2022", l: "Founded" },
              { v: "50+", l: "Organizations served" },
              { v: "3", l: "Frameworks supported" },
              { v: "Blr", l: "Headquartered" },
            ].map((stat) => (
              <div key={stat.l} style={{ padding: "28px 28px 28px 0", borderRight: "1px solid var(--s-bdr)" }}>
                <div style={{ fontSize: 38, fontWeight: 300, color: "var(--t600)", letterSpacing: "-.04em" }}>{stat.v}</div>
                <div style={{ fontSize: 11, color: "var(--tx2)", marginTop: 5, textTransform: "uppercase", letterSpacing: ".05em" }}>{stat.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Values */}
      <div className="section">
        <div className="w">
          <div className="sec-label">
            <div className="sec-label-n">1</div>OUR VALUES
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 0, borderTop: "1px solid var(--s-bdr)" }}>
            <div
              style={{
                padding: "40px 40px 40px 0",
                fontSize: 11,
                letterSpacing: ".1em",
                textTransform: "uppercase",
                color: "var(--tx3)",
                paddingTop: 24,
                borderRight: "1px solid var(--s-bdr)",
                position: "sticky",
                top: 56,
                height: "fit-content",
              }}
            >
              What we believe
            </div>
            <div style={{ padding: "40px 0 40px 56px" }}>
              {[
                {
                  n: "01 — CORE VALUE",
                  title: "Radical Transparency",
                  desc: "We practice what we preach. We publish our own quarterly ESG metrics using the same platform we sell — and share the results publicly. If our tool can't handle our own reporting, it can't handle yours.",
                },
                {
                  n: "02 — CORE VALUE",
                  title: "Accuracy Over Speed",
                  desc: "ESG reporting errors have real consequences — regulatory fines, investor distrust, greenwashing accusations. Our AI is designed to flag uncertainty rather than produce confident-sounding wrong numbers.",
                },
                {
                  n: "03 — CORE VALUE",
                  title: "Accessible Compliance",
                  desc: "Sustainability reporting shouldn't be exclusive to companies that can afford Big Four consultants. We're committed to making institutional-grade ESG compliance accessible to every organization, regardless of size.",
                },
              ].map((val) => (
                <div
                  key={val.title}
                  style={{
                    background: "var(--surf)",
                    border: "1.5px solid var(--s-bdr)",
                    borderRadius: 16,
                    padding: "28px 32px",
                    marginBottom: 10,
                    transition: "all .25s",
                    boxShadow: "var(--s-shadow-sm)",
                  }}
                >
                  <div style={{ fontSize: 26, fontWeight: 300, color: "var(--tx1)", letterSpacing: "-.02em", lineHeight: 1.15, marginBottom: 0 }}>
                    {val.title}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--tx3)", letterSpacing: ".08em", textTransform: "uppercase", margin: "12px 0 10px" }}>
                    {val.n}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--tx2)", lineHeight: 1.7, letterSpacing: ".02em", textTransform: "uppercase", maxWidth: 520 }}>
                    {val.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Built By */}
      <div className="section" style={{ borderTop: "1.5px solid var(--s-bdr)" }}>
        <div className="w">
          <div className="sec-label">
            <div className="sec-label-n">2</div>BUILT BY FINITELOOP
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 0, borderTop: "1px solid var(--s-bdr)" }}>
            <div style={{ padding: "36px 28px 36px 0", borderRight: "1px solid var(--s-bdr)", fontSize: 15, fontWeight: 300, color: "var(--tx2)" }}>
              Who we are
            </div>
            <div style={{ padding: "36px 0 36px 48px" }}>
              <p style={{ fontSize: 15, color: "var(--tx2)", lineHeight: 1.78, maxWidth: 600, marginBottom: 20 }}>
                Green Meter is a product of Finiteloop, a Bengaluru-based technology company specializing in enterprise software and sustainability solutions. Finiteloop has been building software for mission-driven organizations since 2018.
              </p>
              <p style={{ fontSize: 15, color: "var(--tx2)", lineHeight: 1.78, maxWidth: 600 }}>
                Our team includes ESG experts, AI engineers, and former regulators who have worked across SEBI, the EU Commission, and leading sustainability consultancies. We understand the regulatory landscape because we&apos;ve lived in it.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Commitment */}
      <div className="section">
        <div className="w">
          <div className="sec-label">
            <div className="sec-label-n">3</div>OUR COMMITMENT
          </div>
          <div
            style={{
              background: "linear-gradient(135deg, var(--t50), var(--s-bg2))",
              border: "1.5px solid var(--t200)",
              borderRadius: 16,
              padding: 40,
              marginTop: 36,
            }}
          >
            <p style={{ fontSize: 16, color: "var(--tx1)", lineHeight: 1.78, marginBottom: 12, fontWeight: 300 }}>
              We are committed to <strong style={{ color: "var(--t700)", fontWeight: 500 }}>carbon-neutral operations</strong>. Our infrastructure runs on renewable energy, and we track and report our own sustainability metrics using GreenMeter — the same platform we offer our customers.
            </p>
            <p style={{ fontSize: 16, color: "var(--tx1)", lineHeight: 1.78, fontWeight: 300 }}>
              We believe that <strong style={{ color: "var(--t700)", fontWeight: 500 }}>transparency starts at home</strong>. If we can&apos;t hold ourselves accountable, we have no business asking our customers to do the same.
            </p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: "80px 0", background: "var(--tx1)" }}>
        <div className="w">
          <div style={{ maxWidth: 600 }}>
            <h2 style={{ fontSize: "clamp(20px, 2.5vw, 32px)", fontWeight: 400, color: "#fff", letterSpacing: "-.01em", marginBottom: 14, lineHeight: 1.3 }}>
              Join us in building a <em style={{ fontStyle: "normal", color: "var(--t400)" }}>sustainable future.</em>
            </h2>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,.6)", lineHeight: 1.72, marginBottom: 28, maxWidth: 440 }}>
              Whether you&apos;re a startup or a listed company, GreenMeter scales with your ESG ambitions.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" as const }}>
              <Link href="/login" style={{ fontSize: 13, color: "var(--t700)", background: "#fff", border: "1.5px solid var(--t300)", padding: "10px 22px", borderRadius: 8, textDecoration: "none", fontFamily: "var(--s-ff)" }}>
                See if you qualify
              </Link>
              <Link href="/site/contact" style={{ fontSize: 13, color: "#fff", background: "linear-gradient(135deg, var(--t600), var(--t500))", border: "none", padding: "10px 22px", borderRadius: 8, display: "flex", alignItems: "center", gap: 8, textDecoration: "none", boxShadow: "0 2px 12px rgba(13,148,136,.28)", fontFamily: "var(--s-ff)" }}>
                Talk to our team →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
