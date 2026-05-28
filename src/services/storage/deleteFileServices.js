import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const uploadDirectory = path.resolve('uploads');
const unlink = promisify(fs.unlink);

export const deleteFile = async (fileName) => {
    const safeFileName = path.basename(fileName); // Prevent directory traversal
    const filePath = path.join(uploadDirectory, safeFileName);

    let fileRecord;
    try {
        fileRecord = await prisma.file.findUnique({
            where: {
                uniqueName: safeFileName, // Use uniqueName to match the file
            },
        });
    } catch (error) {
        throw new Error('Failed to find file in the database: ' + error.message);
    }

    if (!fileRecord) {
        throw new Error('File not found in database');
    }

    // Soft delete database record (do not remove physical file or database row, just update isDeleted)
    try {
        await prisma.file.update({
            where: {
                uniqueName: safeFileName,
            },
            data: {
                isDeleted: true,
            },
        });
    } catch (error) {
        throw new Error('Failed to soft delete file record in database: ' + error.message);
    }
};