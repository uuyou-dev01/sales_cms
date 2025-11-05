// 玩具类目专用类型定义
// 基于参考项目的库存管理仪表盘设计

// 采购单状态
export type ToyPurchaseStatus = "DOMESTIC_IN_TRANSIT" | "JAPAN_IN_TRANSIT" | "JAPAN_ARRIVED";

// 采购单状态显示文本
export const PURCHASE_STATUS_LABELS: Record<ToyPurchaseStatus, string> = {
  DOMESTIC_IN_TRANSIT: "国内在途",
  JAPAN_IN_TRANSIT: "日本在途", 
  JAPAN_ARRIVED: "日本到达"
};

// 库存批次（用于先进先出）
export interface ToyInventoryBatch {
  id: string;
  skuId: string;
  quantity: number;
  inboundDate: string; // 入库时间
  purchaseOrderId?: string; // 关联的采购单ID
  unitCostPrice: number; // 单个成本价（收货价或采购价+邮费）
  createdAt: string;
  updatedAt: string;
}

// 玩具SKU
export interface ToySKU {
  id: string;
  characterId: string;
  name: string; // SKU名称，如 "端盒", "单盒"
  description?: string;
  image?: string;
  currentStock: number; // 当前库存
  suggestedPrice: number; // 建议售价
  costPrice: number; // 收货价格
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // 关联数据
  character?: ToyCharacter;
  inventoryBatches?: ToyInventoryBatch[];
  purchaseOrders?: ToyPurchaseOrder[];
  salesRecords?: ToySalesRecord[];
}

// 玩具采购订单
export interface ToyPurchaseOrder {
  id: string;
  skuId: string;
  domesticOrderNumber: string; // 国内单号
  status: ToyPurchaseStatus; // 采购单状态
  weight: number; // 重量（kg）
  quantity: number; // 数量
  amount: number; // 金额
  batch?: string; // 发货批次
  shippingDate: string; // 发出时间
  arrivalTime?: string; // 到货时间
  shippingCost?: number; // 单个邮费
  totalShippingAmount?: number; // 总邮费
  totalShippingWeight?: number; // 总重量
  createdAt: string;
  updatedAt: string;
  // 关联数据
  sku?: ToySKU;
  inventoryBatches?: ToyInventoryBatch[];
}

// 玩具销售记录
export interface ToySalesRecord {
  id: string;
  skuId: string;
  date: string; // 销售日期
  amount: number; // 销售金额
  quantity: number; // 销售数量
  cost: number; // 成本
  profit: number; // 利润
  createdAt: string;
  updatedAt: string;
  // 关联数据
  sku?: ToySKU;
}

// 玩具角色（基于现有ToyCharacter扩展）
export interface ToyCharacter {
  id: string;
  name: string; // 角色名称，如 "米奇", "米妮", "高飞"
  seriesId: string; // 所属系列ID
  description?: string;
  image?: string;
  rarity?: string; // 稀有度，如 "普通", "隐藏", "特别款"
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // 关联数据
  series?: ToySeries;
  skus?: ToySKU[];
}

// 玩具系列（基于现有ToySeries）
export interface ToySeries {
  id: string;
  name: string; // 系列名称，如 "迪士尼family系列"
  brandId: string; // 所属品牌ID
  description?: string;
  image?: string;
  releaseDate?: string; // 发布日期
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // 关联数据
  brand?: ToyBrand;
  characters?: ToyCharacter[];
}

// 玩具品牌（基于现有ToyBrand）
export interface ToyBrand {
  id: string;
  name: string; // 品牌名称，如 "泡泡玛特"
  description?: string;
  logo?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // 关联数据
  series?: ToySeries[];
}

// 完整的系列数据（包含所有关联数据）
export interface ToySeriesWithDetails extends ToySeries {
  characters: (ToyCharacter & {
    skus: (ToySKU & {
      inventoryBatches: ToyInventoryBatch[];
      purchaseOrders: ToyPurchaseOrder[];
      salesRecords: ToySalesRecord[];
    })[];
  })[];
}

// API请求/响应类型
export interface CreateToySKURequest {
  characterId: string;
  name: string;
  description?: string;
  image?: string;
  suggestedPrice: number;
  costPrice: number;
}

export interface UpdateToySKURequest {
  name?: string;
  description?: string;
  image?: string;
  suggestedPrice?: number;
  costPrice?: number;
  isActive?: boolean;
}

export interface CreateToyPurchaseOrderRequest {
  skuId: string;
  domesticOrderNumber: string;
  status: ToyPurchaseStatus;
  weight: number;
  quantity: number;
  amount: number;
  batch?: string;
  shippingDate: string;
  arrivalTime?: string;
  shippingCost?: number;
  totalShippingAmount?: number;
  totalShippingWeight?: number;
}

export interface UpdateToyPurchaseOrderRequest {
  domesticOrderNumber?: string;
  status?: ToyPurchaseStatus;
  weight?: number;
  quantity?: number;
  amount?: number;
  batch?: string;
  shippingDate?: string;
  arrivalTime?: string;
  shippingCost?: number;
  totalShippingAmount?: number;
  totalShippingWeight?: number;
}

export interface CreateToySalesRecordRequest {
  skuId: string;
  date: string;
  amount: number;
  quantity: number;
  cost: number;
  profit: number;
}

export interface AdjustToyStockRequest {
  skuId: string;
  adjustmentType: "set" | "add" | "subtract";
  quantity: number;
  reason: string;
  remarks?: string;
}

export interface CompleteBatchInboundRequest {
  purchaseOrderIds: string[];
  arrivalTime?: string;
}

export interface ShipUnassignedBatchRequest {
  skuId: string;
  batch: string;
  totalShippingAmount: number;
  totalShippingWeight: number;
}

// 统计数据类型
export interface ToySKUStats {
  totalStock: number;
  totalInTransit: number;
  totalSales: number;
  totalSalesAmount: number;
  totalCost: number;
  totalProfit: number;
  averageSellingPrice: number;
  averageCostPrice: number;
}

export interface ToySeriesStats {
  totalSKUs: number;
  totalStock: number;
  totalInTransit: number;
  totalSales: number;
  totalSalesAmount: number;
  totalCost: number;
  totalProfit: number;
}

// 分页和查询参数
export interface ToySKUQueryParams {
  characterId?: string;
  seriesId?: string;
  brandId?: string;
  isActive?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface ToyPurchaseOrderQueryParams {
  skuId?: string;
  status?: ToyPurchaseStatus;
  batch?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface ToySalesRecordQueryParams {
  skuId?: string;
  characterId?: string;
  seriesId?: string;
  brandId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
