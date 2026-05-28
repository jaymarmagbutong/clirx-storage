import { uploadFile as uploadFileService } from '../services/storage/uploadFileService.js';
import { listFiles as listFilesService } from '../services/storage/listFilesServices.js';
import {
    getFile as getFileService,
    verifyFileAccess,
    resolveFileServeOptions,
    parseRangeRequest,
} from '../services/storage/getFileServices.js';
import { getThumbnail as getThumbnailService } from '../services/storage/getThumbnailService.js';
import { deleteFile as deleteFileService } from '../services/storage/deleteFileServices.js';
import {
    updateFile as updateFileService,
    bulkUpdateFiles as bulkUpdateFilesService,
    bulkDeleteFiles as bulkDeleteFilesService,
    buildUpdateData,
    buildBulkUpdateData,
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
import fs from 'fs';

export const uploadFile = async (req, res) => {
    try {
        const result = await uploadFileService(req);
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
        const result = await listFilesService({
            page: req.query.page,
            limit: req.query.limit,
            ownerId: req.user?.userId ? parseInt(req.user.userId, 10) : 1,
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

        // Enforce private file access — service throws with status code on failure
        verifyFileAccess(fileRecord, req);

        const { contentType, isVideo, isInline } = resolveFileServeOptions(fileRecord);

        // Byte-range streaming for video scrubbing
        if (isVideo && req.headers.range) {
            activeStream.destroy();
            activeStream = null;

            const fileSize = fs.statSync(filePath).size;
            const range = parseRangeRequest(req.headers.range, fileSize);

            res.writeHead(206, {
                'Content-Range': `bytes ${range.start}-${range.end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': range.chunkSize,
                'Content-Type': contentType,
            });

            const rangeStream = fs.createReadStream(filePath, { start: range.start, end: range.end });
            rangeStream.on('error', (err) => {
                console.error('Range stream error:', err);
                if (!res.headersSent) res.status(500).end();
            });
            rangeStream.pipe(res);
            return;
        }

        res.setHeader('Content-Type', contentType);
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Content-Disposition', `${isInline ? 'inline' : 'attachment'}; filename="${encodeURIComponent(fileRecord.originalName)}"`);
        stream.pipe(res);
    } catch (error) {
        if (activeStream) activeStream.destroy();
        res.status(error.status || 404).send({ error: error.message });
    }
};

export const getThumbnail = async (req, res) => {
    try {
        const { stream, contentType, safeFileName } = await getThumbnailService(req.params.fileName, req.headers['authorization']);
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(safeFileName)}"`);
        stream.pipe(res);
    } catch (error) {
        res.status(error.status || 500).send({ error: error.message });
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

export const updateFile = async (req, res) => {
    try {
        const updateData = buildUpdateData(req.body);
        const updated = await updateFileService(req.params.fileName, updateData);
        res.status(200).send(updated);
    } catch (error) {
        res.status(error.status || 500).send({ error: error.message });
    }
};

export const bulkUpdateFiles = async (req, res) => {
    try {
        const { fileIds } = req.body;
        const updateData = buildBulkUpdateData(req.body); // Validates fileIds + builds payload
        const result = await bulkUpdateFilesService(fileIds, updateData);
        res.status(200).send(result);
    } catch (error) {
        res.status(error.status || 500).send({ error: error.message });
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

        const result = await handleChunkUploadService({
            identifier,
            chunkIndex,
            totalChunks,
            isPrivate,
            originalName,
            folderId,
            tempFilePath: req.files.file.tempFilePath,
            userId: req.user?.userId,
            protocol: req.protocol,
            host: req.get('host'),
        });

        if (result.merged) {
            return res.status(201).send({ success: true, message: 'File uploaded and merged successfully', file: result.file });
        }

        res.status(200).send({ success: true, message: `Chunk ${chunkIndex} uploaded successfully` });
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
};
