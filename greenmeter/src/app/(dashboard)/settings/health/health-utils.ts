export type ComponentStatus = 'healthy' | 'degraded' | 'unhealthy';

export function statusBadgeVariant(
  status: ComponentStatus
): 'success' | 'warning' | 'error' {
  switch (status) {
    case 'healthy':
      return 'success';
    case 'degraded':
      return 'warning';
    case 'unhealthy':
      return 'error';
  }
}

export function formatMs(ms: number | null | undefined): string {
  if (ms == null) return '-';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function truncateJobId(id: string): string {
  return id.length > 8 ? `${id.substring(0, 8)}...` : id;
}
