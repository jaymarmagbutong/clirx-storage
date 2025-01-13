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

    try {
        fileRecord = await prisma.file.findUnique({
            where: {
                uniqueName: safeFileName, // Use uniqueName to match the file
            },
        });

        if (!fileRecord) {
            throw new Error('File not found in database');
        } else {
          return fileRecord;
        }
    } catch (error) {
        throw new Error('Failed to find file in the database: ' + error.message);
    }




    if (!fs.existsSync(filePath)) {
        throw new Error('File not found');
    }

    try {
        await unlink(filePath);
    } catch (error) {
        throw new Error('Failed to delete file: ' + error.message);
    }
};