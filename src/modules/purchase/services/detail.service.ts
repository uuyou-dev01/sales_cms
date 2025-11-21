import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

const detailInclude = {
  sku: true,
  purchaseOrder: true,
  items: true,
} satisfies Prisma.PurchaseDetailInclude;

export function listDetailsByOrder(orderId: string) {
  return prisma.purchaseDetail.findMany({ where: { purchaseOrderId: orderId }, include: detailInclude });
}

export function getDetailById(id: string) {
  return prisma.purchaseDetail.findUnique({ where: { id }, include: detailInclude });
}

export function createDetail(data: Prisma.PurchaseDetailCreateInput) {
  return prisma.purchaseDetail.create({ data, include: detailInclude });
}

export function updateDetail(id: string, data: Prisma.PurchaseDetailUpdateInput) {
  return prisma.purchaseDetail.update({ where: { id }, data, include: detailInclude });
}

export function deleteDetail(id: string) {
  return prisma.purchaseDetail.delete({ where: { id } });
}


