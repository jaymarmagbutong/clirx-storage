import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const listFiles = async (options = {}) => {
    try {
        const { page, limit, ownerId } = options;

        if (page !== undefined) {
            const pageNum = parseInt(page, 10) || 1;
            const limitNum = parseInt(limit, 10) || 30;
            const skip = (pageNum - 1) * limitNum;

            const files = await prisma.file.findMany({
                where: { 
                    isDeleted: false,
                    ownerId: ownerId ? parseInt(ownerId, 10) : undefined
                },
                skip,
                take: limitNum,
                orderBy: { uploadedAt: 'desc' }
            });

            const total = await prisma.file.count({
                where: { 
                    isDeleted: false,
                    ownerId: ownerId ? parseInt(ownerId, 10) : undefined
                }
            });

            return {
                files,
                hasMore: skip + files.length < total,
                total
            };
        }

        const files = await prisma.file.findMany({
            where: {
                isDeleted: false
            }
        });
        return files;
    } catch (error) {
        throw new Error('Failed to list files: ' + error.message);
    }
};