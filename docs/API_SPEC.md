# 新增 API 规范

## 兼容性
- 旧有路径与参数保持不变；新增端点独立。

## 新端点
- `POST /api/composite-sku` 创建/覆盖父 SKU 的子项
- `GET  /api/composite-sku?parentSkuId=...` 查询组合定义
- `POST /api/split` 端盒/盲盒/单品拆分并记录成本分摊
- `POST /api/exchange` 新增或更新汇率（主键：base/quote/rateDate）
- `GET  /api/exchange?base=...&quote=...` 查询汇率
- `POST /api/logistics` 创建物流段
- `GET  /api/logistics?type=ITEM&id=...` 查询物流
- `POST /api/user/activity` 写入操作日志
- `GET  /api/user/activity?userId=...` 查询操作日志
- `POST /api/purchase/create` 创建多 SKU 采购单
- `POST /api/purchase/allocate` 分摊采购成本（平均/比例/手动）
- `POST /api/purchase/confirm` 将明细绑定到已创建 Item
- `GET /api/platforms` / `POST /api/platforms` / `PUT /api/platforms`：支持 `region`、`market`、`currency`、`feeSchema`、`shippingTemplates`、`config` 字段，便于配置多平台手续费与运费模板
- `GET /api/listings?itemId=&platformId=`：拉取 Item 上架记录（附带平台与 Item 基础信息）
- `POST /api/listings`：按 `itemId + platformId` upsert Listing，支持 `status`、`listingPrice`、`listingCurrency`、`listedAt`、`metadata`
- `GET /api/listings/[id]` / `PUT` / `DELETE`：读取、更新或移除单条上架记录

## DTO 概要（TypeScript）
参见 `lib/types.ts`：`CreateCompositeSkuRequest`, `SplitRequest`, `ExchangeRateUpsert`, `LogisticsCreate`, `UserActivityLog`, `PurchaseCreateRequest`, `PurchaseAllocateRequest`, `PurchaseConfirmRequest`。








