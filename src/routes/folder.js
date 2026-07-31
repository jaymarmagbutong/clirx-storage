import { Router } from 'express';
import { createFolder, listFolders, getFolder, deleteFolder, updateFolder, permanentlyDeleteFolder } from '../controllers/folderController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/create', authenticate, createFolder);
router.get('/list', authenticate, listFolders);
router.get('/:id', authenticate, getFolder);
router.delete('/:id', authenticate, deleteFolder);
router.delete('/:id/permanent', authenticate, permanentlyDeleteFolder);
router.patch('/:id', authenticate, updateFolder);

export default router;