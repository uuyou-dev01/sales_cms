import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

const transactionInclude = {
  item: true,
  platform: true,
  details: {
    include: {
      item: true,
      exchangeRate: true,
    },
  },
  createdBy: true,
  soldBy: true,
} satisfies Prisma.TransactionInclude;

export function listTransactions(filters?: { platformId?: string; startDate?: Date; endDate?: Date }) {
  const where: Prisma.TransactionWhereInput = {}
  if (filters?.platformId) {
    where.platformId = filters.platformId
  }
  if (filters?.startDate || filters?.endDate) {
    where.soldDate = {}
    if (filters.startDate) where.soldDate.gte = filters.startDate
    if (filters.endDate) where.soldDate.lte = filters.endDate
  }
  return prisma.transaction.findMany({ where, include: transactionInclude, orderBy: { soldDate: 'desc' } });
}

export function getTransactionById(id: string) {
  return prisma.transaction.findUnique({ where: { id }, include: transactionInclude });
}

export function createTransaction(data: Prisma.TransactionCreateInput) {
  return prisma.transaction.create({ data, include: transactionInclude });
}

export function updateTransaction(id: string, data: Prisma.TransactionUpdateInput) {
  return prisma.transaction.update({ where: { id }, data, include: transactionInclude });
}

export function deleteTransaction(id: string) {
  return prisma.transaction.delete({ where: { id } });
}


