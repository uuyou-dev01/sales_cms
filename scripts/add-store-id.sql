-- 添加storeId字段到各个表
ALTER TABLE "Item" ADD COLUMN IF NOT EXISTS "storeId" TEXT;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "storeId" TEXT;
ALTER TABLE "productRefPrice" ADD COLUMN IF NOT EXISTS "storeId" TEXT;
ALTER TABLE "Warehouse" ADD COLUMN IF NOT EXISTS "storeId" TEXT;
ALTER TABLE "WarehousePosition" ADD COLUMN IF NOT EXISTS "storeId" TEXT;

-- 显示表结构确认
\d "Item"
\d "Transaction"
