import { Router } from "express";

import { loginUser, signOutUser, verifyUser } from "../controllers/authController.js";

const router = Router();

router.post('/login', loginUser);
router.post('/logout/', signOutUser);
router.get('/verify/:token', verifyUser);


export default router;