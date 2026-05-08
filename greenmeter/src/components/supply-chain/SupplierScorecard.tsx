"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { Scorecard } from "@/hooks/useSuppliers";

interface SupplierScorecardProps {
  scorecard: Scorecard | null;
  supplierName: string;
}

const ragVariant = {
  green: "success",
  amber: "warning",
  red: "error",
} as const;

const ragLabel = {
  green: "Low Risk",
  amber: "Medium Risk",
  red: "High Risk",
} as const;

const ragColor = {
  green: "var(--grn)",
  amber: "var(--amb)",
  red: "var(--red)",
} as const;

export function SupplierScorecard({ scorecard, supplierName }: SupplierScorecardProps) {
  if (!scorecard) {
    return (
      <Card>
        <CardHeader>
          <div>
            <CardTitle>ESG Scorecard</CardTitle>
            <CardDescription>{supplierName}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-[var(--tx3)]">
            No assessment data available. Submit an assessment to generate the scorecard.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>ESG Scorecard</CardTitle>
          <CardDescription>{supplierName}</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-xl font-bold font-[var(--fm)]"
            style={{
              color: ragColor[scorecard.overallRagStatus],
            }}
          >
            {scorecard.overallScore !== null
              ? scorecard.overallScore.toFixed(1)
              : "N/A"}
          </span>
          <Badge variant={ragVariant[scorecard.overallRagStatus]}>
            {ragLabel[scorecard.overallRagStatus]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {scorecard.criteria.map((criterion) => (
            <div key={criterion.key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium text-[var(--tx2)]">
                  {criterion.label}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold font-[var(--fm)] text-[var(--tx3)]">
                    Weight: {(criterion.weight * 100).toFixed(0)}%
                  </span>
                  <span
                    className="text-xs font-bold font-[var(--fm)]"
                    style={{ color: ragColor[criterion.ragStatus] }}
                  >
                    {criterion.score !== null ? criterion.score.toFixed(1) : "N/A"}
                  </span>
                </div>
              </div>
              {criterion.score !== null ? (
                <ProgressBar
                  value={criterion.score}
                  color={ragColor[criterion.ragStatus]}
                />
              ) : (
                <div className="h-1 bg-[var(--bdr2)] rounded-sm" />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
