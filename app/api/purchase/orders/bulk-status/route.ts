import { NextRequest } from 'next/server'
import { getAuthFromRequest, hasPermission } from '@/lib/auth'
import { ok, badRequest, forbidden, serverError } from '@/src/modules/shared/api/response'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/audit'
import { buildRemarks, parsePurchaseMeta } from '@/src/modules/purchase/services/order.service'

interface BulkStatusPayload {
  orderIds: string[]
  status?: string
  platform?: string
  supplier?: string
  logisticsTrackingNo?: string
  notes?: string
}

export async function POST(req: NextRequest) {
  try {
    const user = getAuthFromRequest(req)
    if (!user || !hasPermission(user, 'USER')) return forbidden()

    const body: BulkStatusPayload = await req.json()
    const ids = Array.isArray(body.orderIds) ? body.orderIds.filter(Boolean) : []
    if (ids.length === 0) return badRequest('MISSING_ORDER_IDS')

    const orders = await prisma.purchaseOrder.findMany({
      where: { id: { in: ids } },
      select: { id: true, remarks: true },
    })

    if (orders.length === 0) return badRequest('ORDERS_NOT_FOUND')

    const updates = orders.map(order => {
      const currentMeta = parsePurchaseMeta(order.remarks)
      const merged = buildRemarks({
        status: body.status ?? currentMeta.status ?? 'PENDING',
        platform: body.platform ?? currentMeta.platform ?? null,
        supplier: body.supplier ?? currentMeta.supplier ?? null,
        logisticsTrackingNo: body.logisticsTrackingNo ?? currentMeta.logisticsTrackingNo ?? null,
        notes: body.notes ?? currentMeta.notes ?? null,
      })
      return prisma.purchaseOrder.update({
        where: { id: order.id },
        data: { remarks: merged },
        select: { id: true },
      })
    })

    await prisma.$transaction(updates)
    await logActivity(user.id, 'PURCHASE_BULK_STATUS', 'PurchaseOrder', ids.join(','))

    return ok({ updated: ids.length })
  } catch (error) {
    console.error('PURCHASE_BULK_STATUS_FAILED', error)
    return serverError('PURCHASE_BULK_STATUS_FAILED')
  }
}


