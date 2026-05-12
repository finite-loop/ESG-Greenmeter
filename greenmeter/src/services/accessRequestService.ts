import { hashSync } from 'bcryptjs';
import { accessRequestRepository } from '@/db/repositories/accessRequestRepository';
import { userRepository } from '@/db/repositories/userRepository';
import { AppError, ErrorCode } from '@/lib/errors';
import { logger } from '@/lib/logger';
import type { RegisterRequest, AccessRequestListFilter } from '@/schemas/accessRequests';

export const accessRequestService = {
  async register(input: RegisterRequest) {
    // Check if email already exists as a user
    const existingUser = await userRepository.findByEmail(input.email);
    if (existingUser) {
      throw new AppError(
        ErrorCode.DUPLICATE_ENTRY,
        'An account with this email already exists.',
        409
      );
    }

    // Check for existing pending request
    const existingRequest = await accessRequestRepository.findByEmail(input.email);
    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        throw new AppError(
          ErrorCode.DUPLICATE_ENTRY,
          'A registration request for this email is already pending.',
          409
        );
      }
      // If previously rejected, delete old request and allow re-registration
      if (existingRequest.status === 'rejected') {
        await accessRequestRepository.deleteByEmail(input.email);
      }
      // If approved, email should already be a user (checked above)
    }

    const passwordHash = hashSync(input.password, 10);

    const request = await accessRequestRepository.create({
      fullName: input.fullName,
      email: input.email,
      company: input.company,
      industry: input.industry,
      jobTitle: input.jobTitle,
      passwordHash,
    });

    logger.info('Access request submitted', { email: input.email });
    return request;
  },

  async list(filters: AccessRequestListFilter) {
    return accessRequestRepository.findAll(filters);
  },

  async getById(requestId: string) {
    const request = await accessRequestRepository.findById(requestId);
    if (!request) {
      throw new AppError(ErrorCode.NOT_FOUND, 'Access request not found.', 404);
    }
    return request;
  },

  async review(
    requestId: string,
    input: { action: 'approve' | 'reject'; tenantId?: string; role?: string; reviewNote?: string },
    reviewerId: string
  ) {
    const request = await accessRequestRepository.findById(requestId);
    if (!request) {
      throw new AppError(ErrorCode.NOT_FOUND, 'Access request not found.', 404);
    }
    if (request.status !== 'pending') {
      throw new AppError(
        ErrorCode.CONFLICT,
        `Request has already been ${request.status}.`,
        409
      );
    }

    if (input.action === 'approve') {
      // Create user account with the original password hash
      await userRepository.create({
        tenantId: input.tenantId!,
        email: request.email,
        name: request.fullName,
        role: input.role!,
        status: 'active',
        passwordHash: request.passwordHash,
      });

      logger.info('Access request approved — user created', { requestId, email: request.email });
    } else {
      logger.info('Access request rejected', { requestId, email: request.email });
    }

    const updated = await accessRequestRepository.updateStatus(
      requestId,
      input.action === 'approve' ? 'approved' : 'rejected',
      reviewerId,
      input.reviewNote
    );

    return updated;
  },
};
