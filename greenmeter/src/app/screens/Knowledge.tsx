"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import {
  Badge,
  Card,
  CardContent,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui";
import { PageHeader } from "@/components/layout/PageHeader";
import { KnowledgeEntryCard } from "@/components/knowledge/KnowledgeEntryCard";
import { KnowledgeDetailPanel } from "@/components/knowledge/KnowledgeDetailPanel";
import {
  FRAMEWORKS,
  CATEGORIES,
  KNOWLEDGE_ENTRIES,
  searchEntries,
  getEntryById,
  getCategoriesForFramework,
  type Framework,
  type Pillar,
  type ContentType,
  type KnowledgeEntry,
} from "@/config/knowledgeBase";

type Props = { navigate: (s: string) => void };

const ALL_SENTINEL = "__all__";

const PILLARS: { value: string; label: string }[] = [
  { value: ALL_SENTINEL, label: "All pillars" },
  { value: "E", label: "Environment" },
  { value: "S", label: "Social" },
  { value: "G", label: "Governance" },
];

const CONTENT_TYPES: { value: string; label: string }[] = [
  { value: ALL_SENTINEL, label: "All types" },
  { value: "standard", label: "Standard" },
  { value: "regulation", label: "Regulation" },
  { value: "methodology", label: "Methodology" },
  { value: "guide", label: "Guide" },
];

export default function KnowledgeScreen({ navigate }: Props) {
  const searchParams = useSearchParams();

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFramework, setActiveFramework] = useState<Framework | "all">("all");
  const [pillarFilter, setPillarFilter] = useState(ALL_SENTINEL);
  const [categoryFilter, setCategoryFilter] = useState(ALL_SENTINEL);
  const [contentTypeFilter, setContentTypeFilter] = useState(ALL_SENTINEL);
  const [selectedEntry, setSelectedEntry] = useState<KnowledgeEntry | null>(null);

  // Deep-link support: open specific entry from URL params
  useEffect(() => {
    const entryId = searchParams.get("entry");
    if (entryId) {
      const entry = getEntryById(entryId);
      if (entry) {
        setSelectedEntry(entry);
        setActiveFramework(entry.framework);
      }
    }
  }, [searchParams]);

  // Filter entries (memoized to avoid recomputation on unrelated re-renders)
  const filtered = useMemo(
    () =>
      searchEntries(searchQuery, {
        framework: activeFramework === "all" ? undefined : activeFramework,
        pillar:
          pillarFilter === ALL_SENTINEL
            ? undefined
            : (pillarFilter as Pillar),
        category:
          categoryFilter === ALL_SENTINEL ? undefined : categoryFilter,
        contentType:
          contentTypeFilter === ALL_SENTINEL
            ? undefined
            : (contentTypeFilter as ContentType),
      }),
    [searchQuery, activeFramework, pillarFilter, categoryFilter, contentTypeFilter]
  );

  // Categories available for the current framework filter
  const availableCategories =
    activeFramework === "all"
      ? CATEGORIES
      : getCategoriesForFramework(activeFramework);

  const handleEntryClick = useCallback(
    (entry: KnowledgeEntry) => {
      setSelectedEntry((prev) => (prev?.id === entry.id ? null : entry));
    },
    []
  );

  const handleCloseDetail = useCallback(() => {
    setSelectedEntry(null);
  }, []);

  const handleNavigateToParam = useCallback(
    (paramCode: string) => {
      navigate(`params`);
    },
    [navigate]
  );

  const handleFrameworkChange = useCallback((value: string) => {
    setActiveFramework(value as Framework | "all");
    setCategoryFilter(ALL_SENTINEL);
    setPillarFilter(ALL_SENTINEL);
    setContentTypeFilter(ALL_SENTINEL);
    setSelectedEntry(null);
  }, []);

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <PageHeader
        title="Knowledge Base"
        description="ESG standards, methodologies, regulations, and measurement guidance"
      />

      {/* Framework Tabs */}
      <Tabs value={activeFramework} onValueChange={handleFrameworkChange}>
        <TabsList>
          <TabsTrigger value="all">All Frameworks</TabsTrigger>
          {FRAMEWORKS.map((fw) => (
            <TabsTrigger key={fw.id} value={fw.id}>
              {fw.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Search & Filters */}
        <Card className="mt-3.5">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--tx3)]" />
                <input
                  type="text"
                  className="w-full pl-8 pr-3 py-2 border border-[var(--bdr)] rounded-[7px] text-xs outline-none bg-[var(--surf)] focus:border-[var(--t500)] transition-[border-color]"
                  placeholder="Search standards, methodologies, tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Pillar filter */}
              <div className="flex items-center gap-1.5">
                <label className="text-[10px] font-semibold text-[var(--tx3)] uppercase tracking-wide">
                  Pillar
                </label>
                <Select
                  value={pillarFilter}
                  onValueChange={setPillarFilter}
                >
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="All pillars" />
                  </SelectTrigger>
                  <SelectContent>
                    {PILLARS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Category filter */}
              <div className="flex items-center gap-1.5">
                <label className="text-[10px] font-semibold text-[var(--tx3)] uppercase tracking-wide">
                  Topic
                </label>
                <Select
                  value={categoryFilter}
                  onValueChange={setCategoryFilter}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="All topics" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_SENTINEL}>All topics</SelectItem>
                    {availableCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Content type filter */}
              <div className="flex items-center gap-1.5">
                <label className="text-[10px] font-semibold text-[var(--tx3)] uppercase tracking-wide">
                  Type
                </label>
                <Select
                  value={contentTypeFilter}
                  onValueChange={setContentTypeFilter}
                >
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTENT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Result count */}
              <div className="ml-auto">
                <Badge variant="neutral">
                  {filtered.length} entr{filtered.length !== 1 ? "ies" : "y"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content Grid + Detail Panel */}
        <div
          className={`grid gap-3 ${
            selectedEntry ? "grid-cols-[1fr_380px]" : "grid-cols-1"
          }`}
        >
          {/* Entries Grid */}
          <div>
            {filtered.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-xs text-[var(--tx3)]">
                No entries found matching your search criteria.
              </div>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-2.5">
                {filtered.map((entry) => (
                  <KnowledgeEntryCard
                    key={entry.id}
                    entry={entry}
                    isSelected={selectedEntry?.id === entry.id}
                    onClick={() => handleEntryClick(entry)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Detail Panel */}
          {selectedEntry && (
            <KnowledgeDetailPanel
              entry={selectedEntry}
              onClose={handleCloseDetail}
              onNavigateToParam={handleNavigateToParam}
            />
          )}
        </div>
      </Tabs>
    </div>
  );
}
