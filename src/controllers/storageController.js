import { deleteFile as deleteFileService } from '../services/storage/deleteFileServices.js';
import { getFile as getFileService } from '../services/storage/getFileServices.js';
import { uploadFile as uploadFileService } from '../services/storage/uploadFileService.js';
import { listFiles as listFilesService } from '../services/storage/listFilesServices.js';

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
        const fileStream = await getFileService(req.params.fileName);
        fileStream.pipe(res);
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
