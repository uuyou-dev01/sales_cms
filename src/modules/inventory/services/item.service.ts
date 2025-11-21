import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

const itemInclude = {
  warehousePosition: true,
  sku: true,
  transactionDetails: true,
  parentSplits: true,
  childSplits: true,
  createdBy: true,
  soldBy: true,
  purchasedBy: true,
} satisfies Prisma.ItemInclude;

export async function listItems() {
  return prisma.item.findMany({ include: itemInclude });
}

export async function getItemById(itemId: string) {
  return prisma.item.findUnique({ where: { itemId }, include: itemInclude });
}

export async function createItem(data: Prisma.ItemCreateInput) {
  return prisma.item.create({ data, include: itemInclude });
}

export async function updateItem(itemId: string, data: Prisma.ItemUpdateInput) {
  return prisma.item.update({ where: { itemId }, data, include: itemInclude });
}

export async function deleteItem(itemId: string) {
  return prisma.item.delete({ where: { itemId } });
}


