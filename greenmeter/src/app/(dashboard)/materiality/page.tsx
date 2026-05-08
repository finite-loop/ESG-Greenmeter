export default function MaterialityPage() {
  return (
    <div className="mx-auto max-w-2xl py-16">
      <div className="rounded-xl border border-[var(--bdr)] bg-[var(--surf)] p-8 text-center">
        <div className="mb-4 inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
          Coming Soon
        </div>
        <h1 className="mb-2 text-xl font-semibold text-[var(--tx1)]">
          Materiality Assessment
        </h1>
        <p className="text-sm text-[var(--tx3)] leading-relaxed">
          Double materiality assessment for identifying material ESG topics.
          Evaluate financial and impact materiality to determine which
          sustainability matters are most relevant to your organisation and
          stakeholders.
        </p>
      </div>
    </div>
  );
}
