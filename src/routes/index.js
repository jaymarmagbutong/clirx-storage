import { Router } from 'express';
import storageRouter from './storage.js'; // Ensure storage.js exists in the same directory

const router = Router();

router.use('/storage', storageRouter);

export default router;