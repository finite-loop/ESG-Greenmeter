import { configRepository } from '@/db/repositories/configRepository';
import type { TenantConfigRow } from '@/db/repositories/configRepository';
import { encrypt, decrypt, maskCredential } from '@/lib/encryption';
import { AppError, ErrorCode } from '@/lib/errors';
import { logger } from '@/lib/logger';
import type {
  IntegrationType,
  IntegrationConfigValue,
  IntegrationConfigResponse,
  IntegrationConfigInput,
  IntegrationTestInput,
  IntegrationListEntry,
} from '@/schemas/integration';

const INTEGRATION_TYPES: IntegrationType[] = ['sap', 'darwinbox', 'llm'];

const INTEGRATION_LABELS: Record<IntegrationType, string> = {
  sap: 'SAP ERP',
  darwinbox: 'Darwinbox HRMS',
  llm: 'LLM Provider',
};

/**
 * Converts a tenant_config row into a masked API response.
 */
function toResponse(row: TenantConfigRow, integrationType: IntegrationType): IntegrationConfigResponse {
  const value = row.value as IntegrationConfigValue;
  let authKeyMasked = '****';

  try {
    const decrypted = decrypt(value.credentialEncrypted);
    authKeyMasked = maskCredential(decrypted);
  } catch (err: unknown) {
    logger.warn('Failed to decrypt integration credential', {
      configId: row.configId,
      integrationType,
      error: err instanceof Error ? err.message : String(err),
    });
    authKeyMasked = '****';
  }

  return {
    configId: row.configId,
    integrationType,
    endpoint: value.endpoint,
    authKeyMasked,
    scheduleCron: value.scheduleCron,
    enabled: value.enabled,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const integrationService = {
  /**
   * List all integration configs for a tenant.
   * Returns all three integration types — unconfigured ones have null values.
   */
  async listConfigs(tenantId: string): Promise<IntegrationListEntry[]> {
    const rows = await configRepository.getIntegrationConfigs(tenantId);

    // Index by type for quick lookup
    const byType = new Map<string, TenantConfigRow>();
    for (const row of rows) {
      const type = row.key.replace('integration_', '');
      byType.set(type, row);
    }

    return INTEGRATION_TYPES.map((type) => {
      const row = byType.get(type);
      if (row) {
        return { ...toResponse(row, type), label: INTEGRATION_LABELS[type], configured: true as const };
      }
      return { integrationType: type, label: INTEGRATION_LABELS[type], configured: false as const };
    });
  },

  /**
   * Create or update an integration configuration.
   * Encrypts the auth key before storing.
   */
  async saveConfig(
    tenantId: string,
    input: IntegrationConfigInput
  ): Promise<{ oldValue: TenantConfigRow | null; newValue: TenantConfigRow; response: IntegrationConfigResponse }> {
    const encryptedKey = encrypt(input.authKey);

    const configValue: IntegrationConfigValue = {
      endpoint: input.endpoint,
      credentialEncrypted: encryptedKey,
      scheduleCron: input.scheduleCron,
      enabled: input.enabled,
    };

    const result = await configRepository.upsertIntegrationConfig(
      tenantId,
      input.integrationType,
      configValue
    );

    logger.info('Integration config saved', {
      tenantId,
      integrationType: input.integrationType,
      configId: result.newValue.configId,
    });

    const response = toResponse(result.newValue, input.integrationType);

    return { ...result, response };
  },

  /**
   * Test an integration connection without saving.
   * Validates endpoint reachability with a lightweight request.
   */
  async testConnection(
    input: IntegrationTestInput
  ): Promise<{ success: boolean; message: string; latencyMs?: number }> {
    const start = Date.now();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    try {
      const response = await fetch(input.endpoint, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${input.authKey}`,
        },
      });

      clearTimeout(timeoutId);
      const latencyMs = Date.now() - start;

      // Accept any response that didn't throw — even 401/403 means the server is reachable
      if (response.ok || response.status === 401 || response.status === 403) {
        return {
          success: true,
          message: `Connection successful (HTTP ${response.status})`,
          latencyMs,
        };
      }

      return {
        success: false,
        message: `Server responded with HTTP ${response.status}: ${response.statusText}`,
        latencyMs,
      };
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const latencyMs = Date.now() - start;

      if (err instanceof DOMException && err.name === 'AbortError') {
        return {
          success: false,
          message: 'Connection timed out after 10 seconds',
          latencyMs,
        };
      }

      const errMessage = err instanceof Error ? err.message : String(err);

      return {
        success: false,
        message: `Connection failed: ${errMessage}`,
        latencyMs,
      };
    }
  },
};
