"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { TOP_NAV_ITEMS } from "./navigation";

interface TopBarProps {
  userName?: string;
  tenantName?: string;
  onSignOut?: () => void;
}

export function TopBar({
  userName = "User",
  onSignOut,
}: TopBarProps) {
  const pathname = usePathname();

  const initials =
    userName
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  function isActive(href: string): boolean {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <header
      className="flex items-center bg-[var(--surf)] border-b-[0.5px] border-[var(--bdr)]"
      style={{
        height: "var(--topH)",
        paddingRight: "14px",
        position: "sticky",
        top: 0,
        zIndex: 200,
      }}
    >
      {/* Logo area — matches sidebar width */}
      <div
        className="flex items-center flex-shrink-0 border-r-[0.5px] border-[var(--bdr)] h-full"
        style={{ width: "var(--sbw)", gap: "8px", padding: "0 14px" }}
      >
        <div
          className="flex items-center justify-center rounded-[7px] bg-[var(--t700)]"
          style={{ width: "24px", height: "24px" }}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M8 2C5 2 2 5 2 8c0 2.2 1.2 4.1 3 5.2V11c0-1.7 1.3-3 3-3s3 1.3 3 3v2.2C12.8 12.1 14 10.2 14 8c0-3-2.5-6-6-6z"
              fill="white"
              opacity=".9"
            />
            <circle cx="8" cy="8" r="2" fill="white" />
          </svg>
        </div>
        <span
          className="text-[var(--t900)] font-bold"
          style={{ fontSize: "14px", letterSpacing: "-0.3px" }}
        >
          GreenMeter{" "}
          <em className="font-normal text-[var(--t600)] not-italic">AI</em>
        </span>
      </div>

      {/* Top Navigation */}
      <nav
        className="flex items-center flex-1 overflow-x-auto"
        style={{ gap: "1px", padding: "0 8px" }}
      >
        {TOP_NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "whitespace-nowrap rounded-[6px] transition-all",
                active
                  ? "bg-[var(--t50)] text-[var(--t700)] font-semibold"
                  : "text-[var(--tx2)] hover:bg-[var(--bg)] hover:text-[var(--tx1)]"
              )}
              style={{
                fontSize: "12px",
                fontWeight: active ? 600 : 500,
                padding: "5px 9px",
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Right side actions */}
      <div
        className="flex items-center flex-shrink-0 ml-auto"
        style={{ gap: "7px" }}
      >
        {/* Command palette hint */}
        <button
          className="text-[var(--tx3)] bg-[var(--bg)] border-[0.5px] border-[var(--bdr)] rounded-[6px] cursor-pointer"
          style={{
            fontFamily: "var(--fm)",
            fontSize: "11px",
            padding: "4px 10px",
          }}
          onClick={() => {
            /* placeholder for cmd+k */
          }}
        >
          ⌘ K
        </button>

        {/* Notification bell */}
        <button
          className="flex items-center justify-center rounded-[7px] border-[0.5px] border-[var(--bdr)] bg-[var(--surf)] cursor-pointer relative"
          style={{ width: "30px", height: "30px" }}
        >
          <Bell style={{ width: "14px", height: "14px" }} className="text-[var(--tx2)]" />
          <span
            className="absolute rounded-full bg-[var(--red)]"
            style={{
              top: "4px",
              right: "4px",
              width: "6px",
              height: "6px",
              border: "1.5px solid #fff",
              animation: "pulse 2s infinite",
            }}
          />
        </button>

        {/* Avatar */}
        <button
          className="flex items-center justify-center rounded-full bg-[var(--t700)] text-white font-semibold cursor-pointer flex-shrink-0"
          style={{ width: "28px", height: "28px", fontSize: "11px" }}
          onClick={onSignOut}
          title="Sign out"
        >
          {initials}
        </button>
      </div>
    </header>
  );
}
