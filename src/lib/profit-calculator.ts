export interface PlatformRule {
  minSales?: number
  maxSales?: number
  feeRate: number
}

export interface PlatformConfig {
  baseFeeRate: number
  shippingFee?: number | null
  tierRules?: { rules?: PlatformRule[] } | null
}

export function resolvePlatformFeeRate(config: PlatformConfig, context: { salesCount?: number; salesAmount?: number } = {}) {
  const base = config.baseFeeRate ?? 0
  const rules = config.tierRules?.rules || []
  if (!rules.length) return base
  const sc = context.salesCount ?? 0
  // 简化：仅用销量匹配
  const matched = rules
    .filter(r => (r.minSales === undefined || sc >= r.minSales) && (r.maxSales === undefined || sc <= r.maxSales))
    .sort((a,b) => (b.minSales ?? 0) - (a.minSales ?? 0))[0]
  return matched?.feeRate ?? base
}

export function computeProfit({ salePrice, cost, platform }: { salePrice: number; cost: number; platform: PlatformConfig }) {
  const feeRate = resolvePlatformFeeRate(platform)
  const platformFee = salePrice * feeRate
  const shipping = platform.shippingFee ?? 0
  const profit = salePrice - (cost + shipping + platformFee)
  return { profit, platformFee, shipping, feeRate }
}

// ==================== 打包销售利润计算 ====================

export interface BundledSaleItem {
  itemId: string
  purchaseCost: number // Item的采购成本（人民币）
  quantity?: number // 数量，默认为1
  manualPrice?: number // 手动指定的售价（仅当MANUAL模式时使用）
}

export interface BundledSaleParams {
  items: BundledSaleItem[]
  totalSoldPrice: number // 总售价（原币种）
  soldPriceCurrency: string
  soldPriceExchangeRate: number
  platformId?: string
  platformConfig?: PlatformConfig
  shippingCost?: number
  otherFees?: Array<{ amount: number; currency: string; exchangeRate?: number }>
  priceAllocationMethod?: 'BY_COST' | 'BY_QUANTITY' | 'MANUAL' // 售价分摊方式
}

export interface BundledSaleItemDetail {
  itemId: string
  quantity: number
  purchaseCost: number
  allocatedSoldPrice: number // 分摊后的售价（人民币）
  allocatedProfit: number // 分摊后的利润（人民币）
  profitRate: number // 利润率
}

export interface BundledSaleResult {
  totalCost: number // 总成本（人民币）
  totalSoldPriceCNY: number // 总售价（人民币）
  platformFee: number // 平台费用（人民币）
  shippingCost: number // 物流费用（人民币）
  otherFeesTotal: number // 其他费用（人民币）
  totalProfit: number // 总利润（人民币）
  totalProfitRate: number // 总利润率
  itemDetails: BundledSaleItemDetail[] // 每个Item的明细
}

/**
 * 计算打包销售的利润
 */
export function calculateBundledSaleProfit(params: BundledSaleParams): BundledSaleResult {
  const { items, totalSoldPrice, soldPriceCurrency, soldPriceExchangeRate, platformConfig, shippingCost = 0, otherFees = [], priceAllocationMethod = 'BY_COST' } = params

  // 1. 计算总成本（所有Item采购成本之和）
  const totalCost = items.reduce((sum, item) => {
    const quantity = item.quantity || 1
    return sum + (item.purchaseCost * quantity)
  }, 0)

  // 2. 总售价转换为人民币
  const totalSoldPriceCNY = totalSoldPrice * soldPriceExchangeRate

  // 3. 计算平台费用
  let platformFee = 0
  if (platformConfig) {
    const feeRate = resolvePlatformFeeRate(platformConfig)
    platformFee = totalSoldPriceCNY * feeRate
  }

  // 4. 计算其他费用（转换为人民币）
  const otherFeesTotal = otherFees.reduce((sum, fee) => {
    const feeRate = fee.exchangeRate || soldPriceExchangeRate
    return sum + (fee.amount * feeRate)
  }, 0)

  // 5. 计算可分配的总售价（总售价 - 平台费用 - 物流费用 - 其他费用）
  const allocatablePrice = totalSoldPriceCNY - platformFee - shippingCost - otherFeesTotal

  // 6. 按指定方式分摊售价到每个Item
  const itemDetails: BundledSaleItemDetail[] = items.map(item => {
    const quantity = item.quantity || 1
    const itemTotalCost = item.purchaseCost * quantity

    let allocatedSoldPrice: number

    switch (priceAllocationMethod) {
      case 'BY_QUANTITY':
        // 按数量平均分摊
        const totalQuantity = items.reduce((sum, i) => sum + (i.quantity || 1), 0)
        allocatedSoldPrice = (allocatablePrice / totalQuantity) * quantity
        break

      case 'MANUAL':
        // 手动指定（需要提供manualPrice）
        if (item.manualPrice !== undefined) {
          allocatedSoldPrice = item.manualPrice * soldPriceExchangeRate
        } else {
          // 如果没有手动指定，回退到按成本比例分摊
          allocatedSoldPrice = allocatablePrice * (itemTotalCost / totalCost)
        }
        break

      case 'BY_COST':
      default:
        // 按成本比例分摊（默认）
        allocatedSoldPrice = allocatablePrice * (itemTotalCost / totalCost)
        break
    }

    // 计算每个Item的利润
    const allocatedProfit = allocatedSoldPrice - itemTotalCost
    const profitRate = allocatedSoldPrice > 0 ? (allocatedProfit / allocatedSoldPrice) * 100 : 0

    return {
      itemId: item.itemId,
      quantity,
      purchaseCost: item.purchaseCost,
      allocatedSoldPrice,
      allocatedProfit,
      profitRate,
    }
  })

  // 7. 计算总利润
  const totalProfit = allocatablePrice - totalCost

  // 8. 计算总利润率
  const totalProfitRate = totalSoldPriceCNY > 0 ? (totalProfit / totalSoldPriceCNY) * 100 : 0

  return {
    totalCost,
    totalSoldPriceCNY,
    platformFee,
    shippingCost,
    otherFeesTotal,
    totalProfit,
    totalProfitRate,
    itemDetails,
  }
}


