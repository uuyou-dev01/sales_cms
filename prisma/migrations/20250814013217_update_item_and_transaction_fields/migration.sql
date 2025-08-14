/*
  Warnings:

  - You are about to drop the column `transactionStatues` on the `Transaction` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "transactionStatues",
ALTER COLUMN "shipping" DROP NOT NULL,
ALTER COLUMN "domesticShipping" DROP NOT NULL,
ALTER COLUMN "internationalShipping" DROP NOT NULL,
ALTER COLUMN "soldPlatform" DROP NOT NULL,
ALTER COLUMN "soldPrice" DROP NOT NULL,
ALTER COLUMN "soldPriceCurrency" DROP NOT NULL,
ALTER COLUMN "soldPriceExchangeRate" DROP NOT NULL,
ALTER COLUMN "itemGrossProfit" DROP NOT NULL,
ALTER COLUMN "itemNetProfit" DROP NOT NULL,
ALTER COLUMN "isReturn" DROP NOT NULL,
ALTER COLUMN "storageDuration" DROP NOT NULL;
