CREATE TABLE IF NOT EXISTS `schedule_settings` (
  `scope` VARCHAR(16) NOT NULL,
  `is_enabled` BOOLEAN NOT NULL DEFAULT true,
  `start_time` VARCHAR(5) NOT NULL,
  `end_time` VARCHAR(5) NOT NULL,
  `interval_minutes` INT NOT NULL DEFAULT 30,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`scope`)
);

INSERT INTO `schedule_settings` (`scope`, `is_enabled`, `start_time`, `end_time`, `interval_minutes`)
VALUES
  ('WEEKDAY', true, '08:00', '20:00', 30),
  ('SATURDAY', true, '09:00', '13:00', 30),
  ('SUNDAY', false, '09:00', '13:00', 30)
ON DUPLICATE KEY UPDATE
  `scope` = VALUES(`scope`);
