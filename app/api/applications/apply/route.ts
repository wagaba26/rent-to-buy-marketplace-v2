import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { requireCustomer } from '@/lib/rbac';
import { RateLimiter, RateLimitConfigs } from '@/lib/rate-limiter';
import { AuditLogger } from '@/lib/audit-logger';
import { EncryptionService } from '@/lib/encryption';
import { validateObject } from '@/lib/validation';
import { handleError } from '@/lib/errors';

const encryptionService = new EncryptionService(
    process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-production-min-32-chars'
);

/**
 * POST /api/applications/apply - Customer applies for rent-to-buy
 */
export async function POST(request: NextRequest) {
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';

    try {
        // Check customer permission
        const authCheck = await requireCustomer()(request);
        if (authCheck) return authCheck;

        const user = getAuthUser(request)!;

        // Rate limiting
        const rateLimitResult = RateLimiter.check(
            `application_${user.userId}`,
            RateLimitConfigs.APPLICATION_SUBMIT
        );

        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Too many applications submitted. Please try again later.',
                        code: 'RATE_LIMIT_EXCEEDED',
                    },
                },
                { status: 429 }
            );
        }

        const body = await request.json();

        // Validate input
        const validation = validateObject(body, {
            vehicleId: { required: true, type: 'uuid' },
            employmentStatus: { required: true, type: 'string' },
            monthlyIncome: { required: true, type: 'number', min: 0 },
            incomeVerification: { required: false, type: 'string' },
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
        const db = getDb();

        // Verify vehicle exists and is available
        const vehicleResult = await db.query(
            `SELECT v.id, v.status, v.retailer_id, v.make, v.model, v.year
       FROM vehicles v
       WHERE v.id = $1`,
            [data.vehicleId]
        );

        if (vehicleResult.rows.length === 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Vehicle not found',
                        code: 'NOT_FOUND',
                    },
                },
                { status: 404 }
            );
        }

        const vehicle = vehicleResult.rows[0];

        if (vehicle.status !== 'available') {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Vehicle is not available for application',
                        code: 'VEHICLE_UNAVAILABLE',
                    },
                },
                { status: 400 }
            );
        }

        // Check if customer already has pending application for this vehicle
        const existingApp = await db.query(
            `SELECT id FROM credit_applications 
       WHERE customer_id = $1 AND vehicle_id = $2 AND status IN ('pending', 'under_review')`,
            [user.userId, data.vehicleId]
        );

        if (existingApp.rows.length > 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'You already have a pending application for this vehicle',
                        code: 'APPLICATION_EXISTS',
                    },
                },
                { status: 409 }
            );
        }

        // Encrypt income verification if provided
        const encryptedIncome = data.incomeVerification
            ? encryptionService.encrypt(data.incomeVerification as string)
            : null;

        // Create application
        const appResult = await db.query(
            `INSERT INTO credit_applications (
        customer_id, vehicle_id, retailer_id, employment_status,
        monthly_income, income_verification, encrypted_income_verification, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
      RETURNING id, customer_id, vehicle_id, status, created_at`,
            [
                user.userId,
                data.vehicleId,
                vehicle.retailer_id,
                data.employmentStatus,
                data.monthlyIncome,
                data.incomeVerification || null,
                encryptedIncome,
            ]
        );

        const application = appResult.rows[0];

        // Log application submission
        await AuditLogger.logApplication('submit', application.id, user.userId, ipAddress, {
            vehicleId: data.vehicleId,
            vehicleInfo: `${vehicle.make} ${vehicle.model} ${vehicle.year}`,
        });

        return NextResponse.json(
            {
                success: true,
                data: {
                    message: 'Application submitted successfully',
                    application: {
                        id: application.id,
                        vehicleId: application.vehicle_id,
                        status: application.status,
                        createdAt: application.created_at,
                    },
                },
            },
            { status: 201 }
        );
    } catch (error) {
        const errorResponse = handleError(error);
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
