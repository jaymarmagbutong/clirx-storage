import { createUserService } from '../services/user/createUser.js';

export const registerUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }
        const result = await createUserService({ email, password });
        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }
        res.status(201).json({ message: 'User created', user: result.user });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};
