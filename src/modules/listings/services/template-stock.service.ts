import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

type PrismaClient = Prisma.TransactionClient | typeof prisma

export interface TemplateStockAdjustments {
  available?: number
  listed?: number
  reserved?: number
  sold?: number
}

/**
 * 调整数个模板库存计数，默认会校验不出现负数
 */
export async function adjustTemplateStockCounts(
  templateId: string,
  adjustments: TemplateStockAdjustments,
  tx?: Prisma.TransactionClient
) {
  if (
    adjustments.available === undefined &&
    adjustments.listed === undefined &&
    adjustments.reserved === undefined &&
    adjustments.sold === undefined
  ) {
    return null
  }

  const client: PrismaClient = tx ?? prisma

  const template = await client.subSkuTemplate.findUnique({
    where: { id: templateId },
    select: {
      availableQuantity: true,
      listedQuantity: true,
      reservedQuantity: true,
      soldQuantity: true,
    },
  })

  if (!template) {
    throw new Error(`TEMPLATE_NOT_FOUND: ${templateId}`)
  }

  const nextAvailable = template.availableQuantity + (adjustments.available ?? 0)
  const nextListed = template.listedQuantity + (adjustments.listed ?? 0)
  const nextReserved = template.reservedQuantity + (adjustments.reserved ?? 0)
  const nextSold = template.soldQuantity + (adjustments.sold ?? 0)

  if (nextAvailable < 0 || nextListed < 0 || nextReserved < 0 || nextSold < 0) {
    throw new Error('TEMPLATE_STOCK_NEGATIVE')
  }

  return client.subSkuTemplate.update({
    where: { id: templateId },
    data: {
      availableQuantity: nextAvailable,
      listedQuantity: nextListed,
      reservedQuantity: nextReserved,
      soldQuantity: nextSold,
    },
    select: {
      id: true,
      availableQuantity: true,
      listedQuantity: true,
      reservedQuantity: true,
      soldQuantity: true,
    },
  })
}

