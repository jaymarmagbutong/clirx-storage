-- AlterTable
ALTER TABLE `file` MODIFY `originalName` TEXT NOT NULL,
    MODIFY `uniqueName` TEXT NOT NULL,
    MODIFY `filePath` TEXT NOT NULL,
    MODIFY `source` TEXT NOT NULL;
