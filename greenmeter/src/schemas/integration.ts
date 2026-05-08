import { z } from 'zod';

/** Supported integration types */
export const integrationTypeSchema = z.enum(['sap', 'darwinbox', 'llm']);
export type IntegrationType = z.infer<typeof integrationTypeSchema>;

/** Validates that a URL uses http or https protocol */
const httpUrlSchema = z
  .string()
  .url('Endpoint must be a valid URL')
  .refine(
    (url) => url.startsWith('https://') || url.startsWith('http://'),
    { message: 'Endpoint must use http:// or https://' }
  );

/** Schema for creating or updating an integration configuration */
export const integrationConfigSchema = z.object({
  integrationType: integrationTypeSchema,
  endpoint: httpUrlSchema,
  authKey: z.string().min(1, 'Auth key is required').max(4096, 'Auth key must not exceed 4096 characters'),
  scheduleCron: z
    .string()
    .regex(
      /^(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)$/,
      'Must be a valid cron expression (e.g. "0 2 * * *")'
    ),
  enabled: z.boolean().default(true),
});

/** Schema for the test-connection request */
export const integrationTestSchema = z.object({
  integrationType: integrationTypeSchema,
  endpoint: httpUrlSchema,
  authKey: z.string().min(1, 'Auth key is required').max(4096, 'Auth key must not exceed 4096 characters'),
});

export type IntegrationConfigInput = z.infer<typeof integrationConfigSchema>;
export type IntegrationTestInput = z.infer<typeof integrationTestSchema>;

/** Shape of the JSONB value stored in tenant_config for integrations */
export interface IntegrationConfigValue {
  endpoint: string;
  credentialEncrypted: string;
  scheduleCron: string;
  enabled: boolean;
}

/** Shape returned to clients (credentials masked) */
export interface IntegrationConfigResponse {
  configId: string;
  integrationType: IntegrationType;
  endpoint: string;
  authKeyMasked: string;
  scheduleCron: string;
  enabled: boolean;
  updatedAt: string;
}

/** Configured integration entry in list response */
export interface ConfiguredIntegrationEntry extends IntegrationConfigResponse {
  label: string;
  configured: true;
}

/** Unconfigured integration entry in list response */
export interface UnconfiguredIntegrationEntry {
  integrationType: IntegrationType;
  label: string;
  configured: false;
}

/** Union type for list response entries */
export type IntegrationListEntry = ConfiguredIntegrationEntry | UnconfiguredIntegrationEntry;
