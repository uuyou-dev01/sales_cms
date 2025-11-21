import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest, hasPermission } from '@/lib/auth'
import { ok, forbidden, badRequest, serverError } from '@/src/modules/shared/api/response'
import { getItemDetailWithStats } from '@/src/modules/sku/services/sku.service'
import { logActivity } from '@/lib/audit'

export async function GET(
  req: NextRequest,
  { params }: { params: { itemId: string } }
) {
  try {
    const user = getAuthFromRequest(req)
    if (!user || !hasPermission(user, 'USER')) return forbidden()

    const adjustments = await prisma.stockAdjustment.findMany({
      where: { itemId: params.itemId },
      orderBy: { createdAt: 'desc' },
    })

    return ok(adjustments)
  } catch (error) {
    console.error('LIST_STOCK_ADJUSTMENT_FAILED', error)
    return serverError('LIST_STOCK_ADJUSTMENT_FAILED')
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { itemId: string } }
) {
  try {
    const user = getAuthFromRequest(req)
    if (!user || !hasPermission(user, 'USER')) return forbidden()

    const { mode, quantity, reason, remarks } = await req.json()
    if (!mode || typeof quantity !== 'number') {
      return badRequest('INVALID_ADJUSTMENT_INPUT')
    }

    const detail = await getItemDetailWithStats(params.itemId)
    if (!detail) return badRequest('ITEM_NOT_FOUND')

    const previousStock = detail.stock.inStock ?? 0
    let newStock = previousStock

    switch (mode) {
      case 'set':
        newStock = Math.max(0, quantity)
        break
      case 'add':
        newStock = Math.max(0, previousStock + quantity)
        break
      case 'subtract':
        newStock = Math.max(0, previousStock - quantity)
        break
      default:
        return badRequest('INVALID_ADJUSTMENT_MODE')
    }

    const delta = newStock - previousStock

    const adjustment = await prisma.stockAdjustment.create({
      data: {
        itemId: params.itemId,
        adjustmentType: mode.toUpperCase(),
        quantity: delta,
        previousStock,
        newStock,
        reason: reason || '手动调整',
        remarks: remarks || '',
      },
    })

    if (user?.id) {
      await logActivity(user.id, 'ITEM_STOCK_ADJUST', 'Item', params.itemId, {
        previous: previousStock,
        current: newStock,
        mode,
        quantity: delta,
      })
    }

    const updatedDetail = await getItemDetailWithStats(params.itemId)
    return ok({
      adjustment,
      detail: updatedDetail,
    })
  } catch (error) {
    console.error('CREATE_STOCK_ADJUSTMENT_FAILED', error)
    return serverError('CREATE_STOCK_ADJUSTMENT_FAILED')
  }
}


