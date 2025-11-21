# 数据库变更日志（仅新增）

- 新增模型：`Category`, `SKU`, `CompositeSKU`, `InventorySplit`, `ExchangeRate`, `Logistics`, `FinanceRecord`, `TransactionDetail`, `Role`, `UserRoleLink`, `UserActivity`, `PurchaseOrder`, `PurchaseDetail`。
- 变更：`Item` 新增可选外键 `parentItemId`, `skuId`, `purchaseOrderId`, `purchaseDetailId`, `createdById`, `soldById`, `purchasedById` 与相关关系和索引。
- 变更：`Transaction` 新增 `createdById`, `soldById` 与 `details` 关系。
- 变更：`ToySKU` 新增可选 `skuId` 关联通用 `SKU`。
- 变更：`User` 新增 `level` 与反向关系（角色、活动、审计）。

兼容性：所有新增字段均为可选，未修改或删除旧字段与旧关系。

迁移命令：

```bash
npx prisma generate
npx prisma migrate dev --name extend_multi_category_modules
```









