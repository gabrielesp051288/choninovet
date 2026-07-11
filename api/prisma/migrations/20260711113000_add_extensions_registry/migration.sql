CREATE TABLE `extensions` (
    `key` VARCHAR(64) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `version` VARCHAR(40) NOT NULL DEFAULT '1.0.0',
    `description` TEXT NOT NULL,
    `category` VARCHAR(80) NOT NULL,
    `status` ENUM('AVAILABLE', 'ACTIVE', 'INACTIVE', 'NEEDS_CONFIGURATION') NOT NULL DEFAULT 'AVAILABLE',
    `is_installed` BOOLEAN NOT NULL DEFAULT false,
    `requires_external_service` BOOLEAN NOT NULL DEFAULT false,
    `package_path` VARCHAR(512) NULL,
    `manifest` JSON NULL,
    `config` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
