import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 货币转换工具函数
 * 将各种货币转换为人民币
 */
export function convertToCNY(amount: string | number, currency: string, exchangeRate: string | number): number {
  if (!amount || !currency || !exchangeRate) return 0;
  
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  const numExchangeRate = typeof exchangeRate === 'string' ? parseFloat(exchangeRate) : exchangeRate;
  
  if (isNaN(numAmount) || isNaN(numExchangeRate)) return 0;
  
  // 如果已经是人民币，直接返回
  if (currency.toUpperCase() === 'CNY') return numAmount;
  
  // 使用汇率转换为人民币
  return numAmount * numExchangeRate;
}

/**
 * 格式化人民币显示
 */
export function formatCNY(amount: number): string {
  return `¥${amount.toLocaleString('zh-CN', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
}

/**
 * 计算利润率
 */
export function calculateProfitRate(purchasePrice: number, netProfit: number): string {
  if (purchasePrice <= 0) return "0.00";
  return ((netProfit / purchasePrice) * 100).toFixed(2);
}

/**
 * 计算库存周转率
 */
export function calculateTurnoverRate(totalItems: number, soldItems: number): string {
  if (totalItems <= 0) return "0.0";
  return ((soldItems / totalItems) * 100).toFixed(1);
}
