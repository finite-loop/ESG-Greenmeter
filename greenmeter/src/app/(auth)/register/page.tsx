"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const INDUSTRIES = [
  "Manufacturing",
  "Energy & Utilities",
  "Financial Services",
  "IT & Technology",
  "Pharma / Healthcare",
  "FMCG / Retail",
  "Infrastructure",
  "Other",
];

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  border: "1px solid #e2e8f0",
  borderRadius: 6,
  fontSize: 13,
  outline: "none",
  color: "var(--tx1)",
  background: "#fff",
  fontFamily: "var(--ff)",
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  color: "var(--tx2)",
  display: "block",
  marginBottom: 5,
  letterSpacing: ".02em",
  textTransform: "uppercase",
};

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: "",
    jobTitle: "",
    email: "",
    company: "",
    industry: "",
    password: "",
    confirmPassword: "",
    terms: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    setError(null);
    if (!form.fullName || !form.email || !form.company || !form.password) {
      setError("Please fill in all required fields.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!form.terms) {
      setError("You must agree to the terms and privacy policy.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          company: form.company,
          industry: form.industry || undefined,
          jobTitle: form.jobTitle || undefined,
          password: form.password,
          confirmPassword: form.confirmPassword,
        }),
      });

      if (res.status === 201) {
        router.push("/register/success");
        return;
      }

      const data = await res.json();
      setError(data?.error?.message || "Registration failed. Please try again.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 900,
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        border: "1px solid var(--bdr)",
        borderRadius: 16,
        overflow: "hidden",
        alignItems: "start",
      }}
    >
      {/* Left dark panel */}
      <div
        style={{
          background: "var(--tx1)",
          padding: "48px 44px",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* decorative circle */}
        <div
          style={{
            position: "absolute",
            bottom: -60,
            right: -60,
            width: 220,
            height: 220,
            borderRadius: "50%",
            border: "1px solid rgba(13,148,136,.2)",
          }}
        />

        <div
          style={{
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: ".12em",
            textTransform: "uppercase",
            color: "var(--t500)",
            marginBottom: 40,
          }}
        >
          Green Meter Platform
        </div>

        <div
          style={{
            fontSize: 26,
            fontWeight: 300,
            color: "#fff",
            lineHeight: 1.3,
            letterSpacing: "-.01em",
            marginBottom: 12,
          }}
        >
          Start your ESG
          <br />
          transformation{" "}
          <strong style={{ fontWeight: 500, color: "var(--t300)" }}>
            today.
          </strong>
        </div>

        <div
          style={{
            fontSize: 13,
            color: "rgba(255,255,255,.45)",
            lineHeight: 1.7,
            marginBottom: 40,
            maxWidth: 260,
          }}
        >
          Multi-framework reporting across BRSR, GRI, and ESRS — powered by AI.
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 0,
            marginTop: "auto",
          }}
        >
          {[
            { v: "<24h", l: "average approval turnaround" },
            { v: "48h", l: "to your first ESG report" },
            { v: "3", l: "frameworks supported out of the box" },
          ].map((stat, i, arr) => (
            <div
              key={stat.l}
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 12,
                padding: "14px 0",
                borderTop: "1px solid rgba(255,255,255,.07)",
                borderBottom:
                  i === arr.length - 1
                    ? "1px solid rgba(255,255,255,.07)"
                    : "none",
              }}
            >
              <span
                style={{
                  fontSize: 20,
                  fontWeight: 300,
                  color: "var(--t400)",
                  letterSpacing: "-.02em",
                  minWidth: 48,
                }}
              >
                {stat.v}
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: "rgba(255,255,255,.4)",
                  lineHeight: 1.4,
                }}
              >
                {stat.l}
              </span>
            </div>
          ))}
        </div>

        <div
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,.2)",
            marginTop: 32,
            letterSpacing: ".02em",
          }}
        >
          &copy; 2026 Green Meter by Finiteloop
        </div>
      </div>

      {/* Right form panel */}
      <div
        style={{
          background: "#fff",
          padding: "48px 44px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: ".12em",
            textTransform: "uppercase",
            color: "var(--t600)",
            marginBottom: 20,
          }}
        >
          Create account
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 400,
            color: "var(--tx1)",
            marginBottom: 6,
            letterSpacing: "-.01em",
          }}
        >
          Request access
        </div>
        <div
          style={{
            fontSize: 13,
            color: "var(--tx3)",
            marginBottom: 28,
            lineHeight: 1.5,
          }}
        >
          Fill in your details to request a platform account
        </div>

        {error && (
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 6,
              color: "#dc2626",
              fontSize: 13,
              padding: "9px 13px",
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        {/* Row: Full Name + Job Title */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>Full Name *</label>
            <input
              type="text"
              value={form.fullName}
              onChange={(e) => update("fullName", e.target.value)}
              placeholder="Jane Doe"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Job Title</label>
            <input
              type="text"
              value={form.jobTitle}
              onChange={(e) => update("jobTitle", e.target.value)}
              placeholder="Sustainability Lead"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Email */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Email Address *</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder="you@company.com"
            style={inputStyle}
          />
        </div>

        {/* Row: Company + Industry */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>Company Name *</label>
            <input
              type="text"
              value={form.company}
              onChange={(e) => update("company", e.target.value)}
              placeholder="Acme Corp"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Industry</label>
            <select
              value={form.industry}
              onChange={(e) => update("industry", e.target.value)}
              style={{ ...inputStyle, appearance: "none" as const }}
            >
              <option value="">Select industry</option>
              {INDUSTRIES.map((ind) => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "var(--bdr)", margin: "8px 0 18px" }} />

        {/* Row: Password + Confirm */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>Password *</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              placeholder="••••••••"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Confirm Password *</label>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={(e) => update("confirmPassword", e.target.value)}
              placeholder="••••••••"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Terms checkbox */}
        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            fontSize: 12,
            color: "var(--tx3)",
            marginBottom: 18,
            cursor: "pointer",
            lineHeight: 1.5,
          }}
        >
          <input
            type="checkbox"
            checked={form.terms}
            onChange={(e) => update("terms", e.target.checked)}
            style={{ marginTop: 3, accentColor: "var(--t600)" }}
          />
          <span>
            I agree to the{" "}
            <a href="/site/privacy" style={{ color: "var(--t600)", textDecoration: "none" }}>
              Privacy Policy
            </a>{" "}
            and{" "}
            <a href="/site/terms" style={{ color: "var(--t600)", textDecoration: "none" }}>
              Terms of Service
            </a>
          </span>
        </label>

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: "100%",
            padding: "10px 16px",
            background: loading ? "var(--tx3)" : "var(--tx1)",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 500,
            cursor: loading ? "not-allowed" : "pointer",
            letterSpacing: ".01em",
            fontFamily: "var(--ff)",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Submitting..." : "Create Account \u2192"}
        </button>

        {/* Approval note */}
        <div
          style={{
            marginTop: 14,
            padding: "10px 13px",
            background: "var(--t50)",
            border: "1px solid var(--t200)",
            borderRadius: 6,
            fontSize: 12,
            color: "var(--t800)",
            lineHeight: 1.5,
          }}
        >
          Registration requires approval. You will receive an email once your
          account is activated.
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "var(--bdr)", margin: "20px 0" }} />

        <div style={{ fontSize: 12, color: "var(--tx3)" }}>
          Already have an account?{" "}
          <a
            href="/login"
            style={{
              color: "var(--t600)",
              fontWeight: 500,
              textDecoration: "none",
              cursor: "pointer",
            }}
          >
            Sign in &rarr;
          </a>
        </div>

        <a
          href="/site"
          style={{
            fontSize: 12,
            color: "var(--tx3)",
            textDecoration: "none",
            cursor: "pointer",
            display: "inline-block",
            marginTop: 14,
          }}
        >
          &larr; Back to home
        </a>
      </div>
    </div>
  );
}
