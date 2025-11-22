import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { EncryptionService } from '@rent-to-own/encryption';
import { MessageQueueClient } from '@rent-to-own/message-queue';
import { NotFoundError, ValidationError } from '@rent-to-own/errors';
import { CreditServiceClient } from '../services/creditServiceClient';
import { checkPermission, checkOwnershipOrAdmin, AuthenticatedRequest } from '../middleware/permissions';

export function kycRoutes(
  pool: Pool,
  encryptionService: EncryptionService,
  messageQueue: MessageQueueClient,
  creditServiceClient?: CreditServiceClient
): Router {
  const router = Router();

  // Submit KYC document
  router.post('/submit', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId, documentType, documentNumber, documentUrl, storagePath } = req.body;
      const authenticatedUserId = req.user?.userId;

      // Use authenticated user ID if not provided in body (for self-submission)
      const targetUserId = userId || authenticatedUserId;

      if (!targetUserId || !documentType || !documentNumber) {
        throw new ValidationError('userId, documentType, and documentNumber are required');
      }

      // If submitting for another user, require onboarding permission (agent/admin)
      if (targetUserId !== authenticatedUserId && authenticatedUserId) {
        // Check permission via middleware-like check
        const permissionCheck = await pool.query(
          `SELECT 1 FROM role_permissions rp
           JOIN users u ON rp.role = u.role
           WHERE u.id = $1 AND rp.permission = 'onboard_customer'
           UNION
           SELECT 1 FROM user_permissions up
           WHERE up.user_id = $1 AND up.permission = 'onboard_customer'`,
          [authenticatedUserId]
        );

        if (permissionCheck.rows.length === 0) {
          return res.status(403).json({
            success: false,
            error: { message: 'Permission denied: onboard_customer required', code: 'FORBIDDEN' },
          });
        }
      }

      // Verify user exists
      const userCheck = await pool.query('SELECT id, role FROM users WHERE id = $1', [targetUserId]);
      if (userCheck.rows.length === 0) {
        throw new NotFoundError('User');
      }

      // Encrypt document number and storage path
      const encryptedDocumentNumber = encryptionService.encrypt(documentNumber);
      const encryptedStoragePath = storagePath ? encryptionService.encrypt(storagePath) : null;

      // Create KYC verification record
      const result = await pool.query(
        `INSERT INTO kyc_verifications (
          user_id, document_type, document_number, encrypted_document_number, 
          document_url, storage_path, encrypted_storage_path, status
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
         RETURNING id, user_id, document_type, status, created_at`,
        [
          targetUserId,
          documentType,
          documentNumber,
          encryptedDocumentNumber,
          documentUrl,
          storagePath,
          encryptedStoragePath,
        ]
      );

      const kyc = result.rows[0];

      // Publish KYC submitted event
      await messageQueue.publish('kyc.events', 'kyc.submitted', {
        type: 'kyc.submitted',
        payload: {
          kycId: kyc.id,
          userId: kyc.user_id,
          documentType: kyc.document_type,
        },
        timestamp: Date.now(),
      });

      res.status(201).json({
        success: true,
        data: { kyc },
      });
    } catch (error: any) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          error: { message: error.message, code: error.code },
        });
      }
      throw error;
    }
  });

  // Get KYC status
  router.get('/:userId', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId } = req.params;
      const authenticatedUserId = req.user?.userId;

      // Check permission: users can view their own KYC, agents/admins can view any
      if (authenticatedUserId && userId !== authenticatedUserId) {
        const permissionCheck = await pool.query(
          `SELECT 1 FROM role_permissions rp
           JOIN users u ON rp.role = u.role
           WHERE u.id = $1 AND (rp.permission = 'view_customer_profile' OR rp.permission = 'view_all_profiles')
           UNION
           SELECT 1 FROM user_permissions up
           WHERE up.user_id = $1 AND (up.permission = 'view_customer_profile' OR up.permission = 'view_all_profiles')`,
          [authenticatedUserId]
        );

        if (permissionCheck.rows.length === 0) {
          return res.status(403).json({
            success: false,
            error: { message: 'Permission denied', code: 'FORBIDDEN' },
          });
        }
      }

      const result = await pool.query(
        `SELECT id, document_type, status, verified_at, created_at, verification_notes
         FROM kyc_verifications
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        [userId]
      );

      res.json({
        success: true,
        data: { verifications: result.rows },
      });
    } catch (error: any) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          error: { message: error.message, code: error.code },
        });
      }
      throw error;
    }
  });

  // Verify KYC (agent/admin only)
  router.post(
    '/verify/:kycId',
    (req, res, next) => checkPermission('verify_kyc', pool)(req, res, next),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { kycId } = req.params;
        const { status, verificationNotes } = req.body;
        const verifiedBy = req.user?.userId;

        if (!status || !['approved', 'rejected'].includes(status)) {
          throw new ValidationError('Status must be approved or rejected');
        }

        if (!verifiedBy) {
          throw new ValidationError('Verifier ID is required');
        }

        // Get KYC verification details
        const kycCheck = await pool.query(
          `SELECT id, user_id, document_type, status 
           FROM kyc_verifications WHERE id = $1`,
          [kycId]
        );

        if (kycCheck.rows.length === 0) {
          throw new NotFoundError('KYC verification');
        }

        const kyc = kycCheck.rows[0];

        // Update KYC verification
        const result = await pool.query(
          `UPDATE kyc_verifications
           SET status = $1, verified_at = CURRENT_TIMESTAMP, verified_by = $2, 
               verification_notes = $3, updated_at = CURRENT_TIMESTAMP
           WHERE id = $4
           RETURNING id, user_id, document_type, status, verified_at, verification_notes`,
          [status, verifiedBy, verificationNotes, kycId]
        );

        const updatedKyc = result.rows[0];

        // Update user status if approved
        if (status === 'approved') {
          await pool.query(
            `UPDATE users SET status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [kyc.user_id]
          );

          // If credit service is available and user hasn't been scored yet, trigger scoring
          if (creditServiceClient) {
            try {
              // Check if user has eligibility tier
              const userResult = await pool.query(
                'SELECT eligibility_tier, credit_score_id FROM users WHERE id = $1',
                [kyc.user_id]
              );

              if (userResult.rows.length > 0 && !userResult.rows[0].credit_score_id) {
                // Fetch eligibility tier for the user
                const eligibilityTier = await creditServiceClient.getEligibilityTier(kyc.user_id);

                if (eligibilityTier) {
                  await pool.query(
                    `UPDATE users 
                     SET eligibility_tier = $1, credit_score_id = $2, updated_at = CURRENT_TIMESTAMP 
                     WHERE id = $3`,
                    [eligibilityTier.tier, eligibilityTier.applicantId, kyc.user_id]
                  );
                }
              }
            } catch (creditError: any) {
              // Log error but don't fail KYC verification if credit scoring fails
              console.error('Failed to fetch eligibility tier after KYC approval:', creditError.message);
            }
          }

          // Publish KYC approved event
          await messageQueue.publish('kyc.events', 'kyc.approved', {
            type: 'kyc.approved',
            payload: {
              kycId: updatedKyc.id,
              userId: updatedKyc.user_id,
            },
            timestamp: Date.now(),
          });
        } else {
          // Publish KYC rejected event
          await messageQueue.publish('kyc.events', 'kyc.rejected', {
            type: 'kyc.rejected',
            payload: {
              kycId: updatedKyc.id,
              userId: updatedKyc.user_id,
              reason: verificationNotes,
            },
            timestamp: Date.now(),
          });
        }

        res.json({
          success: true,
          data: { kyc: updatedKyc },
        });
      } catch (error: any) {
        if (error.statusCode) {
          return res.status(error.statusCode).json({
            success: false,
            error: { message: error.message, code: error.code },
          });
        }
        throw error;
      }
    }
  );

  return router;
}

