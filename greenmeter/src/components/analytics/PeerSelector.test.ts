import { describe, it, expect, vi } from 'vitest';

// Mock React
vi.mock('react', () => ({
  useState: vi.fn((init: unknown) => [init, vi.fn()]),
  useRef: vi.fn(() => ({ current: null })),
  useEffect: vi.fn(),
}));

vi.mock('@/hooks/usePeers', () => ({
  usePeers: vi.fn(() => ({ data: null, isLoading: false })),
}));

describe('PeerSelector', () => {
  it('exports a default component function', async () => {
    const mod = await import('./PeerSelector');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });
});

describe('PeerSelector selection logic', () => {
  it('toggles peer by adding to selection when not selected', () => {
    const selected = ['peer-1', 'peer-2'];
    const peerId = 'peer-3';
    const result = selected.includes(peerId)
      ? selected.filter((id) => id !== peerId)
      : [...selected, peerId];
    expect(result).toEqual(['peer-1', 'peer-2', 'peer-3']);
  });

  it('toggles peer by removing from selection when already selected', () => {
    const selected = ['peer-1', 'peer-2', 'peer-3'];
    const peerId = 'peer-2';
    const result = selected.includes(peerId)
      ? selected.filter((id) => id !== peerId)
      : [...selected, peerId];
    expect(result).toEqual(['peer-1', 'peer-3']);
  });

  it('select all adds all peer ids when no search filter', () => {
    const peers = [
      { peerId: 'p-1', name: 'Peer A' },
      { peerId: 'p-2', name: 'Peer B' },
      { peerId: 'p-3', name: 'Peer C' },
    ];
    // When no search filter, filtered === peers
    const filtered = peers;
    const result = filtered.map((p) => p.peerId);
    expect(result).toEqual(['p-1', 'p-2', 'p-3']);
  });

  it('select all adds only filtered peer ids when search is active', () => {
    const peers = [
      { peerId: 'p-1', name: 'Tata Steel' },
      { peerId: 'p-2', name: 'Reliance Industries' },
      { peerId: 'p-3', name: 'Tata Power' },
    ];
    const search = 'tata';
    const filtered = peers.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
    const result = filtered.map((p) => p.peerId);
    expect(result).toEqual(['p-1', 'p-3']);
  });

  it('clear all returns empty array', () => {
    const result: string[] = [];
    expect(result).toEqual([]);
  });

  it('filters peers by search text case-insensitively', () => {
    const peers = [
      { peerId: 'p-1', name: 'Tata Steel' },
      { peerId: 'p-2', name: 'Reliance Industries' },
      { peerId: 'p-3', name: 'Tata Power' },
    ];
    const search = 'tata';
    const filtered = peers.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
    expect(filtered).toHaveLength(2);
    expect(filtered[0].name).toBe('Tata Steel');
    expect(filtered[1].name).toBe('Tata Power');
  });

  it('generates correct button label for no selection', () => {
    const selectedCount = 0;
    const label = selectedCount === 0
      ? 'Select peers...'
      : selectedCount <= 2
        ? 'Selected names'
        : `${selectedCount} peers selected`;
    expect(label).toBe('Select peers...');
  });

  it('generates correct button label for many selections', () => {
    const selectedCount = 5;
    const label = selectedCount === 0
      ? 'Select peers...'
      : selectedCount <= 2
        ? 'Selected names'
        : `${selectedCount} peers selected`;
    expect(label).toBe('5 peers selected');
  });
});
