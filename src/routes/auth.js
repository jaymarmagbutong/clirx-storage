import { Router } from "express";

import { loginUser, signOutUser, verifyUser, verifyEmail, googleLoginOrRegister } from "../controllers/authController.js";

const router = Router();

router.post('/login', loginUser);
router.post('/logout/', signOutUser);
router.get('/verify/:token', verifyUser);
router.get('/verify-email', verifyEmail);
router.post('/google', googleLoginOrRegister);

export default router;