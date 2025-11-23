import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { EncryptionService } from '@rent-to-own/encryption';
import { MessageQueueClient } from '@rent-to-own/message-queue';
import { ValidationError, UnauthorizedError } from '@rent-to-own/errors';
import { CreditServiceClient } from '../services/creditServiceClient';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export function authRoutes(
  pool: Pool,
  encryptionService: EncryptionService,
  messageQueue: MessageQueueClient,
  creditServiceClient?: CreditServiceClient
): Router {
  const router = Router();

  // Register
  router.post('/register', async (req: Request, res: Response) => {
    try {
      const {
        email,
        password,
        firstName,
        lastName,
        phoneNumber,
        role = 'customer',
        applicantData,
      } = req.body;

      if (!email || !password) {
        throw new ValidationError('Email and password are required');
      }

      // Check if user exists
      const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existingUser.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: { message: 'User already exists', code: 'USER_EXISTS' },
        });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Encrypt phone number if provided
      const encryptedPhone = phoneNumber ? encryptionService.encrypt(phoneNumber) : null;

      // Create user (initially without credit score)
      const result = await pool.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, phone_number, encrypted_phone, role, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
         RETURNING id, email, role, status, created_at`,
        [email, passwordHash, firstName, lastName, phoneNumber, encryptedPhone, role]
      );

      const user = result.rows[0];
      let eligibilityTier: number | undefined;
      let creditScoreId: string | undefined;

      // For customers, attempt to fetch credit score during onboarding if applicant data is provided
      if (role === 'customer' && creditServiceClient && applicantData) {
        try {
          // Prepare applicant data for credit scoring
          const applicantDataForScoring = {
            personalInfo: {
              firstName: firstName || applicantData.personalInfo?.firstName,
              lastName: lastName || applicantData.personalInfo?.lastName,
              phoneNumber: phoneNumber || applicantData.personalInfo?.phoneNumber,
              email: email,
              dateOfBirth: applicantData.personalInfo?.dateOfBirth,
              address: applicantData.personalInfo?.address,
            },
            mobileMoneyHistory: applicantData.mobileMoneyHistory,
            utilityPayments: applicantData.utilityPayments,
            saccoContributions: applicantData.saccoContributions,
            priorLoanPerformance: applicantData.priorLoanPerformance,
          };

          // Score the applicant
          const creditScoreResult = await creditServiceClient.scoreApplicant(
            user.id,
            applicantDataForScoring
          );

          if (creditScoreResult) {
            eligibilityTier = creditScoreResult.tier;
            creditScoreId = creditScoreResult.applicantId;

            // Update user with eligibility tier
            await pool.query(
              `UPDATE users 
               SET eligibility_tier = $1, credit_score_id = $2, updated_at = CURRENT_TIMESTAMP 
               WHERE id = $3`,
              [eligibilityTier, creditScoreId, user.id]
            );
          }
        } catch (creditError: any) {
          // Log error but don't fail registration if credit scoring fails
          console.error('Failed to fetch credit score during registration:', creditError.message);
          // User registration succeeds even if credit scoring fails
        }
      }

      // Publish user created event
      await messageQueue.publish('user.events', 'user.created', {
        type: 'user.created',
        payload: {
          userId: user.id,
          email: user.email,
          role: user.role,
          eligibilityTier,
        },
        timestamp: Date.now(),
      });

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            status: user.status,
            eligibilityTier,
          },
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

  // Login
  router.post('/login', async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        throw new ValidationError('Email and password are required');
      }

      // Find user
      const result = await pool.query(
        'SELECT id, email, password_hash, role, status FROM users WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        throw new UnauthorizedError('Invalid credentials');
      }

      const user = result.rows[0];

      // Check password
      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) {
        throw new UnauthorizedError('Invalid credentials');
      }

      // Check if user is active
      if (user.status !== 'active' && user.status !== 'pending') {
        throw new UnauthorizedError('Account is not active');
      }

      // Generate JWT
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
        },
        JWT_SECRET as jwt.Secret,
        { expiresIn: JWT_EXPIRES_IN as any }
      );

      res.json({
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            status: user.status,
          },
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

  return router;
}

