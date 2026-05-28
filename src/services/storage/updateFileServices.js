import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Builds a sanitized update payload from raw request body fields.
 * Only includes fields that were explicitly provided.
 */
export const buildUpdateData = ({ folderId, isPrivate, isDeleted }) => {
    const data = {};
    if (folderId !== undefined) data.folderId = folderId ? parseInt(folderId, 10) : null;
    if (isPrivate !== undefined) data.isPrivate = !!isPrivate;
    if (isDeleted !== undefined) data.isDeleted = !!isDeleted;
    return data;
};

/**
 * Validates and builds the update payload for bulk operations.
 * Throws if fileIds is not an array.
 */
export const buildBulkUpdateData = ({ fileIds, folderId, isPrivate, isDeleted }) => {
    if (!Array.isArray(fileIds)) {
        const err = new Error('fileIds must be an array of file IDs');
        err.status = 400;
        throw err;
    }
    return buildUpdateData({ folderId, isPrivate, isDeleted });
};

/**
 * Updates a single file's fields (folderId, isPrivate, etc.).
 */
export const updateFile = async (uniqueName, data) => {
    try {
        const fileRecord = await prisma.file.findUnique({
            where: { uniqueName }
        });

        if (!fileRecord) {
            throw new Error('File not found');
        }

        const updated = await prisma.file.update({
            where: { uniqueName },
            data
        });

        return updated;
    } catch (error) {
        throw new Error('Failed to update file: ' + error.message);
    }
};

/**
 * Updates multiple files (batch move to folder, or batch visibility toggle).
 */
export const bulkUpdateFiles = async (fileIds, data) => {
    try {
        const ids = fileIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
        if (ids.length === 0) {
            return { count: 0 };
        }

        const result = await prisma.file.updateMany({
            where: {
                id: { in: ids }
            },
            data
        });

        return result;
    } catch (error) {
        throw new Error('Failed to bulk update files: ' + error.message);
    }
};

/**
 * Soft deletes multiple files by setting isDeleted = true.
 */
export const bulkDeleteFiles = async (fileIds) => {
    try {
        const ids = fileIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
        if (ids.length === 0) {
            return { count: 0 };
        }

        const result = await prisma.file.updateMany({
            where: {
                id: { in: ids }
            },
            data: {
                isDeleted: true
            }
        });

        return result;
    } catch (error) {
        throw new Error('Failed to bulk soft-delete files: ' + error.message);
    }
};
