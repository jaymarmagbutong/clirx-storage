import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { PrismaClient } from '@prisma/client';
import { permanentlyDeleteFolderRecursive } from '../folder/deleteFolder.js';

const prisma = new PrismaClient();
const unlink = promisify(fs.unlink);

const uploadDirectory = path.resolve('uploads');
const thumbDirectory = path.resolve('uploads/thumbnails');

/**
 * Lists all soft-deleted files and folders for a user.
 */
export const listDeletedFiles = async (ownerId) => {
    try {
        const ownerIdParsed = parseInt(ownerId, 10);
        
        // Find deleted folders at the root of deletion
        const folders = await prisma.folder.findMany({
            where: {
                isDeleted: true,
                ownerId: ownerIdParsed,
                OR: [
                    { parentId: null },
                    { parent: { isDeleted: false } }
                ]
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Find deleted files at the root of deletion
        const files = await prisma.file.findMany({
            where: {
                isDeleted: true,
                ownerId: ownerIdParsed,
                OR: [
                    { folderId: null },
                    { folder: { isDeleted: false } }
                ]
            },
            orderBy: {
                uploadedAt: 'desc'
            }
        });

        return { files, folders };
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
 * Empties all soft-deleted files and folders for a user.
 */
export const emptyTrash = async (ownerId) => {
    const ownerIdParsed = parseInt(ownerId, 10);

    // 1. Permanently delete all root-level deleted folders and their contents
    const rootDeletedFolders = await prisma.folder.findMany({
        where: {
            isDeleted: true,
            ownerId: ownerIdParsed,
            OR: [
                { parentId: null },
                { parent: { isDeleted: false } }
            ]
        }
    });

    for (const folder of rootDeletedFolders) {
        await permanentlyDeleteFolderRecursive(folder.id, ownerIdParsed);
    }

    // 2. Permanently delete any remaining soft-deleted files (not inside deleted folders)
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

    // Bulk delete database records for remaining files
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

/**
 * Permanently deletes multiple files for a user (physical and database).
 */
export const bulkPermanentlyDeleteFiles = async (fileIds, ownerId) => {
    try {
        const ids = fileIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
        if (ids.length === 0) {
            return { count: 0 };
        }

        const ownerIdParsed = parseInt(ownerId, 10);

        // Find all files matching the given IDs and ownerId
        const files = await prisma.file.findMany({
            where: {
                id: { in: ids },
                ownerId: ownerIdParsed,
            },
        });

        for (const file of files) {
            // Delete physical file from disk
            const filePath = path.join(uploadDirectory, file.uniqueName);
            if (fs.existsSync(filePath)) {
                try {
                    await unlink(filePath);
                } catch (err) {
                    console.error(`Failed to bulk permanently delete file ${file.uniqueName}:`, err.message);
                }
            }

            // Delete thumbnail from disk if exists
            if (file.thumbnail) {
                const thumbName = path.basename(file.thumbnail);
                const thumbPath = path.join(thumbDirectory, thumbName);
                if (fs.existsSync(thumbPath)) {
                    try {
                        await unlink(thumbPath);
                    } catch (err) {
                        console.error(`Failed to bulk permanently delete thumbnail for ${file.uniqueName}:`, err.message);
                    }
                }
            }
        }

        // Delete database records
        const result = await prisma.file.deleteMany({
            where: {
                id: { in: ids },
                ownerId: ownerIdParsed,
            },
        });
        return result;
    } catch (error) {
        throw new Error('Failed to bulk permanently delete files: ' + error.message);
    }
};

