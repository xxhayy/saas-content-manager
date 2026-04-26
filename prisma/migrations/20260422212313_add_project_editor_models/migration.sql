/*
  Warnings:

  - You are about to drop the column `filePath` on the `project` table. All the data in the column will be lost.
  - You are about to drop the column `imageKitId` on the `project` table. All the data in the column will be lost.
  - You are about to drop the column `imageUrl` on the `project` table. All the data in the column will be lost.
  - Made the column `name` on table `project` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "GenerationStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "project" DROP COLUMN "filePath",
DROP COLUMN "imageKitId",
DROP COLUMN "imageUrl",
ADD COLUMN     "edgesJson" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "nodesJson" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "thumbnailUrl" TEXT,
ADD COLUMN     "viewportJson" JSONB NOT NULL DEFAULT '{"x":0,"y":0,"zoom":1}',
ALTER COLUMN "name" SET NOT NULL,
ALTER COLUMN "name" SET DEFAULT 'Untitled Project';

-- CreateTable
CREATE TABLE "project_generation" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "outputNodeId" TEXT NOT NULL,
    "kieTaskId" TEXT,
    "status" "GenerationStatus" NOT NULL DEFAULT 'PENDING',
    "kieError" TEXT,
    "prompt" TEXT NOT NULL,
    "aspectRatio" TEXT NOT NULL DEFAULT '1:1',
    "model" TEXT NOT NULL DEFAULT 'nano-banana-2',
    "seed" INTEGER,
    "variationIndex" INTEGER NOT NULL DEFAULT 0,
    "inputImages" JSONB NOT NULL DEFAULT '[]',
    "resultUrl" TEXT,
    "imageUrl" TEXT,
    "imageKitId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_generation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_generation_projectId_idx" ON "project_generation"("projectId");

-- CreateIndex
CREATE INDEX "project_generation_outputNodeId_idx" ON "project_generation"("outputNodeId");

-- CreateIndex
CREATE INDEX "project_generation_status_idx" ON "project_generation"("status");

-- CreateIndex
CREATE INDEX "project_generation_kieTaskId_idx" ON "project_generation"("kieTaskId");

-- CreateIndex
CREATE INDEX "project_userId_idx" ON "project"("userId");

-- AddForeignKey
ALTER TABLE "project_generation" ADD CONSTRAINT "project_generation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
