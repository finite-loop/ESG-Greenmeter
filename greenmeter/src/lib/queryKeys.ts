// Query key factory — [domain, ...params] convention
// Usage: queryKeys.kpiValues.list({ periodId, standard })
// Invalidation: queryClient.invalidateQueries({ queryKey: queryKeys.kpiValues.all })

export const queryKeys = {
  kpiValues: {
    all: ['kpi-values'] as const,
    list: (filters: {
      periodId?: string;
      standard?: string;
      nodeId?: string;
      pillar?: string;
      category?: string;
      department?: string;
      page?: number;
      pageSize?: number;
    }) => ['kpi-values', filters] as const,
    detail: (valueId: string) => ['kpi-values', 'detail', valueId] as const,
  },
  kpiParameters: {
    all: ['kpi-parameters'] as const,
    list: (filters: { standard?: string; pillar?: string; category?: string }) =>
      ['kpi-parameters', filters] as const,
    detail: (paramId: string) => ['kpi-parameters', 'detail', paramId] as const,
  },
  peers: {
    all: ['peers'] as const,
    list: (filters: { standard?: string }) => ['peers', filters] as const,
    detail: (peerId: string) => ['peers', 'detail', peerId] as const,
  },
  esgScores: {
    all: ['esg-scores'] as const,
    list: (filters: { nodeId?: string; periodId?: string }) =>
      ['esg-scores', filters] as const,
  },
  benchmarks: {
    all: ['peer-benchmarks'] as const,
    list: (filters: { peerId?: string; canonicalId?: string }) =>
      ['peer-benchmarks', filters] as const,
  },
  goals: {
    all: ['goals'] as const,
    list: (filters: { periodId?: string; status?: string }) =>
      ['goals', filters] as const,
    detail: (goalId: string) => ['goals', 'detail', goalId] as const,
    milestones: (goalId: string) => ['goals', goalId, 'milestones'] as const,
  },
  reports: {
    all: ['reports'] as const,
    list: (filters: { periodId?: string; standard?: string }) =>
      ['reports', filters] as const,
    detail: (reportId: string) => ['reports', 'detail', reportId] as const,
    coverage: (filters: { framework: string; periodId: string }) =>
      ['reports', 'coverage', filters] as const,
  },
  suppliers: {
    all: ['suppliers'] as const,
    list: (filters: { search?: string; sector?: string; category?: string; riskLevel?: string; page?: number }) =>
      ['suppliers', filters] as const,
    detail: (supplierId: string) => ['suppliers', 'detail', supplierId] as const,
    scope3: () => ['suppliers', 'scope3'] as const,
  },
  documents: {
    all: ['documents'] as const,
    list: (filters: { peerId?: string; status?: string }) =>
      ['documents', filters] as const,
    detail: (documentId: string) => ['documents', 'detail', documentId] as const,
  },
  audit: {
    all: ['audit-logs'] as const,
    list: (filters: { entityType?: string; userId?: string }) =>
      ['audit-logs', filters] as const,
  },
  health: {
    all: ['health'] as const,
    system: () => ['health', 'system'] as const,
    queues: () => ['health', 'queues'] as const,
  },
  users: {
    all: ['users'] as const,
    list: (filters: { role?: string }) => ['users', filters] as const,
    detail: (userId: string) => ['users', 'detail', userId] as const,
  },
  orgNodes: {
    all: ['org-nodes'] as const,
    tree: () => ['org-nodes', 'tree'] as const,
    detail: (nodeId: string) => ['org-nodes', 'detail', nodeId] as const,
  },
  periods: {
    all: ['periods'] as const,
    list: () => ['periods', 'list'] as const,
    detail: (periodId: string) => ['periods', 'detail', periodId] as const,
  },
  rollup: {
    all: ['rollup'] as const,
    summary: (filters: { nodeId?: string; periodId?: string }) =>
      ['rollup', 'summary', filters] as const,
  },
  mappingReview: {
    all: ['mapping-review'] as const,
    list: (extractionId: string) => ['mapping-review', extractionId] as const,
  },
  mds: {
    all: ['mds'] as const,
    coordinates: (filters: { fiscalYear: string; sector?: string }) =>
      ['mds', 'coordinates', filters] as const,
  },
  correlations: {
    all: ['correlations'] as const,
    matrix: (filters: { fiscalYear: string; sector?: string }) =>
      ['correlations', 'matrix', filters] as const,
  },
  recommendations: {
    all: ['recommendations'] as const,
    list: (filters: { limit?: number }) =>
      ['recommendations', filters] as const,
  },
} as const;
