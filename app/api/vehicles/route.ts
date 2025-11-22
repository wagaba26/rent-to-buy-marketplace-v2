import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { handleError } from '@/lib/errors';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vehicleType = searchParams.get('vehicleType');
    const categoryId = searchParams.get('categoryId');
    const eligibilityTier = searchParams.get('eligibilityTier');
    const make = searchParams.get('make');
    const model = searchParams.get('model');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const minDeposit = searchParams.get('minDeposit');
    const maxDeposit = searchParams.get('maxDeposit');
    const status = searchParams.get('status') || 'available';
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const db = getDb();

    let query = `
      SELECT 
        v.id, v.make, v.model, v.year, v.vehicle_type, v.color, v.mileage,
        v.price, v.deposit_amount, v.weekly_payment, v.monthly_payment,
        v.payment_frequency, v.payment_term_months, v.eligibility_tier,
        v.status, v.description, v.images, v.specifications, v.created_at,
        c.id as category_id, c.name as category_name
      FROM vehicles v
      LEFT JOIN vehicle_categories c ON v.category_id = c.id
      WHERE 1=1
    `;
    const values: any[] = [];
    let paramCount = 1;

    if (vehicleType) {
      query += ` AND v.vehicle_type = $${paramCount++}`;
      values.push(vehicleType);
    }

    if (categoryId) {
      query += ` AND v.category_id = $${paramCount++}`;
      values.push(categoryId);
    }

    if (eligibilityTier) {
      query += ` AND v.eligibility_tier = $${paramCount++}`;
      values.push(eligibilityTier);
    }

    if (make) {
      query += ` AND v.make ILIKE $${paramCount++}`;
      values.push(`%${make}%`);
    }

    if (model) {
      query += ` AND v.model ILIKE $${paramCount++}`;
      values.push(`%${model}%`);
    }

    if (search) {
      query += ` AND (
        v.make ILIKE $${paramCount} OR
        v.model ILIKE $${paramCount} OR
        v.description ILIKE $${paramCount}
      )`;
      values.push(`%${search}%`);
      paramCount++;
    }

    if (minPrice) {
      query += ` AND v.price >= $${paramCount++}`;
      values.push(parseFloat(minPrice));
    }

    if (maxPrice) {
      query += ` AND v.price <= $${paramCount++}`;
      values.push(parseFloat(maxPrice));
    }

    if (minDeposit) {
      query += ` AND v.deposit_amount >= $${paramCount++}`;
      values.push(parseFloat(minDeposit));
    }

    if (maxDeposit) {
      query += ` AND v.deposit_amount <= $${paramCount++}`;
      values.push(parseFloat(maxDeposit));
    }

    if (status) {
      query += ` AND v.status = $${paramCount++}`;
      values.push(status);
    }

    // Get total count
    const countQuery = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM');
    const countResult = await db.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total);

    query += ` ORDER BY v.created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    values.push(limit, offset);

    const result = await db.query(query, values);

    return NextResponse.json({
      success: true,
      data: {
        vehicles: result.rows,
        pagination: {
          limit,
          offset,
          count: result.rows.length,
          total,
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      make,
      model,
      year,
      vehicleType,
      categoryId,
      price,
      depositAmount,
      weeklyPayment,
      monthlyPayment,
      paymentFrequency,
      paymentTermMonths,
      eligibilityTier,
      description,
      images,
      specifications,
    } = body;

    if (!make || !model || !year || !vehicleType || !price || !depositAmount) {
      return NextResponse.json(
        { success: false, error: { message: 'Missing required fields', code: 'VALIDATION_ERROR' } },
        { status: 400 }
      );
    }

    const db = getDb();

    const result = await db.query(
      `INSERT INTO vehicles (
        make, model, year, vehicle_type, category_id, price, deposit_amount,
        weekly_payment, monthly_payment, payment_frequency, payment_term_months,
        eligibility_tier, description, images, specifications, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'available')
      RETURNING *`,
      [
        make,
        model,
        year,
        vehicleType,
        categoryId || null,
        price,
        depositAmount,
        weeklyPayment || null,
        monthlyPayment || null,
        paymentFrequency || null,
        paymentTermMonths || null,
        eligibilityTier || null,
        description || null,
        images || [],
        specifications || null,
      ]
    );

    return NextResponse.json({
      success: true,
      data: { vehicle: result.rows[0] },
    }, { status: 201 });
  } catch (error) {
    const errorResponse = handleError(error);
    return NextResponse.json(
      { success: false, error: { message: errorResponse.message, code: errorResponse.code } },
      { status: errorResponse.statusCode }
    );
  }
}

