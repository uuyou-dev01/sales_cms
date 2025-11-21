/**
 * SKU 相关的工具函数
 */

/**
 * 从 SKU 获取主图
 * 优先级：attributes.mainPhoto > items[0].photos[0]
 */
export function getSkuMainPhoto(sku: {
  attributes?: any
  items?: Array<{ photos?: string[] }>
}): string | null {
  // 1. 优先使用 SKU 主图（attributes.mainPhoto）
  if (sku.attributes && typeof sku.attributes === 'object' && 'mainPhoto' in sku.attributes) {
    const mainPhoto = (sku.attributes as any).mainPhoto
    if (typeof mainPhoto === 'string' && mainPhoto.trim()) {
      return mainPhoto
    }
  }
  
  // 2. 回退到第一个有照片的 Item
  if (sku.items && sku.items.length > 0) {
    const firstItemWithPhoto = sku.items.find(item => item.photos && item.photos.length > 0)
    return firstItemWithPhoto?.photos?.[0] || null
  }
  
  return null
}

/**
 * 从 Item 获取第一张照片
 */
export function getItemFirstPhoto(item: { photos?: string[] }): string | null {
  return item.photos && item.photos.length > 0 ? item.photos[0] : null
}

/**
 * 格式化金额
 */
export function formatCurrency(amount: number | string, options?: Intl.NumberFormatOptions): string {
  const num = typeof amount === 'string' ? Number(amount) : amount
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    maximumFractionDigits: 2,
    ...options,
  }).format(num)
}

/**
 * 格式化数字（不带货币符号）
 */
export function formatNumber(num: number | string, options?: Intl.NumberFormatOptions): string {
  const n = typeof num === 'string' ? Number(num) : num
  return new Intl.NumberFormat('zh-CN', {
    maximumFractionDigits: 2,
    ...options,
  }).format(n)
}

/**
 * 计算利润率
 */
export function calculateProfitRate(revenue: number, cost: number): number {
  if (revenue <= 0) return 0
  return ((revenue - cost) / revenue) * 100
}

