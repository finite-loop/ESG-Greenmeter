import { describe, it, expect, beforeEach } from 'vitest';
import { makeQueryClient, getQueryClient } from './queryClient';

describe('queryClient', () => {
  describe('makeQueryClient', () => {
    it('creates a new QueryClient instance', () => {
      const client = makeQueryClient();
      expect(client).toBeDefined();
      expect(typeof client.getDefaultOptions).toBe('function');
    });

    it('sets staleTime to 5 minutes', () => {
      const client = makeQueryClient();
      const defaults = client.getDefaultOptions();
      expect(defaults.queries?.staleTime).toBe(5 * 60 * 1000);
    });

    it('sets gcTime to 10 minutes', () => {
      const client = makeQueryClient();
      const defaults = client.getDefaultOptions();
      expect(defaults.queries?.gcTime).toBe(10 * 60 * 1000);
    });

    it('sets retry to 1', () => {
      const client = makeQueryClient();
      const defaults = client.getDefaultOptions();
      expect(defaults.queries?.retry).toBe(1);
    });

    it('disables refetchOnWindowFocus', () => {
      const client = makeQueryClient();
      const defaults = client.getDefaultOptions();
      expect(defaults.queries?.refetchOnWindowFocus).toBe(false);
    });

    it('creates distinct instances on each call', () => {
      const a = makeQueryClient();
      const b = makeQueryClient();
      expect(a).not.toBe(b);
    });
  });

  describe('getQueryClient', () => {
    it('returns a QueryClient', () => {
      const client = getQueryClient();
      expect(client).toBeDefined();
      expect(typeof client.getDefaultOptions).toBe('function');
    });

    it('creates new instances on server (no window)', () => {
      // In node environment (typeof window === "undefined"), each call creates fresh client
      const a = getQueryClient();
      const b = getQueryClient();
      expect(a).not.toBe(b);
    });
  });
});
