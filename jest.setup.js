import '@testing-library/jest-dom';

// Mock environment variables for tests
process.env.JWT_SECRET = 'test-jwt-secret-min-32-characters-long';
process.env.REFRESH_SECRET = 'test-refresh-secret-min-32-characters-long';
process.env.ENCRYPTION_KEY = 'test-encryption-key-min-32-characters-long';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'rent_to_own_test';
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'postgres';
