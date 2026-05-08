import ExcelJS from 'exceljs';
import { kpiRepository } from '@/db/repositories/kpiRepository';
import { parameterRepository } from '@/db/repositories/parameterRepository';
import { AppError, ErrorCode } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { MAX_IMPORT_FILE_SIZE } from '@/schemas/kpiImport';
import type {
  ImportPreviewRow,
  ImportPreviewResponse,
  ImportConfirmRow,
  AvailableParameter,
} from '@/schemas/kpiImport';

/** Normalized column header names to expected field keys */
const COLUMN_ALIASES: Record<string, string> = {
  // Parameter code aliases
  parameter_code: 'paramCode',
  param_code: 'paramCode',
  parametercode: 'paramCode',
  paramcode: 'paramCode',
  code: 'paramCode',
  kpi_code: 'paramCode',
  kpicode: 'paramCode',
  // Parameter name aliases
  parameter_name: 'paramName',
  param_name: 'paramName',
  parametername: 'paramName',
  paramname: 'paramName',
  name: 'paramName',
  kpi_name: 'paramName',
  kpiname: 'paramName',
  indicator: 'paramName',
  metric: 'paramName',
  // Value aliases
  value: 'value',
  amount: 'value',
  data: 'value',
  result: 'value',
  // Unit aliases
  unit: 'unit',
  uom: 'unit',
  unit_of_measure: 'unit',
};

interface ParsedRow {
  rowIndex: number;
  paramCode: string | null;
  paramName: string | null;
  rawValue: string | null;
  rawUnit: string | null;
}

interface ParameterMatch {
  paramId: string;
  code: string;
  name: string;
  unit: string;
  dataType: string;
}

/**
 * Extracts a usable string value from an ExcelJS cell, handling
 * formula results, rich text, hyperlinks, dates, and error cells.
 */
function extractCellValue(cellValue: ExcelJS.CellValue): string | null {
  if (cellValue === null || cellValue === undefined) return null;

  // Date instances → ISO string
  if (cellValue instanceof Date) {
    return cellValue.toISOString();
  }

  // Primitive types
  if (typeof cellValue === 'string' || typeof cellValue === 'number' || typeof cellValue === 'boolean') {
    return String(cellValue);
  }

  if (typeof cellValue !== 'object') return null;

  // ExcelJS rich text: { richText: [{ text: string }] }
  if ('richText' in cellValue && Array.isArray((cellValue as { richText: unknown[] }).richText)) {
    return (cellValue as { richText: Array<{ text: string }> }).richText
      .map((rt) => rt.text)
      .join('');
  }

  // ExcelJS formula: { formula: string, result?: CellValue }
  if ('formula' in cellValue) {
    const formulaCell = cellValue as { formula: string; result?: ExcelJS.CellValue };
    if (formulaCell.result !== null && formulaCell.result !== undefined) {
      return extractCellValue(formulaCell.result);
    }
    return null;
  }

  // ExcelJS hyperlink: { text?: string, hyperlink: string }
  if ('hyperlink' in cellValue) {
    const hyperlinkCell = cellValue as { text?: string; hyperlink: string };
    return hyperlinkCell.text ?? hyperlinkCell.hyperlink;
  }

  // ExcelJS error cells — no usable value
  if ('error' in cellValue) {
    return null;
  }

  // Fallback — avoid [object Object]
  const str = String(cellValue);
  return str === '[object Object]' ? null : str;
}

/**
 * Parses an Excel file buffer and extracts rows with parameter code/name and value.
 * Returns an array of parsed rows ready for matching.
 */
async function parseExcelFile(buffer: Buffer): Promise<ParsedRow[]> {
  const workbook = new ExcelJS.Workbook();
  // @ts-expect-error -- Buffer generic type mismatch between Node 22 types and ExcelJS types
  await workbook.xlsx.load(buffer);

  // Use the first worksheet
  const worksheet = workbook.worksheets[0];
  if (!worksheet || worksheet.rowCount < 2) {
    throw new AppError(
      ErrorCode.VALIDATION_ERROR,
      'Excel file is empty or has no data rows. Expected a header row and at least one data row.',
      400
    );
  }

  // Parse header row — map column indices to field keys
  const headerRow = worksheet.getRow(1);
  const columnMap = new Map<number, string>();

  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const headerText = String(cell.value ?? '')
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, '_');
    const fieldKey = COLUMN_ALIASES[headerText];
    if (fieldKey) {
      columnMap.set(colNumber, fieldKey);
    }
  });

  // Validate required columns
  const mappedFields = new Set(columnMap.values());
  const hasCodeOrName = mappedFields.has('paramCode') || mappedFields.has('paramName');
  const hasValue = mappedFields.has('value');

  if (!hasCodeOrName) {
    throw new AppError(
      ErrorCode.VALIDATION_ERROR,
      'Excel file must have a column for parameter identification (e.g., "parameter_code", "code", "parameter_name", "name")',
      400,
      { columns: ['Missing parameter_code or parameter_name column'] }
    );
  }
  if (!hasValue) {
    throw new AppError(
      ErrorCode.VALIDATION_ERROR,
      'Excel file must have a "value" column',
      400,
      { columns: ['Missing value column'] }
    );
  }

  // Parse data rows
  const rows: ParsedRow[] = [];
  const lastRow = worksheet.rowCount;

  for (let rowNum = 2; rowNum <= lastRow; rowNum++) {
    const row = worksheet.getRow(rowNum);
    const fields: Record<string, string | null> = {
      paramCode: null,
      paramName: null,
      value: null,
      unit: null,
    };

    let hasAnyValue = false;
    columnMap.forEach((fieldKey, colNumber) => {
      const cell = row.getCell(colNumber);
      const extracted = extractCellValue(cell.value);
      if (extracted !== null && extracted.trim() !== '') {
        fields[fieldKey] = extracted.trim();
        hasAnyValue = true;
      }
    });

    // Skip completely empty rows
    if (!hasAnyValue) continue;

    rows.push({
      rowIndex: rowNum,
      paramCode: fields.paramCode,
      paramName: fields.paramName,
      rawValue: fields.value,
      rawUnit: fields.unit,
    });
  }

  if (rows.length === 0) {
    throw new AppError(
      ErrorCode.VALIDATION_ERROR,
      'Excel file contains no data rows',
      400
    );
  }

  return rows;
}

/**
 * Loads all active parameters (platform defaults merged with tenant overrides)
 * for matching purposes. Returns lookup maps and a flat list for manual mapping.
 */
async function loadParameterIndex(
  tenantId: string
): Promise<{
  byCode: Map<string, ParameterMatch>;
  byName: Map<string, ParameterMatch>;
  all: AvailableParameter[];
}> {
  const params = await parameterRepository.findAllForMatching(tenantId);

  const byCode = new Map<string, ParameterMatch>();
  const byName = new Map<string, ParameterMatch>();
  const all: AvailableParameter[] = [];

  for (const p of params) {
    const match: ParameterMatch = {
      paramId: p.paramId,
      code: p.code,
      name: p.name,
      unit: p.unit,
      dataType: p.dataType,
    };
    byCode.set(p.code.toLowerCase(), match);
    byName.set(p.name.toLowerCase(), match);
    all.push({ paramId: p.paramId, code: p.code, name: p.name });
  }

  return { byCode, byName, all };
}

export const excelImportService = {
  /**
   * Parses an uploaded Excel file and returns a preview of matched/unmatched rows.
   * Does NOT insert any data — this is read-only.
   */
  async preview(
    tenantId: string,
    nodeId: string,
    periodId: string,
    file: { name: string; type: string; size: number; buffer: Buffer }
  ): Promise<ImportPreviewResponse> {
    // Validate file
    if (file.size > MAX_IMPORT_FILE_SIZE) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        `File size exceeds ${MAX_IMPORT_FILE_SIZE / (1024 * 1024)} MB limit`,
        400
      );
    }

    if (file.type !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Only .xlsx files are accepted',
        400
      );
    }

    // Parse Excel
    const parsedRows = await parseExcelFile(file.buffer);

    // Load parameter index for matching
    const paramIndex = await loadParameterIndex(tenantId);

    // Match rows to parameters and check for duplicates
    const previewRows: ImportPreviewRow[] = [];
    let matchedCount = 0;
    let unmatchedCount = 0;
    let duplicateCount = 0;

    for (const row of parsedRows) {
      // Try to match: code first, then name
      let matched: ParameterMatch | undefined;

      if (row.paramCode) {
        matched = paramIndex.byCode.get(row.paramCode.toLowerCase());
      }
      if (!matched && row.paramName) {
        matched = paramIndex.byName.get(row.paramName.toLowerCase());
      }

      if (!matched) {
        unmatchedCount++;
        previewRows.push({
          rowIndex: row.rowIndex,
          paramCode: row.paramCode,
          paramName: row.paramName,
          rawValue: row.rawValue,
          rawUnit: row.rawUnit,
          status: 'unmatched',
          error: 'No matching parameter found',
        });
        continue;
      }

      // Check for value validity
      if (row.rawValue === null || row.rawValue === '') {
        unmatchedCount++;
        previewRows.push({
          rowIndex: row.rowIndex,
          paramCode: row.paramCode,
          paramName: row.paramName,
          rawValue: row.rawValue,
          rawUnit: row.rawUnit,
          status: 'unmatched',
          error: 'No value provided',
          paramId: matched.paramId,
          matchedParamCode: matched.code,
          matchedParamName: matched.name,
        });
        continue;
      }

      // Check for duplicate (existing value for same param+node+period)
      const existing = await kpiRepository.findByParamNodePeriod(
        tenantId,
        matched.paramId,
        nodeId,
        periodId
      );

      if (existing) {
        duplicateCount++;
        previewRows.push({
          rowIndex: row.rowIndex,
          paramCode: row.paramCode,
          paramName: row.paramName,
          rawValue: row.rawValue,
          rawUnit: row.rawUnit,
          status: 'duplicate',
          error: `Value already exists (current: ${existing.value ?? existing.valueText ?? 'N/A'})`,
          paramId: matched.paramId,
          matchedParamCode: matched.code,
          matchedParamName: matched.name,
          matchedUnit: matched.unit,
          matchedDataType: matched.dataType,
        });
        continue;
      }

      matchedCount++;
      previewRows.push({
        rowIndex: row.rowIndex,
        paramCode: row.paramCode,
        paramName: row.paramName,
        rawValue: row.rawValue,
        rawUnit: row.rawUnit,
        status: 'matched',
        paramId: matched.paramId,
        matchedParamCode: matched.code,
        matchedParamName: matched.name,
        matchedUnit: matched.unit,
        matchedDataType: matched.dataType,
      });
    }

    return {
      rows: previewRows,
      summary: {
        totalRows: previewRows.length,
        matchedRows: matchedCount,
        unmatchedRows: unmatchedCount,
        duplicateRows: duplicateCount,
      },
      filename: file.name,
      availableParameters: paramIndex.all,
    };
  },

  /**
   * Confirms the import by inserting selected rows as kpi_values.
   * Each row is individually inserted and audit-logged.
   * Returns success/error counts.
   */
  async confirm(
    tenantId: string,
    userId: string,
    nodeId: string,
    periodId: string,
    filename: string,
    rows: ImportConfirmRow[]
  ): Promise<{
    imported: number;
    failed: number;
    results: Array<{
      rowIndex: number;
      status: 'success' | 'error';
      valueId?: string;
      error?: string;
    }>;
  }> {
    let imported = 0;
    let failed = 0;
    const results: Array<{
      rowIndex: number;
      status: 'success' | 'error';
      valueId?: string;
      error?: string;
    }> = [];

    for (const row of rows) {
      try {
        const isNumeric = row.value !== undefined && row.value !== '';
        const created = await kpiRepository.insert(tenantId, {
          paramId: row.paramId,
          nodeId,
          periodId,
          value: isNumeric ? row.value : undefined,
          valueText: !isNumeric ? row.valueText : undefined,
          unit: row.unit,
          sourceType: 'import',
          sourceRef: filename,
          notApplicable: false,
        });

        imported++;
        results.push({
          rowIndex: row.rowIndex,
          status: 'success',
          valueId: created.valueId,
        });
      } catch (err: unknown) {
        const pgError = err as { code?: string };
        const errorMessage =
          pgError.code === '23505'
            ? 'Duplicate value already exists'
            : err instanceof Error
              ? err.message
              : 'Unknown error';

        failed++;
        results.push({
          rowIndex: row.rowIndex,
          status: 'error',
          error: errorMessage,
        });

        logger.warn('Excel import row failed', {
          rowIndex: row.rowIndex,
          paramId: row.paramId,
          error: errorMessage,
        });
      }
    }

    logger.info('Excel import completed', {
      filename,
      totalRows: rows.length,
      imported,
      failed,
    });

    return { imported, failed, results };
  },
};
