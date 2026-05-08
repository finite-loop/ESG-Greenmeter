"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
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
import { Input } from "@/components/ui/Input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/Select";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from "@/components/ui/Modal";

interface ParameterEntry {
  paramId: string;
  tenantId: string | null;
  standard: string;
  standardSection: string;
  standardCode: string | null;
  code: string;
  name: string;
  description: string | null;
  pillar: string;
  unit: string;
  dataType: string;
  category: string | null;
  direction: string | null;
  rollupMethod: string | null;
  howToMeasure: string | null;
  howToCompute: string | null;
  howToReport: string | null;
  status: string | null;
  src: string | null;
  depts: string[] | null;
  standards: string[] | null;
  overrideParamId: string | null;
}

interface ParameterListResponse {
  data: ParameterEntry[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
  };
}

const PILLAR_LABELS: Record<string, string> = {
  E: "Environment",
  S: "Social",
  G: "Governance",
};

const PILLAR_BADGE_VARIANT: Record<string, "teal" | "info" | "warning"> = {
  E: "teal",
  S: "info",
  G: "warning",
};

export default function ParametersPage() {
  const [parameters, setParameters] = useState<ParameterEntry[]>([]);
  const [meta, setMeta] = useState<{ page: number; pageSize: number; total: number }>({
    page: 1,
    pageSize: 20,
    total: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Filter state
  const [searchInput, setSearchInput] = useState("");
  const [standardFilter, setStandardFilter] = useState<string>("");
  const [pillarFilter, setPillarFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");

  // Edit modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editParam, setEditParam] = useState<ParameterEntry | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    unit: "",
    category: "",
    direction: "",
    rollupMethod: "",
    howToMeasure: "",
    howToCompute: "",
    howToReport: "",
    depts: "",
    status: "",
  });

  const abortRef = useRef<AbortController | null>(null);

  const fetchParameters = useCallback(
    async (page: number, search?: string, standard?: string, pillar?: string, category?: string) => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("pageSize", "20");
        if (search) params.set("search", search);
        if (standard) params.set("standard", standard);
        if (pillar) params.set("pillar", pillar);
        if (category) params.set("category", category);

        const res = await fetch(`/api/parameters?${params.toString()}`, {
          signal: controller.signal,
        });

        if (res.status === 401 || res.status === 403) {
          setUnauthorized(true);
          return;
        }

        if (!res.ok) {
          const body = await res.json().catch(() => null);
          setError(body?.error?.message ?? `Request failed with status ${res.status}`);
          return;
        }

        const json: ParameterListResponse = await res.json();
        setParameters(json.data);
        setMeta(json.meta);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Failed to fetch parameters");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchParameters(1);
    // Fetch session to determine user role for edit permissions
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((session) => {
        if (session?.user?.role === "admin") {
          setIsAdmin(true);
        }
      })
      .catch(() => { /* session unavailable — default to non-admin */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleApplyFilters() {
    fetchParameters(
      1,
      searchInput || undefined,
      standardFilter || undefined,
      pillarFilter || undefined,
      categoryFilter || undefined
    );
  }

  function handleClearFilters() {
    setSearchInput("");
    setStandardFilter("");
    setPillarFilter("");
    setCategoryFilter("");
    fetchParameters(1);
  }

  function handlePageChange(newPage: number) {
    fetchParameters(
      newPage,
      searchInput || undefined,
      standardFilter || undefined,
      pillarFilter || undefined,
      categoryFilter || undefined
    );
  }

  function openEditModal(param: ParameterEntry) {
    setEditParam(param);
    setEditForm({
      name: param.name,
      description: param.description ?? "",
      unit: param.unit,
      category: param.category ?? "",
      direction: param.direction ?? "lower_is_better",
      rollupMethod: param.rollupMethod ?? "SUM",
      howToMeasure: param.howToMeasure ?? "",
      howToCompute: param.howToCompute ?? "",
      howToReport: param.howToReport ?? "",
      depts: (param.depts ?? []).join(", "),
      status: param.status ?? "active",
    });
    setEditError(null);
    setEditOpen(true);
  }

  async function handleEditSubmit() {
    if (!editParam) return;

    setEditLoading(true);
    setEditError(null);

    try {
      const payload: Record<string, unknown> = {};

      if (editForm.name !== editParam.name) payload.name = editForm.name;
      if (editForm.description !== (editParam.description ?? ""))
        payload.description = editForm.description || null;
      if (editForm.unit !== editParam.unit) payload.unit = editForm.unit;
      if (editForm.category !== (editParam.category ?? ""))
        payload.category = editForm.category || null;
      if (editForm.direction !== (editParam.direction ?? "lower_is_better"))
        payload.direction = editForm.direction;
      if (editForm.rollupMethod !== (editParam.rollupMethod ?? "SUM"))
        payload.rollupMethod = editForm.rollupMethod;
      if (editForm.howToMeasure !== (editParam.howToMeasure ?? ""))
        payload.howToMeasure = editForm.howToMeasure || null;
      if (editForm.howToCompute !== (editParam.howToCompute ?? ""))
        payload.howToCompute = editForm.howToCompute || null;
      if (editForm.howToReport !== (editParam.howToReport ?? ""))
        payload.howToReport = editForm.howToReport || null;
      if (editForm.status !== (editParam.status ?? "active"))
        payload.status = editForm.status;

      const newDepts = editForm.depts
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean);
      const oldDepts = editParam.depts ?? [];
      if (JSON.stringify(newDepts) !== JSON.stringify(oldDepts))
        payload.depts = newDepts;

      // Only send if there are actual changes
      if (Object.keys(payload).length === 0) {
        setEditOpen(false);
        return;
      }

      const res = await fetch(`/api/parameters/${editParam.paramId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setEditError(body?.error?.message ?? "Failed to save override");
        return;
      }

      setEditOpen(false);
      fetchParameters(
        meta.page,
        searchInput || undefined,
        standardFilter || undefined,
        pillarFilter || undefined,
        categoryFilter || undefined
      );
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "Failed to save override");
    } finally {
      setEditLoading(false);
    }
  }

  const totalPages = Math.ceil(meta.total / (meta.pageSize || 20));

  if (unauthorized) {
    return (
      <div>
        <PageHeader title="Parameters & KPI Library" description="Access restricted" />
        <div className="p-4 rounded-lg bg-[var(--redbg)] text-[var(--redtx)] text-xs">
          You do not have permission to view parameters. This page is restricted to Admin and
          Analyst roles.
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Parameters & KPI Library"
        description="Browse parameter library and customize overrides for your organization"
      />

      {/* Filter Controls */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="w-52">
          <Input
            label="Search"
            id="filter-search"
            placeholder="Name or code..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        <div className="w-36">
          <label className="block text-[11px] font-semibold text-[var(--tx2)] mb-[5px]">
            Standard
          </label>
          <Select
            value={standardFilter}
            onValueChange={(val) => setStandardFilter(val === "__all__" ? "" : val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All standards" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All standards</SelectItem>
              <SelectItem value="BRSR">BRSR</SelectItem>
              <SelectItem value="ESRS">ESRS</SelectItem>
              <SelectItem value="GRI">GRI</SelectItem>
              <SelectItem value="IFRS_S2">IFRS S2</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-36">
          <label className="block text-[11px] font-semibold text-[var(--tx2)] mb-[5px]">
            Pillar
          </label>
          <Select
            value={pillarFilter}
            onValueChange={(val) => setPillarFilter(val === "__all__" ? "" : val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All pillars" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All pillars</SelectItem>
              <SelectItem value="E">Environment</SelectItem>
              <SelectItem value="S">Social</SelectItem>
              <SelectItem value="G">Governance</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-40">
          <Input
            label="Category"
            id="filter-category"
            placeholder="e.g. Climate"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          />
        </div>

        <div className="flex gap-2 pb-[13px]">
          <Button variant="primary" size="sm" onClick={handleApplyFilters}>
            Apply
          </Button>
          <Button variant="ghost" size="sm" onClick={handleClearFilters}>
            Clear
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-[var(--redbg)] text-[var(--redtx)] text-xs">
          {error}
        </div>
      )}

      {/* Parameters Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Standard</TableHead>
            <TableHead>Pillar</TableHead>
            <TableHead>Unit</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Departments</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8 text-[var(--tx3)]">
                Loading...
              </TableCell>
            </TableRow>
          )}
          {!loading && parameters.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8 text-[var(--tx3)]">
                No parameters found
              </TableCell>
            </TableRow>
          )}
          {!loading &&
            parameters.map((param) => (
              <TableRow key={param.paramId}>
                <TableCell className="font-mono text-[11px]">{param.code}</TableCell>
                <TableCell className="font-medium">
                  {param.name}
                  {param.overrideParamId && (
                    <Badge variant="warning" className="ml-2 text-[9px]">
                      Override
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="neutral">{param.standard}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={PILLAR_BADGE_VARIANT[param.pillar] ?? "neutral"}>
                    {PILLAR_LABELS[param.pillar] ?? param.pillar}
                  </Badge>
                </TableCell>
                <TableCell className="text-[var(--tx3)]">{param.unit}</TableCell>
                <TableCell className="text-[var(--tx3)]">{param.category ?? "—"}</TableCell>
                <TableCell className="text-[var(--tx3)] text-[11px]">
                  {param.depts?.join(", ") || "—"}
                </TableCell>
                <TableCell>
                  {isAdmin && (
                    <Button variant="ghost" size="sm" onClick={() => openEditModal(param)}>
                      Edit
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-[11px] text-[var(--tx3)]">
            Page {meta.page} of {totalPages} ({meta.total} total parameters)
          </span>
          <div className="flex gap-1">
            <Button
              variant="secondary"
              size="sm"
              disabled={meta.page <= 1}
              onClick={() => handlePageChange(meta.page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={meta.page >= totalPages}
              onClick={() => handlePageChange(meta.page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Edit Parameter Override Modal */}
      <Modal open={editOpen} onOpenChange={setEditOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Override Parameter</ModalTitle>
            <ModalDescription>
              {editParam
                ? `Customize ${editParam.code} — ${editParam.name} for your organization. Changes create a tenant-specific override without modifying the platform default.`
                : ""}
            </ModalDescription>
          </ModalHeader>

          <div className="space-y-1 max-h-[60vh] overflow-y-auto pr-1">
            <Input
              label="Name"
              id="edit-name"
              value={editForm.name}
              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
            />
            <Input
              label="Description"
              id="edit-description"
              value={editForm.description}
              onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
            />
            <Input
              label="Unit"
              id="edit-unit"
              value={editForm.unit}
              onChange={(e) => setEditForm((f) => ({ ...f, unit: e.target.value }))}
            />
            <Input
              label="Category"
              id="edit-category"
              value={editForm.category}
              onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
            />

            <div className="mb-[13px]">
              <label className="block text-[11px] font-semibold text-[var(--tx2)] mb-[5px]">
                Direction
              </label>
              <Select
                value={editForm.direction}
                onValueChange={(val) => setEditForm((f) => ({ ...f, direction: val }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lower_is_better">Lower is better</SelectItem>
                  <SelectItem value="higher_is_better">Higher is better</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="mb-[13px]">
              <label className="block text-[11px] font-semibold text-[var(--tx2)] mb-[5px]">
                Rollup Method
              </label>
              <Select
                value={editForm.rollupMethod}
                onValueChange={(val) => setEditForm((f) => ({ ...f, rollupMethod: val }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SUM">Sum</SelectItem>
                  <SelectItem value="AVG">Average</SelectItem>
                  <SelectItem value="WEIGHTED_AVG">Weighted Average</SelectItem>
                  <SelectItem value="LATEST">Latest</SelectItem>
                  <SelectItem value="NONE">None</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Input
              label="How to Measure"
              id="edit-howToMeasure"
              value={editForm.howToMeasure}
              onChange={(e) => setEditForm((f) => ({ ...f, howToMeasure: e.target.value }))}
            />
            <Input
              label="How to Compute"
              id="edit-howToCompute"
              value={editForm.howToCompute}
              onChange={(e) => setEditForm((f) => ({ ...f, howToCompute: e.target.value }))}
            />
            <Input
              label="How to Report"
              id="edit-howToReport"
              value={editForm.howToReport}
              onChange={(e) => setEditForm((f) => ({ ...f, howToReport: e.target.value }))}
            />
            <Input
              label="Departments (comma-separated)"
              id="edit-depts"
              placeholder="Operations, Finance, EHS"
              value={editForm.depts}
              onChange={(e) => setEditForm((f) => ({ ...f, depts: e.target.value }))}
            />

            <div className="mb-[13px]">
              <label className="block text-[11px] font-semibold text-[var(--tx2)] mb-[5px]">
                Status
              </label>
              <Select
                value={editForm.status}
                onValueChange={(val) => setEditForm((f) => ({ ...f, status: val }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {editError && (
            <div className="p-2 rounded bg-[var(--redbg)] text-[var(--redtx)] text-xs mt-2">
              {editError}
            </div>
          )}

          <ModalFooter>
            <Button variant="ghost" size="sm" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={editLoading}
              onClick={handleEditSubmit}
              disabled={!editForm.name}
            >
              Save Override
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
