import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { requireRetailer } from '@/lib/rbac';
import { RateLimiter, RateLimitConfigs } from '@/lib/rate-limiter';
import { AuditLogger } from '@/lib/audit-logger';
import { validateObject } from '@/lib/validation';
import { handleError } from '@/lib/errors';

/**
 * GET /api/cars - List all cars (public, surface info only)
 * POST /api/cars - Create car (retailer only)
 */

export async function GET(request: NextRequest) {
    try {
        const db = getDb();
        const { searchParams } = new URL(request.url);

        const limit = parseInt(searchParams.get('limit') || '20');
        const offset = parseInt(searchParams.get('offset') || '0');
        const vehicleType = searchParams.get('type');
        const status = searchParams.get('status') || 'available';

        let query = `
      SELECT 
        id, make, model, year, vehicle_type, color, mileage,
        price, deposit_amount, weekly_payment, monthly_payment,
        payment_frequency, payment_term_months, eligibility_tier,
        status, description, images, created_at
      FROM vehicles
      WHERE status = $1
    `;

        const params: any[] = [status];
        let paramIndex = 2;

        if (vehicleType) {
            query += ` AND vehicle_type = $${paramIndex++}`;
            params.push(vehicleType);
        }

        query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
        params.push(limit, offset);

        const result = await db.query(query, params);

        return NextResponse.json({
            success: true,
            data: {
                vehicles: result.rows,
                count: result.rows.length,
            },
        });
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

export async function POST(request: NextRequest) {
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';

    try {
        // Check retailer permission
        const authCheck = await requireRetailer()(request);
        if (authCheck) return authCheck;

        const user = getAuthUser(request)!;

        if (!user.retailerId) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Retailer profile not found',
                        code: 'NOT_FOUND',
                    },
                },
                { status: 404 }
            );
        }

        // Rate limiting
        const rateLimitResult = RateLimiter.check(
            `car_create_${user.retailerId}`,
            RateLimitConfigs.CAR_CREATE
        );

        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Too many cars created. Please try again later.',
                        code: 'RATE_LIMIT_EXCEEDED',
                    },
                },
                { status: 429 }
            );
        }

        const body = await request.json();

        // Validate input
        const validation = validateObject(body, {
            make: { required: true, type: 'string', minLength: 2, maxLength: 255 },
            model: { required: true, type: 'string', minLength: 1, maxLength: 255 },
            year: { required: true, type: 'number', min: 1900, max: new Date().getFullYear() + 1 },
            vehicleType: { required: true, type: 'string' },
            color: { required: false, type: 'string', maxLength: 50 },
            mileage: { required: false, type: 'number', min: 0 },
            price: { required: true, type: 'number', min: 1 },
            depositAmount: { required: true, type: 'number', min: 1 },
            weeklyPayment: { required: false, type: 'number', min: 0 },
            monthlyPayment: { required: false, type: 'number', min: 0 },
            paymentFrequency: { required: true, type: 'string' },
            paymentTermMonths: { required: true, type: 'number', min: 1 },
            eligibilityTier: { required: false, type: 'string' },
            description: { required: false, type: 'string', maxLength: 2000 },
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

        // Validate vehicle type
        const validTypes = ['motorcycle', 'car', 'van', 'truck'];
        if (!validTypes.includes(data.vehicleType as string)) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Invalid vehicle type',
                        code: 'VALIDATION_ERROR',
                    },
                },
                { status: 400 }
            );
        }

        // Validate payment frequency
        const validFrequencies = ['weekly', 'monthly'];
        if (!validFrequencies.includes(data.paymentFrequency as string)) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Invalid payment frequency',
                        code: 'VALIDATION_ERROR',
                    },
                },
                { status: 400 }
            );
        }

        const db = getDb();

        // Create vehicle
        const result = await db.query(
            `INSERT INTO vehicles (
        make, model, year, vehicle_type, color, mileage, price,
        deposit_amount, weekly_payment, monthly_payment, payment_frequency,
        payment_term_months, eligibility_tier, description, retailer_id, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'available')
      RETURNING id, make, model, year, vehicle_type, price, created_at`,
            [
                data.make,
                data.model,
                data.year,
                data.vehicleType,
                data.color || null,
                data.mileage || 0,
                data.price,
                data.depositAmount,
                data.weeklyPayment || null,
                data.monthlyPayment || null,
                data.paymentFrequency,
                data.paymentTermMonths,
                data.eligibilityTier || 'basic',
                data.description || null,
                user.retailerId,
            ]
        );

        const vehicle = result.rows[0];

        // Log vehicle creation
        await AuditLogger.logVehicle('create', vehicle.id, user.retailerId, ipAddress, {
            make: data.make,
            model: data.model,
            year: data.year,
        });

        return NextResponse.json(
            {
                success: true,
                data: {
                    message: 'Vehicle created successfully',
                    vehicle,
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
