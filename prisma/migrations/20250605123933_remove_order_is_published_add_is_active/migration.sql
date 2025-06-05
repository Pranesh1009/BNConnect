/*
  Warnings:

  - You are about to drop the column `isPublished` on the `Chapter` table. All the data in the column will be lost.
  - You are about to drop the column `order` on the `Chapter` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Chapter" DROP COLUMN "isPublished",
DROP COLUMN "order",
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;
