"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { TOP_NAV_ITEMS } from "./navigation";
import { signOutAction } from "@/lib/auth-actions";

interface TopBarProps {
  userName?: string;
  userEmail?: string;
  userRole?: string;
  tenantName?: string;
}

export function TopBar({
  userName = "User",
  userEmail = "",
  userRole = "viewer",
  tenantName = "Organisation",
}: TopBarProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const initials =
    userName
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  const roleLabel =
    userRole === "admin"
      ? "Admin"
      : userRole === "analyst"
        ? "Analyst"
        : userRole === "department"
          ? "Department"
          : "Viewer";

  function isActive(href: string): boolean {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [menuOpen]);

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
        {/* Tenant / org indicator */}
        <div
          className="text-[var(--tx3)] bg-[var(--bg)] border-[0.5px] border-[var(--bdr)] rounded-[6px]"
          style={{
            fontSize: "10px",
            fontWeight: 600,
            padding: "4px 10px",
            maxWidth: "180px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {tenantName}
        </div>

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

        {/* Avatar + dropdown */}
        <div ref={menuRef} style={{ position: "relative" }}>
          <button
            className="flex items-center justify-center rounded-full bg-[var(--t700)] text-white font-semibold cursor-pointer flex-shrink-0"
            style={{ width: "28px", height: "28px", fontSize: "11px" }}
            onClick={() => setMenuOpen((o) => !o)}
            title={userName}
          >
            {initials}
          </button>

          {/* Dropdown menu */}
          {menuOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                right: 0,
                width: "260px",
                background: "var(--surf)",
                border: "0.5px solid var(--bdr)",
                borderRadius: "10px",
                boxShadow: "0 8px 24px rgba(0,0,0,.12)",
                zIndex: 300,
                overflow: "hidden",
              }}
            >
              {/* User info */}
              <div style={{ padding: "14px 16px", borderBottom: "0.5px solid var(--bdr)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      background: "var(--t700)",
                      color: "#fff",
                      fontSize: "13px",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {initials}
                  </div>
                  <div style={{ overflow: "hidden" }}>
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: 700,
                        color: "var(--tx1)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {userName}
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "var(--tx3)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {userEmail}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
                  <span
                    style={{
                      fontSize: "9px",
                      fontWeight: 700,
                      padding: "2px 7px",
                      borderRadius: "4px",
                      background: roleLabel === "Admin" ? "var(--t50)" : "var(--bg)",
                      color: roleLabel === "Admin" ? "var(--t700)" : "var(--tx2)",
                      border: "0.5px solid var(--bdr)",
                    }}
                  >
                    {roleLabel}
                  </span>
                </div>
              </div>

              {/* Organisation */}
              <div style={{ padding: "10px 16px", borderBottom: "0.5px solid var(--bdr)" }}>
                <div
                  style={{
                    fontSize: "9px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                    color: "var(--tx3)",
                    marginBottom: "3px",
                  }}
                >
                  Organisation
                </div>
                <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--tx1)" }}>
                  {tenantName}
                </div>
              </div>

              {/* Actions */}
              <div style={{ padding: "6px 8px" }}>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    signOutAction();
                  }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 10px",
                    fontSize: "12px",
                    fontWeight: 500,
                    color: "var(--red)",
                    background: "none",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLElement).style.background = "var(--redbg)")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLElement).style.background = "none")
                  }
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
