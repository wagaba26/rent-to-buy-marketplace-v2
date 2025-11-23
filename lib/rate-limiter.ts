/**
 * Rate Limiting Service
 * Implements sliding window rate limiting with in-memory storage
 */

interface RateLimitConfig {
    windowMs: number; // Time window in milliseconds
    maxRequests: number; // Maximum requests allowed in window
}

interface RateLimitEntry {
    count: number;
    resetTime: number;
    requests: number[]; // Timestamps of requests
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Predefined rate limit configurations
export const RateLimitConfigs = {
    LOGIN: { windowMs: 15 * 60 * 1000, maxRequests: 5 }, // 5 requests per 15 minutes
    REGISTER: { windowMs: 60 * 60 * 1000, maxRequests: 3 }, // 3 requests per hour
    RETAILER_REGISTER: { windowMs: 24 * 60 * 60 * 1000, maxRequests: 2 }, // 2 requests per day
    API_DEFAULT: { windowMs: 60 * 1000, maxRequests: 100 }, // 100 requests per minute
    CAR_CREATE: { windowMs: 60 * 60 * 1000, maxRequests: 20 }, // 20 cars per hour
    APPLICATION_SUBMIT: { windowMs: 24 * 60 * 60 * 1000, maxRequests: 5 }, // 5 applications per day
};

export class RateLimiter {
    /**
     * Check if request should be rate limited
     * @param identifier Unique identifier (IP address, user ID, etc.)
     * @param config Rate limit configuration
     * @returns Object with allowed status and retry info
     */
    static check(
        identifier: string,
        config: RateLimitConfig
    ): {
        allowed: boolean;
        remaining: number;
        resetTime: number;
        retryAfter?: number;
    } {
        const now = Date.now();
        const key = `${identifier}`;

        // Get or create entry
        let entry = rateLimitStore.get(key);

        if (!entry) {
            entry = {
                count: 0,
                resetTime: now + config.windowMs,
                requests: [],
            };
            rateLimitStore.set(key, entry);
        }

        // Clean up old requests (sliding window)
        entry.requests = entry.requests.filter(
            (timestamp) => timestamp > now - config.windowMs
        );

        // Check if limit exceeded
        if (entry.requests.length >= config.maxRequests) {
            const oldestRequest = entry.requests[0];
            const retryAfter = Math.ceil((oldestRequest + config.windowMs - now) / 1000);

            return {
                allowed: false,
                remaining: 0,
                resetTime: oldestRequest + config.windowMs,
                retryAfter,
            };
        }

        // Add current request
        entry.requests.push(now);
        entry.count = entry.requests.length;

        return {
            allowed: true,
            remaining: config.maxRequests - entry.requests.length,
            resetTime: entry.requests[0] + config.windowMs,
        };
    }

    /**
     * Reset rate limit for an identifier
     */
    static reset(identifier: string): void {
        rateLimitStore.delete(identifier);
    }

    /**
     * Clean up expired entries (should be run periodically)
     */
    static cleanup(): void {
        const now = Date.now();

        for (const [key, entry] of rateLimitStore.entries()) {
            // Remove entries with no recent requests
            entry.requests = entry.requests.filter(
                (timestamp) => timestamp > now - 24 * 60 * 60 * 1000 // Keep last 24 hours
            );

            if (entry.requests.length === 0) {
                rateLimitStore.delete(key);
            }
        }
    }

    /**
     * Get current stats for an identifier
     */
    static getStats(identifier: string): {
        requestCount: number;
        oldestRequest: number | null;
    } | null {
        const entry = rateLimitStore.get(identifier);

        if (!entry || entry.requests.length === 0) {
            return null;
        }

        return {
            requestCount: entry.requests.length,
            oldestRequest: entry.requests[0],
        };
    }
}

/**
 * Middleware helper to apply rate limiting
 */
export function createRateLimitMiddleware(config: RateLimitConfig) {
    return (identifier: string) => {
        const result = RateLimiter.check(identifier, config);

        if (!result.allowed) {
            return {
                error: {
                    message: 'Too many requests, please try again later',
                    code: 'RATE_LIMIT_EXCEEDED',
                    retryAfter: result.retryAfter,
                },
                headers: {
                    'X-RateLimit-Limit': config.maxRequests.toString(),
                    'X-RateLimit-Remaining': '0',
                    'X-RateLimit-Reset': result.resetTime.toString(),
                    'Retry-After': result.retryAfter?.toString() || '60',
                },
                statusCode: 429,
            };
        }

        return {
            success: true,
            headers: {
                'X-RateLimit-Limit': config.maxRequests.toString(),
                'X-RateLimit-Remaining': result.remaining.toString(),
                'X-RateLimit-Reset': result.resetTime.toString(),
            },
        };
    };
}

// Cleanup expired entries every hour
if (typeof setInterval !== 'undefined') {
    setInterval(() => {
        RateLimiter.cleanup();
    }, 60 * 60 * 1000);
}
