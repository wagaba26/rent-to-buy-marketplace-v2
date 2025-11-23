import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { handleError } from '@/lib/errors';

/**
 * GET /api/applications/retailer - Get applications for retailer's vehicles
 */
export async function GET(request: NextRequest) {
    try {
        const user = getAuthUser(request);

        if (!user || user.role !== 'retailer') {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Only retailers can access this endpoint',
                        code: 'FORBIDDEN',
                    },
                },
                { status: 403 }
            );
        }

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

        const db = getDb();
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');

        let query = `
      SELECT 
        ca.id, ca.status, ca.employment_status, ca.monthly_income,
        ca.created_at, ca.updated_at,
        v.id as vehicle_id, v.make, v.model, v.year, v.price,
        u.id as customer_id, u.first_name, u.last_name, u.email, u.phone_number
      FROM credit_applications ca
      JOIN vehicles v ON v.id = ca.vehicle_id
      JOIN users u ON u.id = ca.customer_id
      WHERE ca.retailer_id = $1
    `;

        const params: any[] = [user.retailerId];

        if (status) {
            query += ` AND ca.status = $2`;
            params.push(status);
        }

        query += ` ORDER BY ca.created_at DESC`;

        const result = await db.query(query, params);

        // Filter to show only surface customer info
        const applications = result.rows.map((app) => ({
            id: app.id,
            status: app.status,
            employmentStatus: app.employment_status,
            monthlyIncome: app.monthly_income,
            createdAt: app.created_at,
            updatedAt: app.updated_at,
            vehicle: {
                id: app.vehicle_id,
                make: app.make,
                model: app.model,
                year: app.year,
                price: app.price,
            },
            customer: {
                // Limited customer info only
                firstName: app.first_name,
                lastName: app.last_name,
                phone: app.phone_number,
            },
        }));

        return NextResponse.json({
            success: true,
            data: {
                applications,
                count: applications.length,
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
