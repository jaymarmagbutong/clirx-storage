import { generateToken, revokeToken, verifyToken } from '../services/auth/jwtHelper.js';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log(email + " attempt login");
        
        // Find user by email
        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            return res.status(401).send({ error: 'Invalid email or password' });
        }

        // Compare password using bcrypt
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).send({ error: 'Invalid email or password' });
        }

        // Create payload for the token
        const payload = { userId: user.id, email: user.email };

        // Generate JWT
        const token = generateToken(payload);

        res.status(200).send({ token });
    } catch (error) {
        res.status(500).send({ error: 'Login failed' });
    }
};


export const signOutUser = async (req, res) => {
    try {
        const token = req.body.token;

        if (!token) {
            return res.status(400).send({ error: 'Token is required for logout' });
        }

        try {
            verifyToken(token); // Verify the token to ensure it’s valid
            revokeToken(token); // Revoke the token
            return res.status(200).send({ message: 'Logout successful' });
        } catch (error) {
            return res.status(401).send({ error: 'Invalid or expired token' });
        }
    } catch (error) {
        res.status(500).send({ error: 'Failed to revoke token' });
    }
};

export const verifyUser = async (req, res) => {
    try {
        const token = await req.params.token;

        if (!token) {
            return res.status(400).send({ error: 'Token is required for verification' });
        }

        try {
            const decoded = verifyToken(token);
            return res.status(200).send({ message: 'Token is valid', decoded });
        } catch (error) {
            return res.status(401).send({ error: 'Invalid or expired token' });
        }
    } catch (error) {
        res.status(500).send({ error: 'Failed to verify token' });
    }
}

