-- CreateTable
CREATE TABLE "Item" (
    "itemId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "itemMfgDate" TEXT NOT NULL,
    "itemNumber" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "itemBrand" TEXT NOT NULL,
    "itemCondition" TEXT NOT NULL,
    "itemRemarks" TEXT NOT NULL,
    "itemColor" TEXT NOT NULL,
    "itemSize" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "photos" TEXT[],
    "position" TEXT,
    "warehousePositionId" TEXT,
    "accessories" TEXT,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("itemId")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "shipping" TEXT NOT NULL,
    "domesticShipping" TEXT NOT NULL,
    "internationalShipping" TEXT NOT NULL,
    "domesticTrackingNumber" TEXT,
    "internationalTrackingNumber" TEXT,
    "transactionStatues" TEXT NOT NULL,
    "orderStatus" TEXT NOT NULL DEFAULT '在途（国内）',
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "soldDate" TIMESTAMP(3),
    "launchDate" TIMESTAMP(3),
    "purchasePlatform" TEXT NOT NULL,
    "soldPlatform" TEXT NOT NULL,
    "listingPlatforms" TEXT[],
    "otherFees" JSONB,
    "purchasePrice" TEXT NOT NULL,
    "purchasePriceCurrency" TEXT NOT NULL,
    "purchasePriceExchangeRate" TEXT NOT NULL,
    "soldPrice" TEXT NOT NULL,
    "soldPriceCurrency" TEXT NOT NULL,
    "soldPriceExchangeRate" TEXT NOT NULL,
    "itemGrossProfit" TEXT NOT NULL,
    "itemNetProfit" TEXT NOT NULL,
    "isReturn" BOOLEAN NOT NULL,
    "storageDuration" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productRefPrice" (
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
CREATE TABLE "Warehouse" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarehousePosition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "used" INTEGER NOT NULL DEFAULT 0,
    "warehouseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarehousePosition_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_warehousePositionId_fkey" FOREIGN KEY ("warehousePositionId") REFERENCES "WarehousePosition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("itemId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehousePosition" ADD CONSTRAINT "WarehousePosition_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
