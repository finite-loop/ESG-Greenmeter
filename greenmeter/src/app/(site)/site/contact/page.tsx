"use client";

import Link from "next/link";

export default function ContactPage() {
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
            Ready for unified<br />BRSR, GRI, and<br /><em style={{ fontStyle: "normal", color: "var(--t600)" }}>ESRS reporting?</em>
          </h1>
          <p style={{ fontSize: 16, color: "var(--tx2)", lineHeight: 1.7, maxWidth: 480, margin: "28px 0 0", paddingLeft: 32 }}>
            We review each inquiry to ensure we can provide the value you need. Tell us about your needs and we&apos;ll be in touch within 24 hours.
          </p>

          {/* Stats */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              border: "1.5px solid var(--s-bdr)",
              borderRadius: 16,
              overflow: "hidden",
              marginTop: 48,
              boxShadow: "var(--s-shadow-sm)",
              marginBottom: 52,
            }}
          >
            {[
              { v: "<24hr", l: "Response guarantee" },
              { v: "98%", l: "Customer satisfaction" },
              { v: "24/7", l: "Support availability" },
              { v: "15min", l: "Avg. call wait time" },
            ].map((stat, i) => (
              <div key={stat.l} style={{ padding: 24, borderRight: i < 3 ? "1px solid var(--s-bdr)" : "none", textAlign: "center", background: "var(--surf)" }}>
                <div style={{ fontSize: 28, fontWeight: 300, color: "var(--t600)", letterSpacing: "-.03em" }}>{stat.v}</div>
                <div style={{ fontSize: 10, color: "var(--tx2)", marginTop: 5, textTransform: "uppercase", letterSpacing: ".05em" }}>{stat.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Contact form + info */}
      <div className="section">
        <div className="w">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 340px",
              gap: 0,
              border: "1.5px solid var(--s-bdr)",
              borderRadius: 20,
              overflow: "hidden",
              boxShadow: "var(--s-shadow)",
            }}
          >
            {/* Form */}
            <div style={{ padding: 40, borderRight: "1px solid var(--s-bdr)", background: "var(--surf)" }}>
              <h3 style={{ fontSize: 20, fontWeight: 500, color: "var(--tx1)", marginBottom: 24, letterSpacing: "-.01em" }}>Send us a message</h3>
              {[
                { label: "Your Name", type: "text", placeholder: "Full name" },
                { label: "Email Address", type: "email", placeholder: "you@company.com" },
                { label: "Company", type: "text", placeholder: "Company name" },
              ].map((field) => (
                <div key={field.label} style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--tx2)", display: "block", marginBottom: 6 }}>
                    {field.label}
                  </label>
                  <input
                    type={field.type}
                    placeholder={field.placeholder}
                    style={{
                      width: "100%",
                      padding: "11px 14px",
                      border: "1.5px solid var(--s-bdr)",
                      borderRadius: 10,
                      fontSize: 14,
                      outline: "none",
                      color: "var(--tx1)",
                      background: "var(--s-bg)",
                      fontFamily: "var(--s-ff)",
                    }}
                  />
                </div>
              ))}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--tx2)", display: "block", marginBottom: 6 }}>
                  Message
                </label>
                <textarea
                  placeholder="Tell us about your ESG reporting needs..."
                  rows={4}
                  style={{
                    width: "100%",
                    padding: "11px 14px",
                    border: "1.5px solid var(--s-bdr)",
                    borderRadius: 10,
                    fontSize: 14,
                    outline: "none",
                    color: "var(--tx1)",
                    background: "var(--s-bg)",
                    resize: "vertical",
                    fontFamily: "var(--s-ff)",
                  }}
                />
              </div>
              <button
                style={{
                  width: "100%",
                  padding: 12,
                  background: "linear-gradient(135deg, var(--t700), var(--t500))",
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  fontSize: "11.5px",
                  letterSpacing: ".08em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  fontWeight: 600,
                  marginTop: 4,
                  boxShadow: "0 4px 16px rgba(13,148,136,.25)",
                  fontFamily: "var(--s-ff)",
                }}
              >
                Send message →
              </button>
            </div>

            {/* Info side */}
            <div style={{ padding: 32, background: "var(--s-bg)" }}>
              {[
                { icon: "📧", tag: "EMAIL", value: "hello@greenmeter.ai", plain: false },
                { icon: "📞", tag: "PHONE", value: "+91 98940 98940", plain: false },
                { icon: "📍", tag: "OFFICE", value: "FiniteLoop, Work District 45, Bengaluru, Karnataka", plain: true },
              ].map((info, i) => (
                <div key={info.tag} style={{ borderBottom: i < 2 ? "1px solid var(--s-bdr)" : "none", padding: "18px 0" }}>
                  <div style={{ fontSize: 18, marginBottom: 8 }}>{info.icon}</div>
                  <div style={{ fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--tx3)", marginBottom: 5 }}>{info.tag}</div>
                  <div style={{ fontSize: 13, color: info.plain ? "var(--tx2)" : "var(--t700)", fontWeight: info.plain ? 400 : 600, lineHeight: info.plain ? 1.65 : undefined }}>
                    {info.value}
                  </div>
                </div>
              ))}

              {/* Response times */}
              <div style={{ borderTop: "1px solid var(--s-bdr)", padding: "18px 0 0" }}>
                <div style={{ fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--tx3)", marginBottom: 10 }}>RESPONSE TIMES</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                  {[
                    { v: "<24h", l: "Email" },
                    { v: "<1h", l: "Priority" },
                    { v: "24/7", l: "Emergency" },
                  ].map((rt) => (
                    <div key={rt.l} style={{ padding: 10, background: "var(--t50)", border: "1.5px solid var(--t200)", borderRadius: 10, textAlign: "center" }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--t700)" }}>{rt.v}</div>
                      <div style={{ fontSize: 9, color: "var(--tx2)", marginTop: 3, textTransform: "uppercase", letterSpacing: ".04em" }}>{rt.l}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div style={{ marginTop: 80 }}>
            <div className="sec-label" style={{ marginBottom: 0 }}>
              <div className="sec-label-n">?</div>FREQUENTLY ASKED
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 56px" }}>
              <div>
                {[
                  {
                    q: "How quickly can we get started?",
                    a: "Most organisations are fully onboarded within 48 hours. Our team helps you connect data sources, configure framework mappings, and run your first compliance check — all within the first two days.",
                  },
                  {
                    q: "Do you offer custom solutions?",
                    a: "Yes. Enterprise customers get custom integrations, dedicated account management, and white-label reporting. We also support on-premise deployment for organisations with strict data residency requirements.",
                  },
                ].map((faq) => (
                  <div key={faq.q} style={{ borderTop: "1px solid var(--s-bdr)", padding: "22px 0" }}>
                    <div style={{ fontSize: 15, fontWeight: 500, color: "var(--tx1)", marginBottom: 8, letterSpacing: "-.01em" }}>{faq.q}</div>
                    <div style={{ fontSize: "13.5px", color: "var(--tx2)", lineHeight: 1.7 }}>{faq.a}</div>
                  </div>
                ))}
              </div>
              <div>
                {[
                  {
                    q: "What kind of support do you provide?",
                    a: "All plans include email support. Professional users get priority support with <24h response times. Enterprise customers receive a dedicated account manager with same-day response guarantee.",
                  },
                  {
                    q: "Is my data secure?",
                    a: "Absolutely. All data is encrypted at rest (AES-256) and in transit (TLS 1.2+). We use role-based access control, offer MFA, and are SOC 2 Type II compliant. Your documents are never used to train AI models.",
                  },
                ].map((faq) => (
                  <div key={faq.q} style={{ borderTop: "1px solid var(--s-bdr)", padding: "22px 0" }}>
                    <div style={{ fontSize: 15, fontWeight: 500, color: "var(--tx1)", marginBottom: 8, letterSpacing: "-.01em" }}>{faq.q}</div>
                    <div style={{ fontSize: "13.5px", color: "var(--tx2)", lineHeight: 1.7 }}>{faq.a}</div>
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
