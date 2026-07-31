import { verifyToken } from '../services/auth/jwtHelper.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const authenticate = async (req, res, next) => {

    const authHeader = await req.headers['authorization'];

    if (!authHeader) {
        return res.status(401).send({ error: 'Authorization header missing' });
    }

    const token = authHeader.split(' ')[1]; // Expecting "Bearer <token>"

    if (!token) {
        return res.status(401).send({ error: 'Token missing' });
    }

    try {
        const decoded = verifyToken(token);

        // Check if this is a developer API token and ensure it is still active/valid
        if (decoded.apiTokenId) {
            const apiToken = await prisma.apiToken.findUnique({
                where: { id: parseInt(decoded.apiTokenId, 10) }
            });

            if (!apiToken) {
                return res.status(401).send({ error: 'Token has been revoked or is invalid' });
            }
        }

        req.user = decoded; // Attach decoded payload to request
        next(); // Proceed to the next middleware/controller
    } catch (error) {
        res.status(401).send({ error: 'Invalid or expired token' });
    }
};

