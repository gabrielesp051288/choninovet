CREATE TABLE `medical_attachments` (
    `id` VARCHAR(191) NOT NULL,
    `petId` VARCHAR(191) NOT NULL,
    `medicalRecordId` VARCHAR(191) NULL,
    `uploadedByUserId` VARCHAR(191) NOT NULL,
    `type` ENUM('IMAGE', 'PDF', 'LAB_RESULT', 'RADIOGRAPHY', 'STUDY', 'OTHER') NOT NULL,
    `originalName` VARCHAR(191) NOT NULL,
    `storedFileName` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `sizeBytes` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `medical_attachments_storedFileName_key`(`storedFileName`),
    INDEX `medical_attachments_petId_idx`(`petId`),
    INDEX `medical_attachments_medicalRecordId_idx`(`medicalRecordId`),
    INDEX `medical_attachments_uploadedByUserId_idx`(`uploadedByUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `medical_attachments` ADD CONSTRAINT `medical_attachments_petId_fkey` FOREIGN KEY (`petId`) REFERENCES `pets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `medical_attachments` ADD CONSTRAINT `medical_attachments_medicalRecordId_fkey` FOREIGN KEY (`medicalRecordId`) REFERENCES `medical_records`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `medical_attachments` ADD CONSTRAINT `medical_attachments_uploadedByUserId_fkey` FOREIGN KEY (`uploadedByUserId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
