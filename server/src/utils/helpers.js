import sharp from 'sharp';
import { createError } from './customError.js';
import logger from './logger.js';
import admin from 'firebase-admin';

// Constants
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif'];
const IMAGE_QUALITY = 80;

// Utility Functions

/**
 * Handles the upload and processing of a cover photo.
 * @param {object} file - The file object containing path and filename.
 * @param {string|null} oldCoverPath - The path to the old cover photo.
 * @returns {string|null} - The URL of the new cover photo or null.
 */
async function handleAvatarUpload(file, userId) {
    try {
        if (!file) return null;

        // Process và compress ảnh
        const processedImage = await handleImageUpload(file, `avatars/${userId}`);

        await cleanupFiles(file);

        return processedImage;

    } catch (error) {
        await cleanupFiles(file);
        logger.error('Avatar upload error:', error);
        throw createError('9999', 'Failed to process avatar upload');
    }
}

async function handleCoverPhotoUpload(file, userId) {
    try {
        if (!file) return null;

        const processedImage = await handleImageUpload(file, `covers/${userId}`);

        await cleanupFiles(file);

        return processedImage;

    } catch (error) {
        await cleanupFiles(file);
        logger.error('Cover photo upload error:', error);
        throw createError('9999', 'Failed to process cover photo upload');
    }
}

async function handleImageUpload(file, folder = 'general') {
    try {
        // Validate file
        if (!file || !file.buffer) {
            throw createError('1002', 'Invalid file');
        }

        // Validate mime type
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            throw createError('1004', 'Invalid file type. Allowed types: JPG, PNG, GIF');
        }

        // Validate file size
        if (file.size > MAX_IMAGE_SIZE) {
            throw createError('1006', 'File size exceeds 5MB limit');
        }

        // Process image with sharp
        const image = sharp(file.buffer);
        const metadata = await image.metadata();

        // Resize if necessary (maintaining aspect ratio)
        if (metadata.width > 2048 || metadata.height > 2048) {
            image.resize(2048, 2048, {
                fit: 'inside',
                withoutEnlargement: true
            });
        }

        // Optimize based on format
        let processedBuffer;
        let fileExtension;

        // First resize the image while maintaining aspect ratio
        const resizedImage = await image
            .resize(1920, 1080, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .rotate(); // Auto-rotate based on EXIF

        switch (metadata.format) {
            case 'jpeg':
            case 'jpg':
                processedBuffer = await resizedImage
                    .jpeg({
                        quality: IMAGE_QUALITY,
                        progressive: true,
                        mozjpeg: true,
                        chromaSubsampling: '4:4:4'
                    })
                    .toBuffer();
                fileExtension = 'jpg';
                break;

            case 'png':
                processedBuffer = await resizedImage
                    .png({
                        compressionLevel: 9,
                        palette: true,
                        quality: IMAGE_QUALITY,
                        adaptiveFiltering: true
                    })
                    .toBuffer();
                fileExtension = 'png';
                break;

            case 'gif':
                processedBuffer = await resizedImage
                    .gif({
                        reoptimize: true,
                        colors: 256
                    })
                    .toBuffer();
                fileExtension = 'gif';
                break;

            default:
                processedBuffer = await resizedImage
                    .jpeg({ quality: IMAGE_QUALITY })
                    .toBuffer();
                fileExtension = 'jpg';
        }

        // Generate unique filename
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const filename = `${folder}/${timestamp}-${randomString}.${fileExtension}`;

        // Get Firebase Storage bucket
        const bucket = admin.storage().bucket();

        // Upload to Firebase Storage
        const fileUpload = bucket.file(filename);

        // Upload with proper content type and metadata
        await fileUpload.save(processedBuffer, {
            metadata: {
                contentType: `image/${fileExtension}`,
                metadata: {
                    originalName: file.originalname,
                    processed: true
                }
            }
        });

        // Make the file publicly accessible
        await fileUpload.makePublic();

        // Get the public URL
        const [url] = await fileUpload.getSignedUrl({
            action: 'read',
            expires: '03-01-2500'
        });

        logger.info(`Successfully uploaded image to Firebase Storage: ${url}`);
        return url;

    } catch (error) {
        logger.error('Firebase upload failed:', error);
        throw createError('1007', 'Failed to upload image');
    }
}

async function deleteFileFromStorage(url) {
    try {
        if (!url) return;

        // Extract filename from Firebase Storage URL
        const bucket = admin.storage().bucket();
        const decodedUrl = decodeURIComponent(url);
        const startIndex = decodedUrl.indexOf('/o/') + 3;
        const endIndex = decodedUrl.indexOf('?');
        const filename = decodedUrl.substring(startIndex, endIndex);

        await bucket.file(filename).delete();

    } catch (error) {
        logger.error('Error deleting file:', error);
    }
}

const cleanupFiles = async (files) => {
    try {
        if (!files) return;

        const deletePromises = Array.isArray(files)
            ? files.map(file => fs.unlink(file.path))
            : [fs.unlink(files.path)];

        await Promise.all(deletePromises);
        logger.info('Temporary files cleaned up successfully');
    } catch (error) {
        logger.error('Error cleaning up files:', error);
    }
};

export {
    deleteFileFromStorage,
    cleanupFiles,
    handleImageUpload,
    handleAvatarUpload,
    handleCoverPhotoUpload,
};
