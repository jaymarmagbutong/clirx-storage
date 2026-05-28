import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const renameFolderService = async ({ folderId, name, ownerId }) => {
    try {
        // Verify folder exists and belongs to owner
        const folder = await prisma.folder.findFirst({
            where: { id: folderId, ownerId }
        });

        if (!folder) {
            return { success: false, error: 'Folder not found or access denied' };
        }

        const updatedFolder = await prisma.folder.update({
            where: { id: folderId },
            data: { name }
        });

        return { success: true, folder: updatedFolder };
    } catch (error) {
        return { success: false, error: error.message };
    }
};
