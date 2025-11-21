import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

const exchangeRateInclude = {
  transactionDetails: true,
  purchaseOrders: true,
} satisfies Prisma.ExchangeRateInclude;

export function listExchangeRates() {
  return prisma.exchangeRate.findMany({ include: exchangeRateInclude, orderBy: { rateDate: 'desc' } });
}

export function getExchangeRateById(id: string) {
  return prisma.exchangeRate.findUnique({ where: { id }, include: exchangeRateInclude });
}

export function createExchangeRate(data: Prisma.ExchangeRateCreateInput) {
  return prisma.exchangeRate.create({ data, include: exchangeRateInclude });
}

export function updateExchangeRate(id: string, data: Prisma.ExchangeRateUpdateInput) {
  return prisma.exchangeRate.update({ where: { id }, data, include: exchangeRateInclude });
}

export function deleteExchangeRate(id: string) {
  return prisma.exchangeRate.delete({ where: { id } });
}


