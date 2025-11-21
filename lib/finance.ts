import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export function calcProfit({ soldPrice, purchasePrice, rate }: { soldPrice: number; purchasePrice: number; rate: number }) {
  const soldCny = soldPrice * rate
  return soldCny - purchasePrice
}

export async function createFinanceRecord(
  referenceType: string,
  referenceId: string,
  direction: 'IN' | 'OUT',
  amount: number,
  currency = 'CNY',
  meta?: Record<string, unknown>,
  createdById?: string,
) {
  return prisma.financeRecord.create({
    data: {
      referenceType,
      referenceId,
      direction,
      amount: new Prisma.Decimal(amount),
      currency,
      occurredAt: new Date(),
      meta,
      createdById,
    },
  })
}

export async function computeProfitCNY(params: {
  soldPrice: number;
  soldCurrency: string;
  soldDate: Date;
  purchaseCost: number; // already allocated cost in purchase currency or CNY
  shippingCostCNY?: number;
}) {
  const rate = await getRate(params.soldCurrency, 'CNY', params.soldDate);
  const soldCNY = params.soldPrice * rate;
  const costCNY = (params.purchaseCost || 0) + (params.shippingCostCNY || 0);
  const profit = soldCNY - costCNY;
  return { soldCNY, costCNY, profit };
}

export async function getRate(base: string, quote: string, date: Date) {
  const rate = await prisma.exchangeRate.findFirst({
    where: { baseCurrency: base, quoteCurrency: quote, rateDate: { lte: date } },
    orderBy: { rateDate: 'desc' },
  });
  if (!rate) return 1; // fallback
  return parseFloat(rate.rate as any);
}



