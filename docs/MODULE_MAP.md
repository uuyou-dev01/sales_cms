# 模块映射表（Phase 1）

> 目标：将 /app/api 下零散路由映射到标准业务模块，并为 Phase 2 标准化提供依据。

- 模块分区：
  - sku：SKU、类别、组合 SKU、玩具系列/角色（兼容 Toy*）
  - purchase：采购单、分摊、入库批次
  - inventory：Item、库存、仓储、拆卖
  - sales：交易、销售单、利润字段刷新
  - logistics：物流追踪
  - finance：汇率、财务流水、结算
  - user：用户、登录、权限、审计
  - shared：通用能力（上传、CSV、缓存、调试）

## 原路径 → 新模块（含建议新端点）

| 原路径 | 模块 | 建议新端点（Phase 2） |
|---|---|---|
| /app/api/items/list | inventory | /app/api/inventory/items |
| /app/api/items/create | inventory | /app/api/inventory/items |
| /app/api/items/update | inventory | /app/api/inventory/items/[itemId] |
| /app/api/items/delete | inventory | /app/api/inventory/items/[itemId] |
| /app/api/items/export | shared | /app/api/shared/export/inventory |
| /app/api/items/autocomplete | inventory | /app/api/inventory/items/autocomplete |
| /app/api/items/grouped | inventory | /app/api/inventory/items/grouped |
| /app/api/items/stats | inventory | /app/api/inventory/items/stats |
| /app/api/items/months | inventory | /app/api/inventory/items/months |
| /app/api/items/price-prediction | sku | /app/api/sku/price-prediction |
| /app/api/items/batch-import | shared | /app/api/shared/import/items |
| /app/api/items/copy | inventory | /app/api/inventory/items/copy |
| /app/api/items/batch-update-status | inventory | /app/api/inventory/items/batch/status |
| /app/api/items/batch-settlement | finance | /app/api/finance/settlement/batch |
| /app/api/items/create-sku | sku | /app/api/sku |
| /app/api/items/update-sku | sku | /app/api/sku/[skuId] |
| /app/api/items/delete-sku | sku | /app/api/sku/[skuId] |
| /app/api/warehouses | inventory | /app/api/inventory/warehouses |
| /app/api/warehouses/[id] | inventory | /app/api/inventory/warehouses/[id] |
| /app/api/warehouses/positions | inventory | /app/api/inventory/warehouse-positions |
| /app/api/warehouses/positions/[id] | inventory | /app/api/inventory/warehouse-positions/[id] |
| /app/api/warehouses/positions/[id]/update-usage | inventory | /app/api/inventory/warehouse-positions/[id]/usage |
| /app/api/warehouses/stats | inventory | /app/api/inventory/warehouses/stats |
| /app/api/stock/adjust | inventory | /app/api/inventory/stock/adjust |
| /app/api/split | inventory | /app/api/inventory/split |
| /app/api/composite-sku | sku | /app/api/sku/composite |
| /app/api/purchase/create | purchase | /app/api/purchase/orders |
| /app/api/purchase/confirm | purchase | /app/api/purchase/orders/[orderId]/confirm |
| /app/api/purchase/allocate | purchase | /app/api/purchase/orders/[orderId]/allocate |
| /app/api/transactions/create | sales | /app/api/sales/transactions |
| /app/api/transactions/update | sales | /app/api/sales/transactions/[id] |
| /app/api/transactions/delete | sales | /app/api/sales/transactions/[id] |
| /app/api/transactions/list | sales | /app/api/sales/transactions |
| /app/api/exchange | finance | /app/api/finance/exchange-rates |
| /app/api/logistics | logistics | /app/api/logistics |
| /app/api/upload | shared | /app/api/shared/upload |
| /app/api/csv/upload | shared | /app/api/shared/import/csv |
| /app/api/debug/check-db | shared | /app/api/shared/debug/check-db |
| /app/api/debug/clear-cache | shared | /app/api/shared/debug/clear-cache |
| /app/api/debug/clear-database | shared | /app/api/shared/debug/clear-database |
| /app/api/cache/clear | shared | /app/api/shared/cache/clear |
| /app/api/auth/login | user | /app/api/user/auth/login |
| /app/api/auth/logout | user | /app/api/user/auth/logout |
| /app/api/user/activity | user | /app/api/user/activity |
| /app/api/toys/brands | sku | /app/api/sku/brands |
| /app/api/toys/series | sku | /app/api/sku/series |
| /app/api/toys/series/[id] | sku | /app/api/sku/series/[id] |
| /app/api/toys/series-grouped | sku | /app/api/sku/series/grouped |
| /app/api/toys/characters | sku | /app/api/sku/characters |
| /app/api/toys/skus | sku | /app/api/sku/toy-skus |
| /app/api/toys/skus/[id] | sku | /app/api/sku/toy-skus/[id] |
| /app/api/toys/purchase-orders | purchase | /app/api/purchase/toy-orders |
| /app/api/toys/purchase-orders/[id] | purchase | /app/api/purchase/toy-orders/[id] |
| /app/api/toys/inventory | inventory | /app/api/inventory/toy |
| /app/api/toys/sales-records | sales | /app/api/sales/toy-records |
| /app/api/toys/bulk-inbound | inventory | /app/api/inventory/bulk-inbound |
| /app/api/toys/hierarchy | sku | /app/api/sku/hierarchy |
| /app/api/items/categories | sku | /app/api/sku/categories |

> 说明：玩具（toys/*）为历史产物，Phase 2 将并入通用 SKU 与采购/库存/销售模块，同时兼容 Toy* 相关查询。

## Deprecated 路由（迁移后废弃，保留过渡期）
- /api/items/list → /api/inventory/items
- /api/items/create → /api/inventory/items (POST)
- /api/items/update → /api/inventory/items/[itemId] (PUT)
- /api/items/delete → /api/inventory/items/[itemId] (DELETE)
- /api/items/grouped → /api/inventory/items/grouped
- /api/items/autocomplete → /api/inventory/items/autocomplete
- /api/items/stats → /api/inventory/items/stats
- /api/items/months → /api/inventory/items/months
- /api/items/batch-update-status → /api/inventory/items/batch/status
- /api/items/batch-import → /api/shared/import/items
- /api/items/export → /api/shared/export/inventory

## 说明
- 本表不更改数据库结构，仅调整 API 边界与命名。
- Phase 2 将逐一落标 RESTful 规范（GET/POST/PUT/DELETE）与统一错误/权限处理。
- 旧路由将在过渡期保留并标记 Deprecated，待前端全部切换后移除。
