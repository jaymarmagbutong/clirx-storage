import { createFolderService } from '../services/folder/createFolder.js';
import { listFoldersService } from '../services/folder/listFolders.js';
import { getFolderService } from '../services/folder/getFolder.js';

export const createFolder = async (req, res) => {
    try {
        const { name, parentId } = req.body;
        const ownerId = req.user?.userId; // Assumes auth middleware sets req.user

        if (!name || !ownerId) {
            return res.status(400).json({ error: 'Folder name and owner required' });
        }

        const result = await createFolderService({ name, parentId, ownerId });
        if (result.success) {
            res.status(201).json({ folder: result.folder });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const listFolders = async (req, res) => {
    try {
        const ownerId = req.user?.userId; // Assumes auth middleware sets req.user

        if (!ownerId) {
            return res.status(400).json({ error: 'Owner required' });
        }

        const result = await listFoldersService({ ownerId });
        if (result.success) {
            res.status(200).json({ folders: result.folders });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getFolder = async (req, res) => {
    try {
        const folderId = parseInt(req.params.id, 10);
        const ownerId = req.user?.userId; // Assumes auth middleware sets req.user

        if (isNaN(folderId)) {
            return res.status(400).json({ error: 'Invalid folder ID' });
        }
        if (!ownerId) {
            return res.status(400).json({ error: 'Owner required' });
        }

        const result = await getFolderService({ folderId, ownerId });
        if (result.success) {
            res.status(200).json({ folder: result.folder });
        } else {
            const statusCode = result.error.includes('Forbidden') ? 403 : 404;
            res.status(statusCode).json({ error: result.error });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};