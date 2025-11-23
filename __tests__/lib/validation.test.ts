/**
 * Unit Tests for Validation Utilities
 */

import {
    validateEmail,
    validatePassword,
    validatePhone,
    validateUUID,
    validateBusinessRegistration,
    sanitizeInput,
} from '@/lib/validation';

describe('Validation Utilities', () => {
    describe('validateEmail', () => {
        it('should validate correct email addresses', () => {
            expect(validateEmail('test@example.com').valid).toBe(true);
            expect(validateEmail('user.name+tag@example.co.uk').valid).toBe(true);
        });

        it('should reject invalid email addresses', () => {
            expect(validateEmail('invalid').valid).toBe(false);
            expect(validateEmail('test@').valid).toBe(false);
            expect(validateEmail('@example.com').valid).toBe(false);
            expect(validateEmail('test @example.com').valid).toBe(false);
        });

        it('should reject emails that are too long', () => {
            const longEmail = 'a'.repeat(250) + '@example.com';
            expect(validateEmail(longEmail).valid).toBe(false);
        });
    });

    describe('validatePassword', () => {
        it('should validate strong passwords', () => {
            expect(validatePassword('StrongPass123!').valid).toBe(true);
            expect(validatePassword('MyP@ssw0rd').valid).toBe(true);
        });

        it('should reject weak passwords', () => {
            expect(validatePassword('short').valid).toBe(false);
            expect(validatePassword('alllowercase').valid).toBe(false);
            expect(validatePassword('ALLUPPERCASE').valid).toBe(false);
            expect(validatePassword('NoNumbers!').valid).toBe(false);
        });

        it('should require minimum length', () => {
            expect(validatePassword('Short1!').valid).toBe(false);
            expect(validatePassword('LongEnough1!').valid).toBe(true);
        });
    });

    describe('validatePhone', () => {
        it('should validate correct phone numbers', () => {
            expect(validatePhone('+1234567890').valid).toBe(true);
            expect(validatePhone('+44 20 7946 0958').valid).toBe(true);
            expect(validatePhone('1234567890').valid).toBe(true);
        });

        it('should reject invalid phone numbers', () => {
            expect(validatePhone('123').valid).toBe(false);
            expect(validatePhone('abcdefghij').valid).toBe(false);
            expect(validatePhone('').valid).toBe(false);
        });
    });

    describe('validateUUID', () => {
        it('should validate correct UUIDs', () => {
            expect(validateUUID('123e4567-e89b-12d3-a456-426614174000').valid).toBe(true);
            expect(validateUUID('550e8400-e29b-41d4-a716-446655440000').valid).toBe(true);
        });

        it('should reject invalid UUIDs', () => {
            expect(validateUUID('not-a-uuid').valid).toBe(false);
            expect(validateUUID('123e4567-e89b-12d3-a456').valid).toBe(false);
            expect(validateUUID('').valid).toBe(false);
        });
    });

    describe('validateBusinessRegistration', () => {
        it('should validate correct business registration numbers', () => {
            expect(validateBusinessRegistration('TL123456').valid).toBe(true);
            expect(validateBusinessRegistration('REG-2024-001').valid).toBe(true);
        });

        it('should reject invalid registration numbers', () => {
            expect(validateBusinessRegistration('AB').valid).toBe(false);
            expect(validateBusinessRegistration('').valid).toBe(false);
        });
    });

    describe('sanitizeInput', () => {
        it('should remove HTML tags', () => {
            expect(sanitizeInput('<script>alert("xss")</script>')).toBe('');
            expect(sanitizeInput('Hello <b>World</b>')).toBe('Hello World');
        });

        it('should trim whitespace', () => {
            expect(sanitizeInput('  hello  ')).toBe('hello');
            expect(sanitizeInput('\n\ttest\n\t')).toBe('test');
        });

        it('should handle normal text', () => {
            expect(sanitizeInput('Normal text')).toBe('Normal text');
            expect(sanitizeInput('Text with numbers 123')).toBe('Text with numbers 123');
        });
    });
});
