"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { FileText, Play, AlertCircle, ClipboardCheck } from "lucide-react"
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
import { DocumentUpload } from "@/components/extraction/DocumentUpload"
import { MappingReviewTable } from "@/components/extraction/MappingReviewTable"
import { queryKeys } from "@/lib/queryKeys"

type DocumentStatus = "pending" | "processing" | "completed" | "failed"

interface DocumentRow {
  docId: string
  peerId: string | null
  standard: string
  fiscalYear: string
  filename: string
  fileSize: number
  status: DocumentStatus
  peerName: string | null
  errorMessage: string | null
  uploadedAt: string
}

interface DocumentListResponse {
  data: DocumentRow[]
  meta: { page: number; pageSize: number; total: number }
}

const STATUS_BADGE: Record<
  DocumentStatus,
  { variant: "info" | "warning" | "success" | "error"; label: string }
> = {
  pending: { variant: "info", label: "Pending" },
  processing: { variant: "warning", label: "Processing" },
  completed: { variant: "success", label: "Completed" },
  failed: { variant: "error", label: "Failed" },
}

interface ExtractionRow {
  extractionId: string
  docId: string | null
  standard: string
  companyName: string
  metricCount: number | null
  mappedCount: number | null
  status: string | null
}

export default function DocumentsPage() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [reviewExtractionId, setReviewExtractionId] = useState<string | null>(null)

  const filters = {
    status: statusFilter === "all" ? undefined : statusFilter,
  }

  const { data, isLoading, error } = useQuery<DocumentListResponse>({
    queryKey: queryKeys.documents.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.status) params.set("status", filters.status)
      params.set("pageSize", "50")
      const res = await fetch(`/api/extraction?${params}`)
      if (!res.ok) throw new Error("Failed to load documents")
      return res.json()
    },
  })

  const reviewMutation = useMutation({
    mutationFn: async (docId: string) => {
      const res = await fetch(`/api/extraction/by-doc?docId=${docId}`)
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error?.message ?? "Failed to load extraction")
      }
      return res.json() as Promise<{ data: { extractionId: string } }>
    },
    onSuccess: (json) => {
      const extractionId = json.data?.extractionId
      if (extractionId) {
        setReviewExtractionId(extractionId)
      }
    },
  })

  const triggerMutation = useMutation({
    mutationFn: async (docId: string) => {
      const res = await fetch("/api/extraction/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docId }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error?.message ?? "Failed to trigger extraction")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.all })
    },
  })

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (iso: string): string => {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="space-y-6 p-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4 text-[var(--t600)]" />
            Upload Peer Document
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DocumentUpload />
        </CardContent>
      </Card>

      {/* Document List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Document Queue</CardTitle>
            <div className="w-40">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <p className="py-8 text-center text-xs text-[var(--tx3)]">Loading documents...</p>
          )}
          {error && (
            <p className="py-8 text-center text-xs text-[var(--red)]">
              <AlertCircle className="inline h-3 w-3 mr-1" />
              Failed to load documents
            </p>
          )}
          {data && data.data.length === 0 && (
            <p className="py-8 text-center text-xs text-[var(--tx3)]">
              No documents uploaded yet. Use the form above to upload a peer sustainability report.
            </p>
          )}
          {data && data.data.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Filename</TableHead>
                  <TableHead>Peer</TableHead>
                  <TableHead>Standard</TableHead>
                  <TableHead>Fiscal Year</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((doc) => {
                  const statusInfo = STATUS_BADGE[doc.status]
                  return (
                    <TableRow key={doc.docId}>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <FileText className="h-3 w-3 text-[var(--tx3)] shrink-0" />
                          <span className="truncate max-w-[200px]" title={doc.filename}>
                            {doc.filename}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{doc.peerName ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="teal">{doc.standard}</Badge>
                      </TableCell>
                      <TableCell>{doc.fiscalYear}</TableCell>
                      <TableCell>{formatFileSize(doc.fileSize)}</TableCell>
                      <TableCell>
                        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                        {doc.status === "failed" && doc.errorMessage && (
                          <span
                            className="ml-1 text-[10px] text-[var(--red)] cursor-help"
                            title={doc.errorMessage}
                          >
                            (hover for details)
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(doc.uploadedAt)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {doc.status === "pending" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => triggerMutation.mutate(doc.docId)}
                              loading={triggerMutation.isPending && triggerMutation.variables === doc.docId}
                            >
                              <Play className="h-3 w-3" />
                              Extract
                            </Button>
                          )}
                          {doc.status === "completed" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => reviewMutation.mutate(doc.docId)}
                              loading={reviewMutation.isPending && reviewMutation.variables === doc.docId}
                            >
                              <ClipboardCheck className="h-3 w-3" />
                              Review
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
          {data && data.meta.total > 0 && (
            <p className="mt-3 text-[10px] text-[var(--tx3)]">
              Showing {data.data.length} of {data.meta.total} documents
            </p>
          )}
        </CardContent>
      </Card>

      {/* Mapping Review Section */}
      {reviewExtractionId && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm">
                <ClipboardCheck className="h-4 w-4 text-[var(--t600)]" />
                Mapping Review
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReviewExtractionId(null)}
              >
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <MappingReviewTable extractionId={reviewExtractionId} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
