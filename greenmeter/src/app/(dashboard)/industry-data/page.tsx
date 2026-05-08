export default function IndustryDataPage() {
  return (
    <div className="mx-auto max-w-2xl py-16">
      <div className="rounded-xl border border-[var(--bdr)] bg-[var(--surf)] p-8 text-center">
        <div className="mb-4 inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
          Coming Soon
        </div>
        <h1 className="mb-2 text-xl font-semibold text-[var(--tx1)]">
          Industry Data Explorer
        </h1>
        <p className="text-sm text-[var(--tx3)] leading-relaxed">
          Explore ESG data across industries and benchmark against sector peers.
          Compare your performance with industry averages, identify best practices,
          and discover improvement opportunities based on sector-specific data.
        </p>
      </div>
    </div>
  );
}
