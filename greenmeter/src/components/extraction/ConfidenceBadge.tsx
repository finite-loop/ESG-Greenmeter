"use client"

import { Badge, type BadgeProps } from "@/components/ui"

interface ConfidenceBadgeProps {
  confidence: number
  className?: string
}

export function getConfidenceVariant(confidence: number): BadgeProps["variant"] {
  if (confidence >= 85) return "success"
  if (confidence >= 60) return "warning"
  return "error"
}

export function getConfidenceLabel(confidence: number): string {
  if (confidence >= 85) return "High"
  if (confidence >= 60) return "Medium"
  return "Low"
}

export function ConfidenceBadge({ confidence, className }: ConfidenceBadgeProps) {
  const rounded = Math.round(confidence)
  const variant = getConfidenceVariant(rounded)
  const label = getConfidenceLabel(rounded)

  return (
    <Badge variant={variant} className={className}>
      {rounded}% — {label}
    </Badge>
  )
}
