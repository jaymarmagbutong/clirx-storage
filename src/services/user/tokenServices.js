import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const secretKey = process.env.JWT_SECRET || 'd4f7a8caa3c6a9f2f4d6a0b4c1d9e7f8a7b2c3d4e6f1a8c2b3d9f7a8e6b3c4d1';

export const listTokensService = async (userId) => {
    try {
        const tokens = await prisma.apiToken.findMany({
            where: { userId: parseInt(userId, 10) },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                createdAt: true
                // Do not return the token string for listing to keep it secure (like GitHub personal access tokens, shown only once)
            }
        });
        return { success: true, tokens };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

export const generateTokenService = async (userId, email, name) => {
    try {
        const userIdParsed = parseInt(userId, 10);
        
        // 1. Create a dummy row in ApiToken to get a unique ID
        const tokenRecord = await prisma.apiToken.create({
            data: {
                name: name || 'Unnamed Token',
                token: 'PENDING',
                userId: userIdParsed
            }
        });

        // 2. Generate the JWT signed with the unique token ID
        const payload = {
            userId: userIdParsed,
            email,
            apiTokenId: tokenRecord.id
        };

        const signedToken = jwt.sign(payload, secretKey);

        // 3. Update the record with the generated JWT
        const updatedRecord = await prisma.apiToken.update({
            where: { id: tokenRecord.id },
            data: { token: signedToken }
        });

        return {
            success: true,
            token: {
                id: updatedRecord.id,
                name: updatedRecord.name,
                token: signedToken, // Return the raw token value to show it once
                createdAt: updatedRecord.createdAt
            }
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

export const revokeTokenService = async (userId, tokenId) => {
    try {
        const tokenRecord = await prisma.apiToken.findFirst({
            where: {
                id: parseInt(tokenId, 10),
                userId: parseInt(userId, 10)
            }
        });

        if (!tokenRecord) {
            return { success: false, error: 'Token not found or access denied' };
        }

        await prisma.apiToken.delete({
            where: { id: tokenRecord.id }
        });

        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};
