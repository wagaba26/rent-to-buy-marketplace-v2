import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const images = formData.getAll('images') as File[];

        if (!images || images.length === 0) {
            return NextResponse.json(
                { success: false, error: 'No images provided' },
                { status: 400 }
            );
        }

        // Create uploads directory if it doesn't exist
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'vehicles');
        if (!existsSync(uploadsDir)) {
            await mkdir(uploadsDir, { recursive: true });
        }

        const uploadedUrls: string[] = [];

        for (const image of images) {
            // Validate file type
            if (!image.type.startsWith('image/')) {
                continue;
            }

            // Generate unique filename
            const timestamp = Date.now();
            const randomString = Math.random().toString(36).substring(7);
            const extension = image.name.split('.').pop();
            const filename = `${timestamp}-${randomString}.${extension}`;

            // Convert file to buffer and save
            const bytes = await image.arrayBuffer();
            const buffer = Buffer.from(bytes);

            const filepath = path.join(uploadsDir, filename);
            await writeFile(filepath, buffer);

            // Store relative URL
            uploadedUrls.push(`/uploads/vehicles/${filename}`);
        }

        return NextResponse.json({
            success: true,
            data: {
                urls: uploadedUrls,
            },
        });
    } catch (error: any) {
        console.error('Upload error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Upload failed' },
            { status: 500 }
        );
    }
}

// Configure max file size (5MB)
export const config = {
    api: {
        bodyParser: {
            sizeLimit: '5mb',
        },
    },
};
