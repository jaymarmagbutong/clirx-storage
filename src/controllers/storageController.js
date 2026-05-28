import { deleteFile as deleteFileService } from '../services/storage/deleteFileServices.js';
import { getFile as getFileService } from '../services/storage/getFileServices.js';
import { uploadFile as uploadFileService } from '../services/storage/uploadFileService.js';
import { listFiles as listFilesService } from '../services/storage/listFilesServices.js';
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
        const files = await listFilesService();
        res.status(200).send(files);
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
};

export const getFile = async (req, res) => {
    try {
        const { fileRecord, filePath, stream } = await getFileService(req.params.fileName);
        
        // If file is marked private, enforce authentication
        if (fileRecord.isPrivate) {
            const authHeader = req.headers['authorization'];
            if (!authHeader) {
                return res.status(401).send({ error: 'Authorization header missing. Private file access requires authentication.' });
            }

            const token = authHeader.split(' ')[1];
            if (!token) {
                return res.status(401).send({ error: 'Token missing. Private file access requires authentication.' });
            }

            try {
                const decoded = verifyToken(token);
                if (decoded.userId !== fileRecord.ownerId) {
                    return res.status(403).send({ error: 'Forbidden. You do not have permission to access this private file.' });
                }
            } catch (authError) {
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
            const stat = fs.statSync(filePath);
            const fileSize = stat.size;
            const rangeHeader = req.headers.range;
            const [startStr, endStr] = rangeHeader.replace(/bytes=/, '').split('-');
            const start = parseInt(startStr, 10);
            const end = endStr ? parseInt(endStr, 10) : fileSize - 1;
            const chunkSize = end - start + 1;

            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunkSize,
                'Content-Type': contentType,
            });
            fs.createReadStream(filePath, { start, end }).pipe(res);
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
