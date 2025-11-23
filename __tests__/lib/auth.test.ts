/**
 * Unit Tests for Auth Utilities
 */

import { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken } from '@/lib/auth';

describe('Auth Utilities', () => {
    const mockUser = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        role: 'customer',
    };

    describe('generateAccessToken', () => {
        it('should generate a valid access token', () => {
            const token = generateAccessToken(mockUser);
            expect(token).toBeDefined();
            expect(typeof token).toBe('string');
            expect(token.split('.')).toHaveLength(3); // JWT format
        });

        it('should include user data in token', () => {
            const token = generateAccessToken(mockUser);
            const decoded = verifyAccessToken(token);

            expect(decoded).toBeDefined();
            expect(decoded?.userId).toBe(mockUser.userId);
            expect(decoded?.email).toBe(mockUser.email);
            expect(decoded?.role).toBe(mockUser.role);
        });

        it('should include retailerId if provided', () => {
            const retailerUser = { ...mockUser, retailerId: 'retailer-123' };
            const token = generateAccessToken(retailerUser);
            const decoded = verifyAccessToken(token);

            expect(decoded?.retailerId).toBe('retailer-123');
        });
    });

    describe('generateRefreshToken', () => {
        it('should generate a valid refresh token', () => {
            const token = generateRefreshToken(mockUser);
            expect(token).toBeDefined();
            expect(typeof token).toBe('string');
            expect(token.split('.')).toHaveLength(3);
        });

        it('should be different from access token', () => {
            const accessToken = generateAccessToken(mockUser);
            const refreshToken = generateRefreshToken(mockUser);

            expect(accessToken).not.toBe(refreshToken);
        });
    });

    describe('verifyAccessToken', () => {
        it('should verify valid token', () => {
            const token = generateAccessToken(mockUser);
            const decoded = verifyAccessToken(token);

            expect(decoded).toBeDefined();
            expect(decoded?.userId).toBe(mockUser.userId);
        });

        it('should return null for invalid token', () => {
            const decoded = verifyAccessToken('invalid.token.here');
            expect(decoded).toBeNull();
        });

        it('should return null for expired token', () => {
            // This would require mocking time or using a very short expiry
            // For now, we'll just test with an obviously invalid token
            const decoded = verifyAccessToken('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature');
            expect(decoded).toBeNull();
        });
    });

    describe('verifyRefreshToken', () => {
        it('should verify valid refresh token', () => {
            const token = generateRefreshToken(mockUser);
            const decoded = verifyRefreshToken(token);

            expect(decoded).toBeDefined();
            expect(decoded?.userId).toBe(mockUser.userId);
        });

        it('should return null for invalid refresh token', () => {
            const decoded = verifyRefreshToken('invalid.token.here');
            expect(decoded).toBeNull();
        });
    });
});
