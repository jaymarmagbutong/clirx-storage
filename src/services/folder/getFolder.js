import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const getFolderService = async ({ folderId, ownerId }) => {
    try {
        const folder = await prisma.folder.findUnique({
            where: { id: folderId },
            include: {
                children: true,
                files: true
            }
        });

        if (!folder) {
            return { success: false, error: 'Folder not found' };
        }

        if (folder.ownerId !== ownerId) {
            return { success: false, error: 'Forbidden. You do not have access to this folder.' };
        }

        return { success: true, folder };
    } catch (error) {
        return { success: false, error: error.message };
    }
};
