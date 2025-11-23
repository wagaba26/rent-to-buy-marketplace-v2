import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { getDb } from '@/lib/db';
import { EncryptionService } from '@/lib/encryption';
import { validateObject, validateBusinessRegistration } from '@/lib/validation';
import { RateLimiter, RateLimitConfigs } from '@/lib/rate-limiter';
import { AuditLogger } from '@/lib/audit-logger';
import { handleError } from '@/lib/errors';

const encryptionService = new EncryptionService(
    process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-production-min-32-chars'
);

export async function POST(request: NextRequest) {
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

    try {
        // Rate limiting
        const rateLimitResult = RateLimiter.check(ipAddress, RateLimitConfigs.RETAILER_REGISTER);

        if (!rateLimitResult.allowed) {
            await AuditLogger.logSecurity('rate_limit_exceeded', undefined, ipAddress);

            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Too many registration attempts. Please try again later.',
                        code: 'RATE_LIMIT_EXCEEDED',
                        retryAfter: rateLimitResult.retryAfter,
                    },
                },
                {
                    status: 429,
                    headers: {
                        'Retry-After': rateLimitResult.retryAfter?.toString() || '3600',
                    },
                }
            );
        }

        const body = await request.json();

        // Validate input
        const validation = validateObject(body, {
            email: { required: true, type: 'email' },
            password: { required: true, type: 'string', minLength: 8 },
            businessName: { required: true, type: 'string', minLength: 2, maxLength: 255, sanitize: true },
            tradingLicense: { required: true, type: 'string', minLength: 5, maxLength: 100 },
            taxId: { required: false, type: 'string', maxLength: 50 },
            businessType: { required: true, type: 'string' },
            businessAddress: { required: true, type: 'string', minLength: 10, maxLength: 500, sanitize: true },
            contactPerson: { required: true, type: 'string', minLength: 2, maxLength: 255, sanitize: true },
            contactPhone: { required: true, type: 'phone' },
        });

        if (!validation.valid) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Validation failed',
                        code: 'VALIDATION_ERROR',
                        details: validation.errors,
                    },
                },
                { status: 400 }
            );
        }

        const data = validation.data!;

        // Validate business type
        const validBusinessTypes = ['sole_proprietor', 'partnership', 'corporation', 'llc', 'other'];
        if (!validBusinessTypes.includes(data.businessType as string)) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Invalid business type',
                        code: 'VALIDATION_ERROR',
                    },
                },
                { status: 400 }
            );
        }

        // Validate trading license format
        const licenseValidation = validateBusinessRegistration(data.tradingLicense as string);
        if (!licenseValidation.valid) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: licenseValidation.error,
                        code: 'VALIDATION_ERROR',
                    },
                },
                { status: 400 }
            );
        }

        const db = getDb();

        // Check if email already exists
        const existingUser = await db.query(
            'SELECT id FROM users WHERE email = $1',
            [data.email]
        );

        if (existingUser.rows.length > 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Email already registered',
                        code: 'USER_EXISTS',
                    },
                },
                { status: 409 }
            );
        }

        // Check if trading license already exists
        const existingLicense = await db.query(
            'SELECT id FROM retailers WHERE trading_license = $1',
            [data.tradingLicense]
        );

        if (existingLicense.rows.length > 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Trading license already registered',
                        code: 'LICENSE_EXISTS',
                    },
                },
                { status: 409 }
            );
        }

        // Hash password
        const passwordHash = await bcrypt.hash(data.password as string, 10);

        // Encrypt phone number
        const encryptedPhone = encryptionService.encrypt(data.contactPhone as string);

        // Start transaction
        await db.query('BEGIN');

        try {
            // Create user account
            const userResult = await db.query(
                `INSERT INTO users (email, password_hash, role, status, phone_number, encrypted_phone)
         VALUES ($1, $2, 'retailer', 'pending', $3, $4)
         RETURNING id, email, role, status, created_at`,
                [data.email, passwordHash, data.contactPhone, encryptedPhone]
            );

            const user = userResult.rows[0];

            // Create retailer profile
            const retailerResult = await db.query(
                `INSERT INTO retailers (
          user_id, business_name, trading_license, tax_id, business_type,
          business_address, contact_person, contact_phone, encrypted_contact_phone, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
        RETURNING id, business_name, status, created_at`,
                [
                    user.id,
                    data.businessName,
                    data.tradingLicense,
                    data.taxId || null,
                    data.businessType,
                    data.businessAddress,
                    data.contactPerson,
                    data.contactPhone,
                    encryptedPhone,
                ]
            );

            const retailer = retailerResult.rows[0];

            // Commit transaction
            await db.query('COMMIT');

            // Log registration
            await AuditLogger.logRetailer('register', retailer.id, undefined, ipAddress, {
                businessName: data.businessName,
                businessType: data.businessType,
            });

            return NextResponse.json(
                {
                    success: true,
                    data: {
                        message: 'Retailer registration submitted successfully',
                        status: 'pending',
                        retailer: {
                            id: retailer.id,
                            businessName: retailer.business_name,
                            status: retailer.status,
                            createdAt: retailer.created_at,
                        },
                        user: {
                            id: user.id,
                            email: user.email,
                            role: user.role,
                        },
                    },
                },
                { status: 201 }
            );
        } catch (error) {
            // Rollback transaction
            await db.query('ROLLBACK');
            throw error;
        }
    } catch (error) {
        const errorResponse = handleError(error);

        await AuditLogger.log({
            action: 'retailer.register',
            ipAddress,
            success: false,
            errorMessage: errorResponse.message,
        });

        return NextResponse.json(
            {
                success: false,
                error: {
                    message: errorResponse.message,
                    code: errorResponse.code,
                },
            },
            { status: errorResponse.statusCode }
        );
    }
}
