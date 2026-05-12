import { db } from '@/db';
import { accessRequests } from '@/db/schema/access-requests';
import { eq, and, sql, desc, ilike, or } from 'drizzle-orm';
import { AppError, ErrorCode } from '@/lib/errors';
import type { AccessRequestListFilter } from '@/schemas/accessRequests';

export interface AccessRequestInsert {
  fullName: string;
  email: string;
  company: string;
  industry?: string;
  jobTitle?: string;
  passwordHash: string;
}

export interface AccessRequestRow {
  requestId: string;
  fullName: string;
  email: string;
  company: string;
  industry: string | null;
  jobTitle: string | null;
  passwordHash: string;
  status: string;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  reviewNote: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export const accessRequestRepository = {
  async create(data: AccessRequestInsert): Promise<AccessRequestRow> {
    try {
      const result = await db
        .insert(accessRequests)
        .values({
          fullName: data.fullName,
          email: data.email,
          company: data.company,
          industry: data.industry ?? null,
          jobTitle: data.jobTitle ?? null,
          passwordHash: data.passwordHash,
        })
        .returning();

      return result[0] as AccessRequestRow;
    } catch (err: unknown) {
      const pgError = err as { code?: string };
      if (pgError.code === '23505') {
        throw new AppError(
          ErrorCode.DUPLICATE_ENTRY,
          'A registration request for this email already exists.',
          409
        );
      }
      throw err;
    }
  },

  async findAll(
    filters: AccessRequestListFilter
  ): Promise<{ data: AccessRequestRow[]; total: number }> {
    const conditions = [];

    if (filters.status) {
      conditions.push(eq(accessRequests.status, filters.status));
    }
    if (filters.search) {
      const escaped = filters.search.replace(/[%_\\]/g, '\\$&');
      conditions.push(
        or(
          ilike(accessRequests.fullName, `%${escaped}%`),
          ilike(accessRequests.email, `%${escaped}%`),
          ilike(accessRequests.company, `%${escaped}%`)
        )
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const offset = (filters.page - 1) * filters.pageSize;

    const [data, countResult] = await Promise.all([
      db
        .select()
        .from(accessRequests)
        .where(where)
        .orderBy(desc(accessRequests.createdAt))
        .limit(filters.pageSize)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(accessRequests)
        .where(where),
    ]);

    return {
      data: data as AccessRequestRow[],
      total: countResult[0]?.count ?? 0,
    };
  },

  async findById(requestId: string): Promise<AccessRequestRow | null> {
    const result = await db
      .select()
      .from(accessRequests)
      .where(eq(accessRequests.requestId, requestId))
      .limit(1);

    return (result[0] as AccessRequestRow) ?? null;
  },

  async findByEmail(email: string): Promise<AccessRequestRow | null> {
    const result = await db
      .select()
      .from(accessRequests)
      .where(eq(accessRequests.email, email))
      .limit(1);

    return (result[0] as AccessRequestRow) ?? null;
  },

  async updateStatus(
    requestId: string,
    status: string,
    reviewedBy: string,
    reviewNote?: string
  ): Promise<AccessRequestRow | null> {
    const result = await db
      .update(accessRequests)
      .set({
        status,
        reviewedBy,
        reviewedAt: new Date(),
        reviewNote: reviewNote ?? null,
        updatedAt: new Date(),
      })
      .where(eq(accessRequests.requestId, requestId))
      .returning();

    return (result[0] as AccessRequestRow) ?? null;
  },

  async deleteByEmail(email: string): Promise<void> {
    await db
      .delete(accessRequests)
      .where(eq(accessRequests.email, email));
  },
};
