import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const uploadDirectory = path.resolve('uploads');
const unlink = promisify(fs.unlink);

export const deleteFile = async (fileName) => {

    const safeFileName = path.basename(fileName); // Prevent directory traversal
    const filePath = path.join(uploadDirectory, safeFileName);

    if (!fs.existsSync(filePath)) {
        throw new Error('File not found');
    }

    try {
        await unlink(filePath);
    } catch (error) {
        throw new Error('Failed to delete file: ' + error.message);
    }
};