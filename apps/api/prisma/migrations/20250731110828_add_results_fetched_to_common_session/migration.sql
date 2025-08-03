/*
  Warnings:

  - The `drs` column on the `live_telemetry_data` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "common_sessions" ADD COLUMN     "results_fetched" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "live_telemetry_data" ADD COLUMN     "distance_to_driver_ahead" DOUBLE PRECISION,
ADD COLUMN     "driver_ahead" TEXT,
DROP COLUMN "drs",
ADD COLUMN     "drs" INTEGER;
