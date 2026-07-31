import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const uploadDirectory = path.resolve('uploads');
const thumbDirectory = path.resolve('uploads/thumbnails');
const unlink = promisify(fs.unlink);

const deleteFilePhysically = async (fileRecord) => {
    // 1. Delete physical file
    const filePath = path.join(uploadDirectory, fileRecord.uniqueName);
    if (fs.existsSync(filePath)) {
        try {
            await unlink(filePath);
        } catch (error) {
            console.error(`Failed to delete physical file ${fileRecord.uniqueName}:`, error.message);
        }
    }

    // 2. Delete thumbnail if exists
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
};

const deleteFolderRecursive = async (folderId, ownerId) => {
    // 1. Find all subfolders of this folder
    const subfolders = await prisma.folder.findMany({
        where: { parentId: folderId, ownerId }
    });

    // 2. Recursively soft-delete subfolders
    for (const sub of subfolders) {
        await deleteFolderRecursive(sub.id, ownerId);
    }

    // 3. Soft-delete all files in this folder by setting isDeleted = true
    await prisma.file.updateMany({
        where: { folderId, ownerId },
        data: {
            isDeleted: true
        }
    });

    // 4. Soft-delete the folder record itself by setting isDeleted = true
    await prisma.folder.update({
        where: { id: folderId },
        data: {
            isDeleted: true
        }
    });
};

export const deleteFolderService = async ({ folderId, ownerId }) => {
    try {
        // Verify folder exists and belongs to owner
        const folder = await prisma.folder.findFirst({
            where: { id: folderId, ownerId }
        });

        if (!folder) {
            return { success: false, error: 'Folder not found or access denied' };
        }

        await deleteFolderRecursive(folderId, ownerId);

        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

export const permanentlyDeleteFolderRecursive = async (folderId, ownerId) => {
    // 1. Find all subfolders of this folder
    const subfolders = await prisma.folder.findMany({
        where: { parentId: folderId, ownerId }
    });

    // 2. Recursively delete subfolders
    for (const sub of subfolders) {
        await permanentlyDeleteFolderRecursive(sub.id, ownerId);
    }

    // 3. Find and permanently delete all files in this folder
    const files = await prisma.file.findMany({
        where: { folderId, ownerId }
    });

    for (const file of files) {
        // Delete physical file and thumbnail
        await deleteFilePhysically(file);
        
        // Delete file versions first
        await prisma.fileVersion.deleteMany({
            where: { fileId: file.id }
        });

        // Delete database record
        await prisma.file.delete({
            where: { id: file.id }
        });
    }

    // 4. Finally delete the folder record itself
    await prisma.folder.delete({
        where: { id: folderId }
    });
};

export const permanentlyDeleteFolderService = async ({ folderId, ownerId }) => {
    try {
        // Verify folder exists and belongs to owner
        const folder = await prisma.folder.findFirst({
            where: { id: folderId, ownerId }
        });

        if (!folder) {
            return { success: false, error: 'Folder not found or access denied' };
        }

        await permanentlyDeleteFolderRecursive(folderId, ownerId);

        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

