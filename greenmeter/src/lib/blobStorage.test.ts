import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError, ErrorCode } from './errors';

const VALID_TENANT_ID = '00000000-0000-0000-0000-000000000001';

// Mock @azure/storage-blob
const mockUploadData = vi.fn().mockResolvedValue({});
const mockDownload = vi.fn();
const mockDeleteBlob = vi.fn().mockResolvedValue({});
const mockGenerateSasUrl = vi.fn().mockResolvedValue('https://blob.test/sas-url');
const mockGetProperties = vi.fn().mockResolvedValue({ contentLength: 1024 });

const mockBlockBlobClient = {
  uploadData: mockUploadData,
  url: `https://blob.test/documents/${VALID_TENANT_ID}/path/file.pdf`,
  download: mockDownload,
  deleteIfExists: mockDeleteBlob,
  generateSasUrl: mockGenerateSasUrl,
  getProperties: mockGetProperties,
};

const mockContainerClient = {
  getBlockBlobClient: vi.fn().mockReturnValue(mockBlockBlobClient),
  createIfNotExists: vi.fn().mockResolvedValue({}),
};

const mockBlobServiceClient = {
  getContainerClient: vi.fn().mockReturnValue(mockContainerClient),
};

vi.mock('@azure/storage-blob', () => ({
  BlobServiceClient: {
    fromConnectionString: vi.fn().mockReturnValue(mockBlobServiceClient),
  },
  BlobSASPermissions: {
    parse: vi.fn().mockReturnValue({}),
  },
  generateBlobSASQueryParameters: vi.fn().mockReturnValue({ toString: () => 'sas-token' }),
  StorageSharedKeyCredential: vi.fn(),
}));

describe('blobStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.AZURE_STORAGE_CONNECTION_STRING = 'DefaultEndpointsProtocol=https;AccountName=test;AccountKey=dGVzdA==;EndpointSuffix=core.windows.net';
    // Reset download mock to return valid stream each time
    mockDownload.mockResolvedValue({
      readableStreamBody: (async function* () {
        yield Buffer.from('file-content');
      })(),
      blobBody: undefined,
    });
    mockGetProperties.mockResolvedValue({ contentLength: 1024 });
  });

  describe('upload', () => {
    it('uploads a buffer to the correct tenant-scoped path', async () => {
      const { upload } = await import('./blobStorage');
      const buffer = Buffer.from('test-content');
      const url = await upload(VALID_TENANT_ID, 'reports/file.pdf', buffer, 'application/pdf');

      expect(mockContainerClient.getBlockBlobClient).toHaveBeenCalledWith(`${VALID_TENANT_ID}/reports/file.pdf`);
      expect(mockUploadData).toHaveBeenCalledWith(buffer, {
        blobHTTPHeaders: { blobContentType: 'application/pdf' },
      });
      expect(url).toBe(`https://blob.test/documents/${VALID_TENANT_ID}/path/file.pdf`);
    });

    it('throws AppError with PROCESSING_ERROR on failure', async () => {
      mockUploadData.mockRejectedValueOnce(new Error('Storage unavailable'));
      const { upload } = await import('./blobStorage');

      await expect(
        upload(VALID_TENANT_ID, 'file.pdf', Buffer.from('test'), 'application/pdf')
      ).rejects.toMatchObject({
        code: 'PROCESSING_ERROR',
        name: 'AppError',
      });
    });
  });

  describe('download', () => {
    it('downloads a buffer from the correct tenant-scoped path', async () => {
      const { download } = await import('./blobStorage');
      const result = await download(VALID_TENANT_ID, 'reports/file.pdf');

      expect(mockContainerClient.getBlockBlobClient).toHaveBeenCalledWith(`${VALID_TENANT_ID}/reports/file.pdf`);
      expect(result).toBeInstanceOf(Buffer);
    });

    it('throws AppError when blob exceeds maximum download size', async () => {
      mockGetProperties.mockResolvedValueOnce({ contentLength: 600 * 1024 * 1024 });
      const { download } = await import('./blobStorage');

      await expect(download(VALID_TENANT_ID, 'reports/large.pdf')).rejects.toMatchObject({
        code: 'PROCESSING_ERROR',
        name: 'AppError',
      });
    });
  });

  describe('deleteBlob', () => {
    it('deletes the blob at the correct tenant-scoped path', async () => {
      const { deleteBlob } = await import('./blobStorage');
      await deleteBlob(VALID_TENANT_ID, 'reports/file.pdf');

      expect(mockContainerClient.getBlockBlobClient).toHaveBeenCalledWith(`${VALID_TENANT_ID}/reports/file.pdf`);
      expect(mockDeleteBlob).toHaveBeenCalled();
    });
  });

  describe('getSignedUrl', () => {
    it('generates a SAS URL for the correct tenant-scoped path', async () => {
      const { getSignedUrl } = await import('./blobStorage');
      const url = await getSignedUrl(VALID_TENANT_ID, 'reports/file.pdf', 3600);

      expect(mockContainerClient.getBlockBlobClient).toHaveBeenCalledWith(`${VALID_TENANT_ID}/reports/file.pdf`);
      expect(typeof url).toBe('string');
    });

    it('throws AppError for zero expiresInSeconds', async () => {
      const { getSignedUrl } = await import('./blobStorage');
      await expect(getSignedUrl(VALID_TENANT_ID, 'file.pdf', 0)).rejects.toMatchObject({
        code: 'PROCESSING_ERROR',
        name: 'AppError',
      });
    });

    it('throws AppError for negative expiresInSeconds', async () => {
      const { getSignedUrl } = await import('./blobStorage');
      await expect(getSignedUrl(VALID_TENANT_ID, 'file.pdf', -1)).rejects.toMatchObject({
        code: 'PROCESSING_ERROR',
        name: 'AppError',
      });
    });

    it('throws AppError for expiresInSeconds above 86400', async () => {
      const { getSignedUrl } = await import('./blobStorage');
      await expect(getSignedUrl(VALID_TENANT_ID, 'file.pdf', 86401)).rejects.toMatchObject({
        code: 'PROCESSING_ERROR',
        name: 'AppError',
      });
    });

    it('throws AppError for NaN expiresInSeconds', async () => {
      const { getSignedUrl } = await import('./blobStorage');
      await expect(getSignedUrl(VALID_TENANT_ID, 'file.pdf', NaN)).rejects.toMatchObject({
        code: 'PROCESSING_ERROR',
        name: 'AppError',
      });
    });
  });

  describe('path traversal validation', () => {
    it('rejects tenantId that is not a valid UUID', async () => {
      const { upload } = await import('./blobStorage');
      await expect(
        upload('not-a-uuid', 'file.pdf', Buffer.from('test'), 'application/pdf')
      ).rejects.toMatchObject({
        code: 'PROCESSING_ERROR',
        name: 'AppError',
      });
    });

    it('rejects path containing ".."', async () => {
      const { upload } = await import('./blobStorage');
      await expect(
        upload(VALID_TENANT_ID, '../escape/file.pdf', Buffer.from('test'), 'application/pdf')
      ).rejects.toMatchObject({
        code: 'PROCESSING_ERROR',
        name: 'AppError',
      });
    });

    it('rejects path starting with "/"', async () => {
      const { upload } = await import('./blobStorage');
      await expect(
        upload(VALID_TENANT_ID, '/absolute/file.pdf', Buffer.from('test'), 'application/pdf')
      ).rejects.toMatchObject({
        code: 'PROCESSING_ERROR',
        name: 'AppError',
      });
    });

    it('rejects path with embedded ".." traversal', async () => {
      const { deleteBlob } = await import('./blobStorage');
      await expect(
        deleteBlob(VALID_TENANT_ID, 'reports/../../etc/passwd')
      ).rejects.toMatchObject({
        code: 'PROCESSING_ERROR',
        name: 'AppError',
      });
    });
  });
});
