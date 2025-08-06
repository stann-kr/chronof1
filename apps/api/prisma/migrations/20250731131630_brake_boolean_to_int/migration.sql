/*
  Warnings:

  - The `brake` column on the `live_telemetry_data` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "live_telemetry_data" DROP COLUMN "brake",
ADD COLUMN     "brake" INTEGER;
