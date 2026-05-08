import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from './errors';

const mockPollUntilDone = vi.fn();
const mockBeginAnalyzeDocument = vi.fn().mockResolvedValue({
  pollUntilDone: mockPollUntilDone,
});

vi.mock('@azure/ai-form-recognizer', () => ({
  DocumentAnalysisClient: vi.fn().mockImplementation(function () {
    return { beginAnalyzeDocument: mockBeginAnalyzeDocument };
  }),
  AzureKeyCredential: vi.fn().mockImplementation(function (this: { key: string }, key: string) {
    this.key = key;
  }),
}));

describe('documentIntelligence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT = 'https://test.cognitiveservices.azure.com';
    process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY = 'test-key';
  });

  describe('extractText', () => {
    it('returns structured text organized by page', async () => {
      mockPollUntilDone.mockResolvedValueOnce({
        content: 'Full document text',
        pages: [
          {
            pageNumber: 1,
            lines: [
              { content: 'Line 1 on page 1' },
              { content: 'Line 2 on page 1' },
            ],
          },
          {
            pageNumber: 2,
            lines: [
              { content: 'Line 1 on page 2' },
            ],
          },
        ],
      });

      const { extractText } = await import('./documentIntelligence');
      const result = await extractText(Buffer.from('pdf-content'));

      expect(result).toEqual({
        fullText: 'Full document text',
        pages: [
          {
            pageNumber: 1,
            text: 'Line 1 on page 1\nLine 2 on page 1',
          },
          {
            pageNumber: 2,
            text: 'Line 1 on page 2',
          },
        ],
      });
    });

    it('uses the prebuilt-layout model', async () => {
      mockPollUntilDone.mockResolvedValueOnce({
        content: '',
        pages: [],
      });

      const { extractText } = await import('./documentIntelligence');
      await extractText(Buffer.from('test'));

      expect(mockBeginAnalyzeDocument).toHaveBeenCalledWith(
        'prebuilt-layout',
        expect.any(Buffer)
      );
    });

    it('handles documents with no pages', async () => {
      mockPollUntilDone.mockResolvedValueOnce({
        content: '',
        pages: undefined,
      });

      const { extractText } = await import('./documentIntelligence');
      const result = await extractText(Buffer.from('empty'));

      expect(result).toEqual({
        fullText: '',
        pages: [],
      });
    });

    it('throws AppError with PROCESSING_ERROR on failure', async () => {
      mockBeginAnalyzeDocument.mockRejectedValueOnce(new Error('Service error'));

      const { extractText } = await import('./documentIntelligence');
      await expect(extractText(Buffer.from('bad'))).rejects.toMatchObject({
        code: 'PROCESSING_ERROR',
        name: 'AppError',
      });
    });

    it('throws AppError if endpoint env var is missing', async () => {
      delete process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;

      const { extractText } = await import('./documentIntelligence');
      await expect(extractText(Buffer.from('test'))).rejects.toThrow('AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT');
    });

    it('throws AppError on polling timeout', async () => {
      // Mock setTimeout to fire immediately so the timeout wins the Promise.race
      const originalSetTimeout = globalThis.setTimeout;
      vi.stubGlobal('setTimeout', (fn: () => void) => {
        return originalSetTimeout(fn, 0);
      });

      mockPollUntilDone.mockImplementationOnce(
        () => new Promise(() => { /* never resolves */ })
      );

      const { extractText } = await import('./documentIntelligence');

      await expect(extractText(Buffer.from('slow-doc'))).rejects.toMatchObject({
        code: 'PROCESSING_ERROR',
        name: 'AppError',
      });

      vi.stubGlobal('setTimeout', originalSetTimeout);
    });
  });
});
