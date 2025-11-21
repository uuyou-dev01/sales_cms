import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export function listLogistics() {
  return prisma.logistics.findMany({ orderBy: { createdAt: 'desc' } });
}

export function getLogisticsById(id: string) {
  return prisma.logistics.findUnique({ where: { id } });
}

export function createLogistics(data: Prisma.LogisticsCreateInput) {
  return prisma.logistics.create({ data });
}

export function updateLogistics(id: string, data: Prisma.LogisticsUpdateInput) {
  return prisma.logistics.update({ where: { id }, data });
}

export function deleteLogistics(id: string) {
  return prisma.logistics.delete({ where: { id } });
}


