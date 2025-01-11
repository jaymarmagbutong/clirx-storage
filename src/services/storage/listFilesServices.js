import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const uploadDirectory = path.resolve('uploads');

const readdir = promisify(fs.readdir);

export const listFiles = async () => {
    try {
        return await readdir(uploadDirectory);
    } catch (error) {
        throw new Error('Failed to list files: ' + error.message);
    }
};