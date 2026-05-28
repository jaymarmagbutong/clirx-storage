import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '../auth/jwtHelper.js';

const prisma = new PrismaClient();
const thumbDirectory = path.resolve('uploads/thumbnails');

export const getThumbnail = async (fileName, authHeader) => {
    const safeFileName = path.basename(fileName);
    const filePath = path.join(thumbDirectory, safeFileName);

    if (!fs.existsSync(filePath)) {
        const err = new Error('Thumbnail not found');
        err.status = 404;
        throw err;
    }

    // Find the file record that owns this thumbnail to verify privacy permissions
    const fileRecord = await prisma.file.findFirst({
        where: {
            thumbnail: {
                contains: safeFileName
            }
        }
    });

    if (fileRecord && fileRecord.isPrivate) {
        if (!authHeader) {
            const err = new Error('Authorization header missing.');
            err.status = 401;
            throw err;
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            const err = new Error('Token missing.');
            err.status = 401;
            throw err;
        }

        try {
            const decoded = verifyToken(token);
            if (decoded.userId !== fileRecord.ownerId) {
                const err = new Error('Forbidden. You do not have permission to access this private thumbnail.');
                err.status = 403;
                throw err;
            }
        } catch (authError) {
            const err = new Error('Invalid or expired token.');
            err.status = 401;
            throw err;
        }
    }

    // Detect appropriate inline content-type
    const ext = path.extname(safeFileName).toLowerCase();
    const mimeMap = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.gif': 'image/gif'
    };
    const contentType = mimeMap[ext] || 'image/jpeg';

    return {
        stream: fs.createReadStream(filePath),
        contentType,
        safeFileName
    };
};
