"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_GROUPS } from "./navigation";

export function Sidebar() {
  const pathname = usePathname();

  function isActive(href: string): boolean {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <aside
      className="flex flex-col flex-shrink-0 bg-[var(--surf)] border-r-[0.5px] border-[var(--bdr)] overflow-y-auto"
      style={{
        width: "var(--sbw)",
        padding: "10px 8px",
        position: "sticky",
        top: "var(--topH)",
        height: "calc(100vh - var(--topH))",
      }}
    >
      {NAV_GROUPS.map((group) => (
        <div key={group.title}>
          {/* Section header */}
          <div
            className="text-[var(--tx3)] uppercase font-bold"
            style={{
              fontSize: "9px",
              letterSpacing: "0.08em",
              padding: "9px 10px 3px",
            }}
          >
            {group.title}
          </div>

          {/* Section items */}
          {group.items.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center rounded-[7px] transition-colors",
                  active
                    ? "bg-[var(--t50)] text-[var(--t800)] font-semibold border-l-[var(--t700)]"
                    : "text-[var(--tx2)] hover:bg-[var(--bg)] hover:text-[var(--tx1)] border-l-transparent"
                )}
                style={{
                  gap: "7px",
                  padding: "7px 10px",
                  borderLeft: `2px solid ${active ? "var(--t700)" : "transparent"}`,
                  fontSize: "12px",
                  fontWeight: active ? 600 : 500,
                }}
              >
                <Icon
                  className="flex-shrink-0"
                  style={{
                    width: "13px",
                    height: "13px",
                    opacity: active ? 1 : 0.5,
                  }}
                />
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className="ml-auto rounded-[3px] font-bold"
                    style={{
                      fontSize: "9px",
                      background: "var(--redbg)",
                      color: "var(--redtx)",
                      padding: "1px 5px",
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </aside>
  );
}
