import { NextRequest } from 'next/server'
import { getAuthFromRequest, hasPermission } from '@/lib/auth'
import { ok, notFound, forbidden, serverError } from '@/src/modules/shared/api/response'
import { getSkuById, updateSku, deleteSku } from '@/src/modules/sku/services/sku.service'
import { getSkuDetailWithStats } from '@/src/modules/sku/services/sku.service'
import { logActivity } from '@/lib/audit'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const data = await getSkuDetailWithStats(id)
    if (!data) return notFound('SKU_NOT_FOUND')
    return ok(data)
  } catch (e) {
    return serverError('SKU_GET_FAILED')
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = getAuthFromRequest(req)
    if (!user || !hasPermission(user, 'USER')) return forbidden()
    
    const body = await req.json()
    if (!body?.name) {
      return serverError('MISSING_SKU_NAME')
    }

    // 处理category连接
    const updateData: any = {
      name: body.name.trim(),
      skuNumber: body.skuNumber?.trim() || undefined,
      brand: body.brand?.trim() || undefined,
      unit: body.unit || undefined,
      attributes: body.attributes || undefined,
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
    }

    // 处理category
    if (body.category?.connect?.id) {
      updateData.category = { connect: { id: body.category.connect.id } }
    } else if (body.categoryId) {
      updateData.category = { connect: { id: body.categoryId } }
    } else if (body.category === null || body.category?.disconnect === true) {
      updateData.category = { disconnect: true }
    }

    const updated = await updateSku(id, updateData)
    if (user?.id) await logActivity(user.id, 'SKU_UPDATE', 'SKU', id)
    return ok(updated)
  } catch (e: any) {
    console.error('Update SKU error:', e)
    return serverError(e?.message || 'SKU_UPDATE_FAILED')
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = getAuthFromRequest(req)
    if (!user || !hasPermission(user, 'ADMIN')) return forbidden()
    await deleteSku(id)
    if (user?.id) await logActivity(user.id, 'SKU_DELETE', 'SKU', id)
    return ok({ success: true })
  } catch (e) {
    return serverError('SKU_DELETE_FAILED')
  }
}


