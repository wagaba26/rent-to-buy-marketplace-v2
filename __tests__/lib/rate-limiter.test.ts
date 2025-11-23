/**
 * Unit Tests for Rate Limiter
 */

import { RateLimiter, RateLimitConfigs } from '@/lib/rate-limiter';

describe('Rate Limiter', () => {
    beforeEach(() => {
        // Clear rate limiter state before each test
        RateLimiter['requests'].clear();
    });

    describe('check', () => {
        it('should allow requests within limit', () => {
            const identifier = 'test-user-1';
            const config = RateLimitConfigs.LOGIN;

            // First request should be allowed
            const result1 = RateLimiter.check(identifier, config);
            expect(result1.allowed).toBe(true);
            expect(result1.remaining).toBe(config.maxRequests - 1);

            // Second request should be allowed
            const result2 = RateLimiter.check(identifier, config);
            expect(result2.allowed).toBe(true);
            expect(result2.remaining).toBe(config.maxRequests - 2);
        });

        it('should block requests exceeding limit', () => {
            const identifier = 'test-user-2';
            const config = { maxRequests: 3, windowMs: 60000 };

            // Make 3 requests (at limit)
            for (let i = 0; i < 3; i++) {
                const result = RateLimiter.check(identifier, config);
                expect(result.allowed).toBe(true);
            }

            // 4th request should be blocked
            const result = RateLimiter.check(identifier, config);
            expect(result.allowed).toBe(false);
            expect(result.retryAfter).toBeGreaterThan(0);
        });

        it('should track different identifiers separately', () => {
            const config = { maxRequests: 2, windowMs: 60000 };

            // User 1 makes 2 requests
            RateLimiter.check('user-1', config);
            RateLimiter.check('user-1', config);

            // User 1 should be blocked
            expect(RateLimiter.check('user-1', config).allowed).toBe(false);

            // User 2 should still be allowed
            expect(RateLimiter.check('user-2', config).allowed).toBe(true);
        });

        it('should reset after window expires', async () => {
            const identifier = 'test-user-3';
            const config = { maxRequests: 2, windowMs: 100 }; // 100ms window

            // Make 2 requests
            RateLimiter.check(identifier, config);
            RateLimiter.check(identifier, config);

            // Should be blocked
            expect(RateLimiter.check(identifier, config).allowed).toBe(false);

            // Wait for window to expire
            await new Promise((resolve) => setTimeout(resolve, 150));

            // Should be allowed again
            const result = RateLimiter.check(identifier, config);
            expect(result.allowed).toBe(true);
        });
    });

    describe('RateLimitConfigs', () => {
        it('should have LOGIN config', () => {
            expect(RateLimitConfigs.LOGIN).toBeDefined();
            expect(RateLimitConfigs.LOGIN.maxRequests).toBe(5);
            expect(RateLimitConfigs.LOGIN.windowMs).toBe(15 * 60 * 1000);
        });

        it('should have REGISTER config', () => {
            expect(RateLimitConfigs.REGISTER).toBeDefined();
            expect(RateLimitConfigs.REGISTER.maxRequests).toBe(3);
        });

        it('should have RETAILER_REGISTER config', () => {
            expect(RateLimitConfigs.RETAILER_REGISTER).toBeDefined();
            expect(RateLimitConfigs.RETAILER_REGISTER.maxRequests).toBe(2);
        });

        it('should have CAR_CREATE config', () => {
            expect(RateLimitConfigs.CAR_CREATE).toBeDefined();
            expect(RateLimitConfigs.CAR_CREATE.maxRequests).toBe(20);
        });

        it('should have APPLICATION_SUBMIT config', () => {
            expect(RateLimitConfigs.APPLICATION_SUBMIT).toBeDefined();
            expect(RateLimitConfigs.APPLICATION_SUBMIT.maxRequests).toBe(5);
        });
    });

    describe('cleanup', () => {
        it('should remove expired entries', async () => {
            const identifier = 'test-user-4';
            const config = { maxRequests: 5, windowMs: 100 };

            // Make a request
            RateLimiter.check(identifier, config);

            // Verify entry exists
            expect(RateLimiter['requests'].has(identifier)).toBe(true);

            // Wait for expiry
            await new Promise((resolve) => setTimeout(resolve, 150));

            // Trigger cleanup
            RateLimiter.cleanup();

            // Entry should be removed
            expect(RateLimiter['requests'].has(identifier)).toBe(false);
        });
    });
});
