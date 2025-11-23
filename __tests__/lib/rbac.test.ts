/**
 * Unit Tests for RBAC Middleware
 */

import { NextRequest } from 'next/server';
import { requireRole, requireAdmin, requireRetailer, requireCustomer } from '@/lib/rbac';

// Mock getAuthUser
jest.mock('@/lib/auth', () => ({
    getAuthUser: jest.fn(),
}));

import { getAuthUser } from '@/lib/auth';

describe('RBAC Middleware', () => {
    const mockGetAuthUser = getAuthUser as jest.MockedFunction<typeof getAuthUser>;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('requireRole', () => {
        it('should allow access for matching role', async () => {
            mockGetAuthUser.mockReturnValue({
                userId: '123',
                email: 'admin@test.com',
                role: 'admin',
            });

            const middleware = requireRole('admin');
            const request = new NextRequest('http://localhost/api/test');
            const result = await middleware(request);

            expect(result).toBeNull();
        });

        it('should deny access for non-matching role', async () => {
            mockGetAuthUser.mockReturnValue({
                userId: '123',
                email: 'customer@test.com',
                role: 'customer',
            });

            const middleware = requireRole('admin');
            const request = new NextRequest('http://localhost/api/test');
            const result = await middleware(request);

            expect(result).toBeDefined();
            expect(result?.status).toBe(403);
        });

        it('should allow access for any of multiple roles', async () => {
            mockGetAuthUser.mockReturnValue({
                userId: '123',
                email: 'retailer@test.com',
                role: 'retailer',
            });

            const middleware = requireRole('admin', 'retailer');
            const request = new NextRequest('http://localhost/api/test');
            const result = await middleware(request);

            expect(result).toBeNull();
        });

        it('should deny access when user is not authenticated', async () => {
            mockGetAuthUser.mockReturnValue(null);

            const middleware = requireRole('admin');
            const request = new NextRequest('http://localhost/api/test');
            const result = await middleware(request);

            expect(result).toBeDefined();
            expect(result?.status).toBe(401);
        });
    });

    describe('requireAdmin', () => {
        it('should allow admin access', async () => {
            mockGetAuthUser.mockReturnValue({
                userId: '123',
                email: 'admin@test.com',
                role: 'admin',
            });

            const middleware = requireAdmin();
            const request = new NextRequest('http://localhost/api/admin/test');
            const result = await middleware(request);

            expect(result).toBeNull();
        });

        it('should deny non-admin access', async () => {
            mockGetAuthUser.mockReturnValue({
                userId: '123',
                email: 'customer@test.com',
                role: 'customer',
            });

            const middleware = requireAdmin();
            const request = new NextRequest('http://localhost/api/admin/test');
            const result = await middleware(request);

            expect(result).toBeDefined();
            expect(result?.status).toBe(403);
        });
    });

    describe('requireRetailer', () => {
        it('should allow retailer access', async () => {
            mockGetAuthUser.mockReturnValue({
                userId: '123',
                email: 'retailer@test.com',
                role: 'retailer',
                retailerId: 'retailer-123',
            });

            const middleware = requireRetailer();
            const request = new NextRequest('http://localhost/api/retailer/test');
            const result = await middleware(request);

            expect(result).toBeNull();
        });

        it('should deny non-retailer access', async () => {
            mockGetAuthUser.mockReturnValue({
                userId: '123',
                email: 'customer@test.com',
                role: 'customer',
            });

            const middleware = requireRetailer();
            const request = new NextRequest('http://localhost/api/retailer/test');
            const result = await middleware(request);

            expect(result).toBeDefined();
            expect(result?.status).toBe(403);
        });
    });

    describe('requireCustomer', () => {
        it('should allow customer access', async () => {
            mockGetAuthUser.mockReturnValue({
                userId: '123',
                email: 'customer@test.com',
                role: 'customer',
            });

            const middleware = requireCustomer();
            const request = new NextRequest('http://localhost/api/customer/test');
            const result = await middleware(request);

            expect(result).toBeNull();
        });

        it('should deny non-customer access', async () => {
            mockGetAuthUser.mockReturnValue({
                userId: '123',
                email: 'admin@test.com',
                role: 'admin',
            });

            const middleware = requireCustomer();
            const request = new NextRequest('http://localhost/api/customer/test');
            const result = await middleware(request);

            expect(result).toBeDefined();
            expect(result?.status).toBe(403);
        });
    });
});
