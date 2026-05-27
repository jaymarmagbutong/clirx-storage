import { deleteFile as deleteFileService } from '../services/storage/deleteFileServices.js';
import { getFile as getFileService } from '../services/storage/getFileServices.js';
import { uploadFile as uploadFileService } from '../services/storage/uploadFileService.js';
import { listFiles as listFilesService } from '../services/storage/listFilesServices.js';
import { verifyToken } from '../services/auth/jwtHelper.js';

export const uploadFile = async (req, res) => {
    try {
        const result = await uploadFileService(req);
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
        const { fileRecord, stream } = await getFileService(req.params.fileName);
        
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
                // Enforce owner verification: only the owner of the private file can access it
                if (decoded.userId !== fileRecord.ownerId) {
                    return res.status(403).send({ error: 'Forbidden. You do not have permission to access this private file.' });
                }
            } catch (authError) {
                return res.status(401).send({ error: 'Invalid or expired token.' });
            }
        }

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
