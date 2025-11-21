# 迁移日志（Migration Log）

## Phase 1（完成）
- 扫描 58 个 API 路由，建立“原路径 → 新模块”映射表（见 MODULE_MAP.md）。
- 明确模块分区：sku / purchase / inventory / sales / logistics / finance / user / shared。
- 规划新 RESTful 端点命名与聚合策略，为 Phase 2 重写提供蓝图。

## Phase 2（计划）
- 标准化所有 API 至 RESTful（GET/POST/PUT/DELETE），并统一：
  - Prisma 访问与 include 关联
  - 错误处理（try/catch + 统一返回体）
  - 权限校验（/lib/auth.ts: hasPermission）
  - 审计日志（UserActivity）
- 合并零散批量接口（批量导入、批量状态、导出等）。

### Phase 2 进展（进行中）
- 新增共享响应工具：`src/modules/shared/api/response.ts`。
- 新增 Inventory API：
  - `app/api/inventory/items`（GET 列表、POST 创建）
  - `app/api/inventory/items/[itemId]`（GET 查询、PUT 更新、DELETE 删除）
  - 对应 service：`src/modules/inventory/services/item.service.ts`
- 新增 SKU API：
  - `app/api/sku`（GET 列表、POST 创建）
  - `app/api/sku/[skuId]`（GET、PUT、DELETE）
  - 对应 service：`src/modules/sku/services/sku.service.ts`
- 新增 Sales/Transactions API：
  - `app/api/sales/transactions`（GET 列表、POST 创建）
  - `app/api/sales/transactions/[id]`（GET、PUT、DELETE）
  - 对应 service：`src/modules/sales/services/transaction.service.ts`
 - 新增 Finance/ExchangeRate API：
   - `app/api/finance/exchange-rates`（GET 列表、POST 创建）
   - `app/api/finance/exchange-rates/[id]`（GET、PUT、DELETE）
   - 对应 service：`src/modules/finance/services/exchange-rate.service.ts`
 - 新增 Purchase/Orders & Details API：
   - `app/api/purchase/orders`（GET、POST）
   - `app/api/purchase/orders/[id]`（GET、PUT、DELETE）
   - `app/api/purchase/orders/[orderId]/details`（GET、POST）
   - `app/api/purchase/orders/[orderId]/details/[id]`（GET、PUT、DELETE）
   - 对应 service：`src/modules/purchase/services/order.service.ts`、`src/modules/purchase/services/detail.service.ts`
 - 新增 Logistics API：
   - `app/api/logistics`（GET、POST）
   - `app/api/logistics/[id]`（GET、PUT、DELETE）
   - 对应 service：`src/modules/logistics/services/logistics.service.ts`
 - 新增 Shared Import/Export & Inventory 批量状态：
   - `app/api/shared/import/items`（POST）
   - `app/api/shared/export/inventory`（POST）
   - `app/api/inventory/items/batch/status`（POST）

## Phase 3（计划）
- 重组 /app 页面：dashboard/sku/purchase/inventory/sales/logistics/finance/users。
- 将模块组件迁移至 src/modules/*/components。

### Phase 3 进展（进行中）
- 新增页面：
  - `app/dashboard/page.tsx`
  - `app/sku/page.tsx`
  - `app/purchase/page.tsx`
  - `app/inventory/page.tsx`
  - `app/sales/page.tsx`
  - `app/logistics/page.tsx`
  - `app/finance/page.tsx`
  - `app/users/page.tsx`
- 暂时复用现有组件以保证无缝过渡，后续迁移到 `src/modules/*/components`。

## Phase 4（计划）
- 新建 /lib/store.ts（Zustand）+ React Query，替换页面内重复 useState。
- /lib/finance.ts 独立利润计算与财务逻辑。

### Phase 4 进展（进行中）
- 已新增全局 Zustand store：`lib/store.ts`，提供 user/warehouses/exchangeRates/selectedItems 全局状态。
- 已新增财务工具：`lib/finance.ts`，含 `calcProfit`、`createFinanceRecord`。
- 已接入 React Query Provider：`lib/query.tsx` + `app/layout.tsx` 包裹全局。
- 新增基础数据 hooks：
  - `src/modules/inventory/hooks/useItems.ts`
  - `src/modules/sku/hooks/useSkus.ts`
  - `src/modules/sales/hooks/useTransactions.ts`

## Phase 5（计划）
- 交易自动生成 FinanceRecord；物流成本同步至财务。
- 汇率缓存组件优化（多币种）。

### Phase 5 进展（进行中）
- 新增 `lib/exchange.ts`（内存缓存 + 最新汇率查询 +转换函数）。
- 新增 `lib/audit.ts`（logActivity）。
- Sales/Transactions：在创建/更新售出时，计算毛/净利润，创建 IN 财务流水，并记录审计。
- Logistics：创建/更新含 cost 时创建 OUT 财务流水，并记录审计；统一了重复路由实现。
- PurchaseOrder：创建时按总金额创建 OUT 财务流水，记录审计；更新/删除写入审计（更新暂用全额 OUT 作为示例调整记录）。

## Phase 6（计划）
- JSON 权限点与细粒度控制；所有写操作落审计。

### Phase 6 进展（进行中）
- 已在关键写接口接入 `hasPermission` 与 `logActivity`（交易、采购、物流、汇率），后续补齐其余写接口。
