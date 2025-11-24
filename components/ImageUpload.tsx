'use client';

import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

interface ImageUploadProps {
    images: string[];
    onChange: (images: string[]) => void;
    maxImages?: number;
    maxSizeMB?: number;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
    images,
    onChange,
    maxImages = 5,
    maxSizeMB = 5,
}) => {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        // Check if adding these files would exceed max
        if (images.length + files.length > maxImages) {
            setError(`Maximum ${maxImages} images allowed`);
            return;
        }

        setError('');
        setUploading(true);

        try {
            const formData = new FormData();
            files.forEach((file) => {
                // Check file size
                if (file.size > maxSizeMB * 1024 * 1024) {
                    throw new Error(`File ${file.name} exceeds ${maxSizeMB}MB`);
                }
                formData.append('images', file);
            });

            const response = await fetch('/api/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                },
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            const data = await response.json();
            if (data.success && data.data.urls) {
                onChange([...images, ...data.data.urls]);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to upload images');
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const removeImage = (index: number) => {
        const newImages = images.filter((_, i) => i !== index);
        onChange(newImages);
    };

    return (
        <div className="space-y-4">
            {/* Upload Button */}
            <div className="flex items-center gap-4">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={uploading || images.length >= maxImages}
                />
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading || images.length >= maxImages}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                >
                    <Upload className="w-4 h-4" />
                    {uploading ? 'Uploading...' : 'Upload Images'}
                </button>
                <span className="text-sm text-text-secondary">
                    {images.length}/{maxImages} images
                </span>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-error/10 border border-error/20 text-error px-4 py-2 rounded-lg text-sm">
                    {error}
                </div>
            )}

            {/* Image Previews */}
            {images.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {images.map((url, index) => (
                        <div key={index} className="relative group aspect-square rounded-lg overflow-hidden bg-bg-tertiary border border-border-secondary">
                            <img
                                src={url}
                                alt={`Upload ${index + 1}`}
                                className="w-full h-full object-cover"
                            />
                            <button
                                type="button"
                                onClick={() => removeImage(index)}
                                className="absolute top-2 right-2 w-6 h-6 bg-error text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-error/80"
                            >
                                <X className="w-4 h-4" />
                            </button>
                            {index === 0 && (
                                <div className="absolute bottom-2 left-2 px-2 py-1 bg-primary text-white text-xs rounded">
                                    Primary
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {images.length === 0 && !uploading && (
                <div className="border-2 border-dashed border-border-secondary rounded-lg p-8 text-center">
                    <ImageIcon className="w-12 h-12 text-text-muted mx-auto mb-3" />
                    <p className="text-text-secondary mb-2">No images uploaded yet</p>
                    <p className="text-sm text-text-muted">Click "Upload Images" to add photos</p>
                </div>
            )}
        </div>
    );
};
