import { verifyToken } from '../services/auth/jwtHelper.js';

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
        req.user = decoded; // Attach decoded payload to request
        next(); // Proceed to the next middleware/controller
    } catch (error) {
        res.status(401).send({ error: 'Invalid or expired token' });
    }
};
