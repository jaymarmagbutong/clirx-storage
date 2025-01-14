import { Router } from 'express';
import storageRouter from './storage.js'; // Ensure storage.js exists in the same directory
import authRouter from './auth.js';

const router = Router();

router.use('/storage', storageRouter);

router.use('/auth', authRouter);


export default router;