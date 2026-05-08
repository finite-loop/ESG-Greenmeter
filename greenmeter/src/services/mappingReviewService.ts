import { mappingReviewRepository, type FlaggedMetricRow, type ExtractionSummary } from '@/db/repositories/mappingReviewRepository';
import { AppError, ErrorCode } from '@/lib/errors';
import { logger } from '@/lib/logger';

export type MappingAction = 'confirm' | 'reassign' | 'reject';

export interface MappingDecisionInput {
  metricId: string;
  action: MappingAction;
  /** Required for reassign — the new paramId to map to */
  paramId?: string;
}

export interface MappingDecisionResult {
  metricId: string;
  action: MappingAction;
  mappingStatus: string;
  paramId: string | null;
  aliasCreated: boolean;
}

export const mappingReviewService = {
  /**
   * Lists flagged metrics for review for a given extraction.
   */
  async listFlaggedMetrics(extractionId: string): Promise<FlaggedMetricRow[]> {
    const extraction = await mappingReviewRepository.findExtraction(extractionId);
    if (!extraction) {
      throw new AppError(ErrorCode.NOT_FOUND, `Extraction ${extractionId} not found`, 404);
    }

    return mappingReviewRepository.findFlaggedMetrics(extractionId);
  },

  /**
   * Finds the most recent extraction for a document.
   */
  async findExtractionByDocId(docId: string): Promise<ExtractionSummary> {
    const extraction = await mappingReviewRepository.findExtractionByDocId(docId);
    if (!extraction) {
      throw new AppError(ErrorCode.NOT_FOUND, 'No extraction found for this document', 404);
    }
    return extraction;
  },

  /**
   * Processes a single mapping decision (confirm, reassign, or reject).
   * All DB writes are wrapped in a transaction to prevent partial failures.
   *
   * - Confirm: Sets status=manual_mapped, creates alias, creates peer_kpi_values
   * - Reassign: Deletes old peer_kpi_values, maps to new param, creates alias + new peer_kpi_values
   * - Reject: Sets status=rejected, preserves suggested paramId, keeps existing peer_kpi_values
   */
  async processDecision(
    userId: string,
    extractionId: string,
    decision: MappingDecisionInput
  ): Promise<MappingDecisionResult> {
    const metric = await mappingReviewRepository.findMetricById(decision.metricId);
    if (!metric) {
      throw new AppError(ErrorCode.NOT_FOUND, `Metric ${decision.metricId} not found`, 404);
    }

    // Validate the metric belongs to the specified extraction
    if (metric.extractionId !== extractionId) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Metric does not belong to the specified extraction',
        400
      );
    }

    const now = new Date();

    switch (decision.action) {
      case 'confirm': {
        if (!metric.paramId) {
          throw new AppError(
            ErrorCode.VALIDATION_ERROR,
            'Cannot confirm a metric that has no suggested mapping. Use reassign instead.',
            400
          );
        }

        const paramId = metric.paramId;
        let aliasCreated = false;

        await mappingReviewRepository.db.transaction(async (tx) => {
          await mappingReviewRepository.updateMetricMapping(metric.metricId, {
            paramId,
            mappingStatus: 'manual_mapped',
            mappingMethod: 'manual',
            mappedBy: userId,
            mappedAt: now,
            mappingConfidence: '100',
          }, tx);

          aliasCreated = await mappingReviewRepository.insertAlias(
            paramId, metric.metricName, metric.standard, tx
          );

          await this._createPeerKpiValue(metric, paramId, tx);
          await mappingReviewRepository.updateExtractionMappedCount(metric.extractionId, tx);
        });

        logger.info('Mapping confirmed', {
          metricId: metric.metricId,
          paramId,
          metricName: metric.metricName,
        });

        return {
          metricId: metric.metricId,
          action: 'confirm',
          mappingStatus: 'manual_mapped',
          paramId,
          aliasCreated,
        };
      }

      case 'reassign': {
        if (!decision.paramId) {
          throw new AppError(
            ErrorCode.VALIDATION_ERROR,
            'paramId is required for reassign action',
            400
          );
        }

        const newParamId = decision.paramId;
        let aliasCreated = false;

        await mappingReviewRepository.db.transaction(async (tx) => {
          // Delete old peer_kpi_values for this metric before inserting new
          await mappingReviewRepository.deletePeerKpiValueByMetric(metric.metricId, tx);

          await mappingReviewRepository.updateMetricMapping(metric.metricId, {
            paramId: newParamId,
            mappingStatus: 'manual_mapped',
            mappingMethod: 'manual',
            mappedBy: userId,
            mappedAt: now,
            mappingConfidence: '100',
          }, tx);

          aliasCreated = await mappingReviewRepository.insertAlias(
            newParamId, metric.metricName, metric.standard, tx
          );

          await this._createPeerKpiValue(metric, newParamId, tx);
          await mappingReviewRepository.updateExtractionMappedCount(metric.extractionId, tx);
        });

        logger.info('Mapping reassigned', {
          metricId: metric.metricId,
          oldParamId: metric.paramId,
          newParamId,
          metricName: metric.metricName,
        });

        return {
          metricId: metric.metricId,
          action: 'reassign',
          mappingStatus: 'manual_mapped',
          paramId: newParamId,
          aliasCreated,
        };
      }

      case 'reject': {
        // Reject preserves the suggested paramId — only changes status
        await mappingReviewRepository.updateMetricMapping(metric.metricId, {
          mappingStatus: 'rejected',
          mappingMethod: 'manual',
          mappedBy: userId,
          mappedAt: now,
          mappingConfidence: '0',
        });

        logger.info('Mapping rejected', {
          metricId: metric.metricId,
          metricName: metric.metricName,
        });

        return {
          metricId: metric.metricId,
          action: 'reject',
          mappingStatus: 'rejected',
          paramId: metric.paramId,
          aliasCreated: false,
        };
      }

      default:
        throw new AppError(
          ErrorCode.VALIDATION_ERROR,
          `Unknown action: ${decision.action as string}`,
          400
        );
    }
  },

  /**
   * Creates a peer_kpi_values entry for a confirmed/reassigned mapping.
   * Looks up the extraction -> document -> peerId chain.
   */
  async _createPeerKpiValue(
    metric: {
      metricId: string;
      extractionId: string;
      tenantId: string;
      standard: string;
      parsedValue: string | null;
      unit: string | null;
    },
    paramId: string,
    tx?: Parameters<Parameters<typeof mappingReviewRepository.db.transaction>[0]>[0]
  ): Promise<void> {
    const extraction = await mappingReviewRepository.findExtraction(metric.extractionId);
    if (!extraction) {
      logger.warn('Skipping peer_kpi_values creation — extraction not found', {
        extractionId: metric.extractionId,
        metricId: metric.metricId,
      });
      return;
    }

    let peerId: string | null = null;
    if (extraction.docId) {
      peerId = await mappingReviewRepository.findPeerIdByDocId(extraction.docId);
    }
    if (!peerId) {
      logger.warn('Skipping peer_kpi_values creation — peerId not found', {
        docId: extraction.docId,
        metricId: metric.metricId,
      });
      return;
    }

    const canonicalId = await mappingReviewRepository.findCanonicalId(paramId);

    await mappingReviewRepository.upsertPeerKpiValue({
      tenantId: metric.tenantId,
      peerId,
      paramId,
      canonicalId,
      fiscalYear: extraction.fiscalYear,
      value: metric.parsedValue,
      unit: metric.unit,
      sourceExtractionId: metric.extractionId,
      sourceMetricId: metric.metricId,
      confidence: '100',
    }, tx as typeof mappingReviewRepository.db | undefined);
  },
};
