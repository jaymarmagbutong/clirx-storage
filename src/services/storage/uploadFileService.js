import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import { PrismaClient } from '@prisma/client';
import sharp from 'sharp';
import ffmpegPath from 'ffmpeg-static';
import { execFile } from 'child_process';

const prisma = new PrismaClient();
const execFilePromise = promisify(execFile);

const uploadDirectory = path.resolve('uploads');
const writeFile = promisify(fs.writeFile);

if (!fs.existsSync(uploadDirectory)) {
    fs.mkdirSync(uploadDirectory, { recursive: true });
}

const imageExtensions   = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.tiff', '.ico'];
const videoExtensions   = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv', '.wmv', '.m4v', '.3gp'];
const audioExtensions   = ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a', '.wma'];
const documentExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.md', '.csv'];
const archiveExtensions = ['.zip', '.rar', '.tar', '.gz', '.7z'];

const getFileType = (ext) => {
    if (imageExtensions.includes(ext))    return 'image';
    if (videoExtensions.includes(ext))    return 'video';
    if (audioExtensions.includes(ext))    return 'audio';
    if (documentExtensions.includes(ext)) return 'document';
    if (archiveExtensions.includes(ext))  return 'archive';
    return 'other';
};

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
        const fileType = getFileType(fileExtension);  // 'image' | 'video' | 'audio' | 'document' | 'archive' | 'other'
        const isImage = fileType === 'image';
        const uniqueName = `${Date.now()}_${uuidv4()}${fileExtension}`;
        const filePath = path.join(uploadDirectory, uniqueName);
        const fileUrl = baseUrl + uniqueName;

        if (file.size > 5 * 1024 * 1024 * 1024) { // 5GB limit
            uploadResults.push({ 
                fileName: originalName, 
                message: 'File size exceeds the 5GB limit', 
                fileType,
                isImage 
            });
            continue;
        }

        try {
            // Save file to disk (supports temp file streams and RAM buffers)
            if (file.tempFilePath) {
                await file.mv(filePath);
            } else {
                await writeFile(filePath, file.data);
            }

            // Extract dynamic ownerId and folderId
            const ownerId = req.user?.userId ? parseInt(req.user.userId, 10) : 1;
            
            let folderId = null;
            if (req.body && req.body.folderId) {
                const parsedFolderId = parseInt(req.body.folderId, 10);
                if (!isNaN(parsedFolderId)) {
                    folderId = parsedFolderId;
                }
            } else if (req.query && req.query.folderId) {
                const parsedFolderId = parseInt(req.query.folderId, 10);
                if (!isNaN(parsedFolderId)) {
                    folderId = parsedFolderId;
                }
            }

            // Extract isPrivate from req.body or req.query
            let isPrivate = false;
            if (req.body && (req.body.isPrivate === 'true' || req.body.isPrivate === true)) {
                isPrivate = true;
            } else if (req.query && (req.query.isPrivate === 'true' || req.query.isPrivate === true)) {
                isPrivate = true;
            }

            // Automatically generate thumbnail in the backend if it is an image or video
            let thumbnailUrl = null;
            if (fileType === 'image' || fileType === 'video') {
                try {
                    const thumbDirectory = path.resolve('uploads/thumbnails');
                    if (!fs.existsSync(thumbDirectory)) {
                        fs.mkdirSync(thumbDirectory, { recursive: true });
                    }
                    const thumbUniqueName = `thumb_${path.basename(uniqueName, fileExtension)}.jpg`;
                    const thumbPath = path.join(thumbDirectory, thumbUniqueName);

                    if (fileType === 'image') {
                        await sharp(filePath)
                            .resize({ width: 200, height: 200, fit: 'inside', withoutEnlargement: true })
                            .jpeg({ quality: 70 })
                            .toFile(thumbPath);
                        thumbnailUrl = `${req.protocol}://${req.get('host')}/api/storage/thumbnails/${thumbUniqueName}`;
                    } else if (fileType === 'video') {
                        await execFilePromise(ffmpegPath, [
                            '-ss', '00:00:00.500',
                            '-i', filePath,
                            '-vf', 'scale=200:-1',
                            '-vframes', '1',
                            '-q:v', '4',
                            '-y', thumbPath
                        ]);
                        thumbnailUrl = `${req.protocol}://${req.get('host')}/api/storage/thumbnails/${thumbUniqueName}`;
                    }
                } catch (thumbError) {
                    console.error(`Failed to generate backend thumbnail for ${originalName}:`, thumbError);
                }
            }

            // Save file metadata to the database
            const savedFile = await prisma.file.create({
                data: {
                    originalName: originalName,
                    uniqueName: uniqueName,
                    filePath: fileUrl,
                    size: file.size,
                    uploadedAt: new Date(),
                    source: '',
                    ownerId: ownerId, 
                    folderId: folderId, 
                    isPrivate: isPrivate,
                    thumbnail: thumbnailUrl,
                },
            });

            // Push success message after saving to the database
            uploadResults.push({
                originalName: savedFile.originalName,
                uniqueName: savedFile.uniqueName,
                message: 'File uploaded successfully',
                filePath: filePath,
                baseurl: baseUrl,
                fileType,
                isImage,
            });

        } catch (error) {
            uploadResults.push({
                originalName,
                message: `Failed to upload: ${error.message}`,
                fileType,
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
            fileTypes: uploadResults.map((result) => result.fileType), // 'image' | 'video' | 'audio' | 'document' | 'archive' | 'other'
        },
    };

    return response;
};
