import { Router } from 'express';
import {
    uploadFile,
    listFiles,
    getFile,
    deleteFile,
} from '../controllers/storageController.js';

import { authenticate } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/upload', authenticate, uploadFile);
router.get('/files', authenticate, listFiles);
router.get('/files/:fileName', authenticate, getFile);
router.delete('/files/:fileName', authenticate, deleteFile);

export default router;
