import fs from 'fs';
import path from 'path';


const uploadDirectory = path.resolve('uploads');

export const getFile = async (fileName) => {
    console.log(fileName);
    const safeFileName = path.basename(fileName); // Prevent directory traversal
    const filePath = path.join(uploadDirectory, safeFileName);

    if (!fs.existsSync(filePath)) {
        throw new Error('File not found');
    }

    return fs.createReadStream(filePath);
};