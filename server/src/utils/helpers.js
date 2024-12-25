import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { createError } from './customError.js';
import logger from './logger.js';

// Image processing constants
const MAX_IMAGE_WIDTH = 1024;
const MAX_IMAGE_HEIGHT = 1024;
const MIN_IMAGE_WIDTH = 100;
const MIN_IMAGE_HEIGHT = 100;
const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
const AVATAR_DIR = path.join(UPLOAD_DIR, 'avatars');
const COVER_DIR = path.join(UPLOAD_DIR, 'covers');


const validatePath = (filePath, baseDir) => {
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(baseDir)) {
        throw createError('1001', 'Invalid file path');
    }
    return resolvedPath;
};

const safeUnlink = async (filePath, baseDir) => {
    try {
        const resolvedPath = validatePath(filePath, baseDir);
        await fs.unlink(resolvedPath);
    } catch (err) {
        if (err.code !== 'ENOENT') {
            logger.error(`Error deleting file ${filePath}:`, err);
        }
    }
};

const safeRename = async (oldPath, newPath, baseDir) => {
    const resolvedOldPath = validatePath(oldPath, baseDir);
    const resolvedNewPath = validatePath(newPath, baseDir);
    await fs.rename(resolvedOldPath, resolvedNewPath);
};

const generateAvatarUrl = (filename) => {
    if (!filename) return null;
    // In production, this would be your CDN or domain URL
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    return `${baseUrl}/uploads/avatars/${filename}`;
};

const generateCoverPhotoUrl = (filename) => {
    if (!filename) return null;
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    return `${baseUrl}/uploads/covers/${filename}`;
};

const validateAndProcessImage = async (file) => {
    try {
        const baseDir = path.dirname(file.path);

        // Validate file path
        const filePath = validatePath(file.path, UPLOAD_DIR);

        const image = sharp(filePath);
        const metadata = await image.metadata();

        // Check dimensions
        if (metadata.width < MIN_IMAGE_WIDTH || metadata.height < MIN_IMAGE_HEIGHT) {
            await safeUnlink(filePath, baseDir);
            throw createError('1002', `Image dimensions too small. Minimum size is ${MIN_IMAGE_WIDTH}x${MIN_IMAGE_HEIGHT} pixels`);
        }

        // Resize if image is too large while maintaining aspect ratio
        if (metadata.width > MAX_IMAGE_WIDTH || metadata.height > MAX_IMAGE_HEIGHT) {
            const resizedPath = `${filePath}_resized`;
            await image
                .resize(MAX_IMAGE_WIDTH, MAX_IMAGE_HEIGHT, {
                    fit: 'inside',
                    withoutEnlargement: true,
                })
                .toFile(resizedPath);

            await safeRename(resizedPath, filePath, baseDir);
        }

        // Optimize the image
        const optimizedPath = `${filePath}_optimized`;
        await image
            .jpeg({ quality: 80, progressive: true })
            .png({ compressionLevel: 9, progressive: true })
            .toFile(optimizedPath);

        await safeRename(optimizedPath, filePath, baseDir);

        return true;
    } catch (error) {
        // Clean up files in case of error
        await safeUnlink(file.path, path.dirname(file.path));
        await safeUnlink(file.path + '_resized', path.dirname(file.path));
        await safeUnlink(file.path + '_optimized', path.dirname(file.path));
        throw error;
    }
};

const handleCoverPhotoUpload = async (file, oldCoverPath = null) => {
    try {
        if (!file) return null;

        // Define the base directory for cover photos
        const uploadDir = COVER_DIR;

        // Validate paths
        const filePath = validatePath(file.path, UPLOAD_DIR);

        // Create uploads/covers directory if it doesn't exist
        await fs.mkdir(uploadDir, { recursive: true });

        // Delete the old cover photo if it exists
        if (oldCoverPath) {
            const oldPath = validatePath(path.join(UPLOAD_DIR, oldCoverPath), UPLOAD_DIR);
            await safeUnlink(oldPath, UPLOAD_DIR);
            logger.info(`Deleted old cover photo: ${oldCoverPath}`);
        }

        // Process the new cover photo
        const image = sharp(filePath);
        const metadata = await image.metadata();

        // Validate dimensions
        if (metadata.width < MIN_IMAGE_WIDTH || metadata.height < MIN_IMAGE_HEIGHT) {
            await safeUnlink(filePath, path.dirname(filePath));
            throw createError('1002', `Cover photo dimensions too small. Minimum size is ${MIN_IMAGE_WIDTH}x${MIN_IMAGE_HEIGHT} pixels`);
        }

        // Resize if necessary while maintaining aspect ratio
        if (metadata.width > MAX_IMAGE_WIDTH || metadata.height > MAX_IMAGE_HEIGHT) {
            const resizedPath = `${filePath}_resized`;
            await image
                .resize(MAX_IMAGE_WIDTH, MAX_IMAGE_HEIGHT, {
                    fit: 'inside',
                    withoutEnlargement: true,
                })
                .toFile(resizedPath);

            await safeRename(resizedPath, filePath, path.dirname(filePath));
        }

        // Optimize the image
        const optimizedPath = `${filePath}_optimized`;
        await image
            .jpeg({ quality: 85, progressive: true })
            .png({ compressionLevel: 8, progressive: true })
            .toFile(optimizedPath);

        await safeRename(optimizedPath, filePath, path.dirname(filePath));

        // Generate and return the cover photo URL
        const coverPhotoUrl = generateCoverPhotoUrl(file.filename);
        return coverPhotoUrl;

    } catch (error) {
        // Clean up files in case of error
        await safeUnlink(file.path, path.dirname(file.path));
        await safeUnlink(`${file.path}_resized`, path.dirname(file.path));
        await safeUnlink(`${file.path}_optimized`, path.dirname(file.path));

        logger.error('Cover photo upload error:', error);
        throw createError('9999', 'Failed to process cover photo upload');
    }
};


const handleAvatarUpload = async (file, oldAvatarPath = null) => {
    try {
        if (!file) return null;

        // Validate paths
        const uploadDir = AVATAR_DIR;
        const filePath = validatePath(file.path, UPLOAD_DIR);

        // Create uploads/avatars directory if it doesn't exist
        await fs.mkdir(uploadDir, { recursive: true });

        // Delete old avatar if it exists
        if (oldAvatarPath) {
            const oldPath = validatePath(path.join(UPLOAD_DIR, oldAvatarPath), UPLOAD_DIR);
            await safeUnlink(oldPath, UPLOAD_DIR);
        }

        // Validate and process image
        await validateAndProcessImage({ path: filePath });

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

export {
    generateAvatarUrl,
    handleAvatarUpload,
    sanitizeDeviceInfo,
    handleCoverPhotoUpload,
    generateCoverPhotoUrl,
};
