import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('llm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('createLlmClient', () => {
    it('creates an azure client when LLM_PROVIDER is azure', async () => {
      process.env.LLM_PROVIDER = 'azure';
      process.env.LLM_ENDPOINT = 'https://myopenai.openai.azure.com';
      process.env.LLM_API_KEY = 'test-key';
      process.env.LLM_MODEL = 'gpt-4o';

      const { createLlmClient } = await import('./llm');
      const client = createLlmClient();
      expect(client).toBeDefined();
      expect(typeof client.complete).toBe('function');
    });

    it('creates a local client when LLM_PROVIDER is local', async () => {
      process.env.LLM_PROVIDER = 'local';
      process.env.LLM_ENDPOINT = 'http://localhost:11434';
      process.env.LLM_API_KEY = '';
      process.env.LLM_MODEL = 'llama3';

      const { createLlmClient } = await import('./llm');
      const client = createLlmClient();
      expect(client).toBeDefined();
      expect(typeof client.complete).toBe('function');
    });

    it('throws AppError if LLM_PROVIDER is not set', async () => {
      delete process.env.LLM_PROVIDER;
      process.env.LLM_ENDPOINT = 'http://localhost';
      process.env.LLM_API_KEY = 'key';
      process.env.LLM_MODEL = 'model';

      const { createLlmClient } = await import('./llm');
      expect(() => createLlmClient()).toThrow('LLM_PROVIDER');
    });

    it('throws AppError if LLM_ENDPOINT is not set', async () => {
      process.env.LLM_PROVIDER = 'azure';
      delete process.env.LLM_ENDPOINT;
      process.env.LLM_API_KEY = 'key';
      process.env.LLM_MODEL = 'model';

      const { createLlmClient } = await import('./llm');
      expect(() => createLlmClient()).toThrow('LLM_ENDPOINT');
    });
  });

  describe('azure provider complete()', () => {
    beforeEach(() => {
      process.env.LLM_PROVIDER = 'azure';
      process.env.LLM_ENDPOINT = 'https://myopenai.openai.azure.com';
      process.env.LLM_API_KEY = 'test-key';
      process.env.LLM_MODEL = 'gpt-4o';
    });

    it('sends request to Azure OpenAI endpoint and returns completion text', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'The extracted value is 42.' } }],
        }),
      });

      const { createLlmClient } = await import('./llm');
      const client = createLlmClient();
      const result = await client.complete('Extract the value', 'Some document text');

      expect(result).toBe('The extracted value is 42.');
      expect(mockFetch).toHaveBeenCalledOnce();

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('openai.azure.com');
      expect(options.method).toBe('POST');
      expect(options.headers['api-key']).toBe('test-key');
    });

    it('passes temperature and maxTokens options', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'Result' } }],
        }),
      });

      const { createLlmClient } = await import('./llm');
      const client = createLlmClient();
      await client.complete('Prompt', 'Input', { temperature: 0.2, maxTokens: 500 });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.temperature).toBe(0.2);
      expect(body.max_tokens).toBe(500);
    });

    it('throws AppError on non-ok HTTP response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        text: () => Promise.resolve('Rate limited'),
      });

      const { createLlmClient } = await import('./llm');
      const client = createLlmClient();
      await expect(client.complete('Prompt', 'Input')).rejects.toMatchObject({
        code: 'PROCESSING_ERROR',
        name: 'AppError',
      });
    });

    it('throws AppError on fetch failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { createLlmClient } = await import('./llm');
      const client = createLlmClient();
      await expect(client.complete('Prompt', 'Input')).rejects.toMatchObject({
        code: 'PROCESSING_ERROR',
        name: 'AppError',
      });
    });

    it('passes AbortSignal.timeout to fetch for request timeout', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'Result' } }],
        }),
      });

      const { createLlmClient } = await import('./llm');
      const client = createLlmClient();
      await client.complete('Prompt', 'Input');

      const fetchOptions = mockFetch.mock.calls[0][1];
      expect(fetchOptions.signal).toBeDefined();
    });

    it('throws AppError when LLM returns empty choices array', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ choices: [] }),
      });

      const { createLlmClient } = await import('./llm');
      const client = createLlmClient();
      await expect(client.complete('Prompt', 'Input')).rejects.toMatchObject({
        code: 'PROCESSING_ERROR',
        name: 'AppError',
      });
    });

    it('throws AppError when LLM returns empty content string', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: '' } }],
        }),
      });

      const { createLlmClient } = await import('./llm');
      const client = createLlmClient();
      await expect(client.complete('Prompt', 'Input')).rejects.toMatchObject({
        code: 'PROCESSING_ERROR',
        name: 'AppError',
      });
    });

    it('throws AppError if LLM_PROVIDER has invalid value', async () => {
      process.env.LLM_PROVIDER = 'unsupported';

      const { createLlmClient } = await import('./llm');
      expect(() => createLlmClient()).toThrow('invalid value');
    });
  });

  describe('local provider complete()', () => {
    beforeEach(() => {
      process.env.LLM_PROVIDER = 'local';
      process.env.LLM_ENDPOINT = 'http://localhost:11434';
      process.env.LLM_API_KEY = '';
      process.env.LLM_MODEL = 'llama3';
    });

    it('sends request to local OpenAI-compatible endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'Local result' } }],
        }),
      });

      const { createLlmClient } = await import('./llm');
      const client = createLlmClient();
      const result = await client.complete('Prompt', 'Input');

      expect(result).toBe('Local result');
      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('localhost:11434');
    });

    it('does not include api-key header when key is empty', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'Result' } }],
        }),
      });

      const { createLlmClient } = await import('./llm');
      const client = createLlmClient();
      await client.complete('Prompt', 'Input');

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers['api-key']).toBeUndefined();
      expect(headers['Authorization']).toBeUndefined();
    });

    it('uses Authorization Bearer header instead of api-key for local provider', async () => {
      process.env.LLM_API_KEY = 'local-key';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'Result' } }],
        }),
      });

      const { createLlmClient } = await import('./llm');
      const client = createLlmClient();
      await client.complete('Prompt', 'Input');

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers['Authorization']).toBe('Bearer local-key');
      expect(headers['api-key']).toBeUndefined();
    });
  });
});
