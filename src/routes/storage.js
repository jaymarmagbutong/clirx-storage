import { Router } from 'express';
import {
    uploadFile,
    listFiles,
    getFile,
    deleteFile,
} from '../controllers/storageController.js';

import { authenticate } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/upload',  uploadFile);
router.get('/files',  listFiles);
router.get('/files/:fileName', getFile);
router.delete('/files/:fileName', deleteFile);

export default router;
