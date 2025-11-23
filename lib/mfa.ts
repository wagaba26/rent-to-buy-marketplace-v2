import * as crypto from 'crypto';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { getDb } from './db';

/**
 * MFA Service using TOTP (Time-based One-Time Password)
 */
export class MFAService {
    /**
     * Generate MFA secret for a user
     */
    static async generateSecret(userId: string, email: string): Promise<{
        secret: string;
        qrCode: string;
        backupCodes: string[];
    }> {
        // Generate TOTP secret
        const secret = speakeasy.generateSecret({
            name: `Rent-to-Buy (${email})`,
            issuer: 'Rent-to-Buy Marketplace',
            length: 32,
        });

        // Generate QR code
        const qrCode = await QRCode.toDataURL(secret.otpauth_url!);

        // Generate backup codes
        const backupCodes = this.generateBackupCodes(8);

        // Store in database (not enabled yet, requires verification)
        const db = getDb();
        await db.query(
            `INSERT INTO mfa_secrets (user_id, secret, backup_codes, enabled)
       VALUES ($1, $2, $3, FALSE)
       ON CONFLICT (user_id) 
       DO UPDATE SET secret = $2, backup_codes = $3, enabled = FALSE, updated_at = CURRENT_TIMESTAMP`,
            [userId, secret.base32, backupCodes]
        );

        return {
            secret: secret.base32,
            qrCode,
            backupCodes,
        };
    }

    /**
     * Verify TOTP token
     */
    static async verifyToken(userId: string, token: string): Promise<boolean> {
        const db = getDb();

        // Get user's secret
        const result = await db.query(
            `SELECT secret FROM mfa_secrets WHERE user_id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            return false;
        }

        const secret = result.rows[0].secret;

        // Verify token
        const verified = speakeasy.totp.verify({
            secret,
            encoding: 'base32',
            token,
            window: 2, // Allow 2 time steps before/after for clock skew
        });

        return verified;
    }

    /**
     * Enable MFA after successful verification
     */
    static async enableMFA(userId: string): Promise<void> {
        const db = getDb();

        await db.query(
            `UPDATE mfa_secrets 
       SET enabled = TRUE, verified_at = CURRENT_TIMESTAMP 
       WHERE user_id = $1`,
            [userId]
        );
    }

    /**
     * Disable MFA
     */
    static async disableMFA(userId: string): Promise<void> {
        const db = getDb();

        await db.query(
            `UPDATE mfa_secrets 
       SET enabled = FALSE 
       WHERE user_id = $1`,
            [userId]
        );
    }

    /**
     * Check if MFA is enabled for user
     */
    static async isMFAEnabled(userId: string): Promise<boolean> {
        const db = getDb();

        const result = await db.query(
            `SELECT enabled FROM mfa_secrets WHERE user_id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            return false;
        }

        return result.rows[0].enabled;
    }

    /**
     * Verify backup code
     */
    static async verifyBackupCode(userId: string, code: string): Promise<boolean> {
        const db = getDb();

        // Get backup codes
        const result = await db.query(
            `SELECT backup_codes FROM mfa_secrets WHERE user_id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            return false;
        }

        const backupCodes: string[] = result.rows[0].backup_codes;

        // Check if code exists
        const codeIndex = backupCodes.indexOf(code);
        if (codeIndex === -1) {
            return false;
        }

        // Remove used backup code
        backupCodes.splice(codeIndex, 1);

        await db.query(
            `UPDATE mfa_secrets 
       SET backup_codes = $1 
       WHERE user_id = $2`,
            [backupCodes, userId]
        );

        return true;
    }

    /**
     * Generate backup codes
     */
    private static generateBackupCodes(count: number = 8): string[] {
        const codes: string[] = [];

        for (let i = 0; i < count; i++) {
            // Generate 8-character alphanumeric code
            const code = crypto.randomBytes(4).toString('hex').toUpperCase();
            codes.push(code);
        }

        return codes;
    }

    /**
     * Regenerate backup codes
     */
    static async regenerateBackupCodes(userId: string): Promise<string[]> {
        const backupCodes = this.generateBackupCodes(8);
        const db = getDb();

        await db.query(
            `UPDATE mfa_secrets 
       SET backup_codes = $1 
       WHERE user_id = $2`,
            [backupCodes, userId]
        );

        return backupCodes;
    }
}
