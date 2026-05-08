import { withApiHandler } from '@/middleware';
import { AppError, ErrorCode } from '@/lib/errors';
import { upload } from '@/lib/blobStorage';
import { db } from '@/db';
import { tenants } from '@/db/schema';
import { eq } from 'drizzle-orm';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

export const POST = withApiHandler(
  async (req, ctx) => {
    const formData = await req.formData();
    const file = formData.get('logo');

    if (!file || !(file instanceof File)) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'No logo file provided',
        400
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        `Invalid file type: ${file.type}. Allowed: PNG, JPEG, WebP, SVG`,
        400
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'File size exceeds 2 MB limit',
        400
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const ext = file.name.split('.').pop() || 'png';
    const blobPath = `logos/logo.${ext}`;

    const blobUrl = await upload(ctx.tenantId, blobPath, buffer, file.type);

    await db
      .update(tenants)
      .set({ logoUrl: blobUrl, updatedAt: new Date() })
      .where(eq(tenants.tenantId, ctx.tenantId));

    return {
      data: { logoUrl: blobUrl },
      _audit: {
        entityType: 'tenant',
        entityId: ctx.tenantId,
        action: 'UPDATE',
        newValue: { logoUrl: blobUrl },
      },
    };
  },
  { roles: ['admin'], audit: true }
);
