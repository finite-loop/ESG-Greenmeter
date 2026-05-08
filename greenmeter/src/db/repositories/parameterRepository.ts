import { db } from '@/db';
import { kpiParameters } from '@/db/schema/kpi';
import { eq, and, sql, ilike, or, isNull, asc } from 'drizzle-orm';
import { AppError, ErrorCode } from '@/lib/errors';
import type { ParameterListFilter } from '@/schemas/parameters';

/** Fields that tenants are allowed to override. Used as a whitelist for updates. */
const OVERRIDABLE_FIELDS = [
  'name', 'description', 'unit', 'category', 'direction',
  'rollupMethod', 'howToMeasure', 'howToCompute', 'howToReport',
  'depts', 'status',
] as const;

export interface ParameterRow {
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
  /** Fields from tenant override (null if no override exists) */
  overrideParamId: string | null;
}

/**
 * Merges platform default fields with tenant override fields.
 * Tenant override values take precedence when present.
 */
function mergeParameterRow(
  platform: Record<string, unknown>,
  override: Record<string, unknown> | null
): ParameterRow {
  if (!override) {
    return { ...platform, overrideParamId: null } as unknown as ParameterRow;
  }

  const merged = { ...platform };

  // Override fields take precedence when they are non-null
  const overridableFields = [
    'name', 'description', 'unit', 'category', 'direction',
    'rollupMethod', 'howToMeasure', 'howToCompute', 'howToReport',
    'depts', 'status',
  ];

  for (const field of overridableFields) {
    if (override[field] !== null && override[field] !== undefined) {
      merged[field] = override[field];
    }
  }

  merged.overrideParamId = override.paramId as string;

  return merged as unknown as ParameterRow;
}

export const parameterRepository = {
  /**
   * Finds all parameters: platform defaults merged with any tenant overrides.
   * Platform parameters have tenant_id IS NULL.
   * Tenant overrides match on (tenant_id, standard, code).
   */
  async findAll(
    tenantId: string,
    filters: ParameterListFilter
  ): Promise<{ data: ParameterRow[]; total: number }> {
    const platformAlias = kpiParameters;

    // DB-level filters: standard and pillar are immutable (never overridden)
    const conditions = [isNull(platformAlias.tenantId)];

    if (filters.standard) {
      conditions.push(eq(platformAlias.standard, filters.standard));
    }
    if (filters.pillar) {
      conditions.push(eq(platformAlias.pillar, filters.pillar));
    }

    const where = and(...conditions);

    // Fetch ALL matching platform rows (no pagination yet — applied post-merge)
    const platformRows = await db
      .select()
      .from(platformAlias)
      .where(where)
      .orderBy(asc(platformAlias.priorityOrder), asc(platformAlias.code));

    if (platformRows.length === 0) {
      return { data: [], total: 0 };
    }

    // Fetch tenant overrides for all matching platform params
    const codes = platformRows.map((r) => r.code);
    const standards = [...new Set(platformRows.map((r) => r.standard))];

    const overrideRows = await db
      .select()
      .from(kpiParameters)
      .where(
        and(
          eq(kpiParameters.tenantId, tenantId),
          sql`${kpiParameters.code} = ANY(${codes})`,
          sql`${kpiParameters.standard} = ANY(${standards})`
        )
      );

    // Index overrides by (standard, code) for O(1) lookup
    const overrideMap = new Map<string, Record<string, unknown>>();
    for (const row of overrideRows) {
      overrideMap.set(`${row.standard}:${row.code}`, row as Record<string, unknown>);
    }

    // Merge platform params with their overrides
    let merged = platformRows.map((platform) => {
      const override = overrideMap.get(`${platform.standard}:${platform.code}`) ?? null;
      return mergeParameterRow(platform as Record<string, unknown>, override);
    });

    // Post-merge filters: search and category operate on the merged (overridden) values
    if (filters.category) {
      merged = merged.filter((row) => row.category === filters.category);
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      merged = merged.filter(
        (row) =>
          row.name.toLowerCase().includes(searchLower) ||
          row.code.toLowerCase().includes(searchLower)
      );
    }

    // Apply pagination post-merge
    const total = merged.length;
    const offset = (filters.page - 1) * filters.pageSize;
    const paginated = merged.slice(offset, offset + filters.pageSize);

    return {
      data: paginated,
      total,
    };
  },

  /**
   * Finds a single parameter by paramId (platform default),
   * merged with any tenant override.
   */
  async findById(
    paramId: string,
    tenantId: string
  ): Promise<ParameterRow | null> {
    const platformRow = await db
      .select()
      .from(kpiParameters)
      .where(
        and(
          eq(kpiParameters.paramId, paramId),
          isNull(kpiParameters.tenantId)
        )
      )
      .limit(1);

    if (!platformRow[0]) {
      return null;
    }

    const platform = platformRow[0];

    // Check for tenant override
    const overrideRow = await db
      .select()
      .from(kpiParameters)
      .where(
        and(
          eq(kpiParameters.tenantId, tenantId),
          eq(kpiParameters.standard, platform.standard),
          eq(kpiParameters.code, platform.code)
        )
      )
      .limit(1);

    return mergeParameterRow(
      platform as Record<string, unknown>,
      (overrideRow[0] as Record<string, unknown>) ?? null
    );
  },

  /**
   * Creates or updates a tenant-specific override for a platform parameter.
   * Does NOT modify the platform seed row (tenant_id IS NULL).
   */
  async upsertOverride(
    tenantId: string,
    platformParamId: string,
    overrideData: Record<string, unknown>
  ): Promise<{ overrideRow: ParameterRow; isNew: boolean }> {
    // Load the platform parameter to get standard + code
    const platformRow = await db
      .select()
      .from(kpiParameters)
      .where(
        and(
          eq(kpiParameters.paramId, platformParamId),
          isNull(kpiParameters.tenantId)
        )
      )
      .limit(1);

    if (!platformRow[0]) {
      throw new AppError(
        ErrorCode.NOT_FOUND,
        'Platform parameter not found',
        404
      );
    }

    const platform = platformRow[0];

    // Check if a tenant override already exists
    const existingOverride = await db
      .select()
      .from(kpiParameters)
      .where(
        and(
          eq(kpiParameters.tenantId, tenantId),
          eq(kpiParameters.standard, platform.standard),
          eq(kpiParameters.code, platform.code)
        )
      )
      .limit(1);

    if (existingOverride[0]) {
      // Update existing override — only allow whitelisted fields
      const safeData: Record<string, unknown> = {};
      for (const field of OVERRIDABLE_FIELDS) {
        if (field in overrideData) {
          safeData[field] = overrideData[field];
        }
      }

      const result = await db
        .update(kpiParameters)
        .set(safeData)
        .where(eq(kpiParameters.paramId, existingOverride[0].paramId))
        .returning();

      const merged = mergeParameterRow(
        platform as Record<string, unknown>,
        result[0] as Record<string, unknown>
      );

      return { overrideRow: merged, isNew: false };
    }

    // Insert new tenant override row
    try {
      const insertData = {
        tenantId,
        canonicalId: platform.canonicalId,
        standard: platform.standard,
        standardSection: platform.standardSection,
        standardCode: platform.standardCode,
        disclosure: platform.disclosure,
        code: platform.code,
        name: overrideData.name !== undefined ? overrideData.name : platform.name,
        description: overrideData.description !== undefined ? overrideData.description : platform.description,
        pillar: platform.pillar,
        unit: overrideData.unit !== undefined ? overrideData.unit : platform.unit,
        dataType: platform.dataType,
        category: overrideData.category !== undefined ? overrideData.category : platform.category,
        indicatorType: platform.indicatorType,
        computationMethod: platform.computationMethod,
        howToMeasure: overrideData.howToMeasure !== undefined ? overrideData.howToMeasure : platform.howToMeasure,
        howToCompute: overrideData.howToCompute !== undefined ? overrideData.howToCompute : platform.howToCompute,
        howToReport: overrideData.howToReport !== undefined ? overrideData.howToReport : platform.howToReport,
        direction: overrideData.direction !== undefined ? overrideData.direction : platform.direction,
        rollupMethod: overrideData.rollupMethod !== undefined ? overrideData.rollupMethod : platform.rollupMethod,
        status: overrideData.status !== undefined ? overrideData.status : platform.status,
        src: 'tenant_override',
        depts: overrideData.depts !== undefined ? overrideData.depts : platform.depts,
        standards: platform.standards,
        priorityOrder: platform.priorityOrder,
      };

      const result = await db
        .insert(kpiParameters)
        .values(insertData as typeof kpiParameters.$inferInsert)
        .returning();

      const merged = mergeParameterRow(
        platform as Record<string, unknown>,
        result[0] as Record<string, unknown>
      );

      return { overrideRow: merged, isNew: true };
    } catch (err: unknown) {
      const pgError = err as { code?: string };
      if (pgError.code === '23505') {
        throw new AppError(
          ErrorCode.DUPLICATE_ENTRY,
          'A tenant override already exists for this parameter',
          409
        );
      }
      throw err;
    }
  },

  /**
   * Returns all active parameters (platform defaults merged with tenant overrides)
   * without pagination. Used by import matching and similar bulk-lookup flows.
   */
  async findAllForMatching(tenantId: string): Promise<ParameterRow[]> {
    const platformRows = await db
      .select()
      .from(kpiParameters)
      .where(isNull(kpiParameters.tenantId))
      .orderBy(asc(kpiParameters.code));

    if (platformRows.length === 0) return [];

    // Fetch all tenant overrides for merge
    const overrideRows = await db
      .select()
      .from(kpiParameters)
      .where(eq(kpiParameters.tenantId, tenantId));

    const overrideMap = new Map<string, Record<string, unknown>>();
    for (const row of overrideRows) {
      overrideMap.set(`${row.standard}:${row.code}`, row as Record<string, unknown>);
    }

    return platformRows
      .map((platform) => {
        const override = overrideMap.get(`${platform.standard}:${platform.code}`) ?? null;
        return mergeParameterRow(platform as Record<string, unknown>, override);
      })
      .filter((row) => row.status !== 'inactive');
  },

  /**
   * Returns distinct category values for filter dropdowns.
   */
  async findDistinctCategories(): Promise<string[]> {
    const rows = await db
      .selectDistinct({ category: kpiParameters.category })
      .from(kpiParameters)
      .where(
        and(
          isNull(kpiParameters.tenantId),
          sql`${kpiParameters.category} IS NOT NULL`
        )
      )
      .orderBy(asc(kpiParameters.category));

    return rows.map((r) => r.category).filter((c): c is string => c !== null);
  },
};
