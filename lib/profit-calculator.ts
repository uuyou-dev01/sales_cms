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


