import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
const mockCreate = vi.fn();
const mockFindById = vi.fn();
const mockFindAllByTenant = vi.fn();
const mockUpdateStatus = vi.fn();
const mockUpdateStatusIfCurrent = vi.fn();

vi.mock('@/db/repositories/documentRepository', () => ({
  documentRepository: {
    create: (...args: unknown[]) => mockCreate(...args),
    findById: (...args: unknown[]) => mockFindById(...args),
    findAllByTenant: (...args: unknown[]) => mockFindAllByTenant(...args),
    updateStatus: (...args: unknown[]) => mockUpdateStatus(...args),
    updateStatusIfCurrent: (...args: unknown[]) => mockUpdateStatusIfCurrent(...args),
  },
}));

const mockFindPeerById = vi.fn();
vi.mock('@/db/repositories/peerRepository', () => ({
  peerRepository: {
    findById: (...args: unknown[]) => mockFindPeerById(...args),
  },
}));

const mockUpload = vi.fn();
const mockDeleteBlob = vi.fn();
vi.mock('@/lib/blobStorage', () => ({
  upload: (...args: unknown[]) => mockUpload(...args),
  deleteBlob: (...args: unknown[]) => mockDeleteBlob(...args),
}));

const mockSubmitJob = vi.fn();
vi.mock('@/jobs', () => ({
  submitJob: (...args: unknown[]) => mockSubmitJob(...args),
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
  runWithContext: vi.fn((_ctx, fn) => fn()),
}));

import { documentService } from './documentService';

describe('documentService.upload', () => {
  const tenantId = 'tenant-123';
  const userId = 'user-456';
  const metadata = {
    peerId: 'peer-789',
    standard: 'BRSR' as const,
    fiscalYear: '2024-25',
  };
  const file = {
    name: 'report.pdf',
    type: 'application/pdf',
    size: 5 * 1024 * 1024,
    buffer: Buffer.from('fake pdf'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFindPeerById.mockResolvedValue({ peerId: 'peer-789', name: 'Test Peer' });
    mockUpload.mockResolvedValue('https://blob.storage/documents/report.pdf');
    mockCreate.mockResolvedValue({
      docId: 'doc-new',
      tenantId,
      peerId: metadata.peerId,
      standard: metadata.standard,
      fiscalYear: metadata.fiscalYear,
      filename: file.name,
      status: 'pending',
    });
  });

  it('uploads file and creates document record with pre-generated docId', async () => {
    const result = await documentService.upload(tenantId, userId, metadata, file);

    expect(result.docId).toBe('doc-new');
    expect(mockUpload).toHaveBeenCalledWith(
      tenantId,
      expect.stringContaining('documents/'),
      file.buffer,
      'application/pdf'
    );
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        docId: expect.any(String),
        tenantId,
        peerId: metadata.peerId,
        standard: 'BRSR',
        fiscalYear: '2024-25',
        filename: 'report.pdf',
        uploadedBy: userId,
      })
    );
  });

  it('cleans up blob when DB insert fails', async () => {
    mockCreate.mockRejectedValue(new Error('DB connection lost'));
    mockDeleteBlob.mockResolvedValue(undefined);

    await expect(
      documentService.upload(tenantId, userId, metadata, file)
    ).rejects.toThrow('DB connection lost');

    expect(mockUpload).toHaveBeenCalled();
    expect(mockDeleteBlob).toHaveBeenCalledWith(
      tenantId,
      expect.stringContaining('documents/')
    );
  });

  it('sanitizes filename in blob path', async () => {
    const dangerousFile = { ...file, name: '../../etc/passwd.pdf' };
    await documentService.upload(tenantId, userId, metadata, dangerousFile);

    const blobPath = mockUpload.mock.calls[0][1] as string;
    expect(blobPath).not.toContain('..');
    expect(blobPath).not.toContain('/etc/');
  });

  it('rejects files exceeding 50 MB', async () => {
    const bigFile = { ...file, size: 51 * 1024 * 1024 };
    await expect(
      documentService.upload(tenantId, userId, metadata, bigFile)
    ).rejects.toThrow('50 MB limit');
  });

  it('rejects non-PDF files', async () => {
    const nonPdf = { ...file, type: 'image/png' };
    await expect(
      documentService.upload(tenantId, userId, metadata, nonPdf)
    ).rejects.toThrow('Only PDF');
  });

  it('rejects when peer not found', async () => {
    mockFindPeerById.mockResolvedValue(null);
    await expect(
      documentService.upload(tenantId, userId, metadata, file)
    ).rejects.toThrow('Peer organisation not found');
  });
});

describe('documentService.triggerExtraction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('atomically claims document and enqueues job', async () => {
    mockUpdateStatusIfCurrent.mockResolvedValue({
      docId: 'doc-1',
      tenantId: 'tenant-123',
      status: 'processing',
    });
    mockSubmitJob.mockResolvedValue('job-abc');
    mockUpdateStatus.mockResolvedValue({
      docId: 'doc-1',
      status: 'processing',
      jobId: 'job-abc',
    });

    const result = await documentService.triggerExtraction('doc-1');

    expect(result.jobId).toBe('job-abc');
    expect(mockUpdateStatusIfCurrent).toHaveBeenCalledWith('doc-1', 'pending', 'processing');
    expect(mockSubmitJob).toHaveBeenCalledWith(
      'extraction-pipeline',
      expect.objectContaining({ documentId: 'doc-1', tenantId: 'tenant-123' })
    );
    expect(mockUpdateStatus).toHaveBeenCalledWith('doc-1', 'processing', { jobId: 'job-abc' });
  });

  it('rejects when document not found', async () => {
    mockUpdateStatusIfCurrent.mockResolvedValue(null);
    mockFindById.mockResolvedValue(null);
    await expect(
      documentService.triggerExtraction('nonexistent')
    ).rejects.toThrow('Document not found');
  });

  it('rejects when document is not in pending status', async () => {
    mockUpdateStatusIfCurrent.mockResolvedValue(null);
    mockFindById.mockResolvedValue({
      docId: 'doc-1',
      tenantId: 'tenant-123',
      status: 'processing',
    });
    await expect(
      documentService.triggerExtraction('doc-1')
    ).rejects.toThrow('already in "processing" status');
  });

  it('reverts status when job submission returns null', async () => {
    mockUpdateStatusIfCurrent.mockResolvedValue({
      docId: 'doc-1',
      tenantId: 'tenant-123',
      status: 'processing',
    });
    mockSubmitJob.mockResolvedValue(null);
    mockUpdateStatus.mockResolvedValue({ docId: 'doc-1', status: 'pending' });

    await expect(
      documentService.triggerExtraction('doc-1')
    ).rejects.toThrow('Failed to enqueue');

    expect(mockUpdateStatus).toHaveBeenCalledWith('doc-1', 'pending');
  });

  it('reverts status when job submission throws', async () => {
    mockUpdateStatusIfCurrent.mockResolvedValue({
      docId: 'doc-1',
      tenantId: 'tenant-123',
      status: 'processing',
    });
    mockSubmitJob.mockRejectedValue(new Error('Queue unavailable'));
    mockUpdateStatus.mockResolvedValue({ docId: 'doc-1', status: 'pending' });

    await expect(
      documentService.triggerExtraction('doc-1')
    ).rejects.toThrow('Queue unavailable');

    expect(mockUpdateStatus).toHaveBeenCalledWith('doc-1', 'pending');
  });
});

describe('documentService.list', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns paginated document list', async () => {
    mockFindAllByTenant.mockResolvedValue({
      data: [{ docId: 'doc-1', filename: 'report.pdf' }],
      total: 1,
    });

    const result = await documentService.list({ page: 1, pageSize: 20 });

    expect(result.data).toHaveLength(1);
    expect(result.meta).toEqual({ page: 1, pageSize: 20, total: 1 });
  });

  it('passes filters to repository', async () => {
    mockFindAllByTenant.mockResolvedValue({ data: [], total: 0 });

    await documentService.list({ page: 1, pageSize: 10, status: 'completed' });

    expect(mockFindAllByTenant).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'completed', page: 1, pageSize: 10 })
    );
  });
});

describe('documentService.getById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns document when found', async () => {
    mockFindById.mockResolvedValue({ docId: 'doc-1', filename: 'report.pdf' });
    const result = await documentService.getById('doc-1');
    expect(result.docId).toBe('doc-1');
  });

  it('throws when not found', async () => {
    mockFindById.mockResolvedValue(null);
    await expect(
      documentService.getById('nonexistent')
    ).rejects.toThrow('Document not found');
  });
});
