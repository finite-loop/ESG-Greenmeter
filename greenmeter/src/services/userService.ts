import { userRepository } from '@/db/repositories/userRepository';
import { AppError, ErrorCode } from '@/lib/errors';
import type { UserInvite, UserUpdate, UserListFilter } from '@/schemas/users';
import type { UserRow } from '@/db/repositories/userRepository';

export const userService = {
  async list(
    filters: UserListFilter
  ): Promise<{ data: UserRow[]; meta: { page: number; pageSize: number; total: number } }> {
    const result = await userRepository.findAllByTenant(filters);

    return {
      data: result.data,
      meta: {
        page: filters.page,
        pageSize: filters.pageSize,
        total: result.total,
      },
    };
  },

  async getById(userId: string): Promise<UserRow> {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new AppError(
        ErrorCode.NOT_FOUND,
        'User not found',
        404
      );
    }

    return user;
  },

  async invite(tenantId: string, input: UserInvite): Promise<UserRow> {
    const existing = await userRepository.findByEmail(input.email);

    if (existing) {
      throw new AppError(
        ErrorCode.DUPLICATE_ENTRY,
        'Unable to invite user. The email may already be in use.',
        409
      );
    }

    return userRepository.create({
      tenantId,
      email: input.email,
      name: input.name,
      role: input.role,
      departmentId: input.departmentId ?? null,
      status: 'invited',
    });
  },

  async update(userId: string, input: UserUpdate, currentUserId: string): Promise<UserRow> {
    if (userId === currentUserId) {
      throw new AppError(
        ErrorCode.FORBIDDEN,
        'You cannot modify your own account',
        403
      );
    }

    const existing = await userRepository.findById(userId);

    if (!existing) {
      throw new AppError(
        ErrorCode.NOT_FOUND,
        'User not found',
        404
      );
    }

    const updates: Record<string, unknown> = {};
    if (input.name !== undefined) updates.name = input.name;
    if (input.role !== undefined) updates.role = input.role;
    if (input.departmentId !== undefined) updates.departmentId = input.departmentId;
    if (input.active !== undefined) {
      updates.status = input.active ? 'active' : 'deactivated';
    }

    // Last-admin protection: block if this change would remove the last active admin
    const wouldLoseAdmin =
      (existing.role === 'admin' && existing.status === 'active') &&
      (updates.role !== undefined && updates.role !== 'admin' ||
       updates.status === 'deactivated');

    if (wouldLoseAdmin) {
      const adminCount = await userRepository.countActiveAdmins();
      if (adminCount <= 1) {
        throw new AppError(
          ErrorCode.FORBIDDEN,
          'Cannot remove the last active administrator. At least one admin must remain.',
          403
        );
      }
    }

    const updated = await userRepository.update(userId, updates);

    if (!updated) {
      throw new AppError(
        ErrorCode.PROCESSING_ERROR,
        'Failed to update user',
        500
      );
    }

    return updated;
  },
};
