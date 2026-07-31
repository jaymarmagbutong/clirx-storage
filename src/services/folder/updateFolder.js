import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const restoreFolderRecursive = async (folderId, ownerId) => {
    // 1. Mark the folder itself as active
    await prisma.folder.update({
        where: { id: folderId },
        data: { isDeleted: false }
    });

    // 2. Mark all files in this folder as active
    await prisma.file.updateMany({
        where: { folderId, ownerId },
        data: { isDeleted: false }
    });

    // 3. Find all subfolders of this folder
    const subfolders = await prisma.folder.findMany({
        where: { parentId: folderId, ownerId }
    });

    // 4. Recursively restore subfolders
    for (const sub of subfolders) {
        await restoreFolderRecursive(sub.id, ownerId);
    }
};

export const updateFolderService = async ({ folderId, name, isDeleted, ownerId }) => {
    try {
        const folder = await prisma.folder.findFirst({
            where: { id: folderId, ownerId }
        });

        if (!folder) {
            return { success: false, error: 'Folder not found or access denied' };
        }

        const data = {};
        if (name !== undefined) {
            data.name = name.trim();
        }

        let updatedFolder = folder;
        if (isDeleted !== undefined) {
            if (isDeleted === false) {
                // Restore folder and all its contents recursively
                await restoreFolderRecursive(folderId, ownerId);
                updatedFolder = await prisma.folder.findUnique({
                    where: { id: folderId }
                });
            } else {
                // Soft delete folder and all its contents recursively
                // Handled via deleteFolderService, but let's support it here too just in case
                data.isDeleted = true;
                updatedFolder = await prisma.folder.update({
                    where: { id: folderId },
                    data
                });
            }
        } else if (name !== undefined) {
            updatedFolder = await prisma.folder.update({
                where: { id: folderId },
                data
            });
        }

        return { success: true, folder: updatedFolder };
    } catch (error) {
        return { success: false, error: error.message };
    }
};
