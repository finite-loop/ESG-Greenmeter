"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/components/ui";

interface TopBarProps {
  userName?: string;
  tenantName?: string;
  onSignOut?: () => void;
}

export function TopBar({
  userName = "User",
  tenantName = "Organization",
  onSignOut,
}: TopBarProps) {
  const initials = userName
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "U";

  return (
    <header className="flex h-[var(--topH)] items-center justify-between border-b border-[var(--bdr)] bg-[var(--surf)] px-4">
      <div className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--t800)]">
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
        <span className="text-[13px] font-semibold text-[var(--tx1)]">
          GreenMeter{" "}
          <em className="font-normal text-[var(--t600)]">AI</em>
        </span>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-[11px] text-[var(--tx3)]">{tenantName}</span>

        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--t50)] text-[10px] font-bold text-[var(--t800)]">
          {initials}
        </div>

        {onSignOut && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onSignOut}
            aria-label="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </header>
  );
}
