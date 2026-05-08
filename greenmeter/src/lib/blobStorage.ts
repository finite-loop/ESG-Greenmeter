import { BlobServiceClient, BlobSASPermissions } from '@azure/storage-blob';
import { AppError, ErrorCode } from './errors';

const CONTAINER_NAME = 'documents';
const MAX_DOWNLOAD_BYTES = 500 * 1024 * 1024; // 500 MB
const MAX_EXPIRES_SECONDS = 86400; // 24 hours
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let blobServiceClient: BlobServiceClient | null = null;

function getClient(): BlobServiceClient {
  if (!blobServiceClient) {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString) {
      throw new AppError(
        ErrorCode.PROCESSING_ERROR,
        'AZURE_STORAGE_CONNECTION_STRING environment variable is not set',
        500
      );
    }
    blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  }
  return blobServiceClient;
}

function validateTenantId(tenantId: string): void {
  if (!UUID_REGEX.test(tenantId)) {
    throw new AppError(
      ErrorCode.PROCESSING_ERROR,
      'Invalid tenantId: must be a valid UUID',
      400
    );
  }
}

function validatePath(path: string): void {
  if (path.includes('..') || path.startsWith('/')) {
    throw new AppError(
      ErrorCode.PROCESSING_ERROR,
      'Invalid path: must not contain ".." or start with "/"',
      400
    );
  }
}

function getBlobPath(tenantId: string, path: string): string {
  validateTenantId(tenantId);
  validatePath(path);
  return `${tenantId}/${path}`;
}

/**
 * Uploads a buffer to Azure Blob Storage at a tenant-scoped path.
 * @returns The URL of the uploaded blob.
 */
export async function upload(
  tenantId: string,
  path: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  try {
    const client = getClient();
    const containerClient = client.getContainerClient(CONTAINER_NAME);
    const blobClient = containerClient.getBlockBlobClient(getBlobPath(tenantId, path));
    await blobClient.uploadData(buffer, {
      blobHTTPHeaders: { blobContentType: contentType },
    });
    return blobClient.url;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      ErrorCode.PROCESSING_ERROR,
      `Blob upload failed: ${error instanceof Error ? error.message : String(error)}`,
      500
    );
  }
}

/**
 * Downloads a blob from Azure Blob Storage at a tenant-scoped path.
 * @returns The file content as a Buffer.
 */
export async function download(tenantId: string, path: string): Promise<Buffer> {
  try {
    const client = getClient();
    const containerClient = client.getContainerClient(CONTAINER_NAME);
    const blobClient = containerClient.getBlockBlobClient(getBlobPath(tenantId, path));
    const properties = await blobClient.getProperties();
    if (properties.contentLength && properties.contentLength > MAX_DOWNLOAD_BYTES) {
      throw new AppError(
        ErrorCode.PROCESSING_ERROR,
        `Blob exceeds maximum download size (${MAX_DOWNLOAD_BYTES} bytes)`,
        400
      );
    }

    const response = await blobClient.download();

    // Node.js environment: use readableStreamBody
    if (response.readableStreamBody) {
      const chunks: Buffer[] = [];
      for await (const chunk of response.readableStreamBody) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      return Buffer.concat(chunks);
    }

    // Browser/fallback: use blobBody
    if (response.blobBody) {
      const blob = await response.blobBody;
      const arrayBuffer = await blob.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }

    throw new Error('No response body received from blob download');
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      ErrorCode.PROCESSING_ERROR,
      `Blob download failed: ${error instanceof Error ? error.message : String(error)}`,
      500
    );
  }
}

/**
 * Deletes a blob at a tenant-scoped path.
 */
export async function deleteBlob(tenantId: string, path: string): Promise<void> {
  try {
    const client = getClient();
    const containerClient = client.getContainerClient(CONTAINER_NAME);
    const blobClient = containerClient.getBlockBlobClient(getBlobPath(tenantId, path));
    await blobClient.deleteIfExists();
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      ErrorCode.PROCESSING_ERROR,
      `Blob delete failed: ${error instanceof Error ? error.message : String(error)}`,
      500
    );
  }
}

/**
 * Generates a time-limited SAS URL for a blob at a tenant-scoped path.
 * @param expiresInSeconds How long the URL should be valid.
 * @returns A signed URL string.
 */
export async function getSignedUrl(
  tenantId: string,
  path: string,
  expiresInSeconds: number
): Promise<string> {
  if (!Number.isFinite(expiresInSeconds) || expiresInSeconds <= 0 || expiresInSeconds > MAX_EXPIRES_SECONDS) {
    throw new AppError(
      ErrorCode.PROCESSING_ERROR,
      `expiresInSeconds must be between 1 and ${MAX_EXPIRES_SECONDS}`,
      400
    );
  }

  try {
    const client = getClient();
    const containerClient = client.getContainerClient(CONTAINER_NAME);
    const blobClient = containerClient.getBlockBlobClient(getBlobPath(tenantId, path));

    const startsOn = new Date();
    const expiresOn = new Date(startsOn.getTime() + expiresInSeconds * 1000);

    const sasUrl = await blobClient.generateSasUrl({
      permissions: BlobSASPermissions.parse('r'),
      startsOn,
      expiresOn,
    });
    return sasUrl;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      ErrorCode.PROCESSING_ERROR,
      `SAS URL generation failed: ${error instanceof Error ? error.message : String(error)}`,
      500
    );
  }
}
