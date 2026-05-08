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
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Console", href: "/console", icon: Database },
  { label: "Rollup", href: "/rollup", icon: GitBranch },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Goals", href: "/goals", icon: Target },
  { label: "Reports", href: "/reports", icon: FileText },
  { label: "Supply Chain", href: "/supply-chain", icon: Truck },
  { label: "Knowledge", href: "/knowledge", icon: BookOpen },
  { label: "Materiality", href: "/materiality", icon: Layers },
  { label: "Industry Data", href: "/industry-data", icon: Globe },
  { label: "Settings", href: "/settings", icon: Settings },
];
