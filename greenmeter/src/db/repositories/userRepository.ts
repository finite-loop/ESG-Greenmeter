import { db } from '@/db';
import { users } from '@/db/schema/auth';
import { eq, and, sql, desc, ilike, or } from 'drizzle-orm';
import { AppError, ErrorCode } from '@/lib/errors';
import type { UserListFilter } from '@/schemas/users';

export interface UserInsert {
  tenantId: string;
  email: string;
  name: string;
  role: string;
  departmentId?: string | null;
  status: string;
  passwordHash?: string;
}

export interface UserRow {
  userId: string;
  tenantId: string;
  name: string;
  email: string;
  role: string;
  departmentId: string | null;
  status: string;
  lastLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const userRepository = {
  async findAllByTenant(
    filters: UserListFilter
  ): Promise<{ data: UserRow[]; total: number }> {
    const conditions = [];

    if (filters.search) {
      const escaped = filters.search.replace(/[%_\\]/g, '\\$&');
      conditions.push(
        or(
          ilike(users.name, `%${escaped}%`),
          ilike(users.email, `%${escaped}%`)
        )
      );
    }
    if (filters.role) {
      conditions.push(eq(users.role, filters.role));
    }
    if (filters.status) {
      conditions.push(eq(users.status, filters.status));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const offset = (filters.page - 1) * filters.pageSize;

    const [data, countResult] = await Promise.all([
      db
        .select()
        .from(users)
        .where(where)
        .orderBy(desc(users.createdAt))
        .limit(filters.pageSize)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(where),
    ]);

    return {
      data: data as UserRow[],
      total: countResult[0]?.count ?? 0,
    };
  },

  async findById(userId: string): Promise<UserRow | null> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.userId, userId))
      .limit(1);

    return (result[0] as UserRow) ?? null;
  },

  async findByEmail(email: string): Promise<UserRow | null> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return (result[0] as UserRow) ?? null;
  },

  async create(user: UserInsert): Promise<UserRow> {
    try {
      const result = await db
        .insert(users)
        .values({
          tenantId: user.tenantId,
          email: user.email,
          name: user.name,
          role: user.role,
          departmentId: user.departmentId ?? null,
          status: user.status,
          passwordHash: user.passwordHash ?? undefined,
        })
        .returning();

      return result[0] as UserRow;
    } catch (err: unknown) {
      const pgError = err as { code?: string; constraint?: string };
      if (pgError.code === '23505') {
        throw new AppError(
          ErrorCode.DUPLICATE_ENTRY,
          'Unable to create user. The email may already be in use.',
          409
        );
      }
      if (pgError.code === '23503') {
        throw new AppError(
          ErrorCode.VALIDATION_ERROR,
          'Invalid department reference. The specified department does not exist.',
          400
        );
      }
      throw err;
    }
  },

  async countActiveAdmins(): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(and(eq(users.role, 'admin'), eq(users.status, 'active')));

    return result[0]?.count ?? 0;
  },

  async update(
    userId: string,
    updates: Partial<Omit<UserInsert, 'tenantId' | 'email'>>
  ): Promise<UserRow | null> {
    const setValues: Record<string, unknown> = { updatedAt: new Date() };

    if (updates.name !== undefined) setValues.name = updates.name;
    if (updates.role !== undefined) setValues.role = updates.role;
    if (updates.departmentId !== undefined) setValues.departmentId = updates.departmentId;
    if (updates.status !== undefined) setValues.status = updates.status;

    const result = await db
      .update(users)
      .set(setValues)
      .where(eq(users.userId, userId))
      .returning();

    return (result[0] as UserRow) ?? null;
  },
};
