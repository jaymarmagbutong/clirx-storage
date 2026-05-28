import { Router } from 'express';
import { createFolder, listFolders, getFolder } from '../controllers/folderController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/create', authenticate, createFolder);
router.get('/list', authenticate, listFolders);
router.get('/:id', authenticate, getFolder);

export default router;