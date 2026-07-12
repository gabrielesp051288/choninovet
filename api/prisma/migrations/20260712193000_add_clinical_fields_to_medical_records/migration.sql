ALTER TABLE `medical_records`
  ADD COLUMN `consultationReason` TEXT NULL,
  ADD COLUMN `diagnosis` TEXT NULL,
  ADD COLUMN `treatment` TEXT NULL,
  ADD COLUMN `medication` TEXT NULL,
  ADD COLUMN `weightKg` DECIMAL(6, 2) NULL,
  ADD COLUMN `temperatureC` DECIMAL(4, 1) NULL,
  ADD COLUMN `ownerVisibleNotes` TEXT NULL,
  ADD COLUMN `privateNotes` TEXT NULL;
