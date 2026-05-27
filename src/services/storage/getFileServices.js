import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const uploadDirectory = path.resolve('uploads');

export const getFile = async (fileName) => {
    console.log(fileName);
    const safeFileName = path.basename(fileName); // Prevent directory traversal
    const filePath = path.join(uploadDirectory, safeFileName);

    if (!fs.existsSync(filePath)) {
        throw new Error('File not found');
    }

    const fileRecord = await prisma.file.findUnique({
        where: {
            uniqueName: safeFileName
        }
    });

    if (!fileRecord) {
        throw new Error('File not found in database');
    }

    return {
        fileRecord,
        stream: fs.createReadStream(filePath)
    };
};