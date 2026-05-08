/**
 * Route mapping from legacy AppShell screen IDs to App Router paths.
 * Used by migrated screen components that still call navigate(screenId).
 */
export const SCREEN_ROUTES: Record<string, string> = {
  dashboard: "/",
  console: "/console",
  rollup: "/rollup",
  analytics: "/analytics",
  goals: "/goals",
  reports: "/reports",
  supplychain: "/supply-chain",
  settings: "/settings",
  params: "/settings/parameters",
  knowledge: "/knowledge",
  entity: "/rollup",
  materiality: "/materiality",
  audit: "/settings/audit",
  peers: "/settings/peers",
  industrydata: "/industry-data",
};
