import { createFolderService } from '../services/folder/createFolder.js';

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