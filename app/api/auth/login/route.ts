import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { getDb } from '@/lib/db';
import { ValidationError, UnauthorizedError, handleError } from '@/lib/errors';
import { generateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

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
      return NextResponse.json(
        { success: false, error: { message: 'Invalid credentials', code: 'UNAUTHORIZED' } },
        { status: 401 }
      );
    }

    const user = result.rows[0];

    // Check password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid credentials', code: 'UNAUTHORIZED' } },
        { status: 401 }
      );
    }

    // Check if user is active
    if (user.status !== 'active' && user.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: { message: 'Account is not active', code: 'UNAUTHORIZED' } },
        { status: 401 }
      );
    }

    // Generate JWT
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return NextResponse.json({
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
  } catch (error) {
    const errorResponse = handleError(error);
    return NextResponse.json(
      { success: false, error: { message: errorResponse.message, code: errorResponse.code } },
      { status: errorResponse.statusCode }
    );
  }
}

