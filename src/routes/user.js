import { Router } from 'express';
import { registerUser } from '../controllers/user.js';
import { listTokens, generateToken, revokeToken } from '../controllers/tokenController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
const router = Router();

router.post('/register', registerUser);

// Developer Token Management
router.get('/tokens', authenticate, listTokens);
router.post('/tokens', authenticate, generateToken);
router.delete('/tokens/:id', authenticate, revokeToken);

export default router;



