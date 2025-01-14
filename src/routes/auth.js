import { Router } from "express";

import { loginUser, signoutUser, verifyUser } from "../controllers/authController.js";

const router = Router();

router.post('/login', loginUser);
router.post('/logout/', signoutUser);
router.get('/verify/:token', verifyUser);


export default router;