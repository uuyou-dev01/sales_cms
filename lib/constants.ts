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

// 其他费用类型
export const OTHER_FEE_TYPES = {
  RETURN_SHIPPING: "退货运费",
  PLATFORM_FEE: "平台手续费",
  PACKAGING_FEE: "包装费",
  PHOTO_FEE: "拍照费",
  INSPECTION_FEE: "检测费",
  REPAIR_FEE: "维修费",
  STORAGE_FEE: "仓储费",
  INSURANCE_FEE: "保险费",
  CUSTOMS_FEE: "关税",
  OTHER: "其他费用",
} as const;

export type OtherFeeType = typeof OTHER_FEE_TYPES[keyof typeof OTHER_FEE_TYPES];

// 其他费用选项
export const OTHER_FEE_OPTIONS = [
  { value: OTHER_FEE_TYPES.RETURN_SHIPPING, label: "退货运费", icon: "🚚" },
  { value: OTHER_FEE_TYPES.PLATFORM_FEE, label: "平台手续费", icon: "💳" },
  { value: OTHER_FEE_TYPES.PACKAGING_FEE, label: "包装费", icon: "📦" },
  { value: OTHER_FEE_TYPES.PHOTO_FEE, label: "拍照费", icon: "📸" },
  { value: OTHER_FEE_TYPES.INSPECTION_FEE, label: "检测费", icon: "🔍" },
  { value: OTHER_FEE_TYPES.REPAIR_FEE, label: "维修费", icon: "🔧" },
  { value: OTHER_FEE_TYPES.STORAGE_FEE, label: "仓储费", icon: "🏪" },
  { value: OTHER_FEE_TYPES.INSURANCE_FEE, label: "保险费", icon: "🛡️" },
  { value: OTHER_FEE_TYPES.CUSTOMS_FEE, label: "关税", icon: "🏛️" },
  { value: OTHER_FEE_TYPES.OTHER, label: "其他费用", icon: "💰" },
];

// 上架平台选项
export const LISTING_PLATFORMS = {
  MERCARI: "煤炉",
  SNKRDUNK: "SNKRDUNK",
  YAHOO_AUCTIONS: "雅虎拍卖",
  RAKUTEN: "乐天",
  AMAZON_JP: "亚马逊日本",
  OTHER: "其他平台",
} as const;

export type ListingPlatform = typeof LISTING_PLATFORMS[keyof typeof LISTING_PLATFORMS];

// 上架平台选项
export const LISTING_PLATFORM_OPTIONS = [
  { value: LISTING_PLATFORMS.MERCARI, label: "煤炉", icon: "🛒" },
  { value: LISTING_PLATFORMS.SNKRDUNK, label: "SNKRDUNK", icon: "👟" },
  { value: LISTING_PLATFORMS.YAHOO_AUCTIONS, label: "雅虎拍卖", icon: "🏷️" },
  { value: LISTING_PLATFORMS.RAKUTEN, label: "乐天", icon: "🛍️" },
  { value: LISTING_PLATFORMS.AMAZON_JP, label: "亚马逊日本", icon: "📦" },
  { value: LISTING_PLATFORMS.OTHER, label: "其他平台", icon: "🌐" },
];

// 利润率选项
export const PROFIT_RATE_OPTIONS = [
  { value: 0.20, label: "20%" },
  { value: 0.25, label: "25%" },
  { value: 0.30, label: "30%" },
  { value: 0.35, label: "35%" },
  { value: 0.40, label: "40%" },
  { value: 0.50, label: "50%" },
]; 