"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Check, X, ArrowRightLeft, AlertCircle } from "lucide-react"
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui"
import { ConfidenceBadge } from "./ConfidenceBadge"
import { queryKeys } from "@/lib/queryKeys"

interface FlaggedMetric {
  metricId: string
  extractionId: string
  standard: string
  section: string | null
  metricName: string
  metricValue: string | null
  parsedValue: string | null
  unit: string | null
  paramId: string | null
  mappingConfidence: string | null
  mappingMethod: string | null
  mappingStatus: string | null
  suggestedParamName: string | null
  suggestedParamCode: string | null
}

interface ParameterOption {
  paramId: string
  name: string
  code: string
  standard: string
}

interface MappingDecisionResult {
  metricId: string
  action: string
  mappingStatus: string
  paramId: string | null
  aliasCreated: boolean
}

interface MappingReviewTableProps {
  extractionId: string
}

export function MappingReviewTable({ extractionId }: MappingReviewTableProps) {
  const queryClient = useQueryClient()
  const [reassignTarget, setReassignTarget] = useState<Record<string, string>>({})

  // Fetch flagged metrics for this extraction
  const { data: metricsResponse, isLoading, error } = useQuery<{ data: FlaggedMetric[] }>({
    queryKey: queryKeys.mappingReview.list(extractionId),
    queryFn: async () => {
      const res = await fetch(`/api/extraction/${extractionId}/mappings`)
      if (!res.ok) throw new Error("Failed to load mapping review data")
      return res.json()
    },
    enabled: !!extractionId,
  })

  // Fetch parameters for reassignment dropdown
  const { data: paramsResponse } = useQuery<{ data: ParameterOption[] }>({
    queryKey: queryKeys.kpiParameters.list({}),
    queryFn: async () => {
      const res = await fetch("/api/parameters?pageSize=1000")
      if (!res.ok) throw new Error("Failed to load parameters")
      return res.json()
    },
  })

  // Mutation for confirm/reassign/reject
  const decisionMutation = useMutation<
    { data: MappingDecisionResult },
    Error,
    { metricId: string; action: "confirm" | "reassign" | "reject"; paramId?: string }
  >({
    mutationFn: async (decision) => {
      const res = await fetch(`/api/extraction/${extractionId}/mappings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(decision),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error?.message ?? "Failed to update mapping")
      }
      return res.json()
    },
    onSuccess: (_data, variables) => {
      setReassignTarget((prev) => {
        const next = { ...prev }
        delete next[variables.metricId]
        return next
      })
      queryClient.invalidateQueries({ queryKey: queryKeys.mappingReview.list(extractionId) })
    },
  })

  const metrics = metricsResponse?.data ?? []
  const parameters = paramsResponse?.data ?? []

  // Filter to only show metrics that actually need review (not already manual_mapped)
  const reviewableMetrics = metrics.filter(
    (m) => m.mappingStatus !== "manual_mapped" && m.mappingStatus !== "rejected"
  )

  const handleConfirm = (metricId: string) => {
    decisionMutation.mutate({ metricId, action: "confirm" })
  }

  const handleReassign = (metricId: string) => {
    const paramId = reassignTarget[metricId]
    if (!paramId) return
    decisionMutation.mutate({ metricId, action: "reassign", paramId })
  }

  const handleReject = (metricId: string) => {
    decisionMutation.mutate({ metricId, action: "reject" })
  }

  if (isLoading) {
    return (
      <p className="py-4 text-center text-xs text-[var(--tx3)]">Loading mapping review data...</p>
    )
  }

  if (error) {
    return (
      <p className="py-4 text-center text-xs text-[var(--red)]">
        <AlertCircle className="inline h-3 w-3 mr-1" />
        Failed to load mapping review data
      </p>
    )
  }

  if (reviewableMetrics.length === 0) {
    return (
      <p className="py-4 text-center text-xs text-[var(--tx3)]">
        No metrics pending review for this extraction.
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Metric Name</TableHead>
          <TableHead>Suggested Mapping</TableHead>
          <TableHead>Confidence</TableHead>
          <TableHead>Reassign To</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {reviewableMetrics.map((metric) => {
          const confidence = metric.mappingConfidence
            ? parseFloat(metric.mappingConfidence)
            : 0
          const isProcessing =
            decisionMutation.isPending &&
            decisionMutation.variables?.metricId === metric.metricId

          return (
            <TableRow key={metric.metricId}>
              <TableCell>
                <div>
                  <span className="font-medium text-xs">{metric.metricName}</span>
                  {metric.section && (
                    <span className="block text-[10px] text-[var(--tx3)]">{metric.section}</span>
                  )}
                  {metric.parsedValue !== null && (
                    <span className="block text-[10px] text-[var(--tx3)]">
                      Value: {metric.parsedValue} {metric.unit ?? ""}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {metric.suggestedParamName ? (
                  <div>
                    <span className="text-xs">{metric.suggestedParamName}</span>
                    {metric.suggestedParamCode && (
                      <Badge variant="teal" className="ml-1">
                        {metric.suggestedParamCode}
                      </Badge>
                    )}
                  </div>
                ) : (
                  <span className="text-[10px] text-[var(--tx3)]">No suggestion</span>
                )}
              </TableCell>
              <TableCell>
                <ConfidenceBadge confidence={confidence} />
              </TableCell>
              <TableCell>
                <div className="w-48">
                  <Select
                    value={reassignTarget[metric.metricId] ?? ""}
                    onValueChange={(val) =>
                      setReassignTarget((prev) => ({ ...prev, [metric.metricId]: val }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select parameter..." />
                    </SelectTrigger>
                    <SelectContent>
                      {parameters
                        .filter((p) => p.standard === metric.standard)
                        .map((p) => (
                          <SelectItem key={p.paramId} value={p.paramId}>
                            {p.code} — {p.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  {metric.paramId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleConfirm(metric.metricId)}
                      loading={isProcessing && decisionMutation.variables?.action === "confirm"}
                      title="Confirm mapping"
                    >
                      <Check className="h-3 w-3 text-[var(--grntx)]" />
                    </Button>
                  )}
                  {reassignTarget[metric.metricId] && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleReassign(metric.metricId)}
                      loading={isProcessing && decisionMutation.variables?.action === "reassign"}
                      title="Reassign to selected parameter"
                    >
                      <ArrowRightLeft className="h-3 w-3 text-[var(--indtx)]" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleReject(metric.metricId)}
                    loading={isProcessing && decisionMutation.variables?.action === "reject"}
                    title="Reject mapping"
                  >
                    <X className="h-3 w-3 text-[var(--redtx)]" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
