import { Router } from 'express';
import { registerUser } from '../controllers/user.js';
import { authenticate } from '../middlewares/authMiddleware.js';
const router = Router();

router.post('/register', authenticate, registerUser);

export default router;

