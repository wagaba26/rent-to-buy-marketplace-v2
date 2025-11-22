import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import { EncryptionService } from '@rent-to-own/encryption';
import { MessageQueueClient } from '@rent-to-own/message-queue';
import { ValidationError, NotFoundError, UnauthorizedError } from '@rent-to-own/errors';
import { AuthenticatedRequest } from '../middleware/auth';

const RESET_TOKEN_EXPIRY_HOURS = 24;

export function passwordResetRoutes(
  pool: Pool,
  encryptionService: EncryptionService,
  messageQueue: MessageQueueClient
): Router {
  const router = Router();

  /**
   * POST /request-reset
   * Request password reset - generates and stores a reset token
   */
  router.post('/request-reset', async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      if (!email) {
        throw new ValidationError('Email is required');
      }

      // Find user by email
      const userResult = await pool.query(
        'SELECT id, email, status FROM users WHERE email = $1',
        [email]
      );

      if (userResult.rows.length === 0) {
        // Don't reveal if user exists or not for security
        return res.json({
          success: true,
          message: 'If the email exists, a password reset link has been sent',
        });
      }

      const user = userResult.rows[0];

      // Check if user is active
      if (user.status === 'suspended' || user.status === 'deleted') {
        return res.json({
          success: true,
          message: 'If the email exists, a password reset link has been sent',
        });
      }

      // Generate reset token
      const resetToken = encryptionService.generateToken(32);
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + RESET_TOKEN_EXPIRY_HOURS);

      // Store reset token
      await pool.query(
        `INSERT INTO password_reset_tokens (user_id, token, expires_at)
         VALUES ($1, $2, $3)`,
        [user.id, resetToken, expiresAt]
      );

      // Publish password reset requested event (for email notification service)
      await messageQueue.publish('user.events', 'password.reset.requested', {
        type: 'password.reset.requested',
        payload: {
          userId: user.id,
          email: user.email,
          resetToken,
          expiresAt: expiresAt.toISOString(),
        },
        timestamp: Date.now(),
      });

      res.json({
        success: true,
        message: 'If the email exists, a password reset link has been sent',
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

  /**
   * POST /verify-token
   * Verify password reset token validity
   */
  router.post('/verify-token', async (req: Request, res: Response) => {
    try {
      const { token } = req.body;

      if (!token) {
        throw new ValidationError('Token is required');
      }

      // Find valid token
      const tokenResult = await pool.query(
        `SELECT prt.id, prt.user_id, prt.expires_at, prt.used, u.status as user_status
         FROM password_reset_tokens prt
         JOIN users u ON prt.user_id = u.id
         WHERE prt.token = $1 AND prt.used = FALSE AND prt.expires_at > NOW()`,
        [token]
      );

      if (tokenResult.rows.length === 0) {
        throw new UnauthorizedError('Invalid or expired reset token');
      }

      const tokenData = tokenResult.rows[0];

      // Check if user is active
      if (tokenData.user_status === 'suspended' || tokenData.user_status === 'deleted') {
        throw new UnauthorizedError('Account is not active');
      }

      res.json({
        success: true,
        data: {
          valid: true,
          userId: tokenData.user_id,
        },
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

  /**
   * POST /reset
   * Reset password using a valid token
   */
  router.post('/reset', async (req: Request, res: Response) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        throw new ValidationError('Token and new password are required');
      }

      if (newPassword.length < 8) {
        throw new ValidationError('Password must be at least 8 characters long');
      }

      // Find valid token
      const tokenResult = await pool.query(
        `SELECT prt.id, prt.user_id, prt.expires_at, prt.used, u.status as user_status, u.email
         FROM password_reset_tokens prt
         JOIN users u ON prt.user_id = u.id
         WHERE prt.token = $1 AND prt.used = FALSE AND prt.expires_at > NOW()`,
        [token]
      );

      if (tokenResult.rows.length === 0) {
        throw new UnauthorizedError('Invalid or expired reset token');
      }

      const tokenData = tokenResult.rows[0];

      // Check if user is active
      if (tokenData.user_status === 'suspended' || tokenData.user_status === 'deleted') {
        throw new UnauthorizedError('Account is not active');
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, 10);

      // Update password and mark token as used
      await pool.query('BEGIN');

      try {
        await pool.query('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [
          passwordHash,
          tokenData.user_id,
        ]);

        await pool.query('UPDATE password_reset_tokens SET used = TRUE WHERE id = $1', [tokenData.id]);

        // Invalidate all other reset tokens for this user
        await pool.query(
          `UPDATE password_reset_tokens 
           SET used = TRUE 
           WHERE user_id = $1 AND used = FALSE AND id != $2`,
          [tokenData.user_id, tokenData.id]
        );

        await pool.query('COMMIT');

        // Publish password reset completed event
        await messageQueue.publish('user.events', 'password.reset.completed', {
          type: 'password.reset.completed',
          payload: {
            userId: tokenData.user_id,
            email: tokenData.email,
          },
          timestamp: Date.now(),
        });

        res.json({
          success: true,
          message: 'Password has been reset successfully',
        });
      } catch (error) {
        await pool.query('ROLLBACK');
        throw error;
      }
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

  /**
   * POST /change-password
   * Change password (requires current password) - protected route
   */
  router.post('/change-password', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        throw new UnauthorizedError('Authentication required');
      }

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        throw new ValidationError('Current password and new password are required');
      }

      if (newPassword.length < 8) {
        throw new ValidationError('Password must be at least 8 characters long');
      }

      // Get user and verify current password
      const userResult = await pool.query(
        'SELECT id, email, password_hash, status FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new NotFoundError('User');
      }

      const user = userResult.rows[0];

      // Verify current password
      const isValid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isValid) {
        throw new UnauthorizedError('Current password is incorrect');
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, 10);

      // Update password
      await pool.query('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [
        passwordHash,
        userId,
      ]);

      // Invalidate all reset tokens for this user
      await pool.query('UPDATE password_reset_tokens SET used = TRUE WHERE user_id = $1 AND used = FALSE', [
        userId,
      ]);

      // Publish password changed event
      await messageQueue.publish('user.events', 'password.changed', {
        type: 'password.changed',
        payload: {
          userId: user.id,
          email: user.email,
        },
        timestamp: Date.now(),
      });

      res.json({
        success: true,
        message: 'Password has been changed successfully',
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

  return router;
}

