// 交易状态枚举
export const TRANSACTION_STATUSES = {
  IN_TRANSIT_DOMESTIC: "在途（国内）",
  IN_TRANSIT_JAPAN: "在途（日本）",
  NOT_LISTED: "未上架",
  LISTED: "已上架",
  IN_TRANSACTION: "交易中",
  RETURNING: "退货中",
  COMPLETED: "已完成",
} as const;

export type TransactionStatus = typeof TRANSACTION_STATUSES[keyof typeof TRANSACTION_STATUSES];

// 状态配置（用于UI显示）
export const STATUS_CONFIG = {
  [TRANSACTION_STATUSES.IN_TRANSIT_DOMESTIC]: {
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon: "🚚",
    description: "商品正在国内运输中",
  },
  [TRANSACTION_STATUSES.IN_TRANSIT_JAPAN]: {
    color: "bg-purple-100 text-purple-800 border-purple-200",
    icon: "✈️",
    description: "商品正在从日本运输中",
  },
  [TRANSACTION_STATUSES.NOT_LISTED]: {
    color: "bg-gray-100 text-gray-800 border-gray-200",
    icon: "📦",
    description: "商品已入库但未上架",
  },
  [TRANSACTION_STATUSES.LISTED]: {
    color: "bg-green-100 text-green-800 border-green-200",
    icon: "📋",
    description: "商品已上架销售",
  },
  [TRANSACTION_STATUSES.IN_TRANSACTION]: {
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    icon: "🤝",
    description: "正在与买家交易中",
  },
  [TRANSACTION_STATUSES.RETURNING]: {
    color: "bg-red-100 text-red-800 border-red-200",
    icon: "↩️",
    description: "商品正在退货处理中",
  },
  [TRANSACTION_STATUSES.COMPLETED]: {
    color: "bg-emerald-100 text-emerald-800 border-emerald-200",
    icon: "✅",
    description: "交易已完成",
  },
} as const;

// 状态选项（用于下拉菜单）
export const STATUS_OPTIONS = [
  { value: TRANSACTION_STATUSES.IN_TRANSIT_DOMESTIC, label: "在途（国内）" },
  { value: TRANSACTION_STATUSES.IN_TRANSIT_JAPAN, label: "在途（日本）" },
  { value: TRANSACTION_STATUSES.NOT_LISTED, label: "未上架" },
  { value: TRANSACTION_STATUSES.LISTED, label: "已上架" },
  { value: TRANSACTION_STATUSES.IN_TRANSACTION, label: "交易中" },
  { value: TRANSACTION_STATUSES.RETURNING, label: "退货中" },
  { value: TRANSACTION_STATUSES.COMPLETED, label: "已完成" },
]; 