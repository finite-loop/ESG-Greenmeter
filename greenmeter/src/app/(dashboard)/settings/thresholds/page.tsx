"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";

interface MergedThreshold {
  thresholdId: string;
  paramId: string | null;
  paramName: string | null;
  paramCode: string | null;
  category: string | null;
  pillar: string | null;
  redMax: string | null;
  amberMax: string | null;
  unit: string | null;
  source: "platform" | "tenant";
}

interface MergedWeight {
  weightId: string;
  pillar: string;
  category: string;
  weight: string;
  source: "platform" | "tenant";
}

interface WeightsByLevel {
  categories: MergedWeight[];
  pillars: MergedWeight[];
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

export default function ThresholdsPage() {
  // --- Thresholds State ---
  const [thresholds, setThresholds] = useState<MergedThreshold[]>([]);
  const [thresholdsLoading, setThresholdsLoading] = useState(false);
  const [thresholdsError, setThresholdsError] = useState<string | null>(null);
  const [pillarFilter, setPillarFilter] = useState<string>("");

  // --- Threshold Edit Modal ---
  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editThreshold, setEditThreshold] = useState<MergedThreshold | null>(null);
  const [editForm, setEditForm] = useState({ redMax: "", amberMax: "", unit: "" });

  // --- Weights State ---
  const [weights, setWeights] = useState<WeightsByLevel>({ categories: [], pillars: [] });
  const [weightsLoading, setWeightsLoading] = useState(false);
  const [weightsError, setWeightsError] = useState<string | null>(null);
  const [weightsSaving, setWeightsSaving] = useState(false);
  const [weightsSaveMessage, setWeightsSaveMessage] = useState<string | null>(null);

  // --- Editable weight rows ---
  const [editableCategories, setEditableCategories] = useState<
    { pillar: string; category: string; weight: string }[]
  >([]);
  const [editablePillars, setEditablePillars] = useState<
    { pillar: string; weight: string }[]
  >([]);

  // --- Auth state ---
  const [isAdmin, setIsAdmin] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);

  // --- Fetch thresholds ---
  const fetchThresholds = useCallback(async () => {
    setThresholdsLoading(true);
    setThresholdsError(null);
    try {
      const res = await fetch("/api/config/thresholds");
      if (res.status === 401 || res.status === 403) {
        setUnauthorized(true);
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setThresholdsError(body?.error?.message ?? `Request failed with status ${res.status}`);
        return;
      }
      const json = await res.json();
      setThresholds(json.data);
    } catch (err: unknown) {
      setThresholdsError(err instanceof Error ? err.message : "Failed to fetch thresholds");
    } finally {
      setThresholdsLoading(false);
    }
  }, []);

  // --- Fetch weights ---
  const fetchWeights = useCallback(async () => {
    setWeightsLoading(true);
    setWeightsError(null);
    try {
      const res = await fetch("/api/config/weights");
      if (res.status === 401 || res.status === 403) {
        setUnauthorized(true);
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setWeightsError(body?.error?.message ?? `Request failed with status ${res.status}`);
        return;
      }
      const json = await res.json();
      const data = json.data as WeightsByLevel;
      setWeights(data);

      // Initialize editable rows from fetched data
      setEditableCategories(
        data.categories.map((w) => ({
          pillar: w.pillar,
          category: w.category,
          weight: w.weight,
        }))
      );
      setEditablePillars(
        data.pillars.map((w) => ({
          pillar: w.pillar,
          weight: w.weight,
        }))
      );
    } catch (err: unknown) {
      setWeightsError(err instanceof Error ? err.message : "Failed to fetch weights");
    } finally {
      setWeightsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchThresholds();
    fetchWeights();
    // Check session for admin role
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((session) => {
        if (session?.user?.role === "admin") {
          setIsAdmin(true);
        }
      })
      .catch(() => { /* session unavailable */ });
  }, [fetchThresholds, fetchWeights]);

  // --- Threshold filtering ---
  const filteredThresholds = pillarFilter
    ? thresholds.filter((t) => t.pillar === pillarFilter)
    : thresholds;

  // --- Threshold Edit ---
  function openThresholdEdit(threshold: MergedThreshold) {
    setEditThreshold(threshold);
    setEditForm({
      redMax: threshold.redMax ?? "",
      amberMax: threshold.amberMax ?? "",
      unit: threshold.unit ?? "",
    });
    setEditError(null);
    setEditOpen(true);
  }

  async function handleThresholdSave() {
    if (!editThreshold) return;
    setEditLoading(true);
    setEditError(null);

    try {
      const res = await fetch("/api/config/thresholds", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paramId: editThreshold.paramId,
          category: editThreshold.category,
          pillar: editThreshold.pillar,
          redMax: editForm.redMax,
          amberMax: editForm.amberMax,
          unit: editForm.unit || undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setEditError(body?.error?.message ?? "Failed to save threshold");
        return;
      }

      setEditOpen(false);
      fetchThresholds();
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "Failed to save threshold");
    } finally {
      setEditLoading(false);
    }
  }

  // --- Weights Save ---
  async function handleWeightsSave() {
    setWeightsSaving(true);
    setWeightsError(null);
    setWeightsSaveMessage(null);

    try {
      const allWeights = [
        ...editableCategories.map((w) => ({
          pillar: w.pillar as "E" | "S" | "G",
          category: w.category,
          weight: w.weight,
        })),
        ...editablePillars.map((w) => ({
          pillar: w.pillar as "E" | "S" | "G",
          category: "_overall",
          weight: w.weight,
        })),
      ];

      const res = await fetch("/api/config/weights", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weights: allWeights }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setWeightsError(body?.error?.message ?? "Failed to save weights");
        return;
      }

      setWeightsSaveMessage("Weights saved. Score recomputation queued.");
      fetchWeights();
    } catch (err: unknown) {
      setWeightsError(err instanceof Error ? err.message : "Failed to save weights");
    } finally {
      setWeightsSaving(false);
    }
  }

  // --- Weight sum validation ---
  function categoryWeightSum(pillar: string): number {
    return editableCategories
      .filter((w) => w.pillar === pillar)
      .reduce((sum, w) => sum + (Number(w.weight) || 0), 0);
  }

  function pillarWeightSum(): number {
    return editablePillars.reduce((sum, w) => sum + (Number(w.weight) || 0), 0);
  }

  function updateCategoryWeight(index: number, value: string) {
    setEditableCategories((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], weight: value };
      return next;
    });
  }

  function updatePillarWeight(index: number, value: string) {
    setEditablePillars((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], weight: value };
      return next;
    });
  }

  if (unauthorized) {
    return (
      <div>
        <PageHeader
          title="Threshold & Weight Configuration"
          description="Access restricted"
        />
        <div className="p-4 rounded-lg bg-[var(--redbg)] text-[var(--redtx)] text-xs">
          You do not have permission to view this page. This page is restricted to Admin and
          Analyst roles.
        </div>
      </div>
    );
  }

  const uniquePillars = [...new Set(editableCategories.map((w) => w.pillar))];

  return (
    <div>
      <PageHeader
        title="Threshold & Weight Configuration"
        description="Configure scoring thresholds and category weights for your organization"
      />

      <Tabs defaultValue="thresholds">
        <TabsList>
          <TabsTrigger value="thresholds">Thresholds</TabsTrigger>
          <TabsTrigger value="weights">Weights</TabsTrigger>
        </TabsList>

        {/* === Thresholds Tab === */}
        <TabsContent value="thresholds">
          {/* Filter */}
          <div className="flex items-end gap-3 mb-4">
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
          </div>

          {thresholdsError && (
            <div className="mb-4 p-3 rounded-lg bg-[var(--redbg)] text-[var(--redtx)] text-xs">
              {thresholdsError}
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Scope</TableHead>
                <TableHead>Pillar</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Red Max</TableHead>
                <TableHead>Amber Max</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Source</TableHead>
                {isAdmin && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {thresholdsLoading && (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 8 : 7} className="text-center py-8 text-[var(--tx3)]">
                    Loading...
                  </TableCell>
                </TableRow>
              )}
              {!thresholdsLoading && filteredThresholds.length === 0 && (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 8 : 7} className="text-center py-8 text-[var(--tx3)]">
                    No thresholds configured
                  </TableCell>
                </TableRow>
              )}
              {!thresholdsLoading &&
                filteredThresholds.map((t) => (
                  <TableRow key={t.thresholdId}>
                    <TableCell className="font-medium">
                      {t.paramCode
                        ? `${t.paramCode} — ${t.paramName}`
                        : t.category
                          ? `Category: ${t.category}`
                          : t.pillar
                            ? `Pillar: ${PILLAR_LABELS[t.pillar] ?? t.pillar}`
                            : "Default"}
                    </TableCell>
                    <TableCell>
                      {t.pillar ? (
                        <Badge variant={PILLAR_BADGE_VARIANT[t.pillar] ?? "neutral"}>
                          {PILLAR_LABELS[t.pillar] ?? t.pillar}
                        </Badge>
                      ) : (
                        <span className="text-[var(--tx3)]">All</span>
                      )}
                    </TableCell>
                    <TableCell className="text-[var(--tx3)]">
                      {t.category ?? "—"}
                    </TableCell>
                    <TableCell className="font-mono text-[11px]">
                      {t.redMax ?? "—"}
                    </TableCell>
                    <TableCell className="font-mono text-[11px]">
                      {t.amberMax ?? "—"}
                    </TableCell>
                    <TableCell className="text-[var(--tx3)]">
                      {t.unit ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={t.source === "tenant" ? "warning" : "neutral"}>
                        {t.source === "tenant" ? "Override" : "Platform"}
                      </Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openThresholdEdit(t)}
                        >
                          Edit
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TabsContent>

        {/* === Weights Tab === */}
        <TabsContent value="weights">
          {weightsError && (
            <div className="mb-4 p-3 rounded-lg bg-[var(--redbg)] text-[var(--redtx)] text-xs">
              {weightsError}
            </div>
          )}

          {weightsSaveMessage && (
            <div className="mb-4 p-3 rounded-lg bg-[var(--greenbg)] text-[var(--greentx)] text-xs">
              {weightsSaveMessage}
            </div>
          )}

          {weightsLoading ? (
            <div className="py-8 text-center text-[var(--tx3)]">Loading...</div>
          ) : (
            <>
              {/* Pillar Weights */}
              <div className="mb-6">
                <h3 className="text-xs font-semibold text-[var(--tx1)] mb-3">
                  Pillar Weights
                  <span className="ml-2 text-[var(--tx3)] font-normal">
                    (must sum to 100%)
                  </span>
                </h3>
                <div className="flex items-center justify-between mb-1 text-[11px] text-[var(--tx3)] font-medium px-1">
                  <span>Total: {pillarWeightSum().toFixed(1)}%</span>
                  {Math.abs(pillarWeightSum() - 100) > 0.01 && editablePillars.length > 0 && (
                    <span className="text-[var(--redtx)]">
                      Sum must equal 100%
                    </span>
                  )}
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pillar</TableHead>
                      <TableHead>Weight (%)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {editablePillars.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center py-4 text-[var(--tx3)]">
                          No pillar weights configured
                        </TableCell>
                      </TableRow>
                    )}
                    {editablePillars.map((w, idx) => (
                      <TableRow key={`pillar-${w.pillar}`}>
                        <TableCell>
                          <Badge variant={PILLAR_BADGE_VARIANT[w.pillar] ?? "neutral"}>
                            {PILLAR_LABELS[w.pillar] ?? w.pillar}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {isAdmin ? (
                            <Input
                              id={`pillar-weight-${w.pillar}`}
                              value={w.weight}
                              onChange={(e) => updatePillarWeight(idx, e.target.value)}
                              className="w-24"
                            />
                          ) : (
                            <span className="font-mono text-[11px]">{w.weight}%</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Category Weights by Pillar */}
              {uniquePillars.map((pillar) => {
                const pillarCategories = editableCategories
                  .map((w, idx) => ({ ...w, originalIndex: idx }))
                  .filter((w) => w.pillar === pillar);
                const sum = categoryWeightSum(pillar);

                return (
                  <div key={pillar} className="mb-6">
                    <h3 className="text-xs font-semibold text-[var(--tx1)] mb-3">
                      <Badge variant={PILLAR_BADGE_VARIANT[pillar] ?? "neutral"} className="mr-2">
                        {PILLAR_LABELS[pillar] ?? pillar}
                      </Badge>
                      Category Weights
                      <span className="ml-2 text-[var(--tx3)] font-normal">
                        (must sum to 100%)
                      </span>
                    </h3>
                    <div className="flex items-center justify-between mb-1 text-[11px] text-[var(--tx3)] font-medium px-1">
                      <span>Total: {sum.toFixed(1)}%</span>
                      {Math.abs(sum - 100) > 0.01 && pillarCategories.length > 0 && (
                        <span className="text-[var(--redtx)]">
                          Sum must equal 100%
                        </span>
                      )}
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Category</TableHead>
                          <TableHead>Weight (%)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pillarCategories.map((w) => (
                          <TableRow key={`cat-${w.pillar}-${w.category}`}>
                            <TableCell className="font-medium">{w.category}</TableCell>
                            <TableCell>
                              {isAdmin ? (
                                <Input
                                  id={`cat-weight-${w.pillar}-${w.category}`}
                                  value={w.weight}
                                  onChange={(e) =>
                                    updateCategoryWeight(w.originalIndex, e.target.value)
                                  }
                                  className="w-24"
                                />
                              ) : (
                                <span className="font-mono text-[11px]">{w.weight}%</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                );
              })}

              {isAdmin && (
                <div className="mt-4">
                  <Button
                    variant="primary"
                    size="sm"
                    loading={weightsSaving}
                    onClick={handleWeightsSave}
                  >
                    Save Weights
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Threshold Edit Modal */}
      <Modal open={editOpen} onOpenChange={setEditOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Edit Threshold</ModalTitle>
            <ModalDescription>
              {editThreshold
                ? editThreshold.paramCode
                  ? `Configure threshold bands for ${editThreshold.paramCode} — ${editThreshold.paramName}. This creates a tenant-specific override.`
                  : editThreshold.category
                    ? `Configure threshold bands for category "${editThreshold.category}". This creates a tenant-specific override.`
                    : editThreshold.pillar
                      ? `Configure threshold bands for ${PILLAR_LABELS[editThreshold.pillar] ?? editThreshold.pillar} pillar. This creates a tenant-specific override.`
                      : "Configure default threshold bands. This creates a tenant-specific override."
                : ""}
            </ModalDescription>
          </ModalHeader>

          <div className="space-y-1">
            <Input
              label="Red Max (poor threshold)"
              id="edit-redMax"
              value={editForm.redMax}
              onChange={(e) => setEditForm((f) => ({ ...f, redMax: e.target.value }))}
            />
            <Input
              label="Amber Max (fair threshold)"
              id="edit-amberMax"
              value={editForm.amberMax}
              onChange={(e) => setEditForm((f) => ({ ...f, amberMax: e.target.value }))}
            />
            <Input
              label="Unit (optional)"
              id="edit-unit"
              value={editForm.unit}
              onChange={(e) => setEditForm((f) => ({ ...f, unit: e.target.value }))}
            />
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
              onClick={handleThresholdSave}
              disabled={!editForm.redMax || !editForm.amberMax}
            >
              Save Override
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
