import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { getDb } from '@/lib/db';
import { ValidationError, UnauthorizedError, handleError } from '@/lib/errors';
import { generateAccessToken, generateRefreshToken, storeRefreshToken } from '@/lib/auth';
import { RateLimiter, RateLimitConfigs } from '@/lib/rate-limiter';
import { MFAService } from '@/lib/mfa';
import { AuditLogger } from '@/lib/audit-logger';

export async function POST(request: NextRequest) {
  const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  try {
    // Rate limiting
    const rateLimitResult = RateLimiter.check(ipAddress, RateLimitConfigs.LOGIN);

    if (!rateLimitResult.allowed) {
      await AuditLogger.logSecurity('rate_limit_exceeded', undefined, ipAddress, userAgent);

      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Too many login attempts. Please try again later.',
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: rateLimitResult.retryAfter,
          },
        },
        {
          status: 429,
          headers: {
            'Retry-After': rateLimitResult.retryAfter?.toString() || '900',
          },
        }
      );
    }

    const body = await request.json();
    const { email, password, accessCode, mfaToken } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: { message: 'Email and password are required', code: 'VALIDATION_ERROR' } },
        { status: 400 }
      );
    }

    const db = getDb();

    // Find user
    const result = await db.query(
      'SELECT id, email, password_hash, role, status FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      await AuditLogger.logAuth('login_failed', null, ipAddress, userAgent, { email, reason: 'user_not_found' });

      return NextResponse.json(
        { success: false, error: { message: 'Invalid credentials', code: 'UNAUTHORIZED' } },
        { status: 401 }
      );
    }

    const user = result.rows[0];

    // Check password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      await AuditLogger.logAuth('login_failed', user.id, ipAddress, userAgent, { email, reason: 'invalid_password' });

      return NextResponse.json(
        { success: false, error: { message: 'Invalid credentials', code: 'UNAUTHORIZED' } },
        { status: 401 }
      );
    }

    // Check if user is active
    if (user.status !== 'active' && user.status !== 'pending') {
      await AuditLogger.logAuth('login_failed', user.id, ipAddress, userAgent, { email, reason: 'account_inactive' });

      return NextResponse.json(
        { success: false, error: { message: 'Account is not active', code: 'UNAUTHORIZED' } },
        { status: 401 }
      );
    }

    // For retailers, validate access code
    let retailerId: string | undefined;
    if (user.role === 'retailer') {
      if (!accessCode) {
        return NextResponse.json(
          {
            success: false,
            error: {
              message: 'Access code is required for retailer login',
              code: 'ACCESS_CODE_REQUIRED',
            },
          },
          { status: 400 }
        );
      }

      // Get retailer profile
      const retailerResult = await db.query(
        'SELECT id FROM retailers WHERE user_id = $1',
        [user.id]
      );

      if (retailerResult.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: { message: 'Retailer profile not found', code: 'NOT_FOUND' } },
          { status: 404 }
        );
      }

      retailerId = retailerResult.rows[0].id;

      // Validate access code
      const codeResult = await db.query(
        `SELECT id, is_used, expires_at 
         FROM retailer_access_codes 
         WHERE code = $1 AND retailer_id = $2`,
        [accessCode, retailerId]
      );

      if (codeResult.rows.length === 0) {
        await AuditLogger.logAuth('login_failed', user.id, ipAddress, userAgent, {
          email,
          reason: 'invalid_access_code'
        });

        return NextResponse.json(
          { success: false, error: { message: 'Invalid access code', code: 'INVALID_ACCESS_CODE' } },
          { status: 401 }
        );
      }

      const codeData = codeResult.rows[0];

      // Check if code is expired
      if (new Date(codeData.expires_at) < new Date()) {
        await AuditLogger.logAuth('login_failed', user.id, ipAddress, userAgent, {
          email,
          reason: 'access_code_expired'
        });

        return NextResponse.json(
          { success: false, error: { message: 'Access code has expired', code: 'ACCESS_CODE_EXPIRED' } },
          { status: 401 }
        );
      }

      // Check if code is already used
      if (codeData.is_used) {
        await AuditLogger.logAuth('login_failed', user.id, ipAddress, userAgent, {
          email,
          reason: 'access_code_already_used'
        });

        return NextResponse.json(
          { success: false, error: { message: 'Access code has already been used', code: 'ACCESS_CODE_USED' } },
          { status: 401 }
        );
      }

      // Mark access code as used
      await db.query(
        `UPDATE retailer_access_codes 
         SET is_used = TRUE, used_at = CURRENT_TIMESTAMP 
         WHERE id = $1`,
        [codeData.id]
      );
    }

    // Check if MFA is enabled
    const mfaEnabled = await MFAService.isMFAEnabled(user.id);

    if (mfaEnabled) {
      if (!mfaToken) {
        return NextResponse.json(
          {
            success: false,
            error: {
              message: 'MFA token required',
              code: 'MFA_REQUIRED',
            },
            data: {
              requiresMFA: true,
            },
          },
          { status: 401 }
        );
      }

      // Verify MFA token
      const mfaValid = await MFAService.verifyToken(user.id, mfaToken);

      if (!mfaValid) {
        await AuditLogger.logAuth('login_failed', user.id, ipAddress, userAgent, {
          email,
          reason: 'invalid_mfa_token'
        });

        return NextResponse.json(
          { success: false, error: { message: 'Invalid MFA token', code: 'INVALID_MFA_TOKEN' } },
          { status: 401 }
        );
      }
    }

    // Generate tokens
    const authUser = {
      userId: user.id,
      email: user.email,
      role: user.role,
      retailerId,
    };

    const accessToken = generateAccessToken(authUser);
    const refreshToken = generateRefreshToken(authUser);

    // Store refresh token
    await storeRefreshToken(refreshToken, user.id, { userAgent }, ipAddress);

    // Log successful login
    await AuditLogger.logAuth('login', user.id, ipAddress, userAgent, {
      email,
      role: user.role,
      mfaUsed: mfaEnabled,
    });

    return NextResponse.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          status: user.status,
          retailerId,
        },
      },
    });
  } catch (error) {
    const errorResponse = handleError(error);
    return NextResponse.json(
      { success: false, error: { message: errorResponse.message, code: errorResponse.code } },
      { status: errorResponse.statusCode }
    );
  }
}


