import sharp from 'sharp';
import { createError } from './customError.js';
import logger from './logger.js';

// Constants
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif'];
const IMAGE_QUALITY = 80;

// Utility Functions

/**
 * Generates a URL for the avatar.
 * @param {string} filename - The filename of the avatar.
 * @returns {string|null} - The URL of the avatar or null if filename is not provided.
 */
const generateAvatarUrl = (filename) => {
    if (!filename) return null;
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    return `${baseUrl}/uploads/avatars/${filename}`;
};

/**
 * Generates a URL for the cover photo.
 * @param {string} filename - The filename of the cover photo.
 * @returns {string|null} - The URL of the cover photo or null if filename is not provided.
 */
const generateCoverPhotoUrl = (filename) => {
    if (!filename) return null;
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    return `${baseUrl}/uploads/covers/${filename}`;
};

/**
 * Handles the upload and processing of a cover photo.
 * @param {object} file - The file object containing path and filename.
 * @param {string|null} oldCoverPath - The path to the old cover photo.
 * @returns {string|null} - The URL of the new cover photo or null.
 */
export async function handleCoverPhotoUpload(file, oldCoverUrl = null) {
    try {
        if (!file) return null;

        const imageUrl = await handleImageUpload(file, 'covers');

        // Delete old cover photo if it exists
        if (oldCoverUrl) {
            await deleteFileFromStorage(oldCoverUrl).catch(err =>
                logger.error('Error deleting old cover photo:', err)
            );
        }

        return imageUrl;
    } catch (error) {
        logger.error('Cover photo upload error:', error);
        throw createError('9999', 'Failed to process cover photo upload');
    }
}

/**
 * Handles the upload and processing of an avatar.
 * @param {object} file - The file object containing path and filename.
 * @param {string|null} oldAvatarPath - The path to the old avatar.
 * @returns {string|null} - The URL of the new avatar or null.
 */
export async function handleAvatarUpload(file, oldAvatarUrl = null) {
    try {
        if (!file) return null;

        const imageUrl = await handleImageUpload(file, 'avatars');

        // Delete old avatar if it exists
        if (oldAvatarUrl) {
            await deleteFileFromStorage(oldAvatarUrl).catch(err =>
                logger.error('Error deleting old avatar:', err)
            );
        }

        return imageUrl;
    } catch (error) {
        logger.error('Avatar upload error:', error);
        throw createError('9999', 'Failed to process avatar upload');
    }
}

export async function handleImageUpload(file, folder = 'general') {
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
        switch (metadata.format) {
            case 'jpeg':
            case 'jpg':
                processedBuffer = await image.jpeg({ quality: IMAGE_QUALITY }).toBuffer();
                fileExtension = 'jpg';
                break;
            case 'png':
                processedBuffer = await image.png({ compressionLevel: 9 }).toBuffer();
                fileExtension = 'png';
                break;
            case 'gif':
                processedBuffer = await image.gif().toBuffer();
                fileExtension = 'gif';
                break;
            default:
                processedBuffer = await image.jpeg({ quality: IMAGE_QUALITY }).toBuffer();
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
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;

        logger.info(`Successfully uploaded image to Firebase Storage: ${publicUrl}`);
        return publicUrl;

    } catch (error) {
        logger.error('Error in handleImageUpload:', error);
        throw error.code ? error : createError('1007', 'Failed to process image');
    }
}

async function deleteFileFromStorage(fileUrl) {
    try {
        if (!fileUrl) return;

        const bucket = admin.storage().bucket();
        const fileName = fileUrl.split('/').pop();

        await bucket.file(fileName).delete();
        logger.info(`Successfully deleted file: ${fileName}`);
    } catch (error) {
        logger.error('Error deleting file from storage:', error);
        throw error;
    }
}

export {
    generateAvatarUrl,
    generateCoverPhotoUrl,
};
