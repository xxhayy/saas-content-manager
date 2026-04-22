-- CreateEnum
CREATE TYPE "AssetsStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "AssetCategory" AS ENUM ('FURNITURE', 'COMMERCE_PRODUCT', 'AVATAR', 'MENS_WATCH', 'WOMENS_WATCH');

-- CreateTable
CREATE TABLE "asset" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "blueprint" TEXT,
    "category" "AssetCategory" NOT NULL,
    "originalUrl" TEXT NOT NULL,
    "cleanUrl" TEXT,
    "kieTaskId" TEXT,
    "kieError" TEXT,
    "status" "AssetsStatus" NOT NULL DEFAULT 'PROCESSING',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "asset_userId_idx" ON "asset"("userId");

-- CreateIndex
CREATE INDEX "asset_status_idx" ON "asset"("status");

-- AddForeignKey
ALTER TABLE "asset" ADD CONSTRAINT "asset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
