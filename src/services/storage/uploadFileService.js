import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const uploadDirectory = path.resolve('uploads');
const writeFile = promisify(fs.writeFile);

if (!fs.existsSync(uploadDirectory)) {
    fs.mkdirSync(uploadDirectory, { recursive: true });
}

const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];

export const uploadFile = async (req) => {
    if (!req.files || !req.files.file) {
        throw new Error('No file uploaded');
    }

    const files = Array.isArray(req.files.file) ? req.files.file : [req.files.file];
    const uploadResults = [];
    const baseUrl = `${req.protocol}://${req.get('host')}/api/storage/files/`;

    // Iterate over each file
    for (const file of files) {
        const originalName = path.basename(file.name);
        const fileExtension = path.extname(originalName).toLowerCase();
        const isImage = imageExtensions.includes(fileExtension);
        const uniqueName = `${Date.now()}_${uuidv4()}${fileExtension}`;
        const filePath = path.join(uploadDirectory, uniqueName);
        const fileUrl = baseUrl + uniqueName;

        if (file.size > 10 * 1024 * 1024) {
            uploadResults.push({ 
                fileName: originalName, 
                message: 'File size exceeds limit', 
                isImage 
            });
            continue;
        }

        try {
            // Save file to disk
            await writeFile(filePath, file.data);

            // Save file metadata to the database
            const savedFile = await prisma.file.create({
                data: {
                    originalName: originalName,
                    uniqueName: uniqueName,
                    filePath: fileUrl,
                    size: file.size,
                    uploadedAt: new Date(),
                    source: '',
                },
            });

            // Push success message after saving to the database
            uploadResults.push({
                originalName: savedFile.originalName,
                uniqueName: savedFile.uniqueName,
                message: 'File uploaded successfully',
                filePath: filePath,
                baseurl: baseUrl,
                isImage,
            });

        } catch (error) {
            uploadResults.push({
                originalName,
                message: `Failed to upload: ${error.message}`,
                isImage,
            });
        }
    }

    // Format the response
    const response = {
        success: true,
        data: {
            baseurl: baseUrl,
            messages: uploadResults.map((result) => result.message),
            files: uploadResults.map((result) => result.uniqueName),
            isImages: uploadResults.map((result) => result.isImage),
        },
    };

    return response;
};
