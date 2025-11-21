-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('ADMIN', 'USER', 'VIEWER');

-- CreateEnum
CREATE TYPE "public"."ToyPurchaseStatus" AS ENUM ('DOMESTIC_IN_TRANSIT', 'JAPAN_IN_TRANSIT', 'JAPAN_ARRIVED');

-- CreateTable
CREATE TABLE "public"."Item" (
    "itemId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "itemMfgDate" TEXT,
    "itemNumber" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "itemBrand" TEXT NOT NULL,
    "itemCondition" TEXT NOT NULL,
    "itemRemarks" TEXT,
    "itemColor" TEXT,
    "itemSize" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "photos" TEXT[],
    "position" TEXT,
    "warehousePositionId" TEXT,
    "accessories" TEXT,
    "toyCharacterName" TEXT,
    "toyCondition" TEXT,
    "toyVariant" TEXT,
    "parentItemId" TEXT,
    "skuId" TEXT NOT NULL,
    "purchaseOrderId" TEXT,
    "purchaseDetailId" TEXT,
    "createdById" TEXT,
    "soldById" TEXT,
    "purchasedById" TEXT,
    "status" TEXT NOT NULL DEFAULT 'IN_STOCK',
    "batchNumber" TEXT,
    "reservedFor" TEXT,
    "templateId" TEXT,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("itemId")
);

-- CreateTable
CREATE TABLE "public"."Transaction" (
    "id" TEXT NOT NULL,
    "itemId" TEXT,
    "platformId" TEXT,
    "shipping" TEXT,
    "domesticShipping" TEXT,
    "internationalShipping" TEXT,
    "domesticTrackingNumber" TEXT,
    "internationalTrackingNumber" TEXT,
    "orderStatus" TEXT NOT NULL DEFAULT '在途（国内）',
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "soldDate" TIMESTAMP(3),
    "launchDate" TIMESTAMP(3),
    "purchasePlatform" TEXT NOT NULL,
    "soldPlatform" TEXT,
    "listingPlatforms" TEXT[],
    "otherFees" JSONB,
    "purchasePrice" TEXT NOT NULL,
    "purchasePriceCurrency" TEXT NOT NULL,
    "purchasePriceExchangeRate" TEXT NOT NULL,
    "soldPrice" TEXT,
    "soldPriceCurrency" TEXT,
    "soldPriceExchangeRate" TEXT,
    "itemGrossProfit" TEXT,
    "itemNetProfit" TEXT,
    "isReturn" BOOLEAN,
    "storageDuration" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "soldById" TEXT,
    "isBundled" BOOLEAN NOT NULL DEFAULT false,
    "totalSoldPrice" DECIMAL(65,30),
    "priceAllocationMethod" TEXT,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."productRefPrice" (
    "itemId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "itemMfgDate" TEXT NOT NULL,
    "itemNumber" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "itemBrand" TEXT NOT NULL,
    "itemCondition" TEXT NOT NULL,
    "itemRemarks" TEXT NOT NULL,
    "itemColor" TEXT NOT NULL,
    "itemStatus" TEXT NOT NULL,
    "itemSize" TEXT NOT NULL,
    "refPrice" TEXT NOT NULL,
    "refPriceCurrency" TEXT NOT NULL,
    "refPriceExchangeRate" TEXT NOT NULL,
    "refPriceCNY" TEXT NOT NULL,
    "refDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "productRefPrice_pkey" PRIMARY KEY ("itemId")
);

-- CreateTable
CREATE TABLE "public"."Warehouse" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WarehousePosition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "used" INTEGER NOT NULL DEFAULT 0,
    "warehouseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarehousePosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Store" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "public"."UserRole" NOT NULL DEFAULT 'USER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "storeId" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ToyBrand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "logo" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ToyBrand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ToySeries" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "releaseDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ToySeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ToyCharacter" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "rarity" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ToyCharacter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StockAdjustment" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "adjustmentType" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "previousStock" INTEGER NOT NULL,
    "newStock" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ToySKU" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "currentStock" INTEGER NOT NULL DEFAULT 0,
    "suggestedPrice" DECIMAL(65,30) NOT NULL,
    "costPrice" DECIMAL(65,30) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "skuId" TEXT,

    CONSTRAINT "ToySKU_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InventoryBatch" (
    "id" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "inboundDate" TIMESTAMP(3) NOT NULL,
    "purchaseOrderId" TEXT,
    "unitCostPrice" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ToyPurchaseOrder" (
    "id" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "domesticOrderNumber" TEXT NOT NULL,
    "status" "public"."ToyPurchaseStatus" NOT NULL DEFAULT 'DOMESTIC_IN_TRANSIT',
    "weight" DECIMAL(65,30) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "batch" TEXT,
    "shippingDate" TIMESTAMP(3) NOT NULL,
    "arrivalTime" TIMESTAMP(3),
    "shippingCost" DECIMAL(65,30),
    "totalShippingAmount" DECIMAL(65,30),
    "totalShippingWeight" DECIMAL(65,30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ToyPurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ToySalesRecord" (
    "id" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "cost" DECIMAL(65,30) NOT NULL,
    "profit" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ToySalesRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "parentId" TEXT,
    "path" TEXT,
    "level" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SKU" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT,
    "name" TEXT NOT NULL,
    "skuNumber" TEXT,
    "brand" TEXT,
    "unit" TEXT,
    "attributes" JSONB,
    "isComposite" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SKU_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SubSkuTemplate" (
    "id" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "itemSize" TEXT,
    "itemCondition" TEXT NOT NULL DEFAULT 'NEW',
    "variantLabel" TEXT,
    "itemColor" TEXT,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "recommendedPrice" DECIMAL(65,30),
    "recommendedPriceCurrency" TEXT DEFAULT 'JPY',
    "optionalAttributes" JSONB,
    "itemRemarks" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubSkuTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Platform" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseFeeRate" DOUBLE PRECISION NOT NULL,
    "shippingFee" DOUBLE PRECISION,
    "tierRules" JSONB,
    "region" TEXT,
    "market" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'JPY',
    "feeSchema" JSONB,
    "shippingTemplates" JSONB,
    "config" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Platform_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CompositeSKU" (
    "id" TEXT NOT NULL,
    "parentSkuId" TEXT NOT NULL,
    "childSkuId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "CompositeSKU_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InventorySplit" (
    "id" TEXT NOT NULL,
    "parentItemId" TEXT NOT NULL,
    "childItemId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "ratio" JSONB,
    "allocatedCost" DECIMAL(65,30),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventorySplit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ExchangeRate" (
    "id" TEXT NOT NULL,
    "baseCurrency" TEXT NOT NULL,
    "quoteCurrency" TEXT NOT NULL,
    "rate" DECIMAL(65,30) NOT NULL,
    "rateDate" TIMESTAMP(3) NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Logistics" (
    "id" TEXT NOT NULL,
    "relatedType" TEXT NOT NULL,
    "relatedId" TEXT NOT NULL,
    "fromCountry" TEXT,
    "toCountry" TEXT,
    "fromNode" TEXT,
    "toNode" TEXT,
    "trackingNo" TEXT,
    "cost" DECIMAL(65,30),
    "currency" TEXT,
    "segments" JSONB,
    "allocations" JSONB,
    "destination" TEXT,
    "departedAt" TIMESTAMP(3),
    "arrivedAt" TIMESTAMP(3),
    "status" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Logistics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ItemListing" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "externalId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "listingPrice" DECIMAL(65,30),
    "listingCurrency" TEXT DEFAULT 'JPY',
    "listingUrl" TEXT,
    "warehouseId" TEXT,
    "note" TEXT,
    "listedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FinanceRecord" (
    "id" TEXT NOT NULL,
    "referenceType" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "meta" JSONB,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TransactionDetail" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(65,30),
    "currency" TEXT,
    "exchangeRateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransactionDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserRoleLink" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "UserRoleLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PurchaseOrder" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "totalAmount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "exchangeRateId" TEXT,
    "createdById" TEXT,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PurchaseDetail" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(65,30),
    "allocatedCost" DECIMAL(65,30),
    "allocationMethod" TEXT,
    "itemIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseDetail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Item_parentItemId_idx" ON "public"."Item"("parentItemId");

-- CreateIndex
CREATE INDEX "Item_skuId_idx" ON "public"."Item"("skuId");

-- CreateIndex
CREATE INDEX "Item_purchaseOrderId_idx" ON "public"."Item"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "Item_purchaseDetailId_idx" ON "public"."Item"("purchaseDetailId");

-- CreateIndex
CREATE INDEX "Item_status_idx" ON "public"."Item"("status");

-- CreateIndex
CREATE INDEX "Item_batchNumber_idx" ON "public"."Item"("batchNumber");

-- CreateIndex
CREATE INDEX "Item_templateId_idx" ON "public"."Item"("templateId");

-- CreateIndex
CREATE INDEX "Transaction_createdById_idx" ON "public"."Transaction"("createdById");

-- CreateIndex
CREATE INDEX "Transaction_soldById_idx" ON "public"."Transaction"("soldById");

-- CreateIndex
CREATE INDEX "Transaction_platformId_idx" ON "public"."Transaction"("platformId");

-- CreateIndex
CREATE INDEX "Transaction_isBundled_idx" ON "public"."Transaction"("isBundled");

-- CreateIndex
CREATE UNIQUE INDEX "Store_name_key" ON "public"."Store"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "public"."User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "User_storeId_idx" ON "public"."User"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "ToyBrand_name_key" ON "public"."ToyBrand"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ToySeries_brandId_name_key" ON "public"."ToySeries"("brandId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ToyCharacter_seriesId_name_key" ON "public"."ToyCharacter"("seriesId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ToySKU_characterId_name_key" ON "public"."ToySKU"("characterId", "name");

-- CreateIndex
CREATE INDEX "ToyPurchaseOrder_skuId_idx" ON "public"."ToyPurchaseOrder"("skuId");

-- CreateIndex
CREATE INDEX "ToyPurchaseOrder_status_idx" ON "public"."ToyPurchaseOrder"("status");

-- CreateIndex
CREATE INDEX "ToySalesRecord_skuId_idx" ON "public"."ToySalesRecord"("skuId");

-- CreateIndex
CREATE INDEX "ToySalesRecord_date_idx" ON "public"."ToySalesRecord"("date");

-- CreateIndex
CREATE INDEX "Category_parentId_idx" ON "public"."Category"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_parentId_key" ON "public"."Category"("name", "parentId");

-- CreateIndex
CREATE INDEX "SKU_categoryId_idx" ON "public"."SKU"("categoryId");

-- CreateIndex
CREATE INDEX "SKU_skuNumber_idx" ON "public"."SKU"("skuNumber");

-- CreateIndex
CREATE UNIQUE INDEX "SKU_name_brand_key" ON "public"."SKU"("name", "brand");

-- CreateIndex
CREATE INDEX "SubSkuTemplate_skuId_idx" ON "public"."SubSkuTemplate"("skuId");

-- CreateIndex
CREATE INDEX "SubSkuTemplate_isActive_idx" ON "public"."SubSkuTemplate"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "SubSkuTemplate_skuId_itemSize_itemCondition_variantLabel_it_key" ON "public"."SubSkuTemplate"("skuId", "itemSize", "itemCondition", "variantLabel", "itemColor");

-- CreateIndex
CREATE UNIQUE INDEX "Platform_name_key" ON "public"."Platform"("name");

-- CreateIndex
CREATE INDEX "CompositeSKU_childSkuId_idx" ON "public"."CompositeSKU"("childSkuId");

-- CreateIndex
CREATE UNIQUE INDEX "CompositeSKU_parentSkuId_childSkuId_key" ON "public"."CompositeSKU"("parentSkuId", "childSkuId");

-- CreateIndex
CREATE INDEX "InventorySplit_parentItemId_idx" ON "public"."InventorySplit"("parentItemId");

-- CreateIndex
CREATE INDEX "InventorySplit_childItemId_idx" ON "public"."InventorySplit"("childItemId");

-- CreateIndex
CREATE INDEX "ExchangeRate_rateDate_idx" ON "public"."ExchangeRate"("rateDate");

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeRate_baseCurrency_quoteCurrency_rateDate_key" ON "public"."ExchangeRate"("baseCurrency", "quoteCurrency", "rateDate");

-- CreateIndex
CREATE INDEX "Logistics_relatedType_relatedId_idx" ON "public"."Logistics"("relatedType", "relatedId");

-- CreateIndex
CREATE INDEX "ItemListing_itemId_idx" ON "public"."ItemListing"("itemId");

-- CreateIndex
CREATE INDEX "ItemListing_platformId_idx" ON "public"."ItemListing"("platformId");

-- CreateIndex
CREATE UNIQUE INDEX "ItemListing_itemId_platformId_key" ON "public"."ItemListing"("itemId", "platformId");

-- CreateIndex
CREATE INDEX "FinanceRecord_referenceType_referenceId_idx" ON "public"."FinanceRecord"("referenceType", "referenceId");

-- CreateIndex
CREATE INDEX "FinanceRecord_occurredAt_idx" ON "public"."FinanceRecord"("occurredAt");

-- CreateIndex
CREATE INDEX "TransactionDetail_transactionId_idx" ON "public"."TransactionDetail"("transactionId");

-- CreateIndex
CREATE INDEX "TransactionDetail_itemId_idx" ON "public"."TransactionDetail"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "public"."Role"("name");

-- CreateIndex
CREATE INDEX "UserRoleLink_roleId_idx" ON "public"."UserRoleLink"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "UserRoleLink_userId_roleId_key" ON "public"."UserRoleLink"("userId", "roleId");

-- CreateIndex
CREATE INDEX "UserActivity_userId_idx" ON "public"."UserActivity"("userId");

-- CreateIndex
CREATE INDEX "UserActivity_entityType_entityId_idx" ON "public"."UserActivity"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_orderNumber_key" ON "public"."PurchaseOrder"("orderNumber");

-- CreateIndex
CREATE INDEX "PurchaseDetail_purchaseOrderId_idx" ON "public"."PurchaseDetail"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "PurchaseDetail_skuId_idx" ON "public"."PurchaseDetail"("skuId");

-- AddForeignKey
ALTER TABLE "public"."Item" ADD CONSTRAINT "Item_warehousePositionId_fkey" FOREIGN KEY ("warehousePositionId") REFERENCES "public"."WarehousePosition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Item" ADD CONSTRAINT "Item_parentItemId_fkey" FOREIGN KEY ("parentItemId") REFERENCES "public"."Item"("itemId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Item" ADD CONSTRAINT "Item_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "public"."SKU"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Item" ADD CONSTRAINT "Item_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."SubSkuTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Item" ADD CONSTRAINT "Item_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "public"."PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Item" ADD CONSTRAINT "Item_purchaseDetailId_fkey" FOREIGN KEY ("purchaseDetailId") REFERENCES "public"."PurchaseDetail"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Item" ADD CONSTRAINT "Item_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Item" ADD CONSTRAINT "Item_soldById_fkey" FOREIGN KEY ("soldById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Item" ADD CONSTRAINT "Item_purchasedById_fkey" FOREIGN KEY ("purchasedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."Item"("itemId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "public"."Platform"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_soldById_fkey" FOREIGN KEY ("soldById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WarehousePosition" ADD CONSTRAINT "WarehousePosition_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "public"."Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "public"."Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ToySeries" ADD CONSTRAINT "ToySeries_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "public"."ToyBrand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ToyCharacter" ADD CONSTRAINT "ToyCharacter_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "public"."ToySeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StockAdjustment" ADD CONSTRAINT "StockAdjustment_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."Item"("itemId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ToySKU" ADD CONSTRAINT "ToySKU_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "public"."ToyCharacter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ToySKU" ADD CONSTRAINT "ToySKU_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "public"."SKU"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryBatch" ADD CONSTRAINT "InventoryBatch_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "public"."ToyPurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryBatch" ADD CONSTRAINT "InventoryBatch_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "public"."ToySKU"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ToyPurchaseOrder" ADD CONSTRAINT "ToyPurchaseOrder_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "public"."ToySKU"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ToySalesRecord" ADD CONSTRAINT "ToySalesRecord_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "public"."ToySKU"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SKU" ADD CONSTRAINT "SKU_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SubSkuTemplate" ADD CONSTRAINT "SubSkuTemplate_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "public"."SKU"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CompositeSKU" ADD CONSTRAINT "CompositeSKU_parentSkuId_fkey" FOREIGN KEY ("parentSkuId") REFERENCES "public"."SKU"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CompositeSKU" ADD CONSTRAINT "CompositeSKU_childSkuId_fkey" FOREIGN KEY ("childSkuId") REFERENCES "public"."SKU"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventorySplit" ADD CONSTRAINT "InventorySplit_parentItemId_fkey" FOREIGN KEY ("parentItemId") REFERENCES "public"."Item"("itemId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventorySplit" ADD CONSTRAINT "InventorySplit_childItemId_fkey" FOREIGN KEY ("childItemId") REFERENCES "public"."Item"("itemId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventorySplit" ADD CONSTRAINT "InventorySplit_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ItemListing" ADD CONSTRAINT "ItemListing_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."Item"("itemId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ItemListing" ADD CONSTRAINT "ItemListing_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "public"."Platform"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FinanceRecord" ADD CONSTRAINT "FinanceRecord_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TransactionDetail" ADD CONSTRAINT "TransactionDetail_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "public"."Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TransactionDetail" ADD CONSTRAINT "TransactionDetail_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."Item"("itemId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TransactionDetail" ADD CONSTRAINT "TransactionDetail_exchangeRateId_fkey" FOREIGN KEY ("exchangeRateId") REFERENCES "public"."ExchangeRate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserRoleLink" ADD CONSTRAINT "UserRoleLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserRoleLink" ADD CONSTRAINT "UserRoleLink_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserActivity" ADD CONSTRAINT "UserActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_exchangeRateId_fkey" FOREIGN KEY ("exchangeRateId") REFERENCES "public"."ExchangeRate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PurchaseDetail" ADD CONSTRAINT "PurchaseDetail_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "public"."PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PurchaseDetail" ADD CONSTRAINT "PurchaseDetail_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "public"."SKU"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
