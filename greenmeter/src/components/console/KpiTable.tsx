'use client';

import { memo, useMemo, useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui';
import { Pencil, Trash2, BookOpen, Plus, CheckCircle2, Ban } from 'lucide-react';
import { getEntriesByParamCode } from '@/config/knowledgeBase';
import { VerificationBadge } from './VerificationBadge';

export type RagStatus = 'green' | 'amber' | 'red' | 'grey';

export interface KpiValueRow {
  valueId: string | null;
  paramId: string;
  paramCode: string;
  paramName: string;
  pillar: string;
  category: string | null;
  standard: string;
  paramUnit: string;
  value: string | null;
  valueText: string | null;
  verified: boolean | null;
  notApplicable: boolean | null;
  verifiedBy: string | null;
  verifiedByName: string | null;
  verifiedAt: string | null;
  sourceType: string | null;
  ragStatus: RagStatus;
}

interface KpiTableProps {
  data: KpiValueRow[];
  onEdit: (row: KpiValueRow) => void;
  onDelete: (row: KpiValueRow) => void;
  onVerify?: (valueIds: string[]) => void;
  onMarkNotApplicable?: (valueIds: string[]) => void;
  isLoading?: boolean;
  isVerifying?: boolean;
}

const RAG_VARIANT: Record<RagStatus, 'success' | 'warning' | 'error' | 'neutral'> = {
  green: 'success',
  amber: 'warning',
  red: 'error',
  grey: 'neutral',
};

const RAG_LABEL: Record<RagStatus, string> = {
  green: 'Verified',
  amber: 'Entered',
  red: 'Missing',
  grey: 'N/A',
};

const PILLAR_VARIANT: Record<string, 'environment' | 'social' | 'governance'> = {
  E: 'environment',
  S: 'social',
  G: 'governance',
};

export function KpiTable({ data, onEdit, onDelete, onVerify, onMarkNotApplicable, isLoading, isVerifying }: KpiTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = useCallback((valueId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(valueId)) next.delete(valueId);
      else next.add(valueId);
      return next;
    });
  }, []);

  const selectableRows = useMemo(
    () => data.filter((r) => r.valueId && r.ragStatus === 'amber'),
    [data]
  );

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === selectableRows.length) return new Set();
      return new Set(selectableRows.map((r) => r.valueId!));
    });
  }, [selectableRows]);

  // Prune selected IDs when data changes (e.g., after successful verify mutation)
  useEffect(() => {
    setSelectedIds((prev) => {
      const selectableIdSet = new Set(selectableRows.map((r) => r.valueId!));
      const filtered = new Set([...prev].filter((id) => selectableIdSet.has(id)));
      if (filtered.size === prev.size) return prev;
      return filtered;
    });
  }, [selectableRows]);

  const handleBatchVerify = useCallback(() => {
    if (selectedIds.size === 0 || !onVerify) return;
    onVerify(Array.from(selectedIds));
  }, [selectedIds, onVerify]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-xs text-[var(--tx3)]">
        Loading KPI values...
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-xs text-[var(--tx3)]">
        No KPI values found for the selected filters.
      </div>
    );
  }

  return (
    <TooltipProvider>
    {/* Batch action bar */}
    {selectedIds.size > 0 && onVerify && (
      <div className="flex items-center gap-2 px-4 py-2 bg-[var(--t50)] border-b border-[var(--bd)]">
        <span className="text-[11px] text-[var(--tx2)]">
          {selectedIds.size} selected
        </span>
        <button
          onClick={handleBatchVerify}
          disabled={isVerifying}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded bg-[var(--grnbg)] text-[var(--grntx)] hover:opacity-80 transition-opacity disabled:opacity-50"
        >
          <CheckCircle2 className="h-3 w-3" />
          Verify Selected
        </button>
      </div>
    )}
    <Table>
      <TableHeader>
        <TableRow>
          {onVerify && (
            <TableHead className="w-[36px]">
              <input
                type="checkbox"
                checked={selectableRows.length > 0 && selectedIds.size === selectableRows.length}
                onChange={toggleAll}
                className="rounded border-[var(--bd)]"
                aria-label="Select all unverified values"
              />
            </TableHead>
          )}
          <TableHead>Code</TableHead>
          <TableHead>Parameter</TableHead>
          <TableHead>Pillar</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Value</TableHead>
          <TableHead>Unit</TableHead>
          <TableHead>Source</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => {
          const isMissing = row.ragStatus === 'red';
          const isVerified = row.ragStatus === 'green';
          const canSelect = row.valueId !== null && row.ragStatus === 'amber';
          return (
          <TableRow key={row.valueId ?? row.paramId}>
            {onVerify && (
              <TableCell>
                {canSelect && (
                  <input
                    type="checkbox"
                    checked={selectedIds.has(row.valueId!)}
                    onChange={() => toggleSelect(row.valueId!)}
                    className="rounded border-[var(--bd)]"
                    aria-label={`Select ${row.paramName} for verification`}
                  />
                )}
              </TableCell>
            )}
            <TableCell className="font-mono text-[11px] text-[var(--tx2)]">
              {row.paramCode}
            </TableCell>
            <TableCell className="font-medium text-[var(--tx1)] max-w-[250px]">
              <div className="flex items-center gap-1.5">
                <span className="truncate">{row.paramName}</span>
                <LearnMoreLink paramCode={row.paramCode} />
              </div>
            </TableCell>
            <TableCell>
              <Badge variant={PILLAR_VARIANT[row.pillar] ?? 'neutral'}>
                {row.pillar}
              </Badge>
            </TableCell>
            <TableCell className="text-[var(--tx2)]">
              {row.category ?? '—'}
            </TableCell>
            <TableCell className="font-medium">
              {isMissing
                ? <span className="text-[var(--tx3)] italic">—</span>
                : row.notApplicable
                  ? <span className="text-[var(--tx3)] italic">N/A</span>
                  : row.value ?? row.valueText ?? '—'}
            </TableCell>
            <TableCell className="text-[var(--tx2)]">
              {row.paramUnit}
            </TableCell>
            <TableCell>
              {row.sourceType
                ? <Badge variant="neutral">{row.sourceType}</Badge>
                : <span className="text-[var(--tx3)]">—</span>}
            </TableCell>
            <TableCell>
              {isVerified ? (
                <VerificationBadge
                  verified
                  verifiedBy={row.verifiedByName ?? row.verifiedBy}
                  verifiedAt={row.verifiedAt}
                />
              ) : (
                <Badge variant={RAG_VARIANT[row.ragStatus]}>
                  {RAG_LABEL[row.ragStatus]}
                </Badge>
              )}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-1">
                {/* Verify button — only for unverified values with data */}
                {!isMissing && !isVerified && !row.notApplicable && onVerify && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => onVerify([row.valueId!])}
                        disabled={isVerifying}
                        className="p-1 rounded hover:bg-[var(--grnbg)] text-[var(--tx3)] hover:text-[var(--grntx)] transition-colors disabled:opacity-50"
                        aria-label={`Verify ${row.paramName}`}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Verify</TooltipContent>
                  </Tooltip>
                )}
                {/* Not Applicable button — only for unverified values with data */}
                {!isMissing && !isVerified && !row.notApplicable && onMarkNotApplicable && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => onMarkNotApplicable([row.valueId!])}
                        className="p-1 rounded hover:bg-[var(--ambbg)] text-[var(--tx3)] hover:text-[var(--ambtx)] transition-colors"
                        aria-label={`Mark ${row.paramName} as not applicable`}
                      >
                        <Ban className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Not Applicable</TooltipContent>
                  </Tooltip>
                )}
                <button
                  onClick={() => onEdit(row)}
                  className="p-1 rounded hover:bg-[var(--bg)] text-[var(--tx3)] hover:text-[var(--t700)] transition-colors"
                  aria-label={isMissing ? `Add value for ${row.paramName}` : `Edit ${row.paramName}`}
                >
                  {isMissing
                    ? <Plus className="h-3.5 w-3.5" />
                    : <Pencil className="h-3.5 w-3.5" />}
                </button>
                {!isMissing && (
                  <button
                    onClick={() => onDelete(row)}
                    className="p-1 rounded hover:bg-[var(--redbg)] text-[var(--tx3)] hover:text-[var(--red)] transition-colors"
                    aria-label={`Delete ${row.paramName}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </TableCell>
          </TableRow>
          );
        })}
      </TableBody>
    </Table>
    </TooltipProvider>
  );
}

/** Shows a "Learn more" icon-link if the parameter has a matching KB entry. */
const LearnMoreLink = memo(function LearnMoreLink({ paramCode }: { paramCode: string }) {
  const entries = useMemo(() => getEntriesByParamCode(paramCode), [paramCode]);
  if (entries.length === 0) return null;

  const firstEntry = entries[0];
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href={`/knowledge?entry=${firstEntry.id}`}
          className="shrink-0 p-0.5 rounded hover:bg-[var(--t50)] text-[var(--tx3)] hover:text-[var(--t700)] transition-colors"
          aria-label="Learn more in knowledge base"
          onClick={(e) => e.stopPropagation()}
        >
          <BookOpen className="h-3 w-3" />
        </Link>
      </TooltipTrigger>
      <TooltipContent>Learn more</TooltipContent>
    </Tooltip>
  );
});
