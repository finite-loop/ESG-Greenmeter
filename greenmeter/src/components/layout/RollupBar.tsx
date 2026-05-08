"use client";

import { cn } from "@/lib/utils";

export interface RollupLevel {
  id: string;
  label: string;
  color: string;
  parent: string | null;
}

interface RollupBarProps {
  levels: RollupLevel[];
  activeLevel: string;
  onSetLevel: (id: string) => void;
}

export function RollupBar({ levels, activeLevel, onSetLevel }: RollupBarProps) {
  return (
    <div className="flex items-center gap-1 border-b border-[var(--bdr2)] bg-[var(--surf)] px-4 py-1.5">
      <span className="mr-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--tx3)]">
        Viewing at:
      </span>
      {levels.map((level, i) => (
        <span key={level.id} className="contents">
          {i > 0 && (
            <span className="text-[11px] text-[var(--tx3)]" aria-hidden="true">
              ›
            </span>
          )}
          <button
            onClick={() => onSetLevel(level.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
              level.id === activeLevel
                ? "bg-[var(--t50)] text-[var(--t800)]"
                : "text-[var(--tx3)] hover:bg-[var(--bg)] hover:text-[var(--tx2)]"
            )}
          >
            <span
              className="inline-block h-[6px] w-[6px] rounded-full"
              style={{ background: level.color }}
              aria-hidden="true"
            />
            {level.label}
          </button>
        </span>
      ))}
    </div>
  );
}
