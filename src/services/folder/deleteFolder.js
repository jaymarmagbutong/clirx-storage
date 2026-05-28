import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const uploadDirectory = path.resolve('uploads');
const unlink = promisify(fs.unlink);

const deleteFilePhysically = async (uniqueName) => {
    const filePath = path.join(uploadDirectory, uniqueName);
    if (fs.existsSync(filePath)) {
        try {
            await unlink(filePath);
        } catch (error) {
            console.error(`Failed to delete physical file ${uniqueName}:`, error.message);
        }
    }
};

const deleteFolderRecursive = async (folderId, ownerId) => {
    // 1. Find all subfolders of this folder
    const subfolders = await prisma.folder.findMany({
        where: { parentId: folderId, ownerId }
    });

    // 2. Recursively delete subfolders
    for (const sub of subfolders) {
        await deleteFolderRecursive(sub.id, ownerId);
    }

    // 3. Find and delete all files in this folder
    const files = await prisma.file.findMany({
        where: { folderId, ownerId }
    });

    for (const file of files) {
        // Delete physical file
        await deleteFilePhysically(file.uniqueName);
        
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
