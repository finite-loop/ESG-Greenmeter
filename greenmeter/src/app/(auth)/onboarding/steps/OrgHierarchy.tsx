"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Plus, Trash2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { NODE_TYPES, CURRENCIES, type OrgNodeInput } from "@/schemas/onboarding";

const NODE_TYPE_LABELS: Record<string, string> = {
  company: "Company",
  subsidiary: "Subsidiary",
  facility: "Facility",
  department: "Department",
};

const CHILD_TYPES: Record<string, string[]> = {
  company: ["subsidiary", "facility", "department"],
  subsidiary: ["facility", "department"],
  facility: ["department"],
  department: [],
};

interface OrgHierarchyProps {
  onSubmit: (nodes: OrgNodeInput[]) => void;
  onBack: () => void;
  isSubmitting?: boolean;
  companyName?: string;
}

let nextTempId = 1;
function generateTempId() {
  return `temp-${nextTempId++}`;
}

export function OrgHierarchyStep({
  onSubmit,
  onBack,
  isSubmitting,
  companyName,
}: OrgHierarchyProps) {
  const [nodes, setNodes] = useState<OrgNodeInput[]>([
    {
      tempId: generateTempId(),
      parentTempId: null,
      name: companyName || "",
      nodeType: "company",
      currency: undefined,
    },
  ]);
  const [error, setError] = useState<string | null>(null);

  function addChild(parentTempId: string) {
    const parent = nodes.find((n) => n.tempId === parentTempId);
    if (!parent) return;

    const allowed = CHILD_TYPES[parent.nodeType];
    if (!allowed || allowed.length === 0) return;

    setNodes((prev) => [
      ...prev,
      {
        tempId: generateTempId(),
        parentTempId,
        name: "",
        nodeType: allowed[0] as OrgNodeInput["nodeType"],
        currency: undefined,
      },
    ]);
  }

  function removeNode(tempId: string) {
    // Don't allow removing the root company node
    const node = nodes.find((n) => n.tempId === tempId);
    if (!node || node.nodeType === "company") return;

    // Remove the node and all its descendants
    const toRemove = new Set<string>();
    toRemove.add(tempId);

    let changed = true;
    while (changed) {
      changed = false;
      for (const n of nodes) {
        if (n.parentTempId && toRemove.has(n.parentTempId) && !toRemove.has(n.tempId)) {
          toRemove.add(n.tempId);
          changed = true;
        }
      }
    }

    setNodes((prev) => prev.filter((n) => !toRemove.has(n.tempId)));
  }

  function updateNode(tempId: string, updates: Partial<OrgNodeInput>) {
    setNodes((prev) =>
      prev.map((n) => (n.tempId === tempId ? { ...n, ...updates } : n))
    );
  }

  function getLevel(node: OrgNodeInput): number {
    let level = 0;
    let current = node;
    while (current.parentTempId) {
      level++;
      const parent = nodes.find((n) => n.tempId === current.parentTempId);
      if (!parent) break;
      current = parent;
    }
    return level;
  }

  function handleSubmit() {
    setError(null);

    // Validate
    const companyNodes = nodes.filter((n) => n.nodeType === "company");
    if (companyNodes.length !== 1) {
      setError("Exactly one company (root) node is required.");
      return;
    }

    for (const node of nodes) {
      if (!node.name.trim()) {
        setError("All nodes must have a name.");
        return;
      }
    }

    onSubmit(nodes);
  }

  // Build ordered list for rendering (depth-first)
  function getOrderedNodes(): OrgNodeInput[] {
    const ordered: OrgNodeInput[] = [];
    function visit(parentId: string | null) {
      const children = nodes.filter((n) => n.parentTempId === parentId);
      for (const child of children) {
        ordered.push(child);
        visit(child.tempId);
      }
    }
    visit(null);
    return ordered;
  }

  const orderedNodes = getOrderedNodes();

  return (
    <div className="space-y-4">
      <p className="text-xs text-[var(--tx2)] mb-3">
        Define your organisation structure. Start with your company and add subsidiaries, facilities, or departments.
      </p>

      <div className="space-y-2">
        {orderedNodes.map((node) => {
          const level = getLevel(node);
          const isRoot = node.nodeType === "company";
          const allowedChildren = CHILD_TYPES[node.nodeType] || [];

          return (
            <div
              key={node.tempId}
              className={cn(
                "rounded-lg border border-[var(--bdr)] p-3",
                isRoot && "border-[var(--t300)] bg-[var(--t50)]"
              )}
              style={{ marginLeft: `${level * 20}px` }}
            >
              {level > 0 && (
                <ChevronRight className="inline h-3 w-3 text-[var(--tx3)] mr-1 -ml-1" />
              )}

              <div className="flex items-start gap-2">
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Node name"
                        value={node.name}
                        onChange={(e) => updateNode(node.tempId, { name: e.target.value })}
                        className="w-full px-[11px] py-1.5 border border-[var(--bdr)] rounded-[7px] text-xs outline-none bg-[var(--surf)] focus:border-[var(--t500)]"
                      />
                    </div>
                    <div className="w-32">
                      <select
                        value={node.nodeType}
                        disabled={isRoot}
                        onChange={(e) =>
                          updateNode(node.tempId, {
                            nodeType: e.target.value as OrgNodeInput["nodeType"],
                          })
                        }
                        className="w-full px-2 py-1.5 border border-[var(--bdr)] rounded-[7px] text-xs outline-none bg-[var(--surf)] focus:border-[var(--t500)] disabled:opacity-60"
                      >
                        {isRoot ? (
                          <option value="company">Company</option>
                        ) : (
                          NODE_TYPES.filter((t) => t !== "company").map((t) => (
                            <option key={t} value={t}>
                              {NODE_TYPE_LABELS[t]}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                    <div className="w-20">
                      <select
                        value={node.currency || ""}
                        onChange={(e) =>
                          updateNode(node.tempId, {
                            currency: (e.target.value || undefined) as OrgNodeInput["currency"],
                          })
                        }
                        className="w-full px-2 py-1.5 border border-[var(--bdr)] rounded-[7px] text-xs outline-none bg-[var(--surf)] focus:border-[var(--t500)]"
                      >
                        <option value="">—</option>
                        {CURRENCIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex gap-1 pt-0.5">
                  {allowedChildren.length > 0 && (
                    <button
                      type="button"
                      onClick={() => addChild(node.tempId)}
                      className="rounded-md p-1 text-[var(--t700)] hover:bg-[var(--t50)] transition-colors"
                      title="Add child node"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {!isRoot && (
                    <button
                      type="button"
                      onClick={() => removeNode(node.tempId)}
                      className="rounded-md p-1 text-[var(--tx3)] hover:text-[var(--red)] hover:bg-[var(--bg)] transition-colors"
                      title="Remove node"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <p className="text-[10px] text-[var(--red)]">{error}</p>
      )}

      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="secondary"
          size="lg"
          className="flex-1 justify-center"
          onClick={onBack}
        >
          Back
        </Button>
        <Button
          type="button"
          size="lg"
          className="flex-1 justify-center"
          loading={isSubmitting}
          onClick={handleSubmit}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
