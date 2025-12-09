import { Router } from 'express';
import authRoutes from './auth.js';
import storageRoutes from './storage.js';
import userRoutes from './user.js';
import folderRoutes from './folder.js';


const router = Router();

router.use('/auth', authRoutes);
router.use('/storage', storageRoutes);
router.use('/user', userRoutes); 
router.use('/folder', folderRoutes);


export default router;