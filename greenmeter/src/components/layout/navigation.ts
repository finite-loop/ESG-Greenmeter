import {
  LayoutDashboard,
  Database,
  GitBranch,
  BarChart3,
  Target,
  FileText,
  Truck,
  BookOpen,
  Layers,
  Globe,
  Settings,
  Building2,
  ListChecks,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/", icon: LayoutDashboard },
      { label: "Rollup view", href: "/rollup", icon: GitBranch },
      { label: "Console", href: "/console", icon: Database },
    ],
  },
  {
    title: "Configuration",
    items: [
      { label: "Org & hierarchy", href: "/settings/org", icon: Building2 },
      { label: "Parameters & KPIs", href: "/settings/parameters", icon: ListChecks },
      { label: "Materiality", href: "/materiality", icon: Layers },
      { label: "Goals", href: "/goals", icon: Target },
    ],
  },
  {
    title: "Intelligence",
    items: [
      { label: "Analytics", href: "/analytics", icon: BarChart3 },
      { label: "Industry data", href: "/industry-data", icon: Globe },
    ],
  },
  {
    title: "Reporting",
    items: [
      { label: "Report builder", href: "/reports", icon: FileText },
      { label: "Supply chain", href: "/supply-chain", icon: Truck },
      { label: "Knowledge base", href: "/knowledge", icon: BookOpen },
    ],
  },
  {
    title: "Governance",
    items: [
      { label: "Audit & assurance", href: "/settings/audit", icon: ShieldCheck },
      { label: "Settings & admin", href: "/settings", icon: Settings },
    ],
  },
];

// Flat list for backward compatibility (topbar nav uses a subset)
export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

// Top navigation items (subset shown in topbar)
export const TOP_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Console", href: "/console", icon: Database },
  { label: "Rollup view", href: "/rollup", icon: GitBranch },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Reports", href: "/reports", icon: FileText },
  { label: "Goals", href: "/goals", icon: Target },
  { label: "Supply chain", href: "/supply-chain", icon: Truck },
];
