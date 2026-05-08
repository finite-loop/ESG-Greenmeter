import Link from "next/link";

export default function AccessDeniedPage() {
  return (
    <div className="w-full max-w-sm rounded-xl border border-[var(--bdr)] bg-[var(--surf)] p-8 text-center">
      <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--red)]">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      </div>
      <h1 className="mb-1 text-lg font-bold text-[var(--tx1)]">Access Denied</h1>
      <p className="mb-6 text-xs text-[var(--tx3)]">
        Your account is not authorized to access GreenMeter AI. Please contact
        your organization administrator to request access.
      </p>
      <Link
        href="/login"
        className="inline-flex items-center justify-center gap-1.5 rounded-[7px] bg-[var(--t700)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--t800)] transition-colors"
      >
        Back to Sign In
      </Link>
    </div>
  );
}
