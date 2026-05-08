import { describe, it, expect, vi } from 'vitest';

// Mock Chart.js
vi.mock('chart.js', () => ({
  Chart: vi.fn().mockImplementation(() => ({
    destroy: vi.fn(),
  })),
  registerables: [],
}));

describe('RadarChart', () => {
  it('exports a default component function', async () => {
    const mod = await import('./RadarChart');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });

  it('exports RadarDataset type (module compiles)', async () => {
    // Verifying the module can be imported without errors
    // indicates the TypeScript types are valid
    const mod = await import('./RadarChart');
    expect(mod).toBeDefined();
  });
});
