import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock encryption module
vi.mock('@/lib/encryption', () => ({
  encrypt: vi.fn((text: string) => `encrypted:${text}`),
  decrypt: vi.fn((text: string) => text.replace('encrypted:', '')),
  maskCredential: vi.fn((text: string) =>
    text.length <= 4 ? '****' : '*'.repeat(text.length - 4) + text.slice(-4)
  ),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock configRepository
const mockGetIntegrationConfigs = vi.fn();
const mockGetIntegrationConfig = vi.fn();
const mockUpsertIntegrationConfig = vi.fn();
vi.mock('@/db/repositories/configRepository', () => ({
  configRepository: {
    getIntegrationConfigs: (...args: unknown[]) => mockGetIntegrationConfigs(...args),
    getIntegrationConfig: (...args: unknown[]) => mockGetIntegrationConfig(...args),
    upsertIntegrationConfig: (...args: unknown[]) => mockUpsertIntegrationConfig(...args),
  },
}));

import { integrationService } from './integrationService';

describe('integrationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listConfigs', () => {
    it('returns all three integration types with configured status', async () => {
      mockGetIntegrationConfigs.mockResolvedValue([
        {
          configId: 'cfg-1',
          tenantId: 'tenant-1',
          key: 'integration_sap',
          value: {
            endpoint: 'https://sap.example.com',
            credentialEncrypted: 'encrypted:my-key-1234',
            scheduleCron: '0 2 * * *',
            enabled: true,
          },
          createdAt: new Date('2026-01-01'),
          updatedAt: new Date('2026-01-01'),
        },
      ]);

      const result = await integrationService.listConfigs('tenant-1');

      expect(result).toHaveLength(3);
      // SAP is configured
      const sap = result.find((r) => r.integrationType === 'sap');
      expect(sap).toBeDefined();
      expect('configured' in sap! && sap!.configured).toBe(true);
      if ('endpoint' in sap!) {
        expect(sap!.endpoint).toBe('https://sap.example.com');
        expect(sap!.authKeyMasked).toContain('1234');
      }
      // Darwinbox and LLM are not configured
      const darwinbox = result.find((r) => r.integrationType === 'darwinbox');
      expect('configured' in darwinbox! && darwinbox!.configured).toBe(false);
      const llm = result.find((r) => r.integrationType === 'llm');
      expect('configured' in llm! && llm!.configured).toBe(false);
    });

    it('returns all unconfigured when no configs exist', async () => {
      mockGetIntegrationConfigs.mockResolvedValue([]);
      const result = await integrationService.listConfigs('tenant-1');
      expect(result).toHaveLength(3);
      expect(result.every((r) => 'configured' in r && r.configured === false)).toBe(true);
    });
  });

  describe('saveConfig', () => {
    it('encrypts credentials and stores config', async () => {
      mockUpsertIntegrationConfig.mockResolvedValue({
        oldValue: null,
        newValue: {
          configId: 'cfg-new',
          tenantId: 'tenant-1',
          key: 'integration_sap',
          value: {
            endpoint: 'https://sap.example.com',
            credentialEncrypted: 'encrypted:my-secret-key',
            scheduleCron: '0 3 * * *',
            enabled: true,
          },
          createdAt: new Date('2026-01-01'),
          updatedAt: new Date('2026-01-01'),
        },
      });

      const result = await integrationService.saveConfig('tenant-1', {
        integrationType: 'sap',
        endpoint: 'https://sap.example.com',
        authKey: 'my-secret-key',
        scheduleCron: '0 3 * * *',
        enabled: true,
      });

      expect(result.newValue.configId).toBe('cfg-new');
      expect(result.response.endpoint).toBe('https://sap.example.com');
      expect(result.response.authKeyMasked).not.toContain('my-secret-key');
      expect(mockUpsertIntegrationConfig).toHaveBeenCalledWith(
        'tenant-1',
        'sap',
        expect.objectContaining({
          endpoint: 'https://sap.example.com',
          credentialEncrypted: 'encrypted:my-secret-key',
          scheduleCron: '0 3 * * *',
          enabled: true,
        })
      );
    });

    it('returns old value when updating existing config', async () => {
      const oldRow = {
        configId: 'cfg-old',
        tenantId: 'tenant-1',
        key: 'integration_sap',
        value: {
          endpoint: 'https://old.example.com',
          credentialEncrypted: 'encrypted:old-key',
          scheduleCron: '0 1 * * *',
          enabled: false,
        },
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      };
      mockUpsertIntegrationConfig.mockResolvedValue({
        oldValue: oldRow,
        newValue: {
          configId: 'cfg-old',
          tenantId: 'tenant-1',
          key: 'integration_sap',
          value: {
            endpoint: 'https://new.example.com',
            credentialEncrypted: 'encrypted:new-key',
            scheduleCron: '0 2 * * *',
            enabled: true,
          },
          createdAt: new Date('2026-01-01'),
          updatedAt: new Date('2026-05-07'),
        },
      });

      const result = await integrationService.saveConfig('tenant-1', {
        integrationType: 'sap',
        endpoint: 'https://new.example.com',
        authKey: 'new-key',
        scheduleCron: '0 2 * * *',
        enabled: true,
      });

      expect(result.oldValue).toBe(oldRow);
      expect(result.response.endpoint).toBe('https://new.example.com');
    });
  });

  describe('testConnection', () => {
    it('returns success for reachable endpoint', async () => {
      // Mock global fetch
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
      }));

      const result = await integrationService.testConnection({
        integrationType: 'sap',
        endpoint: 'https://sap.example.com',
        authKey: 'my-key',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('200');
      expect(result.latencyMs).toBeDefined();
    });

    it('returns success for 401 (server reachable, auth needed)', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      }));

      const result = await integrationService.testConnection({
        integrationType: 'sap',
        endpoint: 'https://sap.example.com',
        authKey: 'bad-key',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('401');
    });

    it('returns failure for 500 error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      }));

      const result = await integrationService.testConnection({
        integrationType: 'sap',
        endpoint: 'https://sap.example.com',
        authKey: 'key',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('500');
    });

    it('returns failure for network error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));

      const result = await integrationService.testConnection({
        integrationType: 'sap',
        endpoint: 'https://unreachable.example.com',
        authKey: 'key',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('ECONNREFUSED');
    });

    it('returns failure for timeout', async () => {
      const abortError = new DOMException('The operation was aborted', 'AbortError');
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortError));

      const result = await integrationService.testConnection({
        integrationType: 'sap',
        endpoint: 'https://slow.example.com',
        authKey: 'key',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('timed out');
    });
  });
});
