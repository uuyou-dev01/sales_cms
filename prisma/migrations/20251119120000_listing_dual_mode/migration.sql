-- Add template-level stock counters
ALTER TABLE "public"."SubSkuTemplate"
  ADD COLUMN "availableQuantity" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "listedQuantity" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "reservedQuantity" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "soldQuantity" INTEGER NOT NULL DEFAULT 0;

-- Add new source type enum for listings
CREATE TYPE "public"."ListingSourceType" AS ENUM ('ITEM', 'TEMPLATE');

-- Extend ItemListing for template-aware listings
ALTER TABLE "public"."ItemListing"
  ADD COLUMN "sourceType" "public"."ListingSourceType" NOT NULL DEFAULT 'ITEM',
  ADD COLUMN "templateId" TEXT,
  ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "fulfilledQuantity" INTEGER NOT NULL DEFAULT 0;

-- Item-level listings now optional
ALTER TABLE "public"."ItemListing"
  ALTER COLUMN "itemId" DROP NOT NULL;

-- Drop and recreate unique & index definitions to include template use-cases
DROP INDEX IF EXISTS "public"."ItemListing_itemId_platformId_key";

CREATE UNIQUE INDEX "ItemListing_itemId_platformId_key" ON "public"."ItemListing"("itemId", "platformId");
CREATE UNIQUE INDEX "ItemListing_templateId_platformId_key" ON "public"."ItemListing"("templateId", "platformId");
CREATE INDEX IF NOT EXISTS "ItemListing_templateId_idx" ON "public"."ItemListing"("templateId");

-- Link listings back to templates
ALTER TABLE "public"."ItemListing"
  ADD CONSTRAINT "ItemListing_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES "public"."SubSkuTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
