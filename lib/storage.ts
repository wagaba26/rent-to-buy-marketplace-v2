/**
 * Secure File Storage Service
 * Handles file uploads to private storage with security validations
 */

import * as crypto from 'crypto';
import * as path from 'path';
import * as fs from 'fs/promises';

export interface UploadedFile {
    id: string;
    originalName: string;
    storedName: string;
    path: string;
    size: number;
    mimeType: string;
    uploadedAt: Date;
}

export class StorageService {
    private basePath: string;

    constructor(basePath: string = './uploads') {
        this.basePath = basePath;
    }

    /**
     * Initialize storage directories
     */
    async initialize(): Promise<void> {
        const directories = [
            path.join(this.basePath, 'retailers'),
            path.join(this.basePath, 'customers'),
            path.join(this.basePath, 'vehicles'),
            path.join(this.basePath, 'applications'),
        ];

        for (const dir of directories) {
            try {
                await fs.mkdir(dir, { recursive: true });
            } catch (error) {
                console.error(`Failed to create directory ${dir}:`, error);
            }
        }
    }

    /**
     * Upload file to secure storage
     */
    async uploadFile(
        file: Buffer,
        originalName: string,
        mimeType: string,
        category: 'retailers' | 'customers' | 'vehicles' | 'applications'
    ): Promise<UploadedFile> {
        // Generate unique filename
        const fileId = crypto.randomBytes(16).toString('hex');
        const extension = path.extname(originalName);
        const storedName = `${fileId}${extension}`;
        const filePath = path.join(this.basePath, category, storedName);

        // Write file
        await fs.writeFile(filePath, file);

        return {
            id: fileId,
            originalName,
            storedName,
            path: filePath,
            size: file.length,
            mimeType,
            uploadedAt: new Date(),
        };
    }

    /**
     * Get file from storage
     */
    async getFile(
        fileId: string,
        category: 'retailers' | 'customers' | 'vehicles' | 'applications'
    ): Promise<Buffer | null> {
        try {
            // Find file with this ID
            const dirPath = path.join(this.basePath, category);
            const files = await fs.readdir(dirPath);

            const matchingFile = files.find(f => f.startsWith(fileId));

            if (!matchingFile) {
                return null;
            }

            const filePath = path.join(dirPath, matchingFile);
            return await fs.readFile(filePath);
        } catch (error) {
            console.error('Failed to read file:', error);
            return null;
        }
    }

    /**
     * Delete file from storage
     */
    async deleteFile(
        fileId: string,
        category: 'retailers' | 'customers' | 'vehicles' | 'applications'
    ): Promise<boolean> {
        try {
            const dirPath = path.join(this.basePath, category);
            const files = await fs.readdir(dirPath);

            const matchingFile = files.find(f => f.startsWith(fileId));

            if (!matchingFile) {
                return false;
            }

            const filePath = path.join(dirPath, matchingFile);
            await fs.unlink(filePath);
            return true;
        } catch (error) {
            console.error('Failed to delete file:', error);
            return false;
        }
    }

    /**
     * Generate signed URL for temporary access (for future cloud storage integration)
     */
    generateSignedUrl(fileId: string, expiresIn: number = 3600): string {
        // For local storage, return a token-based URL
        const token = crypto
            .createHmac('sha256', process.env.STORAGE_SECRET || 'storage-secret')
            .update(`${fileId}:${Date.now() + expiresIn * 1000}`)
            .digest('hex');

        return `/api/files/${fileId}?token=${token}&expires=${Date.now() + expiresIn * 1000}`;
    }

    /**
     * Verify signed URL token
     */
    verifySignedUrl(fileId: string, token: string, expires: number): boolean {
        if (Date.now() > expires) {
            return false;
        }

        const expectedToken = crypto
            .createHmac('sha256', process.env.STORAGE_SECRET || 'storage-secret')
            .update(`${fileId}:${expires}`)
            .digest('hex');

        return token === expectedToken;
    }
}

// Export singleton instance
export const storage = new StorageService(
    process.env.UPLOAD_PATH || './uploads'
);

// Initialize on import
storage.initialize().catch(console.error);
