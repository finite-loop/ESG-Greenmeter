"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError(null);

    if (!email || !password) {
      setError("Please enter email and password.");
      return;
    }

    setLoading(true);
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/",
    });
    setLoading(false);

    if (result?.error) {
      setError("Incorrect email or password.");
    } else if (result?.url) {
      window.location.href = result.url;
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
          ESG reporting<br />
          made <strong style={{ fontWeight: 500, color: "var(--t300)" }}>intelligent.</strong>
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
          Unified BRSR, GRI, and ESRS compliance from a single AI-powered dashboard.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 0, marginTop: "auto" }}>
          {[
            { v: "94%", l: "average BRSR compliance score across customers" },
            { v: "3\u00d7", l: "faster reporting compared to manual workflows" },
            { v: "200+", l: "GRI indicators tracked automatically" },
          ].map((stat, i, arr) => (
            <div
              key={stat.l}
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 12,
                padding: "14px 0",
                borderTop: "1px solid rgba(255,255,255,.07)",
                borderBottom: i === arr.length - 1 ? "1px solid rgba(255,255,255,.07)" : "none",
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
              <span style={{ fontSize: 12, color: "rgba(255,255,255,.4)", lineHeight: 1.4 }}>
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
          Sign in
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
          Welcome back
        </div>
        <div style={{ fontSize: 13, color: "var(--tx3)", marginBottom: 28, lineHeight: 1.5 }}>
          Enter your credentials to access the platform
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

        <div style={{ marginBottom: 14 }}>
          <label
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: "var(--tx2)",
              display: "block",
              marginBottom: 5,
              letterSpacing: ".02em",
              textTransform: "uppercase",
            }}
          >
            Email address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            style={{
              width: "100%",
              padding: "9px 12px",
              border: "1px solid #e2e8f0",
              borderRadius: 6,
              fontSize: 13,
              outline: "none",
              color: "var(--tx1)",
              background: "#fff",
              fontFamily: "var(--ff)",
            }}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: "var(--tx2)",
              display: "block",
              marginBottom: 5,
              letterSpacing: ".02em",
              textTransform: "uppercase",
            }}
          >
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            style={{
              width: "100%",
              padding: "9px 12px",
              border: "1px solid #e2e8f0",
              borderRadius: 6,
              fontSize: 13,
              outline: "none",
              color: "var(--tx1)",
              background: "#fff",
              fontFamily: "var(--ff)",
            }}
          />
          <div style={{ textAlign: "right", marginTop: 6 }}>
            <span
              style={{
                fontSize: 12,
                color: "var(--t600)",
                cursor: "pointer",
              }}
            >
              Forgot password?
            </span>
          </div>
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: "100%",
            padding: "10px 16px",
            background: loading ? "var(--tx2)" : "var(--tx1)",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 500,
            cursor: loading ? "not-allowed" : "pointer",
            letterSpacing: ".01em",
            marginTop: 6,
            fontFamily: "var(--ff)",
          }}
        >
          {loading ? "Signing in..." : "Sign in \u2192"}
        </button>

        <div style={{ height: 1, background: "var(--bdr)", margin: "20px 0" }} />

        <div style={{ fontSize: 12, color: "var(--tx3)" }}>
          No account yet?{" "}
          <a
            href="/register"
            style={{
              color: "var(--t600)",
              fontWeight: 500,
              textDecoration: "none",
              cursor: "pointer",
            }}
          >
            Request access &rarr;
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
