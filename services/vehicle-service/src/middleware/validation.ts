import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '@rent-to-own/errors';

export interface ValidationSchema {
  body?: Record<string, (value: any) => boolean | string>;
  params?: Record<string, (value: any) => boolean | string>;
  query?: Record<string, (value: any) => boolean | string>;
}

export function validate(schema: ValidationSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate body
      if (schema.body) {
        for (const [field, validator] of Object.entries(schema.body)) {
          const value = req.body[field];
          const result = validator(value);
          if (result !== true) {
            throw new ValidationError(
              typeof result === 'string' ? result : `Invalid value for field: ${field}`
            );
          }
        }
      }

      // Validate params
      if (schema.params) {
        for (const [field, validator] of Object.entries(schema.params)) {
          const value = req.params[field];
          const result = validator(value);
          if (result !== true) {
            throw new ValidationError(
              typeof result === 'string' ? result : `Invalid value for parameter: ${field}`
            );
          }
        }
      }

      // Validate query
      if (schema.query) {
        for (const [field, validator] of Object.entries(schema.query)) {
          const value = req.query[field];
          if (value !== undefined) {
            const result = validator(value);
            if (result !== true) {
              throw new ValidationError(
                typeof result === 'string' ? result : `Invalid value for query parameter: ${field}`
              );
            }
          }
        }
      }

      next();
    } catch (error: any) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          error: { message: error.message, code: error.code },
        });
      }
      throw error;
    }
  };
}

// Common validators
export const validators = {
  required: (value: any) => {
    if (value === undefined || value === null || value === '') {
      return 'This field is required';
    }
    return true;
  },
  uuid: (value: any) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) {
      return 'Invalid UUID format';
    }
    return true;
  },
  positiveNumber: (value: any) => {
    const num = parseFloat(value);
    if (isNaN(num) || num <= 0) {
      return 'Must be a positive number';
    }
    return true;
  },
  nonNegativeNumber: (value: any) => {
    const num = parseFloat(value);
    if (isNaN(num) || num < 0) {
      return 'Must be a non-negative number';
    }
    return true;
  },
  integer: (value: any) => {
    const num = parseInt(value);
    if (isNaN(num) || !Number.isInteger(parseFloat(value))) {
      return 'Must be an integer';
    }
    return true;
  },
  year: (value: any) => {
    const year = parseInt(value);
    const currentYear = new Date().getFullYear();
    if (isNaN(year) || year < 1900 || year > currentYear + 1) {
      return `Year must be between 1900 and ${currentYear + 1}`;
    }
    return true;
  },
  enum: (allowedValues: string[]) => (value: any) => {
    if (!allowedValues.includes(value)) {
      return `Must be one of: ${allowedValues.join(', ')}`;
    }
    return true;
  },
  array: (value: any) => {
    if (!Array.isArray(value)) {
      return 'Must be an array';
    }
    return true;
  },
  string: (minLength?: number, maxLength?: number) => (value: any) => {
    if (typeof value !== 'string') {
      return 'Must be a string';
    }
    if (minLength !== undefined && value.length < minLength) {
      return `Must be at least ${minLength} characters`;
    }
    if (maxLength !== undefined && value.length > maxLength) {
      return `Must be at most ${maxLength} characters`;
    }
    return true;
  },
  email: (value: any) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return 'Invalid email format';
    }
    return true;
  },
  date: (value: any) => {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return 'Invalid date format';
    }
    return true;
  },
  futureDate: (value: any) => {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return 'Invalid date format';
    }
    if (date <= new Date()) {
      return 'Date must be in the future';
    }
    return true;
  },
};

