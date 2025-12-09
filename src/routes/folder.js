import { Router } from 'express';
import { createFolder } from '../controllers/folderController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/create', authenticate, createFolder);

export default router;