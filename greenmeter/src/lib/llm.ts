import { AppError, ErrorCode } from './errors';

export interface LlmCompletionOptions {
  temperature?: number;
  maxTokens?: number;
}

export interface LlmClient {
  complete(prompt: string, input: string, options?: LlmCompletionOptions): Promise<string>;
}

interface LlmConfig {
  provider: 'azure' | 'local' | 'gemini';
  endpoint: string;
  apiKey: string;
  model: string;
}

const VALID_PROVIDERS = ['azure', 'local', 'gemini'] as const;
const FETCH_TIMEOUT_MS = 60_000; // 60 seconds

function resolveConfig(): LlmConfig {
  const rawProvider = process.env.LLM_PROVIDER;
  const endpoint = process.env.LLM_ENDPOINT;
  const apiKey = process.env.LLM_API_KEY ?? '';
  const model = process.env.LLM_MODEL ?? '';

  if (!rawProvider) {
    throw new AppError(
      ErrorCode.PROCESSING_ERROR,
      'LLM_PROVIDER environment variable is not set (expected "azure", "local", or "gemini")',
      500
    );
  }

  if (!VALID_PROVIDERS.includes(rawProvider as typeof VALID_PROVIDERS[number])) {
    throw new AppError(
      ErrorCode.PROCESSING_ERROR,
      `LLM_PROVIDER has invalid value "${rawProvider}" (expected "azure", "local", or "gemini")`,
      500
    );
  }

  const provider = rawProvider as 'azure' | 'local' | 'gemini';

  if (!endpoint) {
    throw new AppError(
      ErrorCode.PROCESSING_ERROR,
      'LLM_ENDPOINT environment variable is not set',
      500
    );
  }

  return { provider, endpoint, apiKey, model };
}

function buildAzureUrl(endpoint: string, model: string): string {
  const base = endpoint.replace(/\/$/, '');
  return `${base}/openai/deployments/${model}/chat/completions?api-version=2024-02-01`;
}

function buildLocalUrl(endpoint: string): string {
  const base = endpoint.replace(/\/$/, '');
  return `${base}/v1/chat/completions`;
}

function buildGeminiUrl(endpoint: string): string {
  const base = endpoint.replace(/\/$/, '');
  return `${base}/chat/completions`;
}

async function callOpenAiCompatible(
  url: string,
  apiKey: string,
  model: string,
  provider: 'azure' | 'local' | 'gemini',
  prompt: string,
  input: string,
  options?: LlmCompletionOptions
): Promise<string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (apiKey) {
    if (provider === 'azure') {
      headers['api-key'] = apiKey;
    } else {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
  }

  const body = JSON.stringify({
    model,
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: input },
    ],
    temperature: options?.temperature ?? 0.3,
    max_tokens: options?.maxTokens ?? 2048,
  });

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new AppError(
      ErrorCode.PROCESSING_ERROR,
      `LLM request failed (${response.status}): ${errorText}`,
      500
    );
  }

  const data = await response.json() as {
    choices: Array<{ message: { content: string } }>;
  };

  const content = data.choices?.[0]?.message?.content;
  if (content === undefined || content === null || content === '') {
    throw new AppError(
      ErrorCode.PROCESSING_ERROR,
      'LLM returned empty response: no choices or empty content',
      500
    );
  }
  return content;
}

/**
 * Returns true if an LLM provider is configured and available.
 * Used by feature flags to conditionally show AI features on the client.
 */
export function isLlmAvailable(): boolean {
  const provider = process.env.LLM_PROVIDER;
  const endpoint = process.env.LLM_ENDPOINT;
  return !!provider && !!endpoint && VALID_PROVIDERS.includes(provider as typeof VALID_PROVIDERS[number]);
}

/**
 * Creates a provider-agnostic LLM client.
 * Provider is selected via LLM_PROVIDER env var ("azure", "local", or "gemini").
 * All providers use OpenAI-compatible chat completion APIs.
 */
export function createLlmClient(): LlmClient {
  const config = resolveConfig();

  return {
    async complete(prompt: string, input: string, options?: LlmCompletionOptions): Promise<string> {
      try {
        let url: string;
        if (config.provider === 'azure') {
          url = buildAzureUrl(config.endpoint, config.model);
        } else if (config.provider === 'gemini') {
          url = buildGeminiUrl(config.endpoint);
        } else {
          url = buildLocalUrl(config.endpoint);
        }

        return await callOpenAiCompatible(url, config.apiKey, config.model, config.provider, prompt, input, options);
      } catch (error) {
        if (error instanceof AppError) throw error;
        throw new AppError(
          ErrorCode.PROCESSING_ERROR,
          `LLM completion failed: ${error instanceof Error ? error.message : String(error)}`,
          500
        );
      }
    },
  };
}
