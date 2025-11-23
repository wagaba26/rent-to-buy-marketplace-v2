/**
 * Input Validation and Sanitization Utilities
 */

/**
 * Email validation
 */
export function validateEmail(email: string): { valid: boolean; error?: string } {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email || typeof email !== 'string') {
        return { valid: false, error: 'Email is required' };
    }

    if (!emailRegex.test(email)) {
        return { valid: false, error: 'Invalid email format' };
    }

    if (email.length > 255) {
        return { valid: false, error: 'Email is too long' };
    }

    return { valid: true };
}

/**
 * Password strength validation
 * Requirements: min 8 chars, uppercase, lowercase, number, special character
 */
export function validatePassword(password: string): { valid: boolean; error?: string } {
    if (!password || typeof password !== 'string') {
        return { valid: false, error: 'Password is required' };
    }

    if (password.length < 8) {
        return { valid: false, error: 'Password must be at least 8 characters long' };
    }

    if (password.length > 128) {
        return { valid: false, error: 'Password is too long' };
    }

    if (!/[A-Z]/.test(password)) {
        return { valid: false, error: 'Password must contain at least one uppercase letter' };
    }

    if (!/[a-z]/.test(password)) {
        return { valid: false, error: 'Password must contain at least one lowercase letter' };
    }

    if (!/[0-9]/.test(password)) {
        return { valid: false, error: 'Password must contain at least one number' };
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        return { valid: false, error: 'Password must contain at least one special character' };
    }

    return { valid: true };
}

/**
 * Phone number validation (international format)
 */
export function validatePhoneNumber(phone: string): { valid: boolean; error?: string } {
    if (!phone || typeof phone !== 'string') {
        return { valid: false, error: 'Phone number is required' };
    }

    // Remove spaces, dashes, and parentheses
    const cleaned = phone.replace(/[\s\-()]/g, '');

    // Check if it starts with + and contains only digits after that
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;

    if (!phoneRegex.test(cleaned)) {
        return { valid: false, error: 'Invalid phone number format' };
    }

    return { valid: true };
}

/**
 * Business registration number validation
 */
export function validateBusinessRegistration(regNumber: string): { valid: boolean; error?: string } {
    if (!regNumber || typeof regNumber !== 'string') {
        return { valid: false, error: 'Business registration number is required' };
    }

    // Remove spaces and dashes
    const cleaned = regNumber.replace(/[\s\-]/g, '');

    if (cleaned.length < 5 || cleaned.length > 50) {
        return { valid: false, error: 'Invalid business registration number length' };
    }

    // Allow alphanumeric characters
    if (!/^[A-Z0-9]+$/i.test(cleaned)) {
        return { valid: false, error: 'Business registration number must be alphanumeric' };
    }

    return { valid: true };
}

/**
 * UUID validation
 */
export function validateUUID(uuid: string): { valid: boolean; error?: string } {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuid || typeof uuid !== 'string') {
        return { valid: false, error: 'Invalid UUID' };
    }

    if (!uuidRegex.test(uuid)) {
        return { valid: false, error: 'Invalid UUID format' };
    }

    return { valid: true };
}

/**
 * Sanitize string input (prevent XSS)
 */
export function sanitizeString(input: string): string {
    if (!input || typeof input !== 'string') {
        return '';
    }

    return input
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;')
        .trim();
}

/**
 * Sanitize SQL input (prevent SQL injection)
 * Note: This is a basic sanitizer. Always use parameterized queries!
 */
export function sanitizeSQL(input: string): string {
    if (!input || typeof input !== 'string') {
        return '';
    }

    // Remove common SQL injection patterns
    return input
        .replace(/['";]/g, '')
        .replace(/--/g, '')
        .replace(/\/\*/g, '')
        .replace(/\*\//g, '')
        .replace(/xp_/gi, '')
        .replace(/exec/gi, '')
        .replace(/execute/gi, '')
        .replace(/drop/gi, '')
        .replace(/union/gi, '')
        .trim();
}

/**
 * Validate and sanitize object with schema
 */
export function validateObject<T>(
    obj: any,
    schema: {
        [K in keyof T]: {
            required?: boolean;
            type: 'string' | 'number' | 'boolean' | 'email' | 'phone' | 'uuid';
            minLength?: number;
            maxLength?: number;
            min?: number;
            max?: number;
            pattern?: RegExp;
            sanitize?: boolean;
        };
    }
): { valid: boolean; errors: string[]; data?: Partial<T> } {
    const errors: string[] = [];
    const data: any = {};

    for (const [key, rules] of Object.entries(schema)) {
        const value = obj[key];

        // Check required
        if (rules.required && (value === undefined || value === null || value === '')) {
            errors.push(`${key} is required`);
            continue;
        }

        // Skip if not required and not provided
        if (!rules.required && (value === undefined || value === null || value === '')) {
            continue;
        }

        // Type validation
        switch (rules.type) {
            case 'string':
                if (typeof value !== 'string') {
                    errors.push(`${key} must be a string`);
                    continue;
                }
                if (rules.minLength && value.length < rules.minLength) {
                    errors.push(`${key} must be at least ${rules.minLength} characters`);
                    continue;
                }
                if (rules.maxLength && value.length > rules.maxLength) {
                    errors.push(`${key} must be at most ${rules.maxLength} characters`);
                    continue;
                }
                if (rules.pattern && !rules.pattern.test(value)) {
                    errors.push(`${key} has invalid format`);
                    continue;
                }
                data[key] = rules.sanitize ? sanitizeString(value) : value;
                break;

            case 'email':
                const emailValidation = validateEmail(value);
                if (!emailValidation.valid) {
                    errors.push(emailValidation.error!);
                    continue;
                }
                data[key] = value.toLowerCase().trim();
                break;

            case 'phone':
                const phoneValidation = validatePhoneNumber(value);
                if (!phoneValidation.valid) {
                    errors.push(phoneValidation.error!);
                    continue;
                }
                data[key] = value.replace(/[\s\-()]/g, '');
                break;

            case 'uuid':
                const uuidValidation = validateUUID(value);
                if (!uuidValidation.valid) {
                    errors.push(uuidValidation.error!);
                    continue;
                }
                data[key] = value;
                break;

            case 'number':
                const num = Number(value);
                if (isNaN(num)) {
                    errors.push(`${key} must be a number`);
                    continue;
                }
                if (rules.min !== undefined && num < rules.min) {
                    errors.push(`${key} must be at least ${rules.min}`);
                    continue;
                }
                if (rules.max !== undefined && num > rules.max) {
                    errors.push(`${key} must be at most ${rules.max}`);
                    continue;
                }
                data[key] = num;
                break;

            case 'boolean':
                if (typeof value !== 'boolean') {
                    errors.push(`${key} must be a boolean`);
                    continue;
                }
                data[key] = value;
                break;
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        data: errors.length === 0 ? data : undefined,
    };
}

/**
 * Validate file upload
 */
export function validateFileUpload(
    file: { name: string; size: number; type: string },
    options: {
        maxSize?: number; // in bytes
        allowedTypes?: string[];
        allowedExtensions?: string[];
    } = {}
): { valid: boolean; error?: string } {
    const {
        maxSize = 5 * 1024 * 1024, // 5MB default
        allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
        allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf'],
    } = options;

    // Check file size
    if (file.size > maxSize) {
        return {
            valid: false,
            error: `File size must be less than ${maxSize / 1024 / 1024}MB`,
        };
    }

    // Check file type
    if (!allowedTypes.includes(file.type)) {
        return {
            valid: false,
            error: `File type ${file.type} is not allowed`,
        };
    }

    // Check file extension
    const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!allowedExtensions.includes(extension)) {
        return {
            valid: false,
            error: `File extension ${extension} is not allowed`,
        };
    }

    return { valid: true };
}
