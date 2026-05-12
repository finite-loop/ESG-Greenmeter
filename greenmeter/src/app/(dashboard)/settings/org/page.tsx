"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { Building2, ChevronRight } from "lucide-react";

interface OrgNode {
  nodeId: string;
  name: string;
  nodeType: string;
  code: string | null;
  level: number;
  active: boolean;
  children?: OrgNode[];
}

const NODE_TYPE_STYLES: Record<string, { badge: string; color: string }> = {
  company: { badge: "b-dark", color: "var(--t700)" },
  subsidiary: { badge: "b-teal", color: "var(--t600)" },
  facility: { badge: "b-ind", color: "#6366f1" },
  department: { badge: "b-gray", color: "var(--tx3)" },
  division: { badge: "b-teal", color: "var(--t600)" },
  site: { badge: "b-ind", color: "#6366f1" },
};

function flattenTree(nodes: OrgNode[], level = 0): (OrgNode & { depth: number })[] {
  const result: (OrgNode & { depth: number })[] = [];
  for (const node of nodes) {
    result.push({ ...node, depth: level });
    if (node.children && node.children.length > 0) {
      result.push(...flattenTree(node.children, level + 1));
    }
  }
  return result;
}

export default function OrgHierarchyPage() {
  const { data, isLoading, error } = useQuery<OrgNode[]>({
    queryKey: queryKeys.orgNodes.tree(),
    queryFn: async () => {
      const res = await fetch("/api/org-hierarchy");
      if (!res.ok) throw new Error("Failed to load org hierarchy");
      const json = await res.json();
      return json.data;
    },
  });

  const flatNodes = data ? flattenTree(data) : [];

  return (
    <div>
      <div className="ph">
        <div>
          <div className="ptitle">Org &amp; hierarchy</div>
          <div className="psub">
            View and manage your organisation structure — subsidiaries,
            facilities, and departments
          </div>
        </div>
        <div className="ph-acts">
          <button className="btn-primary">+ Add node</button>
        </div>
      </div>

      {/* Summary strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 10,
          marginBottom: 14,
        }}
      >
        {(
          [
            [
              "Total nodes",
              String(flatNodes.length),
              "Across all levels",
              "var(--tx1)",
            ],
            [
              "Subsidiaries",
              String(
                flatNodes.filter(
                  (n) =>
                    n.nodeType === "subsidiary" || n.nodeType === "division"
                ).length
              ),
              "Business units",
              "var(--t700)",
            ],
            [
              "Facilities",
              String(
                flatNodes.filter(
                  (n) => n.nodeType === "facility" || n.nodeType === "site"
                ).length
              ),
              "Physical locations",
              "#6366f1",
            ],
            [
              "Departments",
              String(
                flatNodes.filter((n) => n.nodeType === "department").length
              ),
              "Functional units",
              "var(--tx3)",
            ],
          ] as [string, string, string, string][]
        ).map(([label, value, sub, color]) => (
          <div key={label} className="stat-card">
            <div className="slbl">{label}</div>
            <div className="sval" style={{ color }}>
              {isLoading ? "—" : value}
            </div>
            <div className="ssub">{sub}</div>
          </div>
        ))}
      </div>

      {/* Hierarchy tree */}
      <div className="card">
        <div className="card-head">
          <div className="ctitle">Organisation tree</div>
          <span style={{ fontSize: 10, color: "var(--tx3)" }}>
            {flatNodes.length} node{flatNodes.length !== 1 ? "s" : ""}
          </span>
        </div>

        {isLoading && (
          <div
            style={{
              padding: "40px 0",
              textAlign: "center",
              fontSize: 12,
              color: "var(--tx3)",
            }}
          >
            Loading organisation hierarchy...
          </div>
        )}

        {error && (
          <div
            style={{
              padding: "40px 0",
              textAlign: "center",
              fontSize: 12,
              color: "var(--red)",
            }}
          >
            {(error as Error).message}
          </div>
        )}

        {!isLoading && !error && flatNodes.length === 0 && (
          <div
            style={{
              padding: "40px 0",
              textAlign: "center",
              fontSize: 12,
              color: "var(--tx3)",
            }}
          >
            No organisation nodes found. Add your first node to get started.
          </div>
        )}

        {flatNodes.length > 0 && (
          <table className="tbl">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Code</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {flatNodes.map((node) => {
                const style =
                  NODE_TYPE_STYLES[node.nodeType] || NODE_TYPE_STYLES.department;
                return (
                  <tr key={node.nodeId}>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          paddingLeft: `${node.depth * 20}px`,
                        }}
                      >
                        {node.depth > 0 && (
                          <ChevronRight
                            style={{
                              width: 12,
                              height: 12,
                              color: "var(--tx3)",
                              flexShrink: 0,
                            }}
                          />
                        )}
                        {node.depth === 0 && (
                          <Building2
                            style={{
                              width: 14,
                              height: 14,
                              color: style.color,
                              flexShrink: 0,
                            }}
                          />
                        )}
                        <span
                          style={{
                            fontWeight: node.depth === 0 ? 700 : 500,
                            color: "var(--tx1)",
                          }}
                        >
                          {node.name}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`badge ${style.badge}`}
                        style={{ fontSize: 9 }}
                      >
                        {node.nodeType}
                      </span>
                    </td>
                    <td
                      style={{
                        fontFamily: "var(--fm)",
                        color: "var(--tx3)",
                        fontSize: 11,
                      }}
                    >
                      {node.code || "—"}
                    </td>
                    <td>
                      <span
                        className={`badge ${node.active ? "b-green" : "b-gray"}`}
                        style={{ fontSize: 9 }}
                      >
                        {node.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <button
                        style={{
                          fontSize: 10,
                          padding: "3px 8px",
                          background: "none",
                          border: ".5px solid var(--bdr)",
                          borderRadius: 5,
                          cursor: "pointer",
                          color: "var(--tx2)",
                        }}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
