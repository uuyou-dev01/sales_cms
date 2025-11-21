-- Create listing activity log table
CREATE TABLE "public"."ListingActivity" (
    "id" TEXT NOT NULL,
    "listingId" TEXT,
    "sourceType" "public"."ListingSourceType" NOT NULL DEFAULT 'ITEM',
    "templateId" TEXT,
    "itemId" TEXT,
    "platformId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "status" TEXT,
    "quantity" INTEGER,
    "operatorId" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ListingActivity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ListingActivity_platformId_idx" ON "public"."ListingActivity"("platformId");
CREATE INDEX "ListingActivity_templateId_idx" ON "public"."ListingActivity"("templateId");
CREATE INDEX "ListingActivity_itemId_idx" ON "public"."ListingActivity"("itemId");
CREATE INDEX "ListingActivity_listingId_idx" ON "public"."ListingActivity"("listingId");
CREATE INDEX "ListingActivity_operatorId_idx" ON "public"."ListingActivity"("operatorId");

ALTER TABLE "public"."ListingActivity"
  ADD CONSTRAINT "ListingActivity_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "public"."ItemListing"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."ListingActivity"
  ADD CONSTRAINT "ListingActivity_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "public"."Platform"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."ListingActivity"
  ADD CONSTRAINT "ListingActivity_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
