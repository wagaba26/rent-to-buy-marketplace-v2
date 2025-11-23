import { EncryptionService } from './index';
import * as crypto from 'crypto';

describe('EncryptionService', () => {
    let encryptionService: EncryptionService;
    const secretKey = 'test-secret-key-must-be-32-chars!!'; // 32 chars

    // Mock process.env
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv, ENCRYPTION_KEY: secretKey };
        encryptionService = new EncryptionService(secretKey);
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it('should encrypt and decrypt a string correctly', () => {
        const originalText = 'Hello, World!';
        const encryptedText = encryptionService.encrypt(originalText);

        expect(encryptedText).not.toBe(originalText);
        expect(encryptedText).toContain(':'); // IV separator

        const decryptedText = encryptionService.decrypt(encryptedText);
        expect(decryptedText).toBe(originalText);
    });

    it('should generate different encrypted outputs for the same input (random IV)', () => {
        const text = 'Sensitive Data';
        const encrypted1 = encryptionService.encrypt(text);
        const encrypted2 = encryptionService.encrypt(text);

        expect(encrypted1).not.toBe(encrypted2);

        expect(encryptionService.decrypt(encrypted1)).toBe(text);
        expect(encryptionService.decrypt(encrypted2)).toBe(text);
    });

    it('should throw error when decrypting invalid format', () => {
        expect(() => {
            encryptionService.decrypt('invalid-format');
        }).toThrow();
    });

    it('should throw error when decrypting with wrong key', () => {
        const text = 'Secret';
        const encrypted = encryptionService.encrypt(text);

        // Create new service with different key
        const wrongService = new EncryptionService('wrong-secret-key-must-be-32-chars!');

        expect(() => {
            wrongService.decrypt(encrypted);
        }).toThrow();
    });
});
