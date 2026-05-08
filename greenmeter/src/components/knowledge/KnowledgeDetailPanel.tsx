"use client";

import { Badge } from "@/components/ui";
import { X, ChevronRight } from "lucide-react";
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

interface KnowledgeDetailPanelProps {
  entry: KnowledgeEntry;
  onClose: () => void;
  onNavigateToParam: (paramCode: string) => void;
}

export function KnowledgeDetailPanel({
  entry,
  onClose,
  onNavigateToParam,
}: KnowledgeDetailPanelProps) {
  return (
    <div className="bg-[var(--surf)] border border-[var(--t300)] rounded-xl overflow-hidden sticky top-[60px] max-h-[calc(100vh-80px)] overflow-y-auto">
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3.5">
          <div className="flex gap-1.5">
            <Badge variant={PILLAR_VARIANT[entry.pillar]}>
              {entry.pillar}
            </Badge>
            <Badge variant={CONTENT_TYPE_VARIANT[entry.contentType]}>
              {CONTENT_TYPE_LABEL[entry.contentType]}
            </Badge>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--tx3)] hover:text-[var(--tx1)] transition-colors p-0.5"
            aria-label="Close detail panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Title */}
        <h2 className="text-[16px] font-bold text-[var(--tx1)] mb-2">
          {entry.title}
        </h2>

        {/* Definition */}
        <section className="mb-4">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--tx3)] mb-1.5">
            Definition
          </h3>
          <p className="text-[12px] text-[var(--tx2)] leading-[1.7]">
            {entry.definition}
          </p>
        </section>

        {/* Methodology */}
        <section className="mb-4">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--tx3)] mb-1.5">
            Methodology
          </h3>
          <p className="text-[12px] text-[var(--tx2)] leading-[1.7]">
            {entry.methodology}
          </p>
        </section>

        {/* Interventions */}
        <section className="mb-4">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--tx3)] mb-1.5">
            Improvement Strategies
          </h3>
          <ul className="space-y-1">
            {entry.interventions.map((intervention, idx) => (
              <li
                key={idx}
                className="text-[11px] text-[var(--tx2)] leading-[1.6] flex items-start gap-2"
              >
                <span className="text-[var(--t600)] mt-0.5 shrink-0">
                  &bull;
                </span>
                {intervention}
              </li>
            ))}
          </ul>
        </section>

        {/* Regulatory Context */}
        {entry.regulatoryContext && (
          <section className="mb-4">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--tx3)] mb-1.5">
              Regulatory Context
            </h3>
            <p className="text-[11px] text-[var(--tx2)] leading-[1.6] bg-[var(--bg)] rounded-lg p-3 border border-[var(--bdr)]">
              {entry.regulatoryContext}
            </p>
          </section>
        )}

        {/* Tags */}
        <section className="mb-3">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--tx3)] mb-1.5">
            Tags
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {entry.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-[9px] py-[3px] bg-[var(--bg)] border border-[var(--bdr)] rounded-full text-[var(--tx2)]"
              >
                {tag}
              </span>
            ))}
          </div>
        </section>

        {/* Related Parameters */}
        {entry.relatedParamCodes.length > 0 && (
          <section className="bg-[var(--t50)] rounded-lg p-3.5 border border-[var(--t200)]">
            <h3 className="text-[10px] font-bold text-[var(--t700)] mb-1.5">
              Related parameters in your system
            </h3>
            {entry.relatedParamCodes.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => onNavigateToParam(code)}
                className="flex items-center gap-2 py-1 cursor-pointer w-full text-left group"
              >
                <ChevronRight className="h-2.5 w-2.5 text-[var(--t700)]" />
                <span className="text-[11px] text-[var(--t700)] font-medium group-hover:underline">
                  {code}
                </span>
              </button>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
