import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { createError } from './customError.js';
import logger from './logger.js';
import crypto from 'crypto';

// Constants
const MAX_IMAGE_WIDTH = 1024;
const MAX_IMAGE_HEIGHT = 1024;
const MIN_IMAGE_WIDTH = 100;
const MIN_IMAGE_HEIGHT = 100;
const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
const AVATAR_DIR = path.join(UPLOAD_DIR, 'avatars');
const COVER_DIR = path.join(UPLOAD_DIR, 'covers');
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png'];
const MAX_FILENAME_LENGTH = 255;

// Utility Functions

/**
 * Generates a secure random filename to prevent collisions and injection.
 * @param {string} originalName - The original filename.
 * @returns {string} - A sanitized and unique filename.
 */
const generateSecureFilename = (originalName) => {
    const ext = path.extname(originalName).toLowerCase();
    const baseName = path.basename(originalName, ext).replace(/[^a-zA-Z0-9-_]/g, '');
    const uniqueSuffix = crypto.randomBytes(8).toString('hex');
    return `${baseName}-${uniqueSuffix}${ext}`;
};

/**
 * Validates the filename for allowed characters and extensions.
 * @param {string} filename - The filename to validate.
 * @throws Will throw an error if the filename is invalid.
 */
const validateFilename = (filename) => {
    if (typeof filename !== 'string') {
        throw createError('1003', 'Filename must be a string');
    }

    if (filename.length > MAX_FILENAME_LENGTH) {
        throw createError('1004', `Filename exceeds maximum length of ${MAX_FILENAME_LENGTH} characters`);
    }

    const ext = path.extname(filename).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
        throw createError('1005', `Unsupported file extension: ${ext}`);
    }

    // Additional sanitization can be added here if necessary
};

/**
 * Validates and resolves the file path within the base directory.
 * @param {string} filePath - The file path to validate.
 * @param {string} baseDir - The base directory.
 * @returns {string} - The validated and resolved file path.
 */
const validatePath = (filePath, baseDir) => {
    const resolvedPath = path.resolve(baseDir, filePath);
    if (!resolvedPath.startsWith(baseDir)) {
        logger.error(`Invalid file path: ${filePath}. Resolved path: ${resolvedPath}`);
        throw createError('1001', 'Invalid file path');
    }
    logger.info(`Validated file path: ${resolvedPath}`);
    return resolvedPath;
};

/**
 * Safely deletes a file within the base directory.
 * @param {string} filePath - The path of the file to delete.
 * @param {string} baseDir - The base directory.
 */
const safeUnlink = async (filePath, baseDir) => {
    try {
        const resolvedPath = validatePath(filePath, baseDir);
        await fs.unlink(resolvedPath);
        logger.info(`Successfully deleted file: ${resolvedPath}`);
    } catch (err) {
        if (err.code !== 'ENOENT') { // Ignore "file not found" errors
            logger.error(`Error deleting file at ${filePath}:`, err);
        } else {
            logger.warn(`File not found, skipping deletion: ${filePath}`);
        }
    }
};

/**
 * Safely renames a file within the base directory.
 * @param {string} oldPath - The current path of the file.
 * @param {string} newPath - The new path for the file.
 * @param {string} baseDir - The base directory.
 */
const safeRename = async (oldPath, newPath, baseDir) => {
    try {
        const resolvedOldPath = validatePath(oldPath, baseDir);
        const resolvedNewPath = validatePath(newPath, baseDir);
        await fs.rename(resolvedOldPath, resolvedNewPath);
        logger.info(`Successfully renamed file from ${resolvedOldPath} to ${resolvedNewPath}`);
    } catch (err) {
        logger.error(`Error renaming file from ${oldPath} to ${newPath}:`, err);
        throw err;
    }
};

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
 * Validates and processes an image file.
 * @param {object} file - The file object containing path and filename.
 * @returns {boolean} - Returns true if processing is successful.
 */
const validateAndProcessImage = async (file) => {
    try {
        validateFilename(file.filename);
        const baseDir = UPLOAD_DIR;

        // Validate file path
        const filePath = validatePath(file.path, baseDir);

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
        await safeUnlink(`${file.path}_resized`, path.dirname(file.path));
        await safeUnlink(`${file.path}_optimized`, path.dirname(file.path));
        throw error;
    }
};

/**
 * Handles the upload and processing of a cover photo.
 * @param {object} file - The file object containing path and filename.
 * @param {string|null} oldCoverPath - The path to the old cover photo.
 * @returns {string|null} - The URL of the new cover photo or null.
 */
const handleCoverPhotoUpload = async (file, oldCoverPath = null) => {
    try {
        if (!file) return null;

        // Sanitize and generate a secure filename
        const secureFilename = generateSecureFilename(file.filename);
        file.filename = secureFilename;

        // Define the base directory for cover photos
        const uploadDir = COVER_DIR;

        // Ensure the upload directory exists
        await fs.mkdir(uploadDir, { recursive: true });

        // Define the secure file path
        const filePath = path.join(uploadDir, secureFilename);

        // Move the file to the cover directory with the secure filename
        await fs.rename(file.path, filePath);

        // Validate and process the image
        await validateAndProcessImage({ path: filePath, filename: secureFilename });

        // Delete the old cover photo if it exists
        if (oldCoverPath) {
            const oldPath = path.join(COVER_DIR, path.basename(oldCoverPath));
            await safeUnlink(oldPath, COVER_DIR);
            logger.info(`Deleted old cover photo: ${oldCoverPath}`);
        }

        // Generate and return the cover photo URL
        const coverPhotoUrl = generateCoverPhotoUrl(secureFilename);
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

/**
 * Handles the upload and processing of an avatar.
 * @param {object} file - The file object containing path and filename.
 * @param {string|null} oldAvatarPath - The path to the old avatar.
 * @returns {string|null} - The URL of the new avatar or null.
 */
const handleAvatarUpload = async (file, oldAvatarPath = null) => {
    try {
        if (!file) return null;

        // Sanitize and generate a secure filename
        const secureFilename = generateSecureFilename(file.filename);
        file.filename = secureFilename;

        // Define the base directory for avatars
        const uploadDir = AVATAR_DIR;

        // Ensure the upload directory exists
        await fs.mkdir(uploadDir, { recursive: true });

        // Define the secure file path
        const filePath = path.join(uploadDir, secureFilename);

        // Move the file to the avatar directory with the secure filename
        await fs.rename(file.path, filePath);

        // Validate and process the image
        await validateAndProcessImage({ path: filePath, filename: secureFilename });

        // Delete the old avatar if it exists
        if (oldAvatarPath) {
            const oldPath = path.join(AVATAR_DIR, path.basename(oldAvatarPath));
            await safeUnlink(oldPath, AVATAR_DIR);
            logger.info(`Deleted old avatar: ${oldAvatarPath}`);
        }

        // Generate and return the avatar URL
        const avatarUrl = generateAvatarUrl(secureFilename);
        return avatarUrl;

    } catch (error) {
        // Clean up files in case of error
        await safeUnlink(file.path, path.dirname(file.path));
        await safeUnlink(`${file.path}_resized`, path.dirname(file.path));
        await safeUnlink(`${file.path}_optimized`, path.dirname(file.path));

        logger.error('Avatar upload error:', error);
        throw createError('9999', 'Failed to process avatar upload');
    }
};

export {
    generateAvatarUrl,
    handleAvatarUpload,
    handleCoverPhotoUpload,
    generateCoverPhotoUrl,
};
