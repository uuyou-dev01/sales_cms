import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

const transactionInclude = {
  item: true,
  details: {
    include: {
      item: true,
      exchangeRate: true,
    },
  },
  createdBy: true,
  soldBy: true,
} satisfies Prisma.TransactionInclude;

export function listTransactions() {
  return prisma.transaction.findMany({ include: transactionInclude, orderBy: { createdAt: 'desc' } });
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


