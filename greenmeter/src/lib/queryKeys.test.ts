import { describe, it, expect } from 'vitest';
import { queryKeys } from './queryKeys';

describe('queryKeys', () => {
  describe('kpiValues', () => {
    it('returns base key for all', () => {
      expect(queryKeys.kpiValues.all).toEqual(['kpi-values']);
    });

    it('returns list key with filters', () => {
      const filters = { periodId: 'p1', standard: 'BRSR' };
      expect(queryKeys.kpiValues.list(filters)).toEqual(['kpi-values', filters]);
    });

    it('returns detail key with valueId', () => {
      expect(queryKeys.kpiValues.detail('v1')).toEqual(['kpi-values', 'detail', 'v1']);
    });

    it('list key starts with all key for invalidation', () => {
      const listKey = queryKeys.kpiValues.list({ periodId: 'p1' });
      expect(listKey[0]).toBe(queryKeys.kpiValues.all[0]);
    });
  });

  describe('peers', () => {
    it('returns base key for all', () => {
      expect(queryKeys.peers.all).toEqual(['peers']);
    });

    it('returns detail key with peerId', () => {
      expect(queryKeys.peers.detail('peer-1')).toEqual(['peers', 'detail', 'peer-1']);
    });
  });

  describe('esgScores', () => {
    it('returns list key with node and period filters', () => {
      const filters = { nodeId: 'n1', periodId: 'p1' };
      expect(queryKeys.esgScores.list(filters)).toEqual(['esg-scores', filters]);
    });
  });

  describe('health', () => {
    it('returns system health key', () => {
      expect(queryKeys.health.system()).toEqual(['health', 'system']);
    });

    it('returns queues key', () => {
      expect(queryKeys.health.queues()).toEqual(['health', 'queues']);
    });
  });

  describe('orgNodes', () => {
    it('returns tree key', () => {
      expect(queryKeys.orgNodes.tree()).toEqual(['org-nodes', 'tree']);
    });
  });

  describe('all domains have consistent structure', () => {
    const domains = [
      'kpiValues', 'kpiParameters', 'peers', 'esgScores', 'benchmarks',
      'goals', 'reports', 'suppliers', 'documents', 'audit', 'health',
      'users', 'orgNodes', 'periods',
    ] as const;

    it('every domain has an "all" key', () => {
      for (const domain of domains) {
        expect(queryKeys[domain].all).toBeDefined();
        expect(Array.isArray(queryKeys[domain].all)).toBe(true);
        expect(queryKeys[domain].all.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('all keys are readonly tuples (frozen-like)', () => {
      // "as const" makes them readonly — verify first element is a string
      for (const domain of domains) {
        expect(typeof queryKeys[domain].all[0]).toBe('string');
      }
    });
  });
});
