const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');
const { createError } = require('./customError');
const logger = require('./logger');

// Image processing constants
const MAX_IMAGE_WIDTH = 1024;
const MAX_IMAGE_HEIGHT = 1024;
const MIN_IMAGE_WIDTH = 100;
const MIN_IMAGE_HEIGHT = 100;

const formatPhoneNumber = (phoneNumber) => {
    if (phoneNumber.startsWith('0')) {
        return '+84' + phoneNumber.slice(1);
    }
    return phoneNumber;
};

const generateAvatarUrl = (filename) => {
    if (!filename) return null;
    // In production, this would be your CDN or domain URL
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    return `${baseUrl}/uploads/avatars/${filename}`;
};

const validateAndProcessImage = async (file) => {
    try {
        const image = sharp(file.path);
        const metadata = await image.metadata();

        // Check dimensions
        if (metadata.width < MIN_IMAGE_WIDTH || metadata.height < MIN_IMAGE_HEIGHT) {
            await fs.unlink(file.path); // Clean up invalid file
            throw createError('1002', `Image dimensions too small. Minimum size is ${MIN_IMAGE_WIDTH}x${MIN_IMAGE_HEIGHT} pixels`);
        }

        // Resize if image is too large while maintaining aspect ratio
        if (metadata.width > MAX_IMAGE_WIDTH || metadata.height > MAX_IMAGE_HEIGHT) {
            await image
                .resize(MAX_IMAGE_WIDTH, MAX_IMAGE_HEIGHT, {
                    fit: 'inside',
                    withoutEnlargement: true
                })
                .toFile(file.path + '_resized');

            // Replace original with resized version
            await fs.unlink(file.path);
            await fs.rename(file.path + '_resized', file.path);
        }

        // Optimize the image
        await image
            .jpeg({ quality: 80, progressive: true })
            .png({ compressionLevel: 9, progressive: true })
            .toFile(file.path + '_optimized');

        // Replace original with optimized version
        await fs.unlink(file.path);
        await fs.rename(file.path + '_optimized', file.path);

        return true;
    } catch (error) {
        // Clean up files in case of error
        try {
            await fs.unlink(file.path);
            await fs.unlink(file.path + '_resized').catch(() => {});
            await fs.unlink(file.path + '_optimized').catch(() => {});
        } catch (cleanupError) {
            logger.error('Error cleaning up files:', cleanupError);
        }
        throw error;
    }
};

const handleAvatarUpload = async (file, oldAvatarPath = null) => {
    try {
        if (!file) return null;

        // Create uploads/avatars directory if it doesn't exist
        const uploadDir = path.join(process.cwd(), 'uploads', 'avatars');
        await fs.mkdir(uploadDir, { recursive: true });

        // Delete old avatar if it exists
        if (oldAvatarPath) {
            const fullOldPath = path.join(process.cwd(), oldAvatarPath);
            try {
                await fs.unlink(fullOldPath);
                logger.info(`Deleted old avatar: ${oldAvatarPath}`);
            } catch (err) {
                // Don't throw if old file doesn't exist
                if (err.code !== 'ENOENT') {
                    logger.error('Error deleting old avatar:', err);
                }
            }
        }

        // Validate and process image
        await validateAndProcessImage(file);
        
        // Generate avatar URL for database after successful processing
        const avatarUrl = generateAvatarUrl(file.filename);
        
        return avatarUrl;
    } catch (error) {
        logger.error('Avatar upload error:', error);
        throw createError('9999', 'Failed to process avatar upload');
    }
};

const sanitizeDeviceInfo = (deviceInfo) => {
    if (!deviceInfo) return {};

    const allowed = ['ip', 'userAgent', 'platform', 'isMobile', 'lastUsed', 'lastLocation'];
    const sanitized = {};

    for (const key of allowed) {
        if (deviceInfo[key] !== undefined) {
            sanitized[key] = deviceInfo[key];
        }
    }

    return sanitized;
};

module.exports = {
    formatPhoneNumber,
    generateAvatarUrl,
    handleAvatarUpload,
    sanitizeDeviceInfo
};
