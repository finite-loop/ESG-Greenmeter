import { describe, it, expect } from 'vitest';
import { userInviteSchema, userUpdateSchema, userListFilterSchema } from './users';

describe('users schemas', () => {
  describe('userInviteSchema', () => {
    it('accepts valid invite', () => {
      const result = userInviteSchema.safeParse({
        email: 'user@example.com',
        name: 'Jane Doe',
        role: 'analyst',
      });
      expect(result.success).toBe(true);
    });

    it('requires email and name', () => {
      const result = userInviteSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('rejects invalid email', () => {
      const result = userInviteSchema.safeParse({
        email: 'not-an-email',
        name: 'Test',
      });
      expect(result.success).toBe(false);
    });

    it('defaults role to viewer', () => {
      const result = userInviteSchema.parse({
        email: 'user@example.com',
        name: 'New User',
      });
      expect(result.role).toBe('viewer');
    });

    it('accepts all valid non-department roles without departmentId', () => {
      for (const role of ['admin', 'analyst', 'viewer']) {
        const result = userInviteSchema.safeParse({
          email: 'user@example.com',
          name: 'Test',
          role,
        });
        expect(result.success).toBe(true);
      }
    });

    it('rejects invalid role', () => {
      const result = userInviteSchema.safeParse({
        email: 'user@example.com',
        name: 'Test',
        role: 'superadmin',
      });
      expect(result.success).toBe(false);
    });

    it('requires departmentId when role is department', () => {
      const result = userInviteSchema.safeParse({
        email: 'user@example.com',
        name: 'Test',
        role: 'department',
      });
      expect(result.success).toBe(false);
    });

    it('accepts department role with valid departmentId', () => {
      const result = userInviteSchema.safeParse({
        email: 'user@example.com',
        name: 'Test',
        role: 'department',
        departmentId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid departmentId format', () => {
      const result = userInviteSchema.safeParse({
        email: 'user@example.com',
        name: 'Test',
        role: 'department',
        departmentId: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('userUpdateSchema', () => {
    it('accepts partial updates', () => {
      const result = userUpdateSchema.safeParse({ role: 'admin' });
      expect(result.success).toBe(true);
    });

    it('accepts empty object', () => {
      const result = userUpdateSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('accepts active flag', () => {
      const result = userUpdateSchema.safeParse({ active: false });
      expect(result.success).toBe(true);
    });

    it('accepts nullable departmentId', () => {
      const result = userUpdateSchema.safeParse({ departmentId: null });
      expect(result.success).toBe(true);
    });

    it('rejects invalid role', () => {
      const result = userUpdateSchema.safeParse({ role: 'invalid' });
      expect(result.success).toBe(false);
    });
  });

  describe('userListFilterSchema', () => {
    it('accepts empty filter (defaults applied)', () => {
      const result = userListFilterSchema.parse({});
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it('accepts role filter', () => {
      const result = userListFilterSchema.safeParse({ role: 'admin' });
      expect(result.success).toBe(true);
    });

    it('accepts status filter', () => {
      const result = userListFilterSchema.safeParse({ status: 'active' });
      expect(result.success).toBe(true);
    });

    it('accepts search filter', () => {
      const result = userListFilterSchema.safeParse({ search: 'Jane' });
      expect(result.success).toBe(true);
    });

    it('rejects invalid role', () => {
      const result = userListFilterSchema.safeParse({ role: 'superadmin' });
      expect(result.success).toBe(false);
    });

    it('rejects invalid status', () => {
      const result = userListFilterSchema.safeParse({ status: 'pending' });
      expect(result.success).toBe(false);
    });

    it('coerces page and pageSize to numbers', () => {
      const result = userListFilterSchema.parse({ page: '3', pageSize: '10' });
      expect(result.page).toBe(3);
      expect(result.pageSize).toBe(10);
    });
  });
});
