import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const unlink = promisify(fs.unlink);

const uploadDirectory = path.resolve('uploads');
const thumbDirectory = path.resolve('uploads/thumbnails');

/**
 * Lists all soft-deleted files for a user.
 */
export const listDeletedFiles = async (ownerId) => {
    try {
        return await prisma.file.findMany({
            where: {
                isDeleted: true,
                ownerId: parseInt(ownerId, 10),
            },
            orderBy: {
                uploadedAt: 'desc',
            },
        });
    } catch (error) {
        throw new Error('Failed to list deleted files: ' + error.message);
    }
};

/**
 * Permanently deletes a single file (physical and database).
 */
export const permanentlyDeleteFile = async (fileName, ownerId) => {
    const safeFileName = path.basename(fileName);
    const ownerIdParsed = parseInt(ownerId, 10);

    const fileRecord = await prisma.file.findFirst({
        where: {
            uniqueName: safeFileName,
            ownerId: ownerIdParsed,
        },
    });

    if (!fileRecord) {
        throw new Error('File not found in trash');
    }

    // 1. Delete physical file from disk
    const filePath = path.join(uploadDirectory, safeFileName);
    if (fs.existsSync(filePath)) {
        try {
            await unlink(filePath);
        } catch (err) {
            console.error('Failed to unlink physical file:', err.message);
        }
    }

    // 2. Delete thumbnail from disk if exists
    if (fileRecord.thumbnail) {
        const thumbName = path.basename(fileRecord.thumbnail);
        const thumbPath = path.join(thumbDirectory, thumbName);
        if (fs.existsSync(thumbPath)) {
            try {
                await unlink(thumbPath);
            } catch (err) {
                console.error('Failed to unlink thumbnail file:', err.message);
            }
        }
    }

    // 3. Delete database record
    try {
        await prisma.file.delete({
            where: {
                id: fileRecord.id,
            },
        });
    } catch (error) {
        throw new Error('Failed to delete file record from database: ' + error.message);
    }
};

/**
 * Empties all soft-deleted files for a user.
 */
export const emptyTrash = async (ownerId) => {
    const ownerIdParsed = parseInt(ownerId, 10);

    const deletedFiles = await prisma.file.findMany({
        where: {
            isDeleted: true,
            ownerId: ownerIdParsed,
        },
    });

    for (const file of deletedFiles) {
        // Delete physical file
        const filePath = path.join(uploadDirectory, file.uniqueName);
        if (fs.existsSync(filePath)) {
            try {
                await unlink(filePath);
            } catch (err) {
                console.error(`Failed to empty trash file ${file.uniqueName}:`, err.message);
            }
        }

        // Delete thumbnail
        if (file.thumbnail) {
            const thumbName = path.basename(file.thumbnail);
            const thumbPath = path.join(thumbDirectory, thumbName);
            if (fs.existsSync(thumbPath)) {
                try {
                    await unlink(thumbPath);
                } catch (err) {
                    console.error(`Failed to empty trash thumbnail for ${file.uniqueName}:`, err.message);
                }
            }
        }
    }

    // Bulk delete database records
    try {
        const result = await prisma.file.deleteMany({
            where: {
                isDeleted: true,
                ownerId: ownerIdParsed,
            },
        });
        return result;
    } catch (error) {
        throw new Error('Failed to empty trash in database: ' + error.message);
    }
};
