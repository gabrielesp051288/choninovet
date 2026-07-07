CREATE TABLE `audit_logs` (
  `id` VARCHAR(191) NOT NULL,
  `actorUserId` VARCHAR(191) NULL,
  `action` VARCHAR(191) NOT NULL,
  `entityType` VARCHAR(191) NOT NULL,
  `entityId` VARCHAR(191) NULL,
  `entityName` VARCHAR(191) NULL,
  `summary` TEXT NOT NULL,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `audit_logs_actorUserId_idx`(`actorUserId`),
  INDEX `audit_logs_entityType_entityId_idx`(`entityType`, `entityId`),
  INDEX `audit_logs_createdAt_idx`(`createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `audit_logs`
ADD CONSTRAINT `audit_logs_actorUserId_fkey`
FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
