"use client";

import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { SupplierRow } from "@/hooks/useSuppliers";

interface SupplierTableProps {
  suppliers: SupplierRow[];
  onView: (supplierId: string) => void;
}

const riskBadgeVariant = {
  low: "success",
  medium: "warning",
  high: "error",
  critical: "error",
} as const;

const riskLabel = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
} as const;

const categoryLabel = {
  tier1: "Tier 1",
  tier2: "Tier 2",
  tier3: "Tier 3",
} as const;

function riskScoreColor(score: number | null): string {
  if (score === null) return "var(--tx3)";
  if (score >= 60) return "var(--t700)";
  if (score >= 40) return "var(--amb)";
  return "var(--red)";
}

export function SupplierTable({ suppliers, onView }: SupplierTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Supplier</TableHead>
          <TableHead>Sector</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Risk Score</TableHead>
          <TableHead>Risk Level</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {suppliers.length === 0 && (
          <TableRow>
            <TableCell colSpan={7} className="text-center py-8 text-[var(--tx3)]">
              No suppliers found. Add your first supplier to get started.
            </TableCell>
          </TableRow>
        )}
        {suppliers.map((supplier) => {
          const riskKey = supplier.riskLevel as keyof typeof riskBadgeVariant | null;
          const catKey = supplier.category as keyof typeof categoryLabel | null;

          return (
            <TableRow key={supplier.supplierId} onClick={() => onView(supplier.supplierId)}>
              <TableCell className="font-medium text-[var(--tx1)]">
                {supplier.name}
              </TableCell>
              <TableCell className="text-[var(--tx3)]">
                {supplier.sector ?? "-"}
              </TableCell>
              <TableCell>
                {catKey ? (
                  <Badge variant={catKey === "tier1" ? "teal" : "neutral"}>
                    {categoryLabel[catKey] ?? supplier.category}
                  </Badge>
                ) : (
                  <span className="text-[var(--tx3)]">-</span>
                )}
              </TableCell>
              <TableCell>
                <span style={{ color: riskScoreColor(supplier.riskScore), fontWeight: 600 }}>
                  {supplier.riskScore !== null && supplier.riskScore !== undefined
                    ? supplier.riskScore.toFixed(1)
                    : "-"}
                </span>
              </TableCell>
              <TableCell>
                {riskKey ? (
                  <Badge variant={riskBadgeVariant[riskKey] ?? "neutral"}>
                    {riskLabel[riskKey] ?? supplier.riskLevel}
                  </Badge>
                ) : (
                  <Badge variant="neutral">Unassessed</Badge>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={supplier.active ? "success" : "neutral"}>
                  {supplier.active ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onView(supplier.supplierId);
                  }}
                >
                  View
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
