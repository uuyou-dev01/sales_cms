/**
 * 统一的利润计算工具函数
 */

export interface ProfitCalculationParams {
  soldPrice?: string | number;
  soldPriceCurrency?: string;
  soldPriceExchangeRate?: string | number;
  purchasePrice?: string | number;
  purchasePriceCurrency?: string;
  purchasePriceExchangeRate?: string | number;
  domesticShipping?: string | number;
  internationalShipping?: string | number;
  otherFees?: Array<{
    amount: string | number;
    currency?: string;
  }>;
}

export interface ProfitCalculationResult {
  grossProfitCNY: number;
  netProfitCNY: number;
  totalCostCNY: number;
  soldPriceCNY: number;
  profitMarginPercent: number; // 利润率 = 利润 / 售价 * 100%
  returnOnCostPercent: number; // 成本回报率 = 利润 / 成本 * 100%
}

/**
 * 汇率转换：将指定货币金额转换为人民币
 */
export function convertToCNY(
  amount: string | number,
  currency: string = 'CNY',
  exchangeRate: string | number = 1
): number {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  const numRate = typeof exchangeRate === 'string' ? parseFloat(exchangeRate) : exchangeRate;
  
  if (isNaN(numAmount) || isNaN(numRate)) return 0;
  
  // 如果已经是人民币，直接返回
  if (currency === 'CNY') return numAmount;
  
  // 对于日元，使用提供的汇率转换
  if (currency === 'JPY') return numAmount * numRate;
  
  // 对于其他货币，使用提供的汇率
  return numAmount * numRate;
}

/**
 * 计算利润（统一逻辑）
 */
export function calculateProfit(params: ProfitCalculationParams): ProfitCalculationResult {
  // 1. 售价转换为人民币
  const soldPriceCNY = convertToCNY(
    params.soldPrice || 0,
    params.soldPriceCurrency || 'CNY',
    params.soldPriceExchangeRate || 1
  );

  // 2. 购入价转换为人民币
  const purchasePriceCNY = convertToCNY(
    params.purchasePrice || 0,
    params.purchasePriceCurrency || 'CNY',
    params.purchasePriceExchangeRate || 1
  );

  // 3. 运费（默认为人民币）
  const domesticShippingCNY = parseFloat(String(params.domesticShipping || 0));
  const internationalShippingCNY = parseFloat(String(params.internationalShipping || 0));

  // 4. 其他费用转换为人民币
  let otherFeesCNY = 0;
  if (params.otherFees && Array.isArray(params.otherFees)) {
    otherFeesCNY = params.otherFees.reduce((sum, fee) => {
      const feeAmount = convertToCNY(
        fee.amount,
        fee.currency || 'CNY',
        // 对于其他费用，如果是日元，使用售价的汇率
        fee.currency === 'JPY' ? params.soldPriceExchangeRate || 1 : 1
      );
      return sum + feeAmount;
    }, 0);
  }

  // 5. 计算总成本
  const totalCostCNY = purchasePriceCNY + domesticShippingCNY + internationalShippingCNY + otherFeesCNY;

  // 6. 计算毛利润和净利润
  const grossProfitCNY = soldPriceCNY - totalCostCNY;
  const netProfitCNY = grossProfitCNY; // 简化：净利润 = 毛利润（不考虑税费等）

  // 7. 计算利润率和成本回报率
  const profitMarginPercent = soldPriceCNY > 0 ? (netProfitCNY / soldPriceCNY) * 100 : 0;
  const returnOnCostPercent = totalCostCNY > 0 ? (netProfitCNY / totalCostCNY) * 100 : 0;

  return {
    grossProfitCNY: Math.round(grossProfitCNY * 100) / 100,
    netProfitCNY: Math.round(netProfitCNY * 100) / 100,
    totalCostCNY: Math.round(totalCostCNY * 100) / 100,
    soldPriceCNY: Math.round(soldPriceCNY * 100) / 100,
    profitMarginPercent: Math.round(profitMarginPercent * 10) / 10, // 保留1位小数
    returnOnCostPercent: Math.round(returnOnCostPercent * 10) / 10, // 保留1位小数
  };
}

/**
 * 检查是否需要重新计算利润
 * 当售价、购入价、运费或其他费用发生变化时需要重新计算
 */
export function shouldRecalculateProfit(
  params: ProfitCalculationParams,
  currentGrossProfit?: string | number,
  currentNetProfit?: string | number
): boolean {
  // 如果没有售价，不需要计算
  if (!params.soldPrice || parseFloat(String(params.soldPrice)) === 0) {
    return false;
  }

  // 如果当前没有利润数据，需要计算
  if (!currentGrossProfit && !currentNetProfit) {
    return true;
  }

  // 计算新的利润
  const newProfit = calculateProfit(params);
  
  // 比较是否有差异（容忍0.01的误差）
  const currentGross = parseFloat(String(currentGrossProfit || 0));
  const currentNet = parseFloat(String(currentNetProfit || 0));
  
  return Math.abs(newProfit.grossProfitCNY - currentGross) > 0.01 || 
         Math.abs(newProfit.netProfitCNY - currentNet) > 0.01;
}

// ==================== 打包销售利润计算 ====================

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
