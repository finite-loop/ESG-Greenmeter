import { z } from "zod";

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1),

  // Auth.js v5
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
  AUTH_AZURE_AD_CLIENT_ID: z.string().min(1).optional(),
  AUTH_AZURE_AD_CLIENT_SECRET: z.string().min(1).optional(),
  AUTH_AZURE_AD_TENANT_ID: z.string().min(1).optional(),
  AUTH_URL: z.string().url().optional(),

  // Azure Blob Storage
  AZURE_STORAGE_CONNECTION_STRING: z.string().min(1).optional(),

  // Azure Document Intelligence
  AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT: z.string().url().optional(),
  AZURE_DOCUMENT_INTELLIGENCE_KEY: z.string().min(1).optional(),

  // Azure Application Insights (optional — not required in dev)
  APPLICATIONINSIGHTS_CONNECTION_STRING: z.string().min(1).optional(),

  // LLM Provider
  LLM_PROVIDER: z.enum(["azure", "local", "gemini"]).optional(),
  LLM_ENDPOINT: z.string().url().optional(),
  LLM_API_KEY: z.string().min(1).optional(),
  LLM_MODEL: z.string().min(1).optional(),

  // Integration credential encryption
  ENCRYPTION_KEY: z.string().length(64, "ENCRYPTION_KEY must be a 64-char hex string (32 bytes)").optional(),

  // Node environment
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | undefined;

/**
 * Validates and returns typed environment variables.
 * Cached after first successful parse.
 */
export function getEnv(): Env {
  if (_env) return _env;

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.flatten().fieldErrors;
    const message = Object.entries(formatted)
      .map(([key, errors]) => `  ${key}: ${errors?.join(", ")}`)
      .join("\n");

    throw new Error(`Environment validation failed:\n${message}`);
  }

  _env = result.data;
  return _env;
}
