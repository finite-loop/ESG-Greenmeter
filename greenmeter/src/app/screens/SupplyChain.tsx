"use client";

import { useState, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from "@/components/ui/Modal";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/Select";
import { SupplierTable } from "@/components/supply-chain/SupplierTable";
import { SupplierDetailPanel } from "@/components/supply-chain/SupplierDetailPanel";
import Scope3Breakdown from "@/components/supply-chain/Scope3Breakdown";
import {
  useSuppliers,
  useSupplierDetail,
  useCreateSupplier,
  useUpsertAssessment,
  useScope3Summary,
  useGeneratePortalToken,
} from "@/hooks/useSuppliers";
import type { CreateSupplierInput, UpsertAssessmentInput } from "@/hooks/useSuppliers";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- matches AppShell navProps spread pattern used by all screens
type Props = { navigate: (s: any) => void; [k: string]: any };

export default function SupplyChainScreen({ navigate }: Props) {
  const [activeTab, setActiveTab] = useState<"suppliers" | "scope3">("suppliers");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [riskFilter, setRiskFilter] = useState<string>("");
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [portalLinkCopied, setPortalLinkCopied] = useState(false);
  const [page, setPage] = useState(1);

  // Create form state
  const [newName, setNewName] = useState("");
  const [newSector, setNewSector] = useState("");
  const [newCountry, setNewCountry] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newContactName, setNewContactName] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");

  const { data: suppliersResponse, isLoading } = useSuppliers({
    search: searchQuery || undefined,
    category: (categoryFilter as "tier1" | "tier2" | "tier3") || undefined,
    riskLevel: (riskFilter as "low" | "medium" | "high" | "critical") || undefined,
    page,
    pageSize: 20,
  });

  const { data: detailResponse } = useSupplierDetail(selectedSupplierId);

  const { data: scope3Response } = useScope3Summary(activeTab === "scope3");

  const createMutation = useCreateSupplier();
  const assessmentMutation = useUpsertAssessment();
  const portalTokenMutation = useGeneratePortalToken();

  const suppliers = suppliersResponse?.data ?? [];
  const meta = suppliersResponse?.meta;
  const supplierDetail = detailResponse?.data ?? null;
  const scope3Data = scope3Response?.data ?? null;

  const handleGeneratePortalLink = useCallback(
    (supplierId: string) => {
      portalTokenMutation.mutate(supplierId, {
        onSuccess: (data) => {
          const url = `${window.location.origin}${data.data.portalUrl}`;
          navigator.clipboard.writeText(url).then(() => {
            setPortalLinkCopied(true);
            setTimeout(() => setPortalLinkCopied(false), 3000);
          });
        },
      });
    },
    [portalTokenMutation]
  );

  const handleCreateSupplier = useCallback(() => {
    const input: CreateSupplierInput = {
      name: newName,
      ...(newSector ? { sector: newSector } : {}),
      ...(newCountry ? { country: newCountry } : {}),
      ...(newCategory ? { category: newCategory as "tier1" | "tier2" | "tier3" } : {}),
      ...(newContactName ? { contactName: newContactName } : {}),
      ...(newContactEmail ? { contactEmail: newContactEmail } : {}),
    };

    createMutation.mutate(input, {
      onSuccess: () => {
        setShowCreateModal(false);
        setNewName("");
        setNewSector("");
        setNewCountry("");
        setNewCategory("");
        setNewContactName("");
        setNewContactEmail("");
      },
    });
  }, [newName, newSector, newCountry, newCategory, newContactName, newContactEmail, createMutation]);

  const handleUpsertAssessment = useCallback(
    (supplierId: string, input: UpsertAssessmentInput) => {
      assessmentMutation.mutate({ supplierId, input });
    },
    [assessmentMutation]
  );

  // Summary stats
  const totalSuppliers = meta?.total ?? 0;
  const highRiskCount = suppliers.filter(
    (s) => s.riskLevel === "high" || s.riskLevel === "critical"
  ).length;

  if (selectedSupplierId && supplierDetail) {
    return (
      <div>
        <div className="ph">
          <div>
            <div className="ptitle">Supplier Detail</div>
            <div className="psub">ESG scorecard and assessment data</div>
          </div>
        </div>
        <SupplierDetailPanel
          supplier={supplierDetail}
          onClose={() => setSelectedSupplierId(null)}
          onUpsertAssessment={handleUpsertAssessment}
          isAssessmentLoading={assessmentMutation.isPending}
          onGeneratePortalLink={handleGeneratePortalLink}
          isPortalLinkLoading={portalTokenMutation.isPending}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="ph">
        <div>
          <div className="ptitle">Supply chain ESG</div>
          <div className="psub">
            Tier 1 &amp; Tier 2 suppliers &middot; Scope 3 Cat 1 emissions &middot; ESG
            scorecards &middot; survey management
          </div>
        </div>
        <div className="ph-acts">
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            + Add supplier
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-3 border-b border-[var(--bdr)]">
        <button
          className={`px-3 py-1.5 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === "suppliers"
              ? "border-[var(--t700)] text-[var(--t700)]"
              : "border-transparent text-[var(--tx3)] hover:text-[var(--tx2)]"
          }`}
          onClick={() => setActiveTab("suppliers")}
        >
          Suppliers
        </button>
        <button
          className={`px-3 py-1.5 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === "scope3"
              ? "border-[var(--t700)] text-[var(--t700)]"
              : "border-transparent text-[var(--tx3)] hover:text-[var(--tx2)]"
          }`}
          onClick={() => setActiveTab("scope3")}
        >
          Scope 3 Emissions
        </button>
      </div>

      {/* Portal link copied toast */}
      {portalLinkCopied && (
        <div className="mb-3 p-2 rounded-lg bg-[#f0fdfa] border border-[#99f6e4] text-xs text-[#134e4a] text-center">
          Portal link copied to clipboard
        </div>
      )}

      {activeTab === "scope3" && scope3Data && (
        <Scope3Breakdown
          totalScope3Cat1={scope3Data.totalScope3Cat1}
          supplierBreakdown={scope3Data.supplierBreakdown}
          onSupplierClick={(id) => {
            setSelectedSupplierId(id);
            setActiveTab("suppliers");
          }}
        />
      )}

      {activeTab === "scope3" && !scope3Data && (
        <div className="p-8 text-center text-xs text-[var(--tx3)]">
          Loading Scope 3 data...
        </div>
      )}

      {activeTab === "suppliers" && (
        <>
      {/* Summary strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 10,
          marginBottom: 14,
        }}
      >
        <div className="stat-card">
          <div className="slbl">Total suppliers</div>
          <div className="sval" style={{ color: "var(--tx1)" }}>
            {totalSuppliers}
          </div>
          <div className="ssub">All categories</div>
        </div>
        <div className="stat-card">
          <div className="slbl">High risk</div>
          <div className="sval" style={{ color: "var(--red)" }}>
            {highRiskCount}
          </div>
          <div className="ssub">Score below 40</div>
        </div>
        <div className="stat-card">
          <div className="slbl">Showing</div>
          <div className="sval" style={{ color: "var(--t700)" }}>
            {suppliers.length}
          </div>
          <div className="ssub">On this page</div>
        </div>
      </div>

      {/* Filters + Table */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Supplier ESG scorecards</CardTitle>
            <CardDescription>
              Manage suppliers and track ESG performance
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search suppliers..."
              className="px-2 py-1.5 border border-[var(--bdr)] rounded-[7px] text-xs bg-[var(--surf)] outline-none w-40"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
            />
            <Select
              value={categoryFilter}
              onValueChange={(v) => {
                setCategoryFilter(v === "all" ? "" : v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="tier1">Tier 1</SelectItem>
                <SelectItem value="tier2">Tier 2</SelectItem>
                <SelectItem value="tier3">Tier 3</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={riskFilter}
              onValueChange={(v) => {
                setRiskFilter(v === "all" ? "" : v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Risk" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All risk</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-[var(--tx3)]">
              Loading suppliers...
            </div>
          ) : (
            <SupplierTable
              suppliers={suppliers}
              onView={(id) => setSelectedSupplierId(id)}
            />
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {meta && meta.total > meta.pageSize && (
        <div className="flex items-center justify-between mt-3 text-xs text-[var(--tx3)]">
          <span>
            Page {meta.page} of {Math.ceil(meta.total / meta.pageSize)}
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= Math.ceil(meta.total / meta.pageSize)}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      </>
      )}

      {/* Create supplier modal */}
      <Modal open={showCreateModal} onOpenChange={setShowCreateModal}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Add Supplier</ModalTitle>
            <ModalDescription>
              Register a new supplier for ESG tracking
            </ModalDescription>
          </ModalHeader>
          <div className="space-y-1">
            <Input
              label="Supplier Name"
              id="supplierName"
              placeholder="e.g., Tata Steel Ltd"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <Input
              label="Sector"
              id="sector"
              placeholder="e.g., Steel, Electronics"
              value={newSector}
              onChange={(e) => setNewSector(e.target.value)}
            />
            <Input
              label="Country"
              id="country"
              placeholder="e.g., India"
              value={newCountry}
              onChange={(e) => setNewCountry(e.target.value)}
            />
            <div className="mb-[13px]">
              <label className="block text-[11px] font-semibold text-[var(--tx2)] mb-[5px]">
                Category
              </label>
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tier1">Tier 1</SelectItem>
                  <SelectItem value="tier2">Tier 2</SelectItem>
                  <SelectItem value="tier3">Tier 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Input
              label="Contact Name"
              id="contactName"
              placeholder="e.g., John Doe"
              value={newContactName}
              onChange={(e) => setNewContactName(e.target.value)}
            />
            <Input
              label="Contact Email"
              id="contactEmail"
              type="email"
              placeholder="e.g., john@example.com"
              value={newContactEmail}
              onChange={(e) => setNewContactEmail(e.target.value)}
            />
          </div>
          <ModalFooter>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateSupplier}
              disabled={!newName.trim()}
              loading={createMutation.isPending}
            >
              Create Supplier
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
