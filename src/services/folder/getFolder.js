import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const getFolderService = async ({ folderId, ownerId }) => {
    try {
        // 1. Get folder first to check ownership and deletion status
        const folderBase = await prisma.folder.findUnique({
            where: { id: folderId }
        });

        if (!folderBase) {
            return { success: false, error: 'Folder not found' };
        }

        if (folderBase.ownerId !== ownerId) {
            return { success: false, error: 'Forbidden. You do not have access to this folder.' };
        }

        const isFolderDeleted = folderBase.isDeleted;

        // 2. Fetch the folder with its matching children
        const folder = await prisma.folder.findUnique({
            where: { id: folderId },
            include: {
                children: {
                    where: {
                        isDeleted: isFolderDeleted
                    }
                },
                files: {
                    where: {
                        isDeleted: isFolderDeleted
                    }
                }
            }
        });

        // Build breadcrumbs parent folder list
        const path = [];
        let currentParentId = folder.parentId;
        while (currentParentId) {
            const parentFolder = await prisma.folder.findFirst({
                where: { id: currentParentId, ownerId }
            });
            if (!parentFolder) break;
            path.unshift({
                id: parentFolder.id,
                name: parentFolder.name,
                parentId: parentFolder.parentId
            });
            currentParentId = parentFolder.parentId;
        }

        return { success: true, folder: { ...folder, path } };
    } catch (error) {
        return { success: false, error: error.message };
    }
};
