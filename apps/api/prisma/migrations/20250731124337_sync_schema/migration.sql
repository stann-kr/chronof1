/*
  Warnings:

  - You are about to drop the column `abbreviation` on the `common_drivers` table. All the data in the column will be lost.
  - You are about to drop the column `country_code` on the `common_drivers` table. All the data in the column will be lost.
  - You are about to drop the column `first_name` on the `common_drivers` table. All the data in the column will be lost.
  - You are about to drop the column `last_name` on the `common_drivers` table. All the data in the column will be lost.
  - Made the column `code` on table `common_drivers` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "common_drivers" DROP COLUMN "abbreviation",
DROP COLUMN "country_code",
DROP COLUMN "first_name",
DROP COLUMN "last_name",
ALTER COLUMN "code" SET NOT NULL;
