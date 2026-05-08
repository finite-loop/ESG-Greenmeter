"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  Badge,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  ProgressBar,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui";
import { FileText, Download, Loader2, CheckCircle, AlertCircle, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";

type Props = { navigate: (s: string) => void; [k: string]: unknown };

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Period {
  periodId: string;
  name: string;
  fiscalYear: string;
  status: string | null;
}

interface GeneratedReport {
  reportId: string;
  name: string;
  status: string | null;
  format: string | null;
  blobUrl: string | null;
  createdAt: string;
  generatedAt: string | null;
  metadata?: {
    coverage?: {
      reported: number;
      notReported: number;
      total: number;
      percentComplete: number;
    };
    fileSize?: number;
    blobPath?: string;
    progressStage?: string;
    progressPercent?: number;
    progressMessage?: string;
  };
}

interface CoverageSection {
  standardSection: string;
  totalParams: number;
  hasValue: number;
  verified: number;
  notApplicable: number;
  percentComplete: number;
}

interface CoverageData {
  framework: string;
  periodId: string;
  totalParams: number;
  hasValue: number;
  verified: number;
  notApplicable: number;
  percentComplete: number;
  warningThreshold: number;
  belowThreshold: boolean;
  sections: CoverageSection[];
}

const FRAMEWORKS = [
  { value: "BRSR", label: "BRSR Core", description: "India SEBI mandate" },
  { value: "GRI", label: "GRI Standards 2021", description: "Global standards" },
  { value: "ESRS", label: "ESRS (CSRD)", description: "EU mandatory" },
  { value: "IFRS_S2", label: "IFRS S2", description: "ISSB climate" },
] as const;

const FORMAT_OPTIONS = [
  { value: "pdf", label: "PDF Report", description: "Formatted disclosure document" },
  { value: "xbrl", label: "XBRL", description: "Machine-readable for SEBI filing" },
  { value: "excel", label: "Excel", description: "Raw KPI data with mapping" },
] as const;

function statusBadge(status: string | null) {
  switch (status) {
    case "complete":
      return <Badge variant="success">Complete</Badge>;
    case "generating":
      return <Badge variant="warning">Generating</Badge>;
    case "failed":
      return <Badge variant="error">Failed</Badge>;
    case "pending":
      return <Badge variant="neutral">Pending</Badge>;
    default:
      return <Badge variant="neutral">{status ?? "Unknown"}</Badge>;
  }
}

function coverageColor(percent: number, threshold: number): string {
  if (percent >= threshold) return "text-emerald-600";
  if (percent >= threshold * 0.75) return "text-amber-600";
  return "text-red-600";
}

function CoverageSummaryBar({ coverage }: { coverage: CoverageData }) {
  const stats = [
    { label: "Total Required", value: coverage.totalParams },
    { label: "Entered", value: coverage.hasValue },
    { label: "Verified", value: coverage.verified },
    { label: "Not Applicable", value: coverage.notApplicable },
  ];

  return (
    <div className="flex items-center gap-6 flex-wrap">
      {stats.map((s) => (
        <div key={s.label} className="text-center">
          <div className="text-lg font-semibold text-[var(--tx1)]">{s.value}</div>
          <div className="text-[10px] text-[var(--tx3)]">{s.label}</div>
        </div>
      ))}
      <div className="text-center">
        <div className={`text-lg font-semibold ${coverageColor(coverage.percentComplete, coverage.warningThreshold)}`}>
          {coverage.percentComplete}%
        </div>
        <div className="text-[10px] text-[var(--tx3)]">Complete</div>
      </div>
      <div className="flex-1 min-w-[120px]">
        <ProgressBar value={coverage.percentComplete} max={100} />
      </div>
    </div>
  );
}

function CoverageSectionBreakdown({
  sections,
  warningThreshold,
}: {
  sections: CoverageSection[];
  warningThreshold: number;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs font-medium text-[var(--tx2)] mb-2 hover:text-[var(--tx1)] transition-colors"
      >
        {expanded ? (
          <ChevronDown className="w-3 h-3" />
        ) : (
          <ChevronRight className="w-3 h-3" />
        )}
        Per-Section Breakdown
      </button>

      {expanded && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Section</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Entered</TableHead>
              <TableHead className="text-right">Verified</TableHead>
              <TableHead className="text-right">N/A</TableHead>
              <TableHead className="text-right">% Complete</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sections.map((section) => (
              <TableRow key={section.standardSection}>
                <TableCell className="text-xs font-medium">
                  {section.standardSection}
                </TableCell>
                <TableCell className="text-right text-xs">{section.totalParams}</TableCell>
                <TableCell className="text-right text-xs">{section.hasValue}</TableCell>
                <TableCell className="text-right text-xs">{section.verified}</TableCell>
                <TableCell className="text-right text-xs">{section.notApplicable}</TableCell>
                <TableCell className={`text-right text-xs font-medium ${coverageColor(section.percentComplete, warningThreshold)}`}>
                  {section.percentComplete}%
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function DownloadButton({ report }: { report: GeneratedReport }) {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(false);

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    setDownloadError(false);
    try {
      const res = await fetch(`/api/reports/${report.reportId}/download`);
      if (!res.ok) {
        throw new Error('Failed to get download URL');
      }
      const json = await res.json();
      const url = json.data?.downloadUrl;
      if (typeof url === 'string' && url.startsWith('https://')) {
        const link = document.createElement('a');
        link.href = url;
        link.download = json.data?.fileName ?? 'report.pdf';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        throw new Error('Invalid download URL');
      }
    } catch {
      setDownloadError(true);
    } finally {
      setDownloading(false);
    }
  }, [report.reportId]);

  return (
    <div className="flex items-center gap-1">
      <Button variant="secondary" size="sm" onClick={handleDownload} disabled={downloading}>
        {downloading ? (
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
        ) : (
          <Download className="w-3 h-3 mr-1" />
        )}
        Download
      </Button>
      {downloadError && (
        <span className="text-[10px] text-red-600">Failed</span>
      )}
    </div>
  );
}

export default function ReportsScreen({ navigate }: Props) {
  const queryClient = useQueryClient();

  const [selectedFramework, setSelectedFramework] = useState<string>("BRSR");
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<string>("pdf");

  // Fetch periods
  const { data: periods } = useQuery<Period[]>({
    queryKey: queryKeys.periods.list(),
    queryFn: async () => {
      const res = await fetch("/api/periods");
      if (!res.ok) throw new Error("Failed to load periods");
      const json = await res.json();
      return json.data;
    },
  });

  // Auto-select first period
  useEffect(() => {
    if (!selectedPeriodId && periods && periods.length > 0) {
      setSelectedPeriodId(periods[0].periodId);
    }
  }, [periods, selectedPeriodId]);

  // Fetch coverage data
  const { data: coverage, isLoading: coverageLoading, isError: coverageError } = useQuery<CoverageData>({
    queryKey: queryKeys.reports.coverage({
      framework: selectedFramework,
      periodId: selectedPeriodId ?? "",
    }),
    queryFn: async () => {
      const params = new URLSearchParams({
        framework: selectedFramework,
        periodId: selectedPeriodId!,
      });
      const res = await fetch(`/api/reports/coverage?${params}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message ?? "Failed to load coverage");
      }
      const json = await res.json();
      return json.data;
    },
    enabled: !!selectedPeriodId && !!selectedFramework,
    staleTime: 30_000,
  });

  // Fetch previously generated reports
  const { data: generatedReports, isLoading: reportsLoading } = useQuery<GeneratedReport[]>({
    queryKey: queryKeys.reports.list({
      periodId: selectedPeriodId ?? undefined,
      standard: selectedFramework,
    }),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedPeriodId) params.set("periodId", selectedPeriodId);
      if (selectedFramework) params.set("standard", selectedFramework);
      const res = await fetch(`/api/reports?${params}`);
      if (!res.ok) {
        // Reports endpoint may not exist yet — return empty
        return [];
      }
      const json = await res.json();
      return json.data ?? [];
    },
    enabled: !!selectedPeriodId,
  });

  // Poll for updates when any report is in-progress
  const hasActiveReport = generatedReports?.some(
    (r) => r.status === "generating" || r.status === "pending"
  );

  useEffect(() => {
    if (!hasActiveReport) return;
    const interval = setInterval(() => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.reports.list({
          periodId: selectedPeriodId ?? undefined,
          standard: selectedFramework,
        }),
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [hasActiveReport, queryClient, selectedPeriodId, selectedFramework]);

  // Generate report mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          framework: selectedFramework,
          periodId: selectedPeriodId,
          format: selectedFormat,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message ?? `Generation failed (${res.status})`);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.all });
    },
  });

  const handleGenerate = useCallback(() => {
    if (!selectedPeriodId || !selectedFramework) return;
    generateMutation.mutate();
  }, [selectedPeriodId, selectedFramework, generateMutation]);

  const frameworkMeta = FRAMEWORKS.find((f) => f.value === selectedFramework);

  return (
    <div>
      {/* Page header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[var(--tx1)]">Report Builder</h1>
          <p className="text-sm text-[var(--tx3)] mt-1">
            Framework templates &middot; BRSR &middot; GRI 2021 &middot; ESRS &middot; IFRS S2 &middot; auto-generate reports
          </p>
        </div>
        <div className="flex items-center gap-2">
          {periods && periods.length > 0 && (
            <Select
              value={selectedPeriodId ?? undefined}
              onValueChange={(val) => setSelectedPeriodId(val)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                {periods.map((p) => (
                  <SelectItem key={p.periodId} value={p.periodId}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            onClick={handleGenerate}
            disabled={!selectedPeriodId || generateMutation.isPending}
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-1" />
                Generate Report
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Status message */}
      {generateMutation.isSuccess && (
        <div className="mb-4 p-3 rounded-md bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-sm text-emerald-700">
          <CheckCircle className="w-4 h-4" />
          Report generation started. Job ID: {generateMutation.data?.data?.jobId ?? "queued"}
        </div>
      )}
      {generateMutation.isError && (
        <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 flex items-center gap-2 text-sm text-red-700">
          <AlertCircle className="w-4 h-4" />
          {(generateMutation.error as Error).message}
        </div>
      )}

      {/* Coverage warning banner */}
      {coverage?.belowThreshold && (
        <div className="mb-4 p-3 rounded-md bg-amber-50 border border-amber-200 flex items-center gap-2 text-sm text-amber-700">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>
            Coverage is {coverage.percentComplete}% — below the {coverage.warningThreshold}% threshold.
            Data gaps may affect report completeness.
          </span>
        </div>
      )}

      <div className="grid grid-cols-[300px_1fr] gap-4">
        {/* Left panel: Framework selector + format options */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Framework</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {FRAMEWORKS.map((fw) => (
                <button
                  key={fw.value}
                  onClick={() => setSelectedFramework(fw.value)}
                  className={`w-full text-left px-4 py-3 border-b border-[var(--bdr2)] transition-colors ${
                    selectedFramework === fw.value
                      ? "bg-[var(--t50)] border-l-2 border-l-[var(--t700)]"
                      : "hover:bg-[var(--bg)]"
                  }`}
                >
                  <div className="text-xs font-semibold text-[var(--tx1)]">{fw.label}</div>
                  <div className="text-[10px] text-[var(--tx3)]">{fw.description}</div>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Export Format</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {FORMAT_OPTIONS.map((fmt) => (
                <label
                  key={fmt.value}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="format"
                    value={fmt.value}
                    checked={selectedFormat === fmt.value}
                    onChange={() => setSelectedFormat(fmt.value)}
                    className="accent-[var(--t700)]"
                  />
                  <div>
                    <div className="text-xs font-medium">{fmt.label}</div>
                    <div className="text-[10px] text-[var(--tx3)]">{fmt.description}</div>
                  </div>
                </label>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right panel: Coverage + Generated reports */}
        <div className="space-y-4">
          {/* Coverage card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                {frameworkMeta?.label ?? selectedFramework} Coverage
              </CardTitle>
            </CardHeader>
            <CardContent>
              {coverageLoading ? (
                <div className="flex items-center justify-center py-6 text-sm text-[var(--tx3)]">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading coverage...
                </div>
              ) : coverageError ? (
                <div className="flex items-center justify-center py-6 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Failed to load coverage data.
                </div>
              ) : coverage ? (
                <div className="space-y-4">
                  <CoverageSummaryBar coverage={coverage} />
                  {coverage.sections.length > 0 && (
                    <CoverageSectionBreakdown
                      sections={coverage.sections}
                      warningThreshold={coverage.warningThreshold}
                    />
                  )}
                </div>
              ) : selectedPeriodId ? (
                <div className="text-center py-6 text-sm text-[var(--tx3)]">
                  No coverage data available. Enter KPI values to see coverage.
                </div>
              ) : (
                <div className="text-center py-6 text-sm text-[var(--tx3)]">
                  Select a reporting period to view coverage.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Generated reports card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                {frameworkMeta?.label ?? selectedFramework} Reports
              </CardTitle>
            </CardHeader>
            <CardContent>
              {reportsLoading ? (
                <div className="flex items-center justify-center py-8 text-sm text-[var(--tx3)]">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading reports...
                </div>
              ) : generatedReports && generatedReports.length > 0 ? (
                <div className="divide-y divide-[var(--bdr2)]">
                  {generatedReports.map((report) => (
                    <div key={report.reportId} className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-[var(--tx3)]" />
                        <div>
                          <div className="text-xs font-medium text-[var(--tx1)]">{report.name}</div>
                          <div className="text-[10px] text-[var(--tx3)]">
                            {report.format?.toUpperCase()} &middot;{" "}
                            {new Date(report.createdAt).toLocaleDateString()}
                            {report.metadata?.fileSize != null && (
                              <> &middot; {formatFileSize(report.metadata.fileSize)}</>
                            )}
                            {report.metadata?.coverage && (
                              <> &middot; {report.metadata.coverage.percentComplete}% coverage</>
                            )}
                          </div>
                          {(report.status === "generating" || report.status === "pending") && (
                            <div className="mt-1 space-y-1">
                              <div className="flex items-center gap-1 text-[10px] text-amber-600">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                {report.metadata?.progressMessage ?? (report.status === "pending" ? "Queued..." : "Generating report...")}
                              </div>
                              {report.metadata?.progressPercent != null && report.metadata.progressPercent > 0 && (
                                <div className="w-32">
                                  <ProgressBar value={report.metadata.progressPercent} max={100} />
                                </div>
                              )}
                            </div>
                          )}
                          {report.metadata?.coverage && report.status === "complete" && (
                            <div className="mt-1 w-32">
                              <ProgressBar
                                value={report.metadata.coverage.percentComplete}
                                max={100}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {statusBadge(report.status)}
                        {report.status === "complete" && (
                          <DownloadButton report={report} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-sm text-[var(--tx3)]">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>No reports generated yet.</p>
                  <p className="mt-1">Select a framework and period, then click Generate Report.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
