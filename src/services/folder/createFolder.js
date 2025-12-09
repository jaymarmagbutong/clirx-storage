import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const createFolderService = async ({ name, parentId, ownerId }) => {
    try {
        // Check if folder with same name exists under the same parent for this user
        const existing = await prisma.folder.findFirst({
            where: { name, parentId, ownerId }
        });
        if (existing) {
            return { success: false, error: 'Folder already exists' };
        }

        // Create folder
        const folder = await prisma.folder.create({
            data: { name, parentId, ownerId }
        });
        return { success: true, folder };
    } catch (error) {
        return { success: false, error: error.message };
    }
};