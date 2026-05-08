"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

interface FiscalYearSetupProps {
  onSubmit: (startMonth: number) => void;
  onBack: () => void;
  isSubmitting?: boolean;
}

function generatePeriodPreview(startMonth: number): string[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  let fyStartYear: number;
  if (currentMonth >= startMonth) {
    fyStartYear = currentYear;
  } else {
    fyStartYear = currentYear - 1;
  }

  const periods: string[] = [];
  for (let i = 0; i < 2; i++) {
    const year = fyStartYear + i;
    if (startMonth === 1) {
      periods.push(`FY ${year}`);
    } else {
      periods.push(`FY ${year}-${String(year + 1).slice(2)}`);
    }
  }

  return periods;
}

export function FiscalYearSetupStep({
  onSubmit,
  onBack,
  isSubmitting,
}: FiscalYearSetupProps) {
  const [startMonth, setStartMonth] = useState(4); // Default: April
  const preview = generatePeriodPreview(startMonth);

  return (
    <div className="space-y-4">
      <p className="text-xs text-[var(--tx2)] mb-3">
        Set your fiscal year start month. This determines how reporting periods are generated.
      </p>

      <div className="mb-[13px]">
        <label className="block text-[11px] font-semibold text-[var(--tx2)] mb-[5px]">
          Fiscal Year Start Month
        </label>
        <Select
          onValueChange={(v) => setStartMonth(parseInt(v, 10))}
          value={String(startMonth)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select month" />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((month, idx) => (
              <SelectItem key={month} value={String(idx + 1)}>
                {month}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-[var(--bdr)] bg-[var(--bg)] p-3">
        <p className="text-[10px] font-semibold text-[var(--tx2)] mb-2">
          Period Preview
        </p>
        <div className="space-y-1">
          {preview.map((period, idx) => (
            <div
              key={period}
              className="flex items-center gap-2 text-xs text-[var(--tx1)]"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--t500)]" />
              {period}
              {idx === 0 && (
                <span className="text-[10px] text-[var(--t700)] font-medium ml-1">
                  (current)
                </span>
              )}
            </div>
          ))}
        </div>
        <p className="text-[10px] text-[var(--tx3)] mt-2">
          The current fiscal year period will be created automatically.
        </p>
      </div>

      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="secondary"
          size="lg"
          className="flex-1 justify-center"
          onClick={onBack}
        >
          Back
        </Button>
        <Button
          type="button"
          size="lg"
          className="flex-1 justify-center"
          loading={isSubmitting}
          onClick={() => onSubmit(startMonth)}
        >
          Complete Setup
        </Button>
      </div>
    </div>
  );
}
