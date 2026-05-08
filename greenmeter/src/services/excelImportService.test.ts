import { describe, it, expect, vi, beforeEach } from 'vitest';
import ExcelJS from 'exceljs';

// Mock parameter repository
const mockFindAllForMatching = vi.fn();
vi.mock('@/db/repositories/parameterRepository', () => ({
  parameterRepository: {
    findAllForMatching: (...args: unknown[]) => mockFindAllForMatching(...args),
  },
}));

// Mock kpi repository
const mockFindByParamNodePeriod = vi.fn();
const mockInsert = vi.fn();
vi.mock('@/db/repositories/kpiRepository', () => ({
  kpiRepository: {
    findByParamNodePeriod: (...args: unknown[]) => mockFindByParamNodePeriod(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
  },
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { excelImportService } from './excelImportService';

/**
 * Helper: creates a valid .xlsx buffer with the given headers and rows.
 */
async function createExcelBuffer(
  headers: string[],
  rows: (string | number | null)[][]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('KPI Data');

  sheet.addRow(headers);
  for (const row of rows) {
    sheet.addRow(row);
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

/** Parameters returned by parameterRepository.findAllForMatching */
const MOCK_PARAMS = [
  {
    paramId: 'param-001',
    tenantId: null,
    canonicalId: null,
    standard: 'BRSR',
    standardSection: 'E',
    standardCode: null,
    disclosure: null,
    code: 'BRSR_E_001',
    name: 'Total Energy Consumption',
    description: null,
    pillar: 'E',
    unit: 'MWh',
    dataType: 'numeric',
    category: null,
    indicatorType: null,
    computationMethod: null,
    howToMeasure: null,
    howToCompute: null,
    howToReport: null,
    direction: null,
    rollupMethod: null,
    status: 'active',
    src: null,
    depts: null,
    standards: null,
    priorityOrder: null,
    createdAt: null,
    overrideParamId: null,
  },
  {
    paramId: 'param-002',
    tenantId: null,
    canonicalId: null,
    standard: 'BRSR',
    standardSection: 'E',
    standardCode: null,
    disclosure: null,
    code: 'BRSR_E_002',
    name: 'GHG Emissions',
    description: null,
    pillar: 'E',
    unit: 'tCO2e',
    dataType: 'numeric',
    category: null,
    indicatorType: null,
    computationMethod: null,
    howToMeasure: null,
    howToCompute: null,
    howToReport: null,
    direction: null,
    rollupMethod: null,
    status: 'active',
    src: null,
    depts: null,
    standards: null,
    priorityOrder: null,
    createdAt: null,
    overrideParamId: null,
  },
];

describe('excelImportService.preview', () => {
  const tenantId = 'tenant-123';
  const nodeId = 'node-456';
  const periodId = 'period-789';

  beforeEach(() => {
    vi.clearAllMocks();
    mockFindByParamNodePeriod.mockResolvedValue(null);
    mockFindAllForMatching.mockResolvedValue(MOCK_PARAMS);
  });

  it('rejects file exceeding size limit', async () => {
    const buffer = Buffer.alloc(11 * 1024 * 1024); // 11MB
    await expect(
      excelImportService.preview(tenantId, nodeId, periodId, {
        name: 'test.xlsx',
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: buffer.length,
        buffer,
      })
    ).rejects.toThrow(/exceeds.*MB limit/);
  });

  it('rejects non-xlsx file type', async () => {
    const buffer = await createExcelBuffer(['code', 'value'], [['X', '100']]);
    await expect(
      excelImportService.preview(tenantId, nodeId, periodId, {
        name: 'test.csv',
        type: 'text/csv',
        size: buffer.length,
        buffer,
      })
    ).rejects.toThrow(/Only .xlsx files/);
  });

  it('rejects Excel missing required columns', async () => {
    const buffer = await createExcelBuffer(['foo', 'bar'], [['a', 'b']]);
    await expect(
      excelImportService.preview(tenantId, nodeId, periodId, {
        name: 'test.xlsx',
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: buffer.length,
        buffer,
      })
    ).rejects.toThrow(/parameter identification/);
  });

  it('rejects Excel missing value column', async () => {
    const buffer = await createExcelBuffer(['parameter_code'], [['BRSR_E_001']]);
    await expect(
      excelImportService.preview(tenantId, nodeId, periodId, {
        name: 'test.xlsx',
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: buffer.length,
        buffer,
      })
    ).rejects.toThrow(/value.*column/);
  });

  it('matches rows by parameter code', async () => {
    const buffer = await createExcelBuffer(
      ['parameter_code', 'value', 'unit'],
      [['BRSR_E_001', '1250.5', 'MWh']]
    );

    const result = await excelImportService.preview(tenantId, nodeId, periodId, {
      name: 'test.xlsx',
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: buffer.length,
      buffer,
    });

    expect(result.summary.totalRows).toBe(1);
    expect(result.summary.matchedRows).toBe(1);
    expect(result.rows[0].status).toBe('matched');
    expect(result.rows[0].paramId).toBe('param-001');
    expect(result.rows[0].matchedParamCode).toBe('BRSR_E_001');
  });

  it('matches rows by parameter name (case-insensitive)', async () => {
    const buffer = await createExcelBuffer(
      ['parameter_name', 'value'],
      [['total energy consumption', '500']]
    );

    const result = await excelImportService.preview(tenantId, nodeId, periodId, {
      name: 'test.xlsx',
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: buffer.length,
      buffer,
    });

    expect(result.summary.matchedRows).toBe(1);
    expect(result.rows[0].status).toBe('matched');
    expect(result.rows[0].paramId).toBe('param-001');
  });

  it('marks unmatched rows correctly', async () => {
    const buffer = await createExcelBuffer(
      ['parameter_code', 'value'],
      [['UNKNOWN_CODE', '100']]
    );

    const result = await excelImportService.preview(tenantId, nodeId, periodId, {
      name: 'test.xlsx',
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: buffer.length,
      buffer,
    });

    expect(result.summary.unmatchedRows).toBe(1);
    expect(result.rows[0].status).toBe('unmatched');
    expect(result.rows[0].error).toContain('No matching parameter');
  });

  it('detects duplicate rows', async () => {
    mockFindByParamNodePeriod.mockResolvedValue({
      valueId: 'existing-value',
      value: '999',
    });

    const buffer = await createExcelBuffer(
      ['parameter_code', 'value'],
      [['BRSR_E_001', '1250.5']]
    );

    const result = await excelImportService.preview(tenantId, nodeId, periodId, {
      name: 'test.xlsx',
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: buffer.length,
      buffer,
    });

    expect(result.summary.duplicateRows).toBe(1);
    expect(result.rows[0].status).toBe('duplicate');
    expect(result.rows[0].error).toContain('already exists');
  });

  it('handles mixed matched, unmatched, and duplicate rows', async () => {
    mockFindByParamNodePeriod
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ valueId: 'existing', value: '50' });

    const buffer = await createExcelBuffer(
      ['parameter_code', 'value'],
      [
        ['BRSR_E_001', '100'],
        ['BRSR_E_002', '200'],
        ['UNKNOWN', '300'],
      ]
    );

    const result = await excelImportService.preview(tenantId, nodeId, periodId, {
      name: 'test.xlsx',
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: buffer.length,
      buffer,
    });

    expect(result.summary.totalRows).toBe(3);
    expect(result.summary.matchedRows).toBe(1);
    expect(result.summary.duplicateRows).toBe(1);
    expect(result.summary.unmatchedRows).toBe(1);
  });

  it('skips empty rows', async () => {
    const buffer = await createExcelBuffer(
      ['parameter_code', 'value'],
      [
        ['BRSR_E_001', '100'],
        [null, null],
        ['BRSR_E_002', '200'],
      ]
    );

    const result = await excelImportService.preview(tenantId, nodeId, periodId, {
      name: 'test.xlsx',
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: buffer.length,
      buffer,
    });

    expect(result.summary.totalRows).toBe(2);
  });

  it('returns the filename in the response', async () => {
    const buffer = await createExcelBuffer(
      ['parameter_code', 'value'],
      [['BRSR_E_001', '100']]
    );

    const result = await excelImportService.preview(tenantId, nodeId, periodId, {
      name: 'my-data.xlsx',
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: buffer.length,
      buffer,
    });

    expect(result.filename).toBe('my-data.xlsx');
  });
});

describe('excelImportService.confirm', () => {
  const tenantId = 'tenant-123';
  const userId = 'user-456';
  const nodeId = 'node-789';
  const periodId = 'period-abc';
  const filename = 'import.xlsx';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inserts matched rows and returns success counts', async () => {
    mockInsert.mockResolvedValue({
      valueId: 'new-value-1',
      tenantId,
      paramId: 'param-001',
      nodeId,
      periodId,
      value: '100',
    });

    const result = await excelImportService.confirm(tenantId, userId, nodeId, periodId, filename, [
      { rowIndex: 2, paramId: 'param-001', value: '100', unit: 'MWh' },
    ]);

    expect(result.imported).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.results[0].status).toBe('success');
    expect(result.results[0].valueId).toBe('new-value-1');
    expect(mockInsert).toHaveBeenCalledWith(tenantId, expect.objectContaining({
      paramId: 'param-001',
      nodeId,
      periodId,
      value: '100',
      sourceType: 'import',
      sourceRef: filename,
    }));
  });

  it('handles insertion errors gracefully', async () => {
    mockInsert.mockRejectedValue({ code: '23505', message: 'unique_violation' });

    const result = await excelImportService.confirm(tenantId, userId, nodeId, periodId, filename, [
      { rowIndex: 2, paramId: 'param-001', value: '100' },
    ]);

    expect(result.imported).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.results[0].status).toBe('error');
    expect(result.results[0].error).toContain('Duplicate');
  });

  it('processes multiple rows independently', async () => {
    mockInsert
      .mockResolvedValueOnce({ valueId: 'v1' })
      .mockRejectedValueOnce(new Error('DB error'))
      .mockResolvedValueOnce({ valueId: 'v3' });

    const result = await excelImportService.confirm(tenantId, userId, nodeId, periodId, filename, [
      { rowIndex: 2, paramId: 'param-001', value: '100' },
      { rowIndex: 3, paramId: 'param-002', value: '200' },
      { rowIndex: 4, paramId: 'param-003', value: '300' },
    ]);

    expect(result.imported).toBe(2);
    expect(result.failed).toBe(1);
    expect(result.results).toHaveLength(3);
  });

  it('passes sourceType=import and sourceRef=filename to repository', async () => {
    mockInsert.mockResolvedValue({ valueId: 'v1' });

    await excelImportService.confirm(tenantId, userId, nodeId, periodId, 'data.xlsx', [
      { rowIndex: 2, paramId: 'param-001', value: '42' },
    ]);

    expect(mockInsert).toHaveBeenCalledWith(
      tenantId,
      expect.objectContaining({
        sourceType: 'import',
        sourceRef: 'data.xlsx',
      })
    );
  });
});
