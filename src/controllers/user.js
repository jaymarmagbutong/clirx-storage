import { createUserService } from '../services/user/createUser.js';
export const registerUser = async (req, res) => {

    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }
        const user = await createUserService({ email, password });
        res.status(201).json({ message: 'User created', user });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};
