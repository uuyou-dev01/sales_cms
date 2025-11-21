import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest, hasPermission } from '@/lib/auth'
import { ok, badRequest, forbidden, serverError, notFound } from '@/src/modules/shared/api/response'
import { logActivity } from '@/lib/audit'
import { generateItemName } from '@/src/modules/sku/utils/item-name-generator'
import { Prisma } from '@prisma/client'

// GET: 获取指定 SKU 的所有模板
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: skuId } = await params
    const user = getAuthFromRequest(req)
    if (!user || !hasPermission(user, 'USER')) return forbidden()

    const templates = await prisma.subSkuTemplate.findMany({
      where: { 
        skuId,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return ok({ items: templates })
  } catch (e) {
    console.error('List templates error:', e)
    return serverError('TEMPLATE_LIST_FAILED')
  }
}

// POST: 创建新的子SKU模板
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
      variantLabel,
      toyCharacterName, // 向后兼容
      itemColor,
      itemRemarks,
      recommendedPrice,
      recommendedPriceCurrency,
      optionalAttributes,
    } = body || {}

    // 验证 SKU 是否存在
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

    // 检查是否已存在相同规格的模板
    const existing = await prisma.subSkuTemplate.findFirst({
      where: {
        skuId,
        itemSize: finalItemSize,
        itemCondition: finalItemCondition,
        variantLabel: finalVariantLabel || null,
        itemColor: itemColor || null,
      },
    })

    if (existing) {
      return badRequest('TEMPLATE_DUPLICATE', {
        message: '已存在相同规格的模板，请修改规格后重试。',
        templateId: existing.id,
      })
    }

    // 准备创建数据
    const createData = {
      skuId,
      itemName,
      itemSize: finalItemSize,
      itemCondition: finalItemCondition,
      variantLabel: finalVariantLabel,
      itemColor: itemColor || null,
      photos: Array.isArray(photos) ? photos : [],
      recommendedPrice: recommendedPrice ? new Prisma.Decimal(recommendedPrice) : null,
      recommendedPriceCurrency: recommendedPriceCurrency || 'JPY',
      optionalAttributes: optionalAttributes || undefined,
      itemRemarks: itemRemarks || null,
      isActive: true,
    }
    
    console.log('📦 Creating template with data:', {
      skuId,
      itemName,
      itemSize: finalItemSize,
      itemCondition: finalItemCondition,
      variantLabel: finalVariantLabel,
      itemColor: itemColor || null,
      photosCount: Array.isArray(photos) ? photos.length : 0,
      recommendedPrice: recommendedPrice ? String(recommendedPrice) : null,
      recommendedPriceCurrency: recommendedPriceCurrency || 'JPY',
      hasOptionalAttributes: !!optionalAttributes,
      itemRemarks: itemRemarks || null,
    })

    // 创建模板
    const created = await prisma.subSkuTemplate.create({
      data: createData,
    })

    if (user?.id) {
      await logActivity(user.id, 'TEMPLATE_CREATE', 'SubSkuTemplate', created.id)
    }

    return ok(created, 201)
  } catch (e) {
    console.error('❌ Create template error:', e)
    console.error('Error details:', {
      name: e instanceof Error ? e.name : typeof e,
      message: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack : undefined,
    })
    
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('Prisma error code:', e.code, 'meta:', e.meta)
      if (e.code === 'P2002') {
        return badRequest('TEMPLATE_DUPLICATE', {
          message: '已存在相同规格的模板。',
        })
      }
      if (e.code === 'P2003') {
        return badRequest('SKU_NOT_FOUND', {
          message: '关联的 SKU 不存在，请刷新页面后重试。',
        })
      }
    }
    
    const errorMessage = e instanceof Error ? e.message : String(e)
    return serverError(errorMessage || 'CREATE_TEMPLATE_FAILED')
  }
}

