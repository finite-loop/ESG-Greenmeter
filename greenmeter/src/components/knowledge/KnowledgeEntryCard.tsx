"use client";

import { Badge } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { KnowledgeEntry } from "@/config/knowledgeBase";

const PILLAR_VARIANT = {
  E: "environment",
  S: "social",
  G: "governance",
} as const;

const CONTENT_TYPE_VARIANT = {
  standard: "teal",
  regulation: "error",
  methodology: "info",
  guide: "warning",
} as const;

const CONTENT_TYPE_LABEL = {
  standard: "Standard",
  regulation: "Regulation",
  methodology: "Methodology",
  guide: "Guide",
} as const;

interface KnowledgeEntryCardProps {
  entry: KnowledgeEntry;
  isSelected: boolean;
  onClick: () => void;
}

export function KnowledgeEntryCard({
  entry,
  isSelected,
  onClick,
}: KnowledgeEntryCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-[10px] p-3.5 border transition-all cursor-pointer",
        isSelected
          ? "bg-[var(--t50)] border-[var(--t400)] border-[1.5px]"
          : "bg-[var(--surf)] border-[var(--bdr)] hover:bg-[var(--bg)] hover:border-[var(--t400)]"
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <Badge variant={PILLAR_VARIANT[entry.pillar]}>{entry.pillar}</Badge>
        <Badge variant={CONTENT_TYPE_VARIANT[entry.contentType]}>
          {CONTENT_TYPE_LABEL[entry.contentType]}
        </Badge>
      </div>
      <div className="text-[13px] font-semibold text-[var(--tx1)] leading-[1.3] mb-1.5">
        {entry.title}
      </div>
      <div className="text-[11px] text-[var(--tx2)] leading-[1.5] mb-2">
        {entry.definition.length > 120
          ? `${entry.definition.slice(0, 120)}...`
          : entry.definition}
      </div>
      <div className="flex flex-wrap gap-1">
        {entry.tags.slice(0, 4).map((tag) => (
          <span
            key={tag}
            className="text-[9px] px-[7px] py-0.5 bg-[var(--bg)] border border-[var(--bdr)] rounded-full text-[var(--tx3)]"
          >
            {tag}
          </span>
        ))}
      </div>
      <div className="text-[9px] text-[var(--tx3)] mt-2">
        Updated {entry.updatedAt}
      </div>
    </button>
  );
}
