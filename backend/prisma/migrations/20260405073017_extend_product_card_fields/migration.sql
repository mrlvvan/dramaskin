-- AlterTable
ALTER TABLE `Product` ADD COLUMN `activeComponents` VARCHAR(191) NULL,
    ADD COLUMN `barcode` VARCHAR(191) NULL,
    ADD COLUMN `characteristics` VARCHAR(191) NULL,
    ADD COLUMN `composition` VARCHAR(191) NULL,
    ADD COLUMN `country` VARCHAR(191) NULL,
    ADD COLUMN `manufacturer` VARCHAR(191) NULL,
    ADD COLUMN `subcategory` VARCHAR(191) NULL,
    ADD COLUMN `usage` VARCHAR(191) NULL,
    ADD COLUMN `weightGr` INTEGER NULL;
