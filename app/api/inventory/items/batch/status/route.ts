import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest, hasPermission } from '@/lib/auth'
import { badRequest, forbidden, serverError } from '@/src/modules/shared/api/response'
import { prisma } from '@/lib/prisma'
import { clearItemsCache } from '@/lib/cache'
import { adjustTemplateStockCounts } from '@/src/modules/listings/services/template-stock.service'

const ALLOWED_STATUS = new Set(['IN_STOCK', 'IN_TRANSIT'])

export async function POST(request: NextRequest) {
  try {
    const user = getAuthFromRequest(request)
    if (!user || !hasPermission(user, 'USER')) return forbidden()

    const { itemIds, newStatus } = await request.json()
    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) return badRequest('MISSING_ITEM_IDS')
    if (!newStatus || typeof newStatus !== 'string') return badRequest('MISSING_NEW_STATUS')

    if (!ALLOWED_STATUS.has(newStatus)) {
      return badRequest('INVALID_STATUS', { message: '仅支持更新为 IN_STOCK 或 IN_TRANSIT' })
    }

    const items = await prisma.item.findMany({
      where: { itemId: { in: itemIds }, deleted: false },
      select: {
        itemId: true,
        status: true,
        templateId: true,
      },
    })

    if (items.length === 0) {
      return badRequest('ITEMS_NOT_FOUND', { message: '未找到对应的库存条目' })
    }

    const invalidItems = items.filter((item) => !ALLOWED_STATUS.has(item.status))
    if (invalidItems.length > 0) {
      return badRequest('ITEM_STATUS_NOT_MUTABLE', {
        message: `存在无法更新的商品（当前状态：${invalidItems[0].status}）`,
        itemId: invalidItems[0].itemId,
      })
    }

    const updatedCount = await prisma.$transaction(async (tx) => {
      let changed = 0
      for (const item of items) {
        if (item.status === newStatus) continue

        const previousStock = item.status === 'IN_STOCK' ? 1 : 0
        const nextStock = newStatus === 'IN_STOCK' ? 1 : 0

        await tx.item.update({
          where: { itemId: item.itemId },
          data: { status: newStatus },
        })

        if (previousStock !== nextStock) {
          await tx.stockAdjustment.create({
            data: {
              itemId: item.itemId,
              adjustmentType: 'STATUS_UPDATE',
              quantity: nextStock - previousStock,
              previousStock,
              newStock: nextStock,
              reason: `状态更新：${item.status} -> ${newStatus}`,
            },
          })

          if (item.templateId) {
            await adjustTemplateStockCounts(item.templateId, { available: nextStock - previousStock }, tx)
          }
        }

        changed++
      }

      return changed
    })

    await clearItemsCache()
    return NextResponse.json({ success: true, updatedCount: updatedCount })
  } catch (e) {
    console.error('BATCH_ITEM_STATUS_UPDATE_FAILED', e)
    return serverError('BATCH_ITEM_STATUS_UPDATE_FAILED')
  }
}

