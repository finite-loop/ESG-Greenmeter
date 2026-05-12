"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { label: "product", href: "/site/features" },
  { label: "pricing", href: "/site/pricing" },
  { label: "about us", href: "/site/about" },
  { label: "contact", href: "/site/contact" },
];

function SiteNav() {
  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 999,
        height: 56,
        background: "rgba(255,255,255,.92)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--s-bdr)",
        display: "flex",
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1280,
          margin: "0 auto",
          padding: "0 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Logo */}
        <Link href="/site" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div
            style={{
              width: 30,
              height: 30,
              background: "linear-gradient(135deg, var(--t600), var(--t400))",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 8px rgba(13,148,136,.3)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M8 2C5 2 2 5 2 8c0 2.2 1.2 4.1 3 5.2V11c0-1.7 1.3-3 3-3s3 1.3 3 3v2.2C12.8 12.1 14 10.2 14 8c0-3-2.5-6-6-6z" fill="white" opacity=".9" />
              <circle cx="8" cy="8" r="2" fill="white" />
            </svg>
          </div>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--tx1)", letterSpacing: "-.01em" }}>
            green<span style={{ color: "var(--t600)" }}>meter</span>
          </span>
        </Link>

        {/* Nav links */}
        <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                fontSize: "11.5px",
                fontWeight: 500,
                color: "var(--tx2)",
                textDecoration: "none",
                padding: "7px 16px",
                letterSpacing: ".04em",
                textTransform: "uppercase",
                opacity: 0.8,
                borderRadius: 6,
                transition: "all .15s",
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Link
            href="/login"
            style={{
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: ".06em",
              color: "var(--t700)",
              background: "transparent",
              border: "1.5px solid var(--t300)",
              padding: "7px 18px",
              borderRadius: 8,
              textTransform: "uppercase",
              textDecoration: "none",
              transition: "all .15s",
            }}
          >
            login
          </Link>
          <Link
            href="/login"
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: ".06em",
              color: "#fff",
              background: "linear-gradient(135deg, var(--t600), var(--t500))",
              border: "none",
              padding: "7px 18px",
              borderRadius: 8,
              textTransform: "uppercase",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: 6,
              boxShadow: "0 2px 12px rgba(13,148,136,.28)",
            }}
          >
            get started →
          </Link>
        </div>
      </div>
    </nav>
  );
}

function SiteFooter() {
  return (
    <footer style={{ background: "var(--tx1)", borderTop: "1px solid rgba(255,255,255,.06)", padding: "56px 0 28px" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 32px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr 1fr",
            gap: 40,
            paddingBottom: 40,
            borderBottom: "1px solid rgba(255,255,255,.06)",
          }}
        >
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#fff", marginBottom: 12, letterSpacing: ".02em" }}>
              green<span style={{ color: "var(--t400)" }}>meter</span>
            </div>
            <div style={{ fontSize: "12.5px", color: "rgba(255,255,255,.35)", lineHeight: 1.75, maxWidth: 230 }}>
              AI-powered ESG analytics platform for unified BRSR, GRI, and ESRS reporting across your organisation.
            </div>
          </div>

          {[
            { title: "Product", links: ["Features", "Pricing", "Integrations", "API"] },
            { title: "Company", links: ["About", "Contact", "Careers", "Blog"] },
            { title: "Legal", links: ["Privacy Policy", "Terms of Service"] },
          ].map((col) => (
            <div key={col.title}>
              <h4
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: ".14em",
                  color: "rgba(255,255,255,.25)",
                  marginBottom: 16,
                }}
              >
                {col.title}
              </h4>
              {col.links.map((link) => (
                <div
                  key={link}
                  style={{
                    fontSize: 12,
                    color: "rgba(255,255,255,.4)",
                    marginBottom: 10,
                    letterSpacing: ".02em",
                    cursor: "pointer",
                  }}
                >
                  {link}
                </div>
              ))}
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: 22,
            fontSize: "10.5px",
            letterSpacing: ".06em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,.2)",
          }}
        >
          <div>&copy; 2026 Green Meter by Finiteloop. All rights reserved.</div>
          <div style={{ display: "flex", gap: 18 }}>
            <span style={{ cursor: "pointer" }}>privacy policy</span>
            <span style={{ cursor: "pointer" }}>terms of service</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="site">
      <SiteNav />
      {children}
      <SiteFooter />
    </div>
  );
}
