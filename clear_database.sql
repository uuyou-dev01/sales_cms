-- 清空数据库脚本
-- 注意：这将删除所有数据，请谨慎使用

-- 禁用外键约束检查
SET session_replication_role = replica;

-- 清空所有表的数据
TRUNCATE TABLE "Transaction" CASCADE;
TRUNCATE TABLE "Item" CASCADE;
TRUNCATE TABLE "WarehousePosition" CASCADE;
TRUNCATE TABLE "Warehouse" CASCADE;

-- 重新启用外键约束检查
SET session_replication_role = DEFAULT;

-- 重置自增ID（如果有的话）
-- ALTER SEQUENCE IF EXISTS "Item_id_seq" RESTART WITH 1;
-- ALTER SEQUENCE IF EXISTS "Transaction_id_seq" RESTART WITH 1;
-- ALTER SEQUENCE IF EXISTS "Warehouse_id_seq" RESTART WITH 1;
-- ALTER SEQUENCE IF EXISTS "WarehousePosition_id_seq" RESTART WITH 1;

-- 验证表是否为空
SELECT 'Item' as table_name, COUNT(*) as count FROM "Item"
UNION ALL
SELECT 'Transaction' as table_name, COUNT(*) as count FROM "Transaction"
UNION ALL
SELECT 'Warehouse' as table_name, COUNT(*) as count FROM "Warehouse"
UNION ALL
SELECT 'WarehousePosition' as table_name, COUNT(*) as count FROM "WarehousePosition";
