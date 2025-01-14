import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { PrismaClient } from '@prisma/client';

const uploadDirectory = path.resolve('uploads');

const prisma = new PrismaClient();

const readdir = promisify(fs.readdir);

export const listFiles = async () => {
    try {
        const files = await prisma.file.findMany();
        return files;
        
    } catch (error) {
        throw new Error('Failed to list files: ' + error.message);
    }
};