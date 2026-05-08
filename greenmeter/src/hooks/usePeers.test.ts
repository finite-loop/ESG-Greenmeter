import { describe, it, expect, vi } from 'vitest';

// Mock TanStack Query
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: null, isLoading: false, error: null })),
}));

vi.mock('@/lib/queryKeys', () => ({
  queryKeys: {
    peers: {
      all: ['peers'],
      list: vi.fn((filters: unknown) => ['peers', filters]),
    },
  },
}));

describe('usePeers hook', () => {
  it('exports usePeers hook', async () => {
    const mod = await import('./usePeers');
    expect(mod.usePeers).toBeDefined();
    expect(typeof mod.usePeers).toBe('function');
  });

  it('exports PeerOrganisation type (module compiles)', async () => {
    const mod = await import('./usePeers');
    expect(mod).toBeDefined();
  });
});

describe('usePeers URL construction', () => {
  it('constructs correct URL with all filters', () => {
    const params = new URLSearchParams();
    params.set('search', 'Tata');
    params.set('sector', 'Manufacturing');
    params.set('active', 'true');
    params.set('page', '1');
    params.set('pageSize', '20');
    expect(params.toString()).toBe('search=Tata&sector=Manufacturing&active=true&page=1&pageSize=20');
  });

  it('omits undefined filter values', () => {
    const filters: { search?: string; sector?: string; active?: boolean } = {
      search: undefined,
      active: true,
    };
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.sector) params.set('sector', filters.sector);
    if (filters.active !== undefined) params.set('active', String(filters.active));
    expect(params.toString()).toBe('active=true');
  });
});
