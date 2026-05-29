import { Router } from 'express';
import {
    uploadFile,
    listFiles,
    getFile,
    deleteFile,
    getThumbnail,
    updateFile,
    bulkUpdateFiles,
    bulkDeleteFiles,
    listDeletedFiles,
    permanentlyDeleteFile,
    bulkPermanentlyDeleteFiles,
    emptyTrash,
    getUploadStatus,
    uploadChunk,
} from '../controllers/storageController.js';

import { authenticate } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/upload', authenticate, uploadFile);
router.get('/files', authenticate, listFiles);
router.get('/files/deleted', authenticate, listDeletedFiles);
router.delete('/files/:fileName/permanent', authenticate, permanentlyDeleteFile);
router.post('/files/bulk-permanent', authenticate, bulkPermanentlyDeleteFiles);
router.post('/files/empty-trash', authenticate, emptyTrash);
router.get('/upload/status', authenticate, getUploadStatus);
router.post('/upload/chunk', authenticate, uploadChunk);
router.get('/files/:fileName', getFile);
router.get('/thumbnails/:fileName', getThumbnail);
router.delete('/files/:fileName', authenticate, deleteFile);
router.patch('/files/:fileName', authenticate, updateFile);
router.post('/files/bulk-update', authenticate, bulkUpdateFiles);
router.post('/files/bulk-delete', authenticate, bulkDeleteFiles);

export default router;
