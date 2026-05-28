import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const listFoldersService = async ({ ownerId }) => {
    try {
        const folders = await prisma.folder.findMany({
            where: { ownerId }
        });
        return { success: true, folders };
    } catch (error) {
        return { success: false, error: error.message };
    }
};
