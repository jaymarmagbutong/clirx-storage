import { deleteFile as deleteFileService } from '../services/storage/deleteFileServices.js';
import { getFile as getFileService } from '../services/storage/getFileServices.js';
import { uploadFile as uploadFileService } from '../services/storage/uploadFileService.js';
import { listFiles as listFilesService } from '../services/storage/listFilesServices.js';
import { getThumbnail as getThumbnailService } from '../services/storage/getThumbnailService.js';
import {
    updateFile as updateFileService,
    bulkUpdateFiles as bulkUpdateFilesService,
    bulkDeleteFiles as bulkDeleteFilesService,
} from '../services/storage/updateFileServices.js';
import {
    listDeletedFiles as listDeletedFilesService,
    permanentlyDeleteFile as permanentlyDeleteFileService,
    emptyTrash as emptyTrashService,
} from '../services/storage/trashFileServices.js';
import {
    getChunkStatus as getChunkStatusService,
    handleChunkUpload as handleChunkUploadService,
} from '../services/storage/chunkUploadService.js';
import { verifyToken } from '../services/auth/jwtHelper.js';
import path from 'path';
import fs from 'fs';

export const uploadFile = async (req, res) => {
    try {
        const result = await uploadFileService(req);
        // If any uploaded file was skipped or failed, return 400 status with the message
        const hasFailure = result.data.messages.some(msg => msg !== 'File uploaded successfully');
        if (hasFailure) {
            const firstFailure = result.data.messages.find(msg => msg !== 'File uploaded successfully');
            return res.status(400).json({ error: firstFailure });
        }
        res.status(201).send(result);
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
};

export const listFiles = async (req, res) => {
    try {
        const pageQuery = req.query.page;
        const ownerId = req.user?.userId ? parseInt(req.user.userId, 10) : 1;
        const limit = req.query.limit;

        const result = await listFilesService({
            page: pageQuery,
            limit: limit,
            ownerId: ownerId
        });
        res.status(200).send(result);
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
};

export const getFile = async (req, res) => {
    let activeStream = null;
    try {
        const { fileRecord, filePath, stream } = await getFileService(req.params.fileName);
        activeStream = stream;

        // If file is marked private, enforce authentication
        if (fileRecord.isPrivate) {
            let token = req.query.token;

            const authHeader = req.headers['authorization'];
            if (authHeader) {
                const parts = authHeader.split(' ');
                if (parts[1]) {
                    token = parts[1];
                }
            }

            if (!token) {
                if (activeStream) activeStream.destroy();
                return res.status(401).send({ error: 'Token missing. Private file access requires authentication.' });
            }

            try {
                const decoded = verifyToken(token);
                if (decoded.userId !== fileRecord.ownerId) {
                    if (activeStream) activeStream.destroy();
                    return res.status(403).send({ error: 'Forbidden. You do not have permission to access this private file.' });
                }
            } catch (authError) {
                if (activeStream) activeStream.destroy();
                return res.status(401).send({ error: 'Invalid or expired token.' });
            }
        }

        // Detect MIME type from extension using mime-types
        const ext = path.extname(fileRecord.originalName).toLowerCase();
        const mimeMap = {
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
        const contentType = mimeMap[ext] || 'application/octet-stream';
        const isVideo = contentType.startsWith('video/');
        const isInline = contentType.startsWith('image/') || contentType.startsWith('video/') || contentType.startsWith('audio/') || ext === '.pdf';

        // Support byte-range requests for video seeking (e.g. <video> scrubbing)
        if (isVideo && req.headers.range) {
            // Destroy the full-file read stream since we will use a range stream
            if (activeStream) {
                activeStream.destroy();
                activeStream = null;
            }

            const stat = fs.statSync(filePath);
            const fileSize = stat.size;
            const rangeHeader = req.headers.range;
            const [startStr, endStr] = rangeHeader.replace(/bytes=/, '').split('-');

            const start = isNaN(parseInt(startStr, 10)) ? 0 : parseInt(startStr, 10);
            const end = (endStr && !isNaN(parseInt(endStr, 10))) ? parseInt(endStr, 10) : fileSize - 1;
            const chunkSize = end - start + 1;

            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunkSize,
                'Content-Type': contentType,
            });

            const rangeStream = fs.createReadStream(filePath, { start, end });
            rangeStream.on('error', (streamErr) => {
                console.error('Range stream error:', streamErr);
                if (!res.headersSent) res.status(500).end();
            });
            rangeStream.pipe(res);
            return;
        }

        res.setHeader('Content-Type', contentType);
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader(
            'Content-Disposition',
            `${isInline ? 'inline' : 'attachment'}; filename="${encodeURIComponent(fileRecord.originalName)}"`
        );

        stream.pipe(res);
    } catch (error) {
        if (activeStream) activeStream.destroy();
        res.status(404).send({ error: error.message });
    }
};

export const deleteFile = async (req, res) => {
    try {
        await deleteFileService(req.params.fileName);
        res.status(200).send({ message: 'File deleted successfully' });
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
};

export const getThumbnail = async (req, res) => {
    try {
        const { fileName } = req.params;
        const authHeader = req.headers['authorization'];

        const { stream, contentType, safeFileName } = await getThumbnailService(fileName, authHeader);

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(safeFileName)}"`);
        stream.pipe(res);
    } catch (error) {
        const status = error.status || 500;
        res.status(status).send({ error: error.message });
    }
};

export const updateFile = async (req, res) => {
    try {
        const { folderId, isPrivate, isDeleted } = req.body;
        const updateData = {};

        if (folderId !== undefined) {
            updateData.folderId = folderId ? parseInt(folderId, 10) : null;
        }
        if (isPrivate !== undefined) {
            updateData.isPrivate = !!isPrivate;
        }
        if (isDeleted !== undefined) {
            updateData.isDeleted = !!isDeleted;
        }

        const updated = await updateFileService(req.params.fileName, updateData);
        res.status(200).send(updated);
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
};

export const bulkUpdateFiles = async (req, res) => {
    try {
        const { fileIds, folderId, isPrivate, isDeleted } = req.body;
        const updateData = {};

        if (folderId !== undefined) {
            updateData.folderId = folderId ? parseInt(folderId, 10) : null;
        }
        if (isPrivate !== undefined) {
            updateData.isPrivate = !!isPrivate;
        }
        if (isDeleted !== undefined) {
            updateData.isDeleted = !!isDeleted;
        }

        if (!Array.isArray(fileIds)) {
            return res.status(400).send({ error: 'fileIds must be an array of file IDs' });
        }

        const result = await bulkUpdateFilesService(fileIds, updateData);
        res.status(200).send(result);
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
};

export const bulkDeleteFiles = async (req, res) => {
    try {
        const { fileIds } = req.body;

        if (!Array.isArray(fileIds)) {
            return res.status(400).send({ error: 'fileIds must be an array of file IDs' });
        }

        const result = await bulkDeleteFilesService(fileIds);
        res.status(200).send({ message: 'Files deleted successfully', ...result });
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
};

export const listDeletedFiles = async (req, res) => {
    try {
        const ownerId = req.user?.userId ? parseInt(req.user.userId, 10) : 1;
        const result = await listDeletedFilesService(ownerId);
        res.status(200).send(result);
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
};

export const permanentlyDeleteFile = async (req, res) => {
    try {
        const ownerId = req.user?.userId ? parseInt(req.user.userId, 10) : 1;
        await permanentlyDeleteFileService(req.params.fileName, ownerId);
        res.status(200).send({ message: 'File permanently deleted' });
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
};

export const emptyTrash = async (req, res) => {
    try {
        const ownerId = req.user?.userId ? parseInt(req.user.userId, 10) : 1;
        const result = await emptyTrashService(ownerId);
        res.status(200).send({ message: 'Trash emptied successfully', ...result });
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
};

export const getUploadStatus = async (req, res) => {
    try {
        const { identifier } = req.query;
        if (!identifier) {
            return res.status(400).send({ error: 'identifier is required' });
        }
        const uploadedChunks = await getChunkStatusService(identifier);
        res.status(200).send({ uploadedChunks });
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
};

export const uploadChunk = async (req, res) => {
    try {
        if (!req.files || !req.files.file) {
            return res.status(400).send({ error: 'No chunk file uploaded' });
        }

        const { identifier, chunkIndex, totalChunks, isPrivate, originalName, folderId } = req.body;

        if (!identifier || chunkIndex === undefined || !totalChunks || !originalName) {
            return res.status(400).send({ error: 'Missing chunk metadata fields' });
        }

        const chunkFile = req.files.file;
        const result = await handleChunkUploadService({
            identifier,
            chunkIndex,
            totalChunks,
            isPrivate,
            originalName,
            folderId,
            tempFilePath: chunkFile.tempFilePath,
            userId: req.user?.userId,
            protocol: req.protocol,
            host: req.get('host')
        });

        if (result.merged) {
            return res.status(201).send({
                success: true,
                message: 'File uploaded and merged successfully',
                file: result.file
            });
        }

        // Returns chunk success status
        res.status(200).send({ success: true, message: `Chunk ${chunkIndex} uploaded successfully` });
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
};

