import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { getDb } from '@/lib/db';
import { EncryptionService } from '@/lib/encryption';
import { MessageQueueClient } from '@/lib/message-queue';
import { ValidationError, handleError } from '@/lib/errors';
import { generateToken } from '@/lib/auth';

const encryptionService = new EncryptionService(
  process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-production-min-32-chars'
);

let messageQueue: MessageQueueClient | null = null;

async function getMessageQueue() {
  if (!messageQueue) {
    messageQueue = new MessageQueueClient({
      url: process.env.RABBITMQ_URL || 'amqp://admin:admin123@localhost:5672',
    });
    await messageQueue.connect();
  }
  return messageQueue;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      email,
      password,
      firstName,
      lastName,
      phoneNumber,
      role = 'customer',
    } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: { message: 'Email and password are required', code: 'VALIDATION_ERROR' } },
        { status: 400 }
      );
    }

    const db = getDb();

    // Check if user exists
    const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: { message: 'User already exists', code: 'USER_EXISTS' } },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Encrypt phone number if provided
    const encryptedPhone = phoneNumber ? encryptionService.encrypt(phoneNumber) : null;

    // Create user
    const result = await db.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, phone_number, encrypted_phone, role, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
       RETURNING id, email, role, status, created_at`,
      [email, passwordHash, firstName, lastName, phoneNumber, encryptedPhone, role]
    );

    const user = result.rows[0];

    // Publish user created event
    try {
      const mq = await getMessageQueue();
      await mq.publish('user.events', 'user.created', {
        type: 'user.created',
        payload: {
          userId: user.id,
          email: user.email,
          role: user.role,
        },
        timestamp: Date.now(),
      });
    } catch (mqError) {
      console.error('Failed to publish user created event:', mqError);
      // Don't fail registration if message queue fails
    }

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
    }, { status: 201 });
  } catch (error) {
    const errorResponse = handleError(error);
    return NextResponse.json(
      { success: false, error: { message: errorResponse.message, code: errorResponse.code } },
      { status: errorResponse.statusCode }
    );
  }
}

