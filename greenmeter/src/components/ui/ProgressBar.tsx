"use client"

import { forwardRef } from "react"
import { cn } from "@/lib/utils"

interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number
  max?: number
  label?: string
  color?: string
}

const ProgressBar = forwardRef<HTMLDivElement, ProgressBarProps>(
  ({ className, value, max = 100, label, color, ...props }, ref) => {
    const pct = Math.min(100, Math.max(0, (value / max) * 100))

    return (
      <div ref={ref} className={cn("", className)} {...props}>
        {label && (
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-[var(--tx2)] font-medium">{label}</span>
            <span className="text-[11px] font-bold font-[var(--fm)]">{Math.round(pct)}%</span>
          </div>
        )}
        <div className="h-1 bg-[var(--bdr2)] rounded-sm overflow-hidden">
          <div
            className="h-full rounded-sm transition-[width] duration-300"
            style={{ width: `${pct}%`, background: color ?? "var(--t500)" }}
          />
        </div>
      </div>
    )
  }
)
ProgressBar.displayName = "ProgressBar"

export { ProgressBar, type ProgressBarProps }
