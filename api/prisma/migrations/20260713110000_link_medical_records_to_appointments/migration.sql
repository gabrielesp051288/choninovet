ALTER TABLE `medical_records`
  ADD COLUMN `appointmentId` VARCHAR(191) NULL;

CREATE UNIQUE INDEX `medical_records_appointmentId_key` ON `medical_records`(`appointmentId`);
CREATE INDEX `medical_records_appointmentId_idx` ON `medical_records`(`appointmentId`);

ALTER TABLE `medical_records`
  ADD CONSTRAINT `medical_records_appointmentId_fkey`
  FOREIGN KEY (`appointmentId`) REFERENCES `appointments`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
