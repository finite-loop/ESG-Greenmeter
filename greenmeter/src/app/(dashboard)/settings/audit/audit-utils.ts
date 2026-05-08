/** Entity types available in the audit log system */
export const ENTITY_TYPES = [
  'kpi_value',
  'goal',
  'parameter',
  'user',
  'supplier',
  'config',
  'organisation',
  'peer_org',
  'document',
  'report',
] as const;

/** Action types for audit log entries */
export const ACTION_TYPES = ['CREATE', 'UPDATE', 'DELETE', 'VERIFY', 'IMPORT'] as const;

export type AuditAction = (typeof ACTION_TYPES)[number];
export type EntityType = (typeof ENTITY_TYPES)[number];

export interface AuditFilters {
  entityType?: string;
  userId?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Build query string from audit filter params.
 * Omits keys with empty/undefined values.
 */
export function buildAuditQueryString(filters: AuditFilters): string {
  const params = new URLSearchParams();

  params.set('page', String(filters.page ?? 1));
  params.set('pageSize', String(filters.pageSize ?? 20));

  if (filters.entityType) {
    params.set('entityType', filters.entityType);
  }
  if (filters.userId) {
    params.set('userId', filters.userId);
  }
  if (filters.action) {
    params.set('action', filters.action);
  }
  if (filters.dateFrom) {
    params.set('dateFrom', filters.dateFrom);
  }
  if (filters.dateTo) {
    params.set('dateTo', filters.dateTo);
  }

  return `?${params.toString()}`;
}

/**
 * Format an ISO timestamp to a readable local string.
 * Returns a fallback string for invalid dates.
 */
export function formatAuditTimestamp(iso: string): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export interface DiffEntry {
  key: string;
  oldVal: unknown;
  newVal: unknown;
  type: 'added' | 'removed' | 'changed' | 'unchanged';
}

/**
 * Type guard: check if value is a plain object suitable for key-level diffing.
 */
function isPlainObject(val: unknown): val is Record<string, unknown> {
  return val !== null && typeof val === 'object' && !Array.isArray(val);
}

/**
 * Compute a shallow JSON diff between old and new values.
 * Returns a list of field-level changes for display.
 * Non-object values (arrays, primitives) are not diffed at field level.
 */
export function computeJsonDiff(
  oldValue: unknown,
  newValue: unknown
): DiffEntry[] {
  const oldObj = isPlainObject(oldValue) ? oldValue : null;
  const newObj = isPlainObject(newValue) ? newValue : null;

  if (!oldObj && !newObj) {
    return [];
  }

  if (!oldObj) {
    return Object.entries(newObj!).map(([key, val]) => ({
      key,
      oldVal: undefined,
      newVal: val,
      type: 'added' as const,
    }));
  }

  if (!newObj) {
    return Object.entries(oldObj).map(([key, val]) => ({
      key,
      oldVal: val,
      newVal: undefined,
      type: 'removed' as const,
    }));
  }

  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
  const entries: DiffEntry[] = [];

  for (const key of allKeys) {
    const inOld = key in oldObj;
    const inNew = key in newObj;

    if (inOld && !inNew) {
      entries.push({ key, oldVal: oldObj[key], newVal: undefined, type: 'removed' });
    } else if (!inOld && inNew) {
      entries.push({ key, oldVal: undefined, newVal: newObj[key], type: 'added' });
    } else if (JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])) {
      entries.push({ key, oldVal: oldObj[key], newVal: newObj[key], type: 'changed' });
    } else {
      entries.push({ key, oldVal: oldObj[key], newVal: newObj[key], type: 'unchanged' });
    }
  }

  return entries;
}
