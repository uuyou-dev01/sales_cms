import { prisma } from '@/lib/prisma'

export async function listPlatforms() {
  return prisma.platform.findMany({ orderBy: { updatedAt: 'desc' } })
}

export async function createPlatform(data: { name: string; baseFeeRate: number; shippingFee?: number | null; tierRules?: any; isActive?: boolean }) {
  return prisma.platform.create({ data: {
    name: data.name,
    baseFeeRate: data.baseFeeRate,
    shippingFee: data.shippingFee ?? null,
    tierRules: data.tierRules,
    isActive: data.isActive ?? true,
  }})
}

export async function updatePlatform(id: string, data: Partial<{ name: string; baseFeeRate: number; shippingFee: number | null; tierRules: any; isActive: boolean }>) {
  return prisma.platform.update({ where: { id }, data })
}

export async function deletePlatform(id: string) {
  await prisma.platform.delete({ where: { id } })
  return { success: true }
}


