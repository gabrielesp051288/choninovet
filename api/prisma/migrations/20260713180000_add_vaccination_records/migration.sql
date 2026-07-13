CREATE TABLE `vaccination_records` (
  `id` VARCHAR(191) NOT NULL,
  `petId` VARCHAR(191) NOT NULL,
  `vetProfileId` VARCHAR(191) NOT NULL,
  `vaccine_name` VARCHAR(160) NOT NULL,
  `brand` VARCHAR(120) NULL,
  `batch_number` VARCHAR(80) NULL,
  `applied_at` DATETIME(3) NOT NULL,
  `next_due_at` DATETIME(3) NULL,
  `notes` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `vaccination_records_petId_idx` ON `vaccination_records`(`petId`);
CREATE INDEX `vaccination_records_vetProfileId_idx` ON `vaccination_records`(`vetProfileId`);
CREATE INDEX `vaccination_records_applied_at_idx` ON `vaccination_records`(`applied_at`);
CREATE INDEX `vaccination_records_next_due_at_idx` ON `vaccination_records`(`next_due_at`);

ALTER TABLE `vaccination_records`
  ADD CONSTRAINT `vaccination_records_petId_fkey`
  FOREIGN KEY (`petId`) REFERENCES `pets`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `vaccination_records`
  ADD CONSTRAINT `vaccination_records_vetProfileId_fkey`
  FOREIGN KEY (`vetProfileId`) REFERENCES `vet_profiles`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
