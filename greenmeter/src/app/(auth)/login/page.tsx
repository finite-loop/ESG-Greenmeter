"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/Button";

const devAuthEnabled = process.env.NEXT_PUBLIC_DEV_AUTH_ENABLED === "true";

function MicrosoftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 21 21" fill="none">
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}

function DevLoginForm() {
  const [email, setEmail] = useState("admin@greenmeter.local");

  return (
    <>
      <div className="my-4 flex items-center gap-2">
        <div className="h-px flex-1 bg-[var(--bdr)]" />
        <span className="text-xs text-[var(--tx3)]">Dev login</span>
        <div className="h-px flex-1 bg-[var(--bdr)]" />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          signIn("dev-credentials", { email, callbackUrl: "/" });
        }}
        className="flex flex-col gap-3"
      >
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@greenmeter.local"
          className="w-full rounded-lg border border-[var(--bdr)] bg-[var(--surf)] px-3 py-2 text-sm text-[var(--tx1)] outline-none focus:border-[var(--t500)]"
        />
        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full justify-center"
        >
          Sign in as Dev User
        </Button>
      </form>
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm rounded-xl border border-[var(--bdr)] bg-[var(--surf)] p-8 text-center">
      <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--t700)]">
        <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
          <path
            d="M8 2C5 2 2 5 2 8c0 2.2 1.2 4.1 3 5.2V11c0-1.7 1.3-3 3-3s3 1.3 3 3v2.2C12.8 12.1 14 10.2 14 8c0-3-2.5-6-6-6z"
            fill="white"
            opacity=".9"
          />
          <circle cx="8" cy="8" r="2" fill="white" />
        </svg>
      </div>
      <h1 className="mb-1 text-lg font-bold text-[var(--tx1)]">GreenMeter AI</h1>
      <p className="mb-6 text-xs text-[var(--tx3)]">
        Sign in to your ESG intelligence platform
      </p>
      <Button
        variant="primary"
        size="lg"
        className="w-full justify-center"
        onClick={() => signIn("microsoft-entra-id", { callbackUrl: "/" })}
      >
        <MicrosoftIcon />
        Sign in with Microsoft
      </Button>
      {devAuthEnabled && <DevLoginForm />}
    </div>
  );
}
