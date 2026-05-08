import { describe, it, expect } from 'vitest';
import {
  goalCreateSchema,
  goalUpdateSchema,
  goalComponentCreateSchema,
  goalListFilterSchema,
  milestoneCreateSchema,
  milestoneUpdateSchema,
} from './goals';

const validUUID = '550e8400-e29b-41d4-a716-446655440000';

describe('goals schemas', () => {
  describe('goalCreateSchema', () => {
    const validGoal = {
      paramId: validUUID,
      name: 'Reduce Scope 1 Emissions',
      targetValue: '100',
      targetYear: '2030',
    };

    it('accepts valid input', () => {
      const result = goalCreateSchema.safeParse(validGoal);
      expect(result.success).toBe(true);
    });

    it('requires name, paramId, targetValue, targetYear', () => {
      const result = goalCreateSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('rejects empty name', () => {
      const result = goalCreateSchema.safeParse({ ...validGoal, name: '' });
      expect(result.success).toBe(false);
    });

    it('rejects non-numeric targetValue', () => {
      const result = goalCreateSchema.safeParse({ ...validGoal, targetValue: 'abc' });
      expect(result.success).toBe(false);
    });

    it('rejects non-numeric baselineValue', () => {
      const result = goalCreateSchema.safeParse({ ...validGoal, baselineValue: 'abc' });
      expect(result.success).toBe(false);
    });

    it('accepts numeric baselineValue', () => {
      const result = goalCreateSchema.safeParse({ ...validGoal, baselineValue: '150.5' });
      expect(result.success).toBe(true);
    });

    it('rejects non-numeric targetYear', () => {
      const result = goalCreateSchema.safeParse({ ...validGoal, targetYear: 'abcd' });
      expect(result.success).toBe(false);
    });

    it('rejects non-4-digit targetYear', () => {
      const result = goalCreateSchema.safeParse({ ...validGoal, targetYear: '25' });
      expect(result.success).toBe(false);
    });

    it('rejects non-numeric baselineYear', () => {
      const result = goalCreateSchema.safeParse({ ...validGoal, baselineYear: 'abcd' });
      expect(result.success).toBe(false);
    });

    it('defaults direction to lower_is_better', () => {
      const result = goalCreateSchema.parse(validGoal);
      expect(result.direction).toBe('lower_is_better');
    });

    it('accepts higher_is_better direction', () => {
      const result = goalCreateSchema.safeParse({ ...validGoal, direction: 'higher_is_better' });
      expect(result.success).toBe(true);
    });
  });

  describe('goalUpdateSchema', () => {
    it('accepts partial update with single field', () => {
      const result = goalUpdateSchema.safeParse({ name: 'Updated Name' });
      expect(result.success).toBe(true);
    });

    it('accepts empty object (all fields optional)', () => {
      const result = goalUpdateSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('rejects invalid targetValue', () => {
      const result = goalUpdateSchema.safeParse({ targetValue: 'not-a-number' });
      expect(result.success).toBe(false);
    });
  });

  describe('goalComponentCreateSchema', () => {
    it('accepts valid component', () => {
      const result = goalComponentCreateSchema.safeParse({
        name: 'Fleet Electrification',
        weight: '0.5',
      });
      expect(result.success).toBe(true);
    });

    it('rejects weight of zero', () => {
      const result = goalComponentCreateSchema.safeParse({
        name: 'Test',
        weight: '0',
      });
      expect(result.success).toBe(false);
    });

    it('rejects weight greater than 1', () => {
      const result = goalComponentCreateSchema.safeParse({
        name: 'Test',
        weight: '1.5',
      });
      expect(result.success).toBe(false);
    });

    it('rejects negative weight', () => {
      const result = goalComponentCreateSchema.safeParse({
        name: 'Test',
        weight: '-0.5',
      });
      expect(result.success).toBe(false);
    });

    it('accepts weight of exactly 1', () => {
      const result = goalComponentCreateSchema.safeParse({
        name: 'Test',
        weight: '1',
      });
      expect(result.success).toBe(true);
    });

    it('rejects non-numeric weight', () => {
      const result = goalComponentCreateSchema.safeParse({
        name: 'Test',
        weight: 'abc',
      });
      expect(result.success).toBe(false);
    });

    it('requires name and weight', () => {
      const result = goalComponentCreateSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('goalListFilterSchema', () => {
    it('defaults page and pageSize', () => {
      const result = goalListFilterSchema.parse({});
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it('accepts valid status filter', () => {
      const result = goalListFilterSchema.safeParse({ status: 'active' });
      expect(result.success).toBe(true);
    });

    it('rejects invalid status', () => {
      const result = goalListFilterSchema.safeParse({ status: 'invalid' });
      expect(result.success).toBe(false);
    });

    it('coerces string page to number', () => {
      const result = goalListFilterSchema.parse({ page: '3', pageSize: '10' });
      expect(result.page).toBe(3);
      expect(result.pageSize).toBe(10);
    });
  });

  describe('milestoneCreateSchema', () => {
    it('accepts valid milestone with all fields', () => {
      const result = milestoneCreateSchema.safeParse({
        name: 'Q1 Checkpoint',
        targetValue: '50',
        targetDate: '2025-03-31',
      });
      expect(result.success).toBe(true);
    });

    it('accepts milestone with only name', () => {
      const result = milestoneCreateSchema.safeParse({
        name: 'Basic Milestone',
      });
      expect(result.success).toBe(true);
    });

    it('requires name', () => {
      const result = milestoneCreateSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('rejects empty name', () => {
      const result = milestoneCreateSchema.safeParse({ name: '' });
      expect(result.success).toBe(false);
    });

    it('rejects name longer than 200 chars', () => {
      const result = milestoneCreateSchema.safeParse({ name: 'a'.repeat(201) });
      expect(result.success).toBe(false);
    });

    it('rejects non-numeric targetValue', () => {
      const result = milestoneCreateSchema.safeParse({ name: 'Test', targetValue: 'abc' });
      expect(result.success).toBe(false);
    });

    it('accepts numeric targetValue', () => {
      const result = milestoneCreateSchema.safeParse({ name: 'Test', targetValue: '150.5' });
      expect(result.success).toBe(true);
    });

    it('defaults sortOrder to 0', () => {
      const result = milestoneCreateSchema.parse({ name: 'Test' });
      expect(result.sortOrder).toBe(0);
    });

    it('accepts description', () => {
      const result = milestoneCreateSchema.safeParse({
        name: 'Test',
        description: 'Some description',
      });
      expect(result.success).toBe(true);
    });

    it('rejects description longer than 1000 chars', () => {
      const result = milestoneCreateSchema.safeParse({
        name: 'Test',
        description: 'a'.repeat(1001),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('milestoneUpdateSchema', () => {
    it('accepts partial update with single field', () => {
      const result = milestoneUpdateSchema.safeParse({ name: 'Updated' });
      expect(result.success).toBe(true);
    });

    it('accepts empty object', () => {
      const result = milestoneUpdateSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('accepts valid status values', () => {
      for (const status of ['pending', 'achieved', 'missed']) {
        const result = milestoneUpdateSchema.safeParse({ status });
        expect(result.success).toBe(true);
      }
    });

    it('rejects invalid status', () => {
      const result = milestoneUpdateSchema.safeParse({ status: 'invalid' });
      expect(result.success).toBe(false);
    });

    it('accepts status and name together', () => {
      const result = milestoneUpdateSchema.safeParse({
        name: 'Updated',
        status: 'achieved',
      });
      expect(result.success).toBe(true);
    });
  });
});
