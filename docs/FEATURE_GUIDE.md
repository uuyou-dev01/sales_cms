# 功能指南（扩展模块）

## 概览
- 支持多品类、多状态（新品/中古）、组合 SKU、拆卖记录。
- 多段物流与汇率历史，跨币种利润计算。
- 角色权限与操作审计。
- 多 SKU 采购单与成本分摊。

## 前端结构建议
```
Dashboard
 ├── ItemTable
 ├── SKUList
 ├── CompositeManager
 ├── SplitActionModal
 ├── LogisticsTracker
 ├── FinanceDashboard
 └── UserPermissionPanel
```

## 示例组件
```tsx
<Card>
  <h2>盲盒拆分记录</h2>
  <Button onClick={splitBox}>拆分端盒</Button>
  <Table data={splitHistory}/>
  </Card>
```

## 迁移步骤
1. `npx prisma generate`
2. `npx prisma migrate dev --name extend_multi_category_modules`
3. 回归测试：旧 API 路径与字段不变，新接口按文档调用。

## 销售 / 平台模块增强
- 平台（Platform）支持 `region`、`market`、`currency`、`feeSchema`、`shippingTemplates`、`config`，可为日本/中国/美国等市场配置不同费率与物流模板。
- 新增 `ItemListing`：记录 Item 在各平台的上架状态、刊登价、外部单号，供销售/库存联动使用。
- 新增 `/api/listings` 系列接口，可创建、更新、删除、查询上架记录，CreateSaleDialog 会直接显示当前平台上架状态。
- `CreateSaleDialog`：
  - 商品筛选支持“平台”、“规格/属性”、“角色/主题”以及“仅显示该平台已上架”。
  - 已选商品区域展示采购成本、上架状态和批次号。
  - 销售信息标签页新增“平台信息 + 费用预估”卡片，自动估算平台费、运费合计与净收益。








