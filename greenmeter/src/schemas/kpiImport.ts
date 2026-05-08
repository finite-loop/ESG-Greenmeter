import { z } from 'zod';
import { uuidSchema } from './common';

export const MAX_IMPORT_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * Metadata sent along with the Excel file upload for preview parsing.
 */
export const importPreviewMetadataSchema = z.object({
  nodeId: uuidSchema,
  periodId: uuidSchema,
});

/**
 * A single row from the parsed Excel file, returned in the preview response.
 */
export const importPreviewRowSchema = z.object({
  rowIndex: z.number().int(),
  paramCode: z.string().nullable(),
  paramName: z.string().nullable(),
  rawValue: z.string().nullable(),
  rawUnit: z.string().nullable(),
  status: z.enum(['matched', 'unmatched', 'duplicate']),
  error: z.string().optional(),
  paramId: z.string().uuid().optional(),
  matchedParamCode: z.string().optional(),
  matchedParamName: z.string().optional(),
  matchedUnit: z.string().optional(),
  matchedDataType: z.string().optional(),
});

/**
 * An available parameter for manual mapping of unmatched rows.
 */
export const availableParameterSchema = z.object({
  paramId: z.string().uuid(),
  code: z.string(),
  name: z.string(),
});

/**
 * The full preview response shape.
 */
export const importPreviewResponseSchema = z.object({
  rows: z.array(importPreviewRowSchema),
  summary: z.object({
    totalRows: z.number().int(),
    matchedRows: z.number().int(),
    unmatchedRows: z.number().int(),
    duplicateRows: z.number().int(),
  }),
  filename: z.string(),
  availableParameters: z.array(availableParameterSchema).optional(),
});

/**
 * A single row in the confirm request — user selects which rows to import.
 */
export const importConfirmRowSchema = z.object({
  rowIndex: z.number().int(),
  paramId: uuidSchema,
  value: z.string().optional(),
  valueText: z.string().optional(),
  unit: z.string().optional(),
});

/**
 * The confirm import request body.
 */
export const importConfirmSchema = z.object({
  nodeId: uuidSchema,
  periodId: uuidSchema,
  filename: z.string().min(1),
  rows: z.array(importConfirmRowSchema).min(1, 'At least one row must be selected for import'),
});

export type ImportPreviewMetadata = z.infer<typeof importPreviewMetadataSchema>;
export type ImportPreviewRow = z.infer<typeof importPreviewRowSchema>;
export type ImportPreviewResponse = z.infer<typeof importPreviewResponseSchema>;
export type ImportConfirmRow = z.infer<typeof importConfirmRowSchema>;
export type ImportConfirmRequest = z.infer<typeof importConfirmSchema>;
export type AvailableParameter = z.infer<typeof availableParameterSchema>;
