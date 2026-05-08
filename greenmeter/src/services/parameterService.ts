import { parameterRepository } from '@/db/repositories/parameterRepository';
import { AppError, ErrorCode } from '@/lib/errors';
import type { ParameterListFilter, ParameterOverride } from '@/schemas/parameters';
import type { ParameterRow } from '@/db/repositories/parameterRepository';

export const parameterService = {
  async list(
    tenantId: string,
    filters: ParameterListFilter
  ): Promise<{ data: ParameterRow[]; meta: { page: number; pageSize: number; total: number } }> {
    const result = await parameterRepository.findAll(tenantId, filters);

    return {
      data: result.data,
      meta: {
        page: filters.page,
        pageSize: filters.pageSize,
        total: result.total,
      },
    };
  },

  async getById(
    paramId: string,
    tenantId: string
  ): Promise<ParameterRow> {
    const param = await parameterRepository.findById(paramId, tenantId);

    if (!param) {
      throw new AppError(
        ErrorCode.NOT_FOUND,
        'Parameter not found',
        404
      );
    }

    return param;
  },

  async overrideParameter(
    tenantId: string,
    platformParamId: string,
    input: ParameterOverride
  ): Promise<{ data: ParameterRow; isNew: boolean; oldValue: ParameterRow }> {
    // Capture the current state before override (for audit)
    const oldValue = await this.getById(platformParamId, tenantId);

    const overrideData: Record<string, unknown> = {};
    if (input.name !== undefined) overrideData.name = input.name;
    if (input.description !== undefined) overrideData.description = input.description;
    if (input.unit !== undefined) overrideData.unit = input.unit;
    if (input.category !== undefined) overrideData.category = input.category;
    if (input.direction !== undefined) overrideData.direction = input.direction;
    if (input.rollupMethod !== undefined) overrideData.rollupMethod = input.rollupMethod;
    if (input.howToMeasure !== undefined) overrideData.howToMeasure = input.howToMeasure;
    if (input.howToCompute !== undefined) overrideData.howToCompute = input.howToCompute;
    if (input.howToReport !== undefined) overrideData.howToReport = input.howToReport;
    if (input.depts !== undefined) overrideData.depts = input.depts;
    if (input.status !== undefined) overrideData.status = input.status;

    const { overrideRow, isNew } = await parameterRepository.upsertOverride(
      tenantId,
      platformParamId,
      overrideData
    );

    return { data: overrideRow, isNew, oldValue };
  },

  async getCategories(): Promise<string[]> {
    return parameterRepository.findDistinctCategories();
  },
};
