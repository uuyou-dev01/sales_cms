import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest, hasPermission } from '@/lib/auth'
import { ok, badRequest, forbidden, serverError, notFound } from '@/src/modules/shared/api/response'
import { logActivity } from '@/lib/audit'
import { generateItemName } from '@/src/modules/sku/utils/item-name-generator'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: skuId } = await params
    const user = getAuthFromRequest(req)
    if (!user || !hasPermission(user, 'USER')) return forbidden()

    const { searchParams } = new URL(req.url)
    const page = Number(searchParams.get('page') || '1')
    const pageSize = Number(searchParams.get('pageSize') || '20')
    const search = searchParams.get('search') || undefined

    const { listItemsBySku } = await import('@/src/modules/sku/services/sku.service')
    const result = await listItemsBySku({ skuId, page, pageSize, search })
    return ok(result)
  } catch (e) {
    console.error('List items error:', e)
    return serverError('ITEM_LIST_FAILED')
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: skuId } = await params
    const user = getAuthFromRequest(req)
    if (!user || !hasPermission(user, 'USER')) return forbidden()

    const body = await req.json()
    const {
      itemSize,
      itemCondition,
      photos = [],
      defaults = {},
      variantLabel, // 变体标签（原toyCharacterName，但更通用）
      toyCharacterName, // 向后兼容
      itemNumber,
      itemColor,
      itemRemarks,
    } = body || {}

    const sku = await prisma.sKU.findUnique({ 
      where: { id: skuId },
      include: { category: true }
    })
    if (!sku) return notFound('SKU_NOT_FOUND')

    // 自动生成 Item 名称
    const finalVariantLabel = variantLabel || toyCharacterName || null
    const finalItemSize = itemSize || '均码'
    const finalItemCondition = itemCondition || 'NEW'
    
    const itemName = generateItemName({
      skuName: sku.name,
      itemSize: finalItemSize,
      itemCondition: finalItemCondition,
      variantLabel: finalVariantLabel,
    })

    const now = Date.now()
    const uid = `${skuId}-${now}-${Math.random().toString(36).slice(2, 8)}`

    const created = await prisma.item.create({
      data: {
        itemId: uid,
        itemName,
        itemNumber: itemNumber || uid,
        itemType: defaults.itemType || sku.category?.name || '其他',
        itemBrand: defaults.itemBrand || sku.brand || '',
        itemCondition: finalItemCondition,
        itemSize: finalItemSize,
        photos,
        itemColor: itemColor || null,
        itemRemarks: itemRemarks || null,
        toyCharacterName: finalVariantLabel || null, // 保留字段以兼容现有数据
        sku: { connect: { id: skuId } },
        // 子SKU模板不应该有实际库存，设置为 TEMPLATE 状态
        // 注意：如果 schema 中没有 TEMPLATE 状态，可以使用其他方式标识（如 purchaseOrderId 为 null）
        status: 'TEMPLATE', // 模板状态，不计入库存
      },
      include: {
        transactionDetails: {
          include: { transaction: true },
        },
      },
    })

    if (user?.id) {
      await logActivity(user.id, 'ITEM_CREATE', 'Item', created.itemId)
    }
    return ok(created, 201)
  } catch (e) {
    console.error('Create item error:', e)
    return serverError('CREATE_ITEM_FAILED')
  }
}


