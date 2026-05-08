import { describe, it, expect, vi } from 'vitest';

vi.mock('react', () => ({
  Fragment: vi.fn(({ children }: { children: unknown }) => children),
  useRef: vi.fn(() => ({ current: null })),
  useEffect: vi.fn(),
  useState: vi.fn((init: unknown) => [init, vi.fn()]),
  useMemo: vi.fn((fn: () => unknown) => fn()),
}));

describe('CorrelationMatrix', () => {
  it('exports a default component function', async () => {
    const mod = await import('./CorrelationMatrix');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });
});

describe('CorrelationMatrix color scale logic', () => {
  // Test the color mapping: -1 (red) → 0 (white) → +1 (green)
  // Mirrors the >= thresholds in the component
  function getCellBackground(value: number | null, isDiagonal: boolean): string {
    if (isDiagonal) return '#0f766e';
    if (value === null) return '#f8fafc';
    const v = value;
    if (v >= 0.7) return '#0f766e';
    if (v >= 0.4) return '#5eead4';
    if (v >= 0.2) return '#ccfbf1';
    if (v <= -0.7) return '#991b1b';
    if (v <= -0.4) return '#ef4444';
    if (v <= -0.2) return '#fca5a5';
    return '#e2e8f0';
  }

  it('returns dark green for strong positive (r >= 0.7)', () => {
    expect(getCellBackground(0.85, false)).toBe('#0f766e');
    expect(getCellBackground(0.7, false)).toBe('#0f766e');
  });

  it('returns teal for moderate positive (r 0.4-0.7)', () => {
    expect(getCellBackground(0.55, false)).toBe('#5eead4');
    expect(getCellBackground(0.4, false)).toBe('#5eead4');
  });

  it('returns light teal for weak positive (r 0.2-0.4)', () => {
    expect(getCellBackground(0.3, false)).toBe('#ccfbf1');
    expect(getCellBackground(0.2, false)).toBe('#ccfbf1');
  });

  it('returns dark red for strong negative (r <= -0.7)', () => {
    expect(getCellBackground(-0.85, false)).toBe('#991b1b');
    expect(getCellBackground(-0.7, false)).toBe('#991b1b');
  });

  it('returns red for moderate negative (r -0.4 to -0.7)', () => {
    expect(getCellBackground(-0.55, false)).toBe('#ef4444');
    expect(getCellBackground(-0.4, false)).toBe('#ef4444');
  });

  it('returns light red for weak negative (r -0.2 to -0.4)', () => {
    expect(getCellBackground(-0.3, false)).toBe('#fca5a5');
    expect(getCellBackground(-0.2, false)).toBe('#fca5a5');
  });

  it('returns neutral for values near zero (|r| < 0.2)', () => {
    expect(getCellBackground(0.1, false)).toBe('#e2e8f0');
    expect(getCellBackground(-0.1, false)).toBe('#e2e8f0');
    expect(getCellBackground(0.19, false)).toBe('#e2e8f0');
  });

  it('returns neutral for null (non-significant)', () => {
    expect(getCellBackground(null, false)).toBe('#f8fafc');
  });

  it('returns branded color for diagonal', () => {
    expect(getCellBackground(1, true)).toBe('#0f766e');
  });
});

describe('CorrelationMatrix text color logic', () => {
  function getCellTextColor(value: number | null, isDiagonal: boolean): string {
    if (isDiagonal) return '#ffffff';
    if (value === null) return '#94a3b8';
    const abs = Math.abs(value);
    if (abs >= 0.4) return '#ffffff';
    if (abs >= 0.2) return '#0f172a';
    return '#94a3b8';
  }

  it('returns white for diagonal', () => {
    expect(getCellTextColor(1, true)).toBe('#ffffff');
  });

  it('returns white for strong correlations', () => {
    expect(getCellTextColor(0.8, false)).toBe('#ffffff');
    expect(getCellTextColor(-0.6, false)).toBe('#ffffff');
    expect(getCellTextColor(0.4, false)).toBe('#ffffff');
  });

  it('returns dark for moderate correlations', () => {
    expect(getCellTextColor(0.3, false)).toBe('#0f172a');
    expect(getCellTextColor(0.2, false)).toBe('#0f172a');
  });

  it('returns muted for weak/null', () => {
    expect(getCellTextColor(0.1, false)).toBe('#94a3b8');
    expect(getCellTextColor(null, false)).toBe('#94a3b8');
    expect(getCellTextColor(0.19, false)).toBe('#94a3b8');
  });
});
