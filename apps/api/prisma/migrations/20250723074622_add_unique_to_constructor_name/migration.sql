/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `Constructor` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code]` on the table `Driver` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Constructor_name_key" ON "history"."Constructor"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_code_key" ON "history"."Driver"("code");
