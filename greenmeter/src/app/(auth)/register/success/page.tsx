"use client";

export default function RegisterSuccessPage() {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: 480,
        border: "1px solid var(--bdr)",
        borderRadius: 16,
        background: "#fff",
        padding: "56px 44px",
        textAlign: "center",
      }}
    >
      {/* Green checkmark */}
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "var(--t50)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 24px",
        }}
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--t600)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      <div
        style={{
          fontSize: 22,
          fontWeight: 400,
          color: "var(--tx1)",
          marginBottom: 12,
          letterSpacing: "-.01em",
        }}
      >
        Application submitted
      </div>

      <div
        style={{
          fontSize: 13,
          color: "var(--tx3)",
          lineHeight: 1.7,
          marginBottom: 32,
          maxWidth: 340,
          margin: "0 auto 32px",
        }}
      >
        We&apos;ve received your registration request. Our team will review your
        application and you&apos;ll receive an email once your account is
        activated.
      </div>

      <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
        <a
          href="/login"
          style={{
            padding: "10px 20px",
            background: "var(--tx1)",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            letterSpacing: ".01em",
            fontFamily: "var(--ff)",
            textDecoration: "none",
          }}
        >
          Go to sign in &rarr;
        </a>
        <a
          href="/site"
          style={{
            padding: "10px 20px",
            background: "#fff",
            color: "var(--tx2)",
            border: "1px solid var(--bdr)",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            letterSpacing: ".01em",
            fontFamily: "var(--ff)",
            textDecoration: "none",
          }}
        >
          Back to home
        </a>
      </div>
    </div>
  );
}
