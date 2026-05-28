import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const getFolderService = async ({ folderId, ownerId }) => {
    try {
        const folder = await prisma.folder.findUnique({
            where: { id: folderId },
            include: {
                children: true,
                files: {
                    where: {
                        isDeleted: false
                    }
                }
            }
        });

        if (!folder) {
            return { success: false, error: 'Folder not found' };
        }

        if (folder.ownerId !== ownerId) {
            return { success: false, error: 'Forbidden. You do not have access to this folder.' };
        }

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
