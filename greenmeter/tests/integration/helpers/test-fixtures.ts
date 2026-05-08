/**
 * Shared test fixtures for integration tests.
 * Provides standard UUIDs, mock data builders, and reusable constants.
 */

// ─── Standard UUIDs ──────────────────────────────────────────

export const TENANT_A = '00000000-0000-4000-a000-000000000001';
export const TENANT_B = '00000000-0000-4000-a000-000000000002';

export const USER_ADMIN = '00000000-0000-4000-b000-000000000001';
export const USER_ANALYST = '00000000-0000-4000-b000-000000000002';
export const USER_DEPT_HR = '00000000-0000-4000-b000-000000000003';
export const USER_DEPT_OPS = '00000000-0000-4000-b000-000000000004';
export const USER_VIEWER = '00000000-0000-4000-b000-000000000005';

export const NODE_ROOT = '00000000-0000-4000-c000-000000000001';
export const NODE_CHILD_1 = '00000000-0000-4000-c000-000000000002';
export const NODE_CHILD_2 = '00000000-0000-4000-c000-000000000003';
export const NODE_GRANDCHILD = '00000000-0000-4000-c000-000000000004';

export const PERIOD_FY24 = '00000000-0000-4000-d000-000000000001';
export const PERIOD_FY25 = '00000000-0000-4000-d000-000000000002';

export const PARAM_GHG = '00000000-0000-4000-e000-000000000001';
export const PARAM_WATER = '00000000-0000-4000-e000-000000000002';
export const PARAM_WASTE = '00000000-0000-4000-e000-000000000003';
export const PARAM_WORKFORCE = '00000000-0000-4000-e000-000000000004';
export const PARAM_BOARD = '00000000-0000-4000-e000-000000000005';
export const PARAM_ENERGY = '00000000-0000-4000-e000-000000000006';

export const GOAL_1 = '00000000-0000-4000-f000-000000000001';
export const GOAL_2 = '00000000-0000-4000-f000-000000000002';

export const MILESTONE_1 = '00000000-0000-4000-f100-000000000001';
export const MILESTONE_2 = '00000000-0000-4000-f100-000000000002';

export const CANONICAL_GHG = '00000000-0000-4000-f200-000000000001';
export const CANONICAL_WATER = '00000000-0000-4000-f200-000000000002';

export const DEPT_HR = '00000000-0000-4000-f300-000000000001';
export const DEPT_OPS = '00000000-0000-4000-f300-000000000002';

// ─── Mock Data Builders ──────────────────────────────────────

export function makeKpiValueForScoring(overrides: Partial<{
  paramId: string;
  value: string | null;
  pillar: string;
  category: string | null;
  direction: string | null;
}> = {}) {
  return {
    paramId: overrides.paramId ?? PARAM_GHG,
    value: 'value' in overrides ? overrides.value : '100',
    pillar: overrides.pillar ?? 'E',
    category: 'category' in overrides ? overrides.category : 'Climate',
    direction: 'direction' in overrides ? overrides.direction : 'lower_is_better',
  };
}

export function makeThreshold(overrides: Partial<{
  thresholdId: string;
  tenantId: string | null;
  paramId: string | null;
  category: string | null;
  pillar: string | null;
  redMax: string | null;
  amberMax: string | null;
  unit: string | null;
}> = {}) {
  return {
    thresholdId: overrides.thresholdId ?? 'thr-1',
    tenantId: overrides.tenantId ?? null,
    paramId: overrides.paramId ?? null,
    category: overrides.category ?? null,
    pillar: overrides.pillar ?? null,
    redMax: overrides.redMax ?? '30',
    amberMax: overrides.amberMax ?? '60',
    unit: overrides.unit ?? null,
  };
}

export function makeWeight(overrides: Partial<{
  weightId: string;
  tenantId: string | null;
  pillar: string;
  category: string;
  weight: string;
}> = {}) {
  return {
    weightId: overrides.weightId ?? 'wgt-1',
    tenantId: overrides.tenantId ?? null,
    pillar: overrides.pillar ?? 'E',
    category: overrides.category ?? 'Climate',
    weight: overrides.weight ?? '1',
  };
}

export function makeChildValueRow(overrides: Partial<{
  paramId: string;
  paramName: string;
  rollupMethod: string;
  unit: string;
  nodeId: string;
  nodeName: string;
  nodeCurrency: string | null;
  value: string | null;
  valueText: string | null;
}> = {}) {
  return {
    paramId: overrides.paramId ?? PARAM_GHG,
    paramName: overrides.paramName ?? 'GHG Emissions',
    rollupMethod: overrides.rollupMethod ?? 'SUM',
    unit: overrides.unit ?? 'tCO2e',
    nodeId: overrides.nodeId ?? NODE_CHILD_1,
    nodeName: overrides.nodeName ?? 'Child 1',
    nodeCurrency: 'nodeCurrency' in overrides ? overrides.nodeCurrency : null,
    value: 'value' in overrides ? overrides.value : '100',
    valueText: overrides.valueText ?? null,
  };
}

export function makeOrgNode(overrides: Partial<{
  nodeId: string;
  tenantId: string;
  parentNodeId: string | null;
  name: string;
  nodeType: string;
  code: string | null;
  currency: string | null;
  level: number;
  active: boolean | null;
  createdAt: Date;
  updatedAt: Date;
}> = {}) {
  return {
    nodeId: overrides.nodeId ?? NODE_ROOT,
    tenantId: overrides.tenantId ?? TENANT_A,
    parentNodeId: overrides.parentNodeId ?? null,
    name: overrides.name ?? 'Root Company',
    nodeType: overrides.nodeType ?? 'company',
    code: overrides.code ?? 'ROOT',
    currency: overrides.currency ?? 'INR',
    level: overrides.level ?? 0,
    active: overrides.active ?? true,
    createdAt: overrides.createdAt ?? new Date('2026-01-01'),
    updatedAt: overrides.updatedAt ?? new Date('2026-01-01'),
  };
}

export function makeGoalRow(overrides: Partial<{
  goalId: string;
  tenantId: string;
  paramId: string;
  canonicalId: string | null;
  name: string;
  description: string | null;
  targetValue: string;
  baselineValue: string | null;
  baselineYear: string | null;
  targetYear: string;
  unit: string | null;
  direction: string | null;
  status: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}> = {}) {
  return {
    goalId: overrides.goalId ?? GOAL_1,
    tenantId: overrides.tenantId ?? TENANT_A,
    paramId: overrides.paramId ?? PARAM_GHG,
    canonicalId: overrides.canonicalId ?? null,
    name: overrides.name ?? 'Reduce GHG Emissions',
    description: overrides.description ?? null,
    targetValue: overrides.targetValue ?? '50',
    baselineValue: overrides.baselineValue ?? '100',
    baselineYear: overrides.baselineYear ?? '2020',
    targetYear: overrides.targetYear ?? '2030',
    unit: overrides.unit ?? 'tCO2e',
    direction: overrides.direction ?? 'lower_is_better',
    status: overrides.status ?? 'active',
    createdBy: overrides.createdBy ?? USER_ADMIN,
    createdAt: overrides.createdAt ?? new Date('2026-01-01'),
    updatedAt: overrides.updatedAt ?? new Date('2026-01-01'),
  };
}

export function makeMilestoneRow(overrides: Partial<{
  milestoneId: string;
  goalId: string;
  tenantId: string;
  name: string;
  description: string | null;
  targetValue: string | null;
  targetDate: Date | null;
  status: string;
  achievedAt: Date | null;
  sortOrder: number | null;
  createdAt: Date;
  goalParamId?: string;
  goalDirection?: string | null;
}> = {}) {
  return {
    milestoneId: overrides.milestoneId ?? MILESTONE_1,
    goalId: overrides.goalId ?? GOAL_1,
    tenantId: overrides.tenantId ?? TENANT_A,
    name: overrides.name ?? 'Phase 1 Reduction',
    description: overrides.description ?? null,
    targetValue: 'targetValue' in overrides ? overrides.targetValue : '75',
    targetDate: overrides.targetDate ?? new Date('2025-12-31'),
    status: overrides.status ?? 'pending',
    achievedAt: overrides.achievedAt ?? null,
    sortOrder: overrides.sortOrder ?? 1,
    createdAt: overrides.createdAt ?? new Date('2026-01-01'),
    goalParamId: overrides.goalParamId ?? PARAM_GHG,
    goalDirection: 'goalDirection' in overrides ? overrides.goalDirection : 'lower_is_better',
  };
}

export function makeKpiValueRow(overrides: Partial<{
  valueId: string;
  tenantId: string;
  paramId: string;
  canonicalId: string | null;
  nodeId: string;
  periodId: string;
  value: string | null;
  valueText: string | null;
  unit: string | null;
  sourceType: string;
  sourceRef: string | null;
  verified: boolean | null;
  notApplicable: boolean | null;
  verifiedBy: string | null;
  verifiedAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}> = {}) {
  return {
    valueId: overrides.valueId ?? 'val-1',
    tenantId: overrides.tenantId ?? TENANT_A,
    paramId: overrides.paramId ?? PARAM_GHG,
    canonicalId: overrides.canonicalId ?? null,
    nodeId: overrides.nodeId ?? NODE_ROOT,
    periodId: overrides.periodId ?? PERIOD_FY24,
    value: overrides.value ?? '100',
    valueText: overrides.valueText ?? null,
    unit: overrides.unit ?? 'tCO2e',
    sourceType: overrides.sourceType ?? 'manual',
    sourceRef: overrides.sourceRef ?? null,
    verified: overrides.verified ?? false,
    notApplicable: overrides.notApplicable ?? false,
    verifiedBy: overrides.verifiedBy ?? null,
    verifiedAt: overrides.verifiedAt ?? null,
    createdAt: overrides.createdAt ?? new Date('2026-01-01'),
    updatedAt: overrides.updatedAt ?? new Date('2026-01-01'),
  };
}

export function makeParameterRow(overrides: Partial<{
  paramId: string;
  tenantId: string | null;
  canonicalId: string | null;
  standard: string;
  standardSection: string;
  standardCode: string | null;
  disclosure: string | null;
  code: string;
  name: string;
  description: string | null;
  pillar: string;
  unit: string;
  dataType: string;
  category: string | null;
  indicatorType: string | null;
  computationMethod: string | null;
  howToMeasure: string | null;
  howToCompute: string | null;
  howToReport: string | null;
  direction: string | null;
  rollupMethod: string | null;
  status: string | null;
  src: string | null;
  depts: string[] | null;
  standards: string[] | null;
  priorityOrder: number | null;
  createdAt: Date | null;
  overrideParamId: string | null;
}> = {}) {
  return {
    paramId: overrides.paramId ?? PARAM_GHG,
    tenantId: overrides.tenantId ?? null,
    canonicalId: overrides.canonicalId ?? CANONICAL_GHG,
    standard: overrides.standard ?? 'BRSR',
    standardSection: overrides.standardSection ?? 'Principle 6',
    standardCode: overrides.standardCode ?? 'P6-E1',
    disclosure: overrides.disclosure ?? null,
    code: overrides.code ?? 'ENV-001',
    name: overrides.name ?? 'GHG Emissions',
    description: overrides.description ?? null,
    pillar: overrides.pillar ?? 'E',
    unit: overrides.unit ?? 'tCO2e',
    dataType: overrides.dataType ?? 'numeric',
    category: overrides.category ?? 'Climate',
    indicatorType: overrides.indicatorType ?? 'essential',
    computationMethod: overrides.computationMethod ?? null,
    howToMeasure: overrides.howToMeasure ?? null,
    howToCompute: overrides.howToCompute ?? null,
    howToReport: overrides.howToReport ?? null,
    direction: overrides.direction ?? 'lower_is_better',
    rollupMethod: overrides.rollupMethod ?? 'SUM',
    status: overrides.status ?? 'active',
    src: overrides.src ?? null,
    depts: overrides.depts ?? null,
    standards: overrides.standards ?? null,
    priorityOrder: overrides.priorityOrder ?? null,
    createdAt: overrides.createdAt ?? new Date('2026-01-01'),
    overrideParamId: overrides.overrideParamId ?? null,
  };
}

export function makeBenchmarkPercentiles(overrides: Partial<{
  canonicalId: string;
  canonicalName: string;
  pillar: string;
  category: string;
  q1: number;
  median: number;
  q3: number;
  min: number;
  max: number;
  peerCount: number;
}> = {}) {
  return {
    canonicalId: overrides.canonicalId ?? CANONICAL_GHG,
    canonicalName: overrides.canonicalName ?? 'GHG Emissions',
    pillar: overrides.pillar ?? 'E',
    category: overrides.category ?? 'Climate',
    q1: overrides.q1 ?? 50,
    median: overrides.median ?? 100,
    q3: overrides.q3 ?? 150,
    min: overrides.min ?? 20,
    max: overrides.max ?? 200,
    peerCount: overrides.peerCount ?? 10,
  };
}

export function makeReportParameterRow(overrides: Partial<{
  paramId: string;
  code: string;
  name: string;
  pillar: string;
  unit: string;
  dataType: string;
  category: string | null;
  standardSection: string;
  indicatorType: string | null;
  disclosure: string | null;
  valueId: string | null;
  value: string | null;
  valueText: string | null;
  verified: boolean | null;
  notApplicable: boolean | null;
}> = {}) {
  return {
    paramId: overrides.paramId ?? PARAM_GHG,
    code: overrides.code ?? 'ENV-001',
    name: overrides.name ?? 'GHG Emissions',
    pillar: overrides.pillar ?? 'E',
    unit: overrides.unit ?? 'tCO2e',
    dataType: overrides.dataType ?? 'numeric',
    category: 'category' in overrides ? overrides.category : 'Climate',
    standardSection: overrides.standardSection ?? 'Principle 6',
    indicatorType: 'indicatorType' in overrides ? overrides.indicatorType : 'essential',
    disclosure: overrides.disclosure ?? null,
    valueId: 'valueId' in overrides ? overrides.valueId : 'val-1',
    value: 'value' in overrides ? overrides.value : '100',
    valueText: overrides.valueText ?? null,
    verified: overrides.verified ?? false,
    notApplicable: overrides.notApplicable ?? false,
  };
}

export function makeEsgScoreRow(overrides: Partial<{
  tenantId: string;
  nodeId: string;
  periodId: string;
  pillar: string;
  category: string;
  categoryScore: string;
  pillarScore: string;
  overallScore: string;
  paramCount: string;
  computedAt: Date;
}> = {}) {
  return {
    tenantId: overrides.tenantId ?? TENANT_A,
    nodeId: overrides.nodeId ?? NODE_ROOT,
    periodId: overrides.periodId ?? PERIOD_FY24,
    pillar: overrides.pillar ?? 'E',
    category: overrides.category ?? 'Climate',
    categoryScore: overrides.categoryScore ?? '85',
    pillarScore: overrides.pillarScore ?? '85',
    overallScore: overrides.overallScore ?? '80',
    paramCount: overrides.paramCount ?? '3',
    computedAt: overrides.computedAt ?? new Date(),
  };
}
