import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

// Mock blobStorage
vi.mock('@/lib/blobStorage', () => ({
  upload: vi.fn().mockResolvedValue('https://blob.storage/tenants/tenant-1/logos/logo.png'),
}));

// Mock db
const mockUpdate = vi.fn().mockReturnValue({
  set: vi.fn().mockReturnValue({
    where: vi.fn().mockResolvedValue(undefined),
  }),
});

vi.mock('@/db', () => ({
  db: {
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}));

vi.mock('@/db/schema', () => ({
  tenants: { tenantId: 'tenant_id' },
}));

// Mock middleware to pass through
vi.mock('@/middleware', () => ({
  withApiHandler: (handler: Function, _opts: unknown) => {
    return async (req: NextRequest) => {
      const ctx = {
        req,
        session: { user: { userId: 'user-1', tenantId: 'tenant-1', role: 'admin' } },
        tenantId: 'tenant-1',
        userId: 'user-1',
      };
      const result = await handler(req, ctx);
      return Response.json(result);
    };
  },
}));

import { POST } from './route';
import { upload } from '@/lib/blobStorage';

function createRequest(formData: FormData): NextRequest {
  return new Request('http://localhost/api/onboarding/logo', {
    method: 'POST',
    body: formData,
  }) as unknown as NextRequest;
}

describe('POST /api/onboarding/logo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uploads a valid PNG logo and returns the URL', async () => {
    const file = new File([new Uint8Array(1024)], 'logo.png', { type: 'image/png' });
    const formData = new FormData();
    formData.append('logo', file);

    const res = await POST(createRequest(formData));
    const body = await res.json();

    expect(body.data.logoUrl).toBe('https://blob.storage/tenants/tenant-1/logos/logo.png');
    expect(upload).toHaveBeenCalledWith(
      'tenant-1',
      'logos/logo.png',
      expect.any(Buffer),
      'image/png'
    );
  });

  it('rejects files larger than 2 MB', async () => {
    const bigBuffer = new Uint8Array(3 * 1024 * 1024); // 3 MB
    const file = new File([bigBuffer], 'big.png', { type: 'image/png' });
    const formData = new FormData();
    formData.append('logo', file);

    await expect(POST(createRequest(formData))).rejects.toThrow('File size exceeds 2 MB limit');
  });

  it('rejects invalid file types', async () => {
    const file = new File([new Uint8Array(100)], 'doc.pdf', { type: 'application/pdf' });
    const formData = new FormData();
    formData.append('logo', file);

    await expect(POST(createRequest(formData))).rejects.toThrow();
  });

  it('rejects request with no file', async () => {
    const formData = new FormData();

    await expect(POST(createRequest(formData))).rejects.toThrow();
  });
});
