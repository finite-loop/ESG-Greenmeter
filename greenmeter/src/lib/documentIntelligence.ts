import { DocumentAnalysisClient, AzureKeyCredential } from '@azure/ai-form-recognizer';
import { AppError, ErrorCode } from './errors';

export interface ExtractedPage {
  pageNumber: number;
  text: string;
}

export interface ExtractionResult {
  fullText: string;
  pages: ExtractedPage[];
}

let client: DocumentAnalysisClient | null = null;

function getClient(): DocumentAnalysisClient {
  if (!client) {
    const endpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
    const key = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;

    if (!endpoint || !key) {
      throw new AppError(
        ErrorCode.PROCESSING_ERROR,
        'AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT and AZURE_DOCUMENT_INTELLIGENCE_KEY must be set',
        500
      );
    }

    client = new DocumentAnalysisClient(endpoint, new AzureKeyCredential(key));
  }
  return client;
}

/**
 * Extracts structured text from a PDF buffer using Azure Document Intelligence.
 * Uses the prebuilt-layout model for general document understanding.
 *
 * @param pdfBuffer The PDF file content as a Buffer.
 * @returns Extracted text organized by page, plus the full concatenated text.
 */
const POLL_TIMEOUT_MS = 120_000; // 2 minutes

export async function extractText(pdfBuffer: Buffer): Promise<ExtractionResult> {
  try {
    const docClient = getClient();
    const poller = await docClient.beginAnalyzeDocument('prebuilt-layout', pdfBuffer);

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(
        () => reject(new Error('Document Intelligence polling timed out after 2 minutes')),
        POLL_TIMEOUT_MS
      );
    });

    let result: Awaited<ReturnType<typeof poller.pollUntilDone>>;
    try {
      result = await Promise.race([poller.pollUntilDone(), timeoutPromise]);
    } finally {
      clearTimeout(timeoutId);
    }

    const pages: ExtractedPage[] = (result.pages ?? []).map((page) => ({
      pageNumber: page.pageNumber,
      text: (page.lines ?? []).map((line) => line.content).join('\n'),
    }));

    return {
      fullText: result.content ?? '',
      pages,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      ErrorCode.PROCESSING_ERROR,
      `Document extraction failed: ${error instanceof Error ? error.message : String(error)}`,
      500
    );
  }
}
