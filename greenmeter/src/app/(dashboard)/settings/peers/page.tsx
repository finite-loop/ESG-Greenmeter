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

const SECTORS = [
  "Technology",
  "Financial Services",
  "Healthcare",
  "Energy",
  "Materials",
  "Industrials",
  "Consumer Discretionary",
  "Consumer Staples",
  "Utilities",
  "Real Estate",
  "Communication Services",
] as const;

interface PeerOrganisation {
  peerId: string;
  name: string;
  sector: string | null;
  country: string | null;
  marketCap: string | null;
  exchange: string | null;
  active: boolean | null;
  createdAt: string;
  updatedAt: string;
}

interface PeerResponse {
  data: PeerOrganisation[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
  };
}

interface PeerFormData {
  name: string;
  sector: string;
  country: string;
  marketCap: string;
  exchange: string;
}

const EMPTY_FORM: PeerFormData = {
  name: "",
  sector: "",
  country: "",
  marketCap: "",
  exchange: "",
};

export default function PeersPage() {
  const [peers, setPeers] = useState<PeerOrganisation[]>([]);
  const [meta, setMeta] = useState<{ page: number; pageSize: number; total: number }>({
    page: 1,
    pageSize: 20,
    total: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);

  // Search state
  const [search, setSearch] = useState("");

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<PeerFormData>(EMPTY_FORM);
  const [editingPeerId, setEditingPeerId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const fetchPeers = useCallback(async (page: number, searchTerm?: string) => {
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
      if (searchTerm) params.set("search", searchTerm);

      const res = await fetch(`/api/peers?${params.toString()}`, {
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

      const json: PeerResponse = await res.json();
      setPeers(json.data);
      setMeta(json.meta);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Failed to fetch peers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPeers(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSearch() {
    fetchPeers(1, search);
  }

  function handleClearSearch() {
    setSearch("");
    fetchPeers(1);
  }

  function handlePageChange(newPage: number) {
    fetchPeers(newPage, search);
  }

  function openAddForm() {
    setFormData(EMPTY_FORM);
    setEditingPeerId(null);
    setFormError(null);
    setShowForm(true);
  }

  function openEditForm(peer: PeerOrganisation) {
    setFormData({
      name: peer.name,
      sector: peer.sector ?? "",
      country: peer.country ?? "",
      marketCap: peer.marketCap ?? "",
      exchange: peer.exchange ?? "",
    });
    setEditingPeerId(peer.peerId);
    setFormError(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingPeerId(null);
    setFormData(EMPTY_FORM);
    setFormError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.name.trim()) {
      setFormError("Name is required");
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      const payload: Record<string, string | undefined> = {
        name: formData.name.trim(),
      };
      if (formData.sector) payload.sector = formData.sector;
      if (formData.country) payload.country = formData.country.trim();
      if (formData.marketCap) payload.marketCap = formData.marketCap;
      if (formData.exchange) payload.exchange = formData.exchange.trim();

      const url = editingPeerId ? `/api/peers/${editingPeerId}` : "/api/peers";
      const method = editingPeerId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setFormError(body?.error?.message ?? `Save failed with status ${res.status}`);
        return;
      }

      closeForm();
      fetchPeers(meta.page, search);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to save peer");
    } finally {
      setSaving(false);
    }
  }

  const totalPages = Math.ceil(meta.total / (meta.pageSize || 20));

  if (unauthorized) {
    return (
      <div>
        <PageHeader title="Peer Organisations" description="Access restricted" />
        <div className="p-4 rounded-lg bg-[var(--redbg)] text-[var(--redtx)] text-xs">
          You do not have permission to manage peer organisations. This page is restricted to Admin and Analyst roles.
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Peer Organisations"
        description="Manage peer companies for ESG benchmarking and comparison"
      />

      {/* Search + Add */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="w-64">
          <Input
            label="Search"
            id="peer-search"
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
        <div className="flex gap-2 pb-[13px]">
          <Button variant="primary" size="sm" onClick={handleSearch}>
            Search
          </Button>
          <Button variant="ghost" size="sm" onClick={handleClearSearch}>
            Clear
          </Button>
        </div>
        <div className="ml-auto pb-[13px]">
          <Button variant="primary" size="sm" onClick={openAddForm}>
            Add Peer
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-[var(--redbg)] text-[var(--redtx)] text-xs">
          {error}
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="mb-4 p-4 rounded-lg border border-[var(--bdr)] bg-[var(--surf)]">
          <h3 className="text-sm font-semibold text-[var(--tx)] mb-3">
            {editingPeerId ? "Edit Peer Organisation" : "Add Peer Organisation"}
          </h3>
          {formError && (
            <div className="mb-3 p-2 rounded bg-[var(--redbg)] text-[var(--redtx)] text-xs">
              {formError}
            </div>
          )}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              label="Name"
              id="peer-name"
              required
              value={formData.name}
              onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
            />
            <div>
              <label className="block text-[11px] font-semibold text-[var(--tx2)] mb-[5px]">
                Sector
              </label>
              <Select
                value={formData.sector}
                onValueChange={(val) =>
                  setFormData((f) => ({ ...f, sector: val === "__none__" ? "" : val }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select sector" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {SECTORS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input
              label="Country"
              id="peer-country"
              value={formData.country}
              onChange={(e) => setFormData((f) => ({ ...f, country: e.target.value }))}
            />
            <div>
              <label className="block text-[11px] font-semibold text-[var(--tx2)] mb-[5px]">
                Market Cap
              </label>
              <Select
                value={formData.marketCap}
                onValueChange={(val) =>
                  setFormData((f) => ({ ...f, marketCap: val === "__none__" ? "" : val }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select market cap" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  <SelectItem value="large_cap">Large Cap</SelectItem>
                  <SelectItem value="mid_cap">Mid Cap</SelectItem>
                  <SelectItem value="small_cap">Small Cap</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Input
              label="Exchange"
              id="peer-exchange"
              value={formData.exchange}
              onChange={(e) => setFormData((f) => ({ ...f, exchange: e.target.value }))}
            />
            <div className="flex items-end gap-2">
              <Button variant="primary" size="sm" type="submit" disabled={saving}>
                {saving ? "Saving..." : editingPeerId ? "Update" : "Create"}
              </Button>
              <Button variant="ghost" size="sm" type="button" onClick={closeForm}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Sector</TableHead>
            <TableHead>Country</TableHead>
            <TableHead>Market Cap</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-[var(--tx3)]">
                Loading...
              </TableCell>
            </TableRow>
          )}
          {!loading && peers.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-[var(--tx3)]">
                No peer organisations found. Click &quot;Add Peer&quot; to create one.
              </TableCell>
            </TableRow>
          )}
          {!loading &&
            peers.map((peer) => (
              <TableRow key={peer.peerId}>
                <TableCell className="font-medium">{peer.name}</TableCell>
                <TableCell>{peer.sector ?? "—"}</TableCell>
                <TableCell>{peer.country ?? "—"}</TableCell>
                <TableCell>
                  {peer.marketCap ? peer.marketCap.replace(/_/g, " ") : "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={peer.active !== false ? "success" : "neutral"}>
                    {peer.active !== false ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditForm(peer)}
                  >
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-[11px] text-[var(--tx3)]">
            Page {meta.page} of {totalPages} ({meta.total} total)
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
    </div>
  );
}
