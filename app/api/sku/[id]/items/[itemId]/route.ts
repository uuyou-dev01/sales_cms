import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest, hasPermission } from '@/lib/auth'
import { ok, badRequest, forbidden, serverError, notFound } from '@/src/modules/shared/api/response'
import { updateItem, deleteItem } from '@/src/modules/sku/services/sku.service'
import { logActivity } from '@/lib/audit'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id: skuId, itemId } = await params
    const user = getAuthFromRequest(req)
    if (!user || !hasPermission(user, 'USER')) return forbidden()

    const body = await req.json()
    
    // 验证 Item 是否属于该 SKU
    const item = await prisma.item.findUnique({
      where: { itemId },
      select: { skuId: true },
    })

    if (!item) return notFound('ITEM_NOT_FOUND')
    if (item.skuId !== skuId) return badRequest('ITEM_NOT_BELONG_TO_SKU')

    const updated = await updateItem(itemId, body)
    if (user?.id) await logActivity(user.id, 'ITEM_UPDATE', 'Item', itemId)
    return ok(updated)
  } catch (e) {
    console.error('Update item error:', e)
    return serverError('ITEM_UPDATE_FAILED')
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id: skuId, itemId } = await params
    const user = getAuthFromRequest(req)
    if (!user || !hasPermission(user, 'USER')) return forbidden()

    // 验证 Item 是否属于该 SKU
    const item = await prisma.item.findUnique({
      where: { itemId },
      select: { skuId: true },
    })

    if (!item) return notFound('ITEM_NOT_FOUND')
    if (item.skuId !== skuId) return badRequest('ITEM_NOT_BELONG_TO_SKU')

    await deleteItem(itemId)
    if (user?.id) await logActivity(user.id, 'ITEM_DELETE', 'Item', itemId)
    return ok({ success: true })
  } catch (e) {
    console.error('Delete item error:', e)
    return serverError('ITEM_DELETE_FAILED')
  }
}

