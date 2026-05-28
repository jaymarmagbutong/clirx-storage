import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '../auth/jwtHelper.js';

const prisma = new PrismaClient();
const uploadDirectory = path.resolve('uploads');

const MIME_MAP = {
    // Images
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.gif': 'image/gif', '.bmp': 'image/bmp', '.webp': 'image/webp',
    '.svg': 'image/svg+xml', '.tiff': 'image/tiff', '.ico': 'image/x-icon',
    // Videos
    '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.avi': 'video/x-msvideo',
    '.mkv': 'video/x-matroska', '.webm': 'video/webm', '.flv': 'video/x-flv',
    '.wmv': 'video/x-ms-wmv', '.m4v': 'video/x-m4v', '.3gp': 'video/3gpp',
    // Audio
    '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.flac': 'audio/flac',
    '.aac': 'audio/aac', '.ogg': 'audio/ogg', '.m4a': 'audio/x-m4a', '.wma': 'audio/x-ms-wma',
    // Documents
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.txt': 'text/plain', '.md': 'text/markdown', '.csv': 'text/csv',
    // Archives
    '.zip': 'application/zip', '.rar': 'application/vnd.rar',
    '.tar': 'application/x-tar', '.gz': 'application/gzip', '.7z': 'application/x-7z-compressed',
};

/**
 * Looks up the file record and path from the DB.
 * Returns { fileRecord, filePath, stream }.
 */
export const getFile = async (fileName) => {
    const safeFileName = path.basename(fileName); // Prevent directory traversal
    const filePath = path.join(uploadDirectory, safeFileName);

    if (!fs.existsSync(filePath)) {
        throw new Error('File not found');
    }

    const fileRecord = await prisma.file.findUnique({
        where: { uniqueName: safeFileName }
    });

    if (!fileRecord || fileRecord.isDeleted) {
        throw new Error('File not found in database');
    }

    return {
        fileRecord,
        filePath,
        stream: fs.createReadStream(filePath)
    };
};

/**
 * Verifies that the requesting user has access to a private file.
 * Extracts token from query param or Authorization header.
 * Throws an error object with { status, message } on failure.
 */
export const verifyFileAccess = (fileRecord, req) => {
    if (!fileRecord.isPrivate) return; // Public file — no check needed

    let token = req.query.token;
    const authHeader = req.headers['authorization'];
    if (authHeader) {
        const parts = authHeader.split(' ');
        if (parts[1]) token = parts[1];
    }

    if (!token) {
        const err = new Error('Token missing. Private file access requires authentication.');
        err.status = 401;
        throw err;
    }

    try {
        const decoded = verifyToken(token);
        if (decoded.userId !== fileRecord.ownerId) {
            const err = new Error('Forbidden. You do not have permission to access this private file.');
            err.status = 403;
            throw err;
        }
    } catch (authError) {
        if (authError.status) throw authError; // Re-throw our own errors
        const err = new Error('Invalid or expired token.');
        err.status = 401;
        throw err;
    }
};

/**
 * Resolves the MIME type, inline/attachment flag, and whether byte-range streaming
 * is applicable for the given file record.
 */
export const resolveFileServeOptions = (fileRecord) => {
    const ext = path.extname(fileRecord.originalName).toLowerCase();
    const contentType = MIME_MAP[ext] || 'application/octet-stream';
    const isVideo = contentType.startsWith('video/');
    const isInline = contentType.startsWith('image/') ||
        contentType.startsWith('video/') ||
        contentType.startsWith('audio/') ||
        ext === '.pdf';

    return { ext, contentType, isVideo, isInline };
};

/**
 * Parses a Range request header and returns stream options for a partial response.
 * Returns { start, end, chunkSize } or null if no range header present.
 */
export const parseRangeRequest = (rangeHeader, fileSize) => {
    if (!rangeHeader) return null;

    const [startStr, endStr] = rangeHeader.replace(/bytes=/, '').split('-');
    const start = isNaN(parseInt(startStr, 10)) ? 0 : parseInt(startStr, 10);
    const end = (endStr && !isNaN(parseInt(endStr, 10))) ? parseInt(endStr, 10) : fileSize - 1;
    const chunkSize = end - start + 1;

    return { start, end, chunkSize };
};