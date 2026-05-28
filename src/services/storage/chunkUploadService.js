import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import sharp from 'sharp';
import ffmpegPath from 'ffmpeg-static';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();
const execFilePromise = promisify(execFile);

const uploadDirectory = path.resolve('uploads');
const chunkParentDirectory = path.resolve('uploads/chunks');

/**
 * Gets the list of chunk indexes that have already been uploaded.
 */
export const getChunkStatus = async (identifier) => {
    // Prevent directory traversal
    const safeIdentifier = path.basename(identifier);
    const chunkDir = path.join(chunkParentDirectory, safeIdentifier);

    if (!fs.existsSync(chunkDir)) {
        return [];
    }

    try {
        const files = fs.readdirSync(chunkDir);
        const indexes = files
            .filter(f => f.startsWith('chunk_'))
            .map(f => parseInt(f.replace('chunk_', ''), 10))
            .filter(idx => !isNaN(idx));
        
        // Sort numerically
        indexes.sort((a, b) => a - b);
        return indexes;
    } catch (err) {
        console.error('Failed to read chunk status:', err.message);
        return [];
    }
};

/**
 * Saves an uploaded chunk to the temp directory.
 */
export const saveChunk = async (identifier, chunkIndex, tempFilePath) => {
    const safeIdentifier = path.basename(identifier);
    const chunkDir = path.join(chunkParentDirectory, safeIdentifier);

    if (!fs.existsSync(chunkDir)) {
        fs.mkdirSync(chunkDir, { recursive: true });
    }

    const chunkPath = path.join(chunkDir, `chunk_${parseInt(chunkIndex, 10)}`);
    
    // Copy the temp file parsed by express-fileupload to the chunks dir
    fs.copyFileSync(tempFilePath, chunkPath);
    
    // Purge the original temp file
    try {
        fs.unlinkSync(tempFilePath);
    } catch (_) {}
};

/**
 * Sequentially merges all chunks into the final destination file.
 */
export const mergeChunks = async (identifier, totalChunks, uniqueName) => {
    const safeIdentifier = path.basename(identifier);
    const chunkDir = path.join(chunkParentDirectory, safeIdentifier);
    const destPath = path.join(uploadDirectory, uniqueName);

    const total = parseInt(totalChunks, 10);

    // Verify all chunks are present before merging
    for (let i = 0; i < total; i++) {
        const chunkFile = path.join(chunkDir, `chunk_${i}`);
        if (!fs.existsSync(chunkFile)) {
            throw new Error(`Missing chunk index ${i}`);
        }
    }

    // Merge chunks
    const writeStream = fs.createWriteStream(destPath);

    for (let i = 0; i < total; i++) {
        const chunkFile = path.join(chunkDir, `chunk_${i}`);
        const chunkBuffer = fs.readFileSync(chunkFile);
        
        // Write chunk synchronously to preserve sequence order perfectly
        writeStream.write(chunkBuffer);
        
        // Delete chunk file immediately after writing to save disk space
        try {
            fs.unlinkSync(chunkFile);
        } catch (_) {}
    }

    writeStream.end();

    // Remove the chunks temp directory
    try {
        if (fs.existsSync(chunkDir)) {
            fs.rmdirSync(chunkDir);
        }
    } catch (_) {}

    return destPath;
};

/**
 * Orchestrates full chunk upload saving and checks if a merge is ready.
 * If ready, performs merge, thumbnail extraction, and DB registration.
 */
export const handleChunkUpload = async ({
    identifier,
    chunkIndex,
    totalChunks,
    isPrivate,
    originalName,
    folderId,
    tempFilePath,
    userId,
    protocol,
    host
}) => {
    // 1. Save chunk file to temp chunks directory
    await saveChunk(identifier, chunkIndex, tempFilePath);

    // 2. Check chunk status
    const uploadedChunks = await getChunkStatus(identifier);
    const total = parseInt(totalChunks, 10);

    if (uploadedChunks.length === total) {
        // All chunks uploaded! Merge them!
        const fileExtension = path.extname(originalName).toLowerCase();
        const uniqueName = `${Date.now()}_${uuidv4()}${fileExtension}`;
        const mergedPath = await mergeChunks(identifier, totalChunks, uniqueName);

        // Compute actual merged file size
        const stat = fs.statSync(mergedPath);
        const fileSize = stat.size;

        // Detect MIME/File Type
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.tiff', '.ico'];
        const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv', '.wmv', '.m4v', '.3gp'];
        const getFileType = (ext) => {
            if (imageExtensions.includes(ext)) return 'image';
            if (videoExtensions.includes(ext)) return 'video';
            return 'other';
        };
        const fileType = getFileType(fileExtension);

        // Generate backend thumbnail
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
                    await sharp(mergedPath)
                        .resize({ width: 200, height: 200, fit: 'inside', withoutEnlargement: true })
                        .jpeg({ quality: 70 })
                        .toFile(thumbPath);
                    thumbnailUrl = `${protocol}://${host}/api/storage/thumbnails/${thumbUniqueName}`;
                } else if (fileType === 'video') {
                    await execFilePromise(ffmpegPath, [
                        '-ss', '00:00:00.500',
                        '-i', mergedPath,
                        '-vf', 'scale=200:-1',
                        '-vframes', '1',
                        '-q:v', '4',
                        '-y', thumbPath
                    ]);
                    thumbnailUrl = `${protocol}://${host}/api/storage/thumbnails/${thumbUniqueName}`;
                }
            } catch (thumbErr) {
                console.error('Failed to generate thumbnail during chunk merge:', thumbErr.message);
            }
        }

        // Save metadata to DB
        const ownerId = userId ? parseInt(userId, 10) : 1;
        const parsedFolderId = folderId ? parseInt(folderId, 10) : null;
        const isPrivateBool = isPrivate === 'true' || isPrivate === true;

        const fileUrl = `${protocol}://${host}/api/storage/files/${uniqueName}`;

        const savedFile = await prisma.file.create({
            data: {
                originalName: originalName,
                uniqueName: uniqueName,
                filePath: fileUrl,
                size: fileSize,
                uploadedAt: new Date(),
                source: '',
                ownerId: ownerId,
                folderId: isNaN(parsedFolderId) ? null : parsedFolderId,
                isPrivate: isPrivateBool,
                thumbnail: thumbnailUrl,
                isDeleted: false,
            },
        });

        return {
            merged: true,
            file: savedFile
        };
    }

    return {
        merged: false,
        uploadedChunks
    };
};
