"use client"

import { useState, useRef, useCallback } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Upload, FileText, X } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select"
import { ProgressBar } from "@/components/ui/ProgressBar"
import { queryKeys } from "@/lib/queryKeys"

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB
const STANDARDS = ["BRSR", "ESRS", "GRI"] as const

interface PeerOption {
  peerId: string
  name: string
}

export function DocumentUpload() {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [peerId, setPeerId] = useState("")
  const [standard, setStandard] = useState("")
  const [fiscalYear, setFiscalYear] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)

  const { data: peers } = useQuery<PeerOption[]>({
    queryKey: queryKeys.peers.all,
    queryFn: async () => {
      const res = await fetch("/api/peers?pageSize=100")
      if (!res.ok) throw new Error("Failed to load peers")
      const json = await res.json()
      return json.data
    },
  })

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      setUploadProgress(10)
      const res = await fetch("/api/extraction", {
        method: "POST",
        body: formData,
      })
      setUploadProgress(80)
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error?.message ?? "Upload failed")
      }
      setUploadProgress(100)
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.all })
      resetForm()
    },
    onError: (err: Error) => {
      setError(err.message)
      setUploadProgress(0)
    },
  })

  const resetForm = useCallback(() => {
    setFile(null)
    setPeerId("")
    setStandard("")
    setFiscalYear("")
    setError(null)
    setUploadProgress(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    const selected = e.target.files?.[0]
    if (!selected) return

    if (selected.type !== "application/pdf") {
      setError("Only PDF files are accepted")
      e.target.value = ""
      return
    }

    if (selected.size > MAX_FILE_SIZE) {
      setError("File size exceeds 50 MB limit")
      e.target.value = ""
      return
    }

    setFile(selected)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!file) {
      setError("Please select a PDF file")
      return
    }
    if (!peerId) {
      setError("Please select a peer organisation")
      return
    }
    if (!standard) {
      setError("Please select a reporting standard")
      return
    }
    if (!fiscalYear) {
      setError("Please enter a fiscal year")
      return
    }

    const formData = new FormData()
    formData.append("file", file)
    formData.append("peerId", peerId)
    formData.append("standard", standard)
    formData.append("fiscalYear", fiscalYear)

    uploadMutation.mutate(formData)
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* File Input */}
      <div>
        <label className="block text-[11px] font-semibold text-[var(--tx2)] mb-[5px]">
          PDF Document
        </label>
        <div
          className="flex items-center gap-3 p-3 border border-dashed border-[var(--bdr)] rounded-lg cursor-pointer hover:border-[var(--t500)] transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />
          {file ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <FileText className="h-4 w-4 text-[var(--t600)] shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-[var(--tx1)] truncate">{file.name}</p>
                <p className="text-[10px] text-[var(--tx3)]">{formatFileSize(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setFile(null)
                  if (fileInputRef.current) fileInputRef.current.value = ""
                }}
                className="p-1 rounded hover:bg-[var(--bg)] transition-colors"
              >
                <X className="h-3 w-3 text-[var(--tx3)]" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[var(--tx3)]">
              <Upload className="h-4 w-4" />
              <span className="text-xs">Click to select PDF (max 50 MB)</span>
            </div>
          )}
        </div>
      </div>

      {/* Metadata Fields */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-[var(--tx2)] mb-[5px]">
            Peer Organisation
          </label>
          <Select value={peerId} onValueChange={setPeerId}>
            <SelectTrigger>
              <SelectValue placeholder="Select peer" />
            </SelectTrigger>
            <SelectContent>
              {peers?.map((p) => (
                <SelectItem key={p.peerId} value={p.peerId}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-[var(--tx2)] mb-[5px]">
            Standard
          </label>
          <Select value={standard} onValueChange={setStandard}>
            <SelectTrigger>
              <SelectValue placeholder="Select standard" />
            </SelectTrigger>
            <SelectContent>
              {STANDARDS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Input
          label="Fiscal Year"
          placeholder="e.g. 2024-25"
          value={fiscalYear}
          onChange={(e) => setFiscalYear(e.target.value)}
        />
      </div>

      {/* Upload Progress */}
      {uploadMutation.isPending && (
        <ProgressBar value={uploadProgress} label="Uploading" />
      )}

      {/* Error Message */}
      {error && (
        <p className="text-[11px] text-[var(--red)]">{error}</p>
      )}

      {/* Submit */}
      <div className="flex justify-end">
        <Button type="submit" loading={uploadMutation.isPending} disabled={!file}>
          <Upload className="h-3 w-3" />
          Upload Document
        </Button>
      </div>
    </form>
  )
}
