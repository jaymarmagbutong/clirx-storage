import jwt from 'jsonwebtoken';

const secretKey = process.env.JWT_SECRET || 'd4f7a8caa3c6a9f2f4d6a0b4c1d9e7f8a7b2c3d4e6f1a8c2b3d9f7a8e6b3c4d1'; // Use a strong, secure key and store it in .env
const expiresIn = '1y'; // Token expires in 1 minute
const tokenBlacklist = new Set();

export const generateToken = (payload) => {
    return jwt.sign(payload, secretKey, { expiresIn });
};

export const verifyToken = (token) => {
    try {

        if (tokenBlacklist.has(token)) {
            throw new Error('Token is blacklisted');
        } else {
            return jwt.verify(token, secretKey);
        }
       
    } catch (error) {
        throw new Error('Invalid or expired token');
    }
};


export const revokeToken = (token) => {
    try {
        // Verify the token first to ensure it's valid before blacklisting
        jwt.verify(token, secretKey);
        // Add the token to the blacklist
        tokenBlacklist.add(token);
        
        return true;
        
    } catch (error) {
        throw new Error('Failed to revoke token: Invalid or expired token');
    }
};