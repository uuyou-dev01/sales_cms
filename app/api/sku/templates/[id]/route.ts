import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest, hasPermission } from '@/lib/auth'
import { ok, badRequest, forbidden, serverError, notFound } from '@/src/modules/shared/api/response'
import { logActivity } from '@/lib/audit'
import { Prisma } from '@prisma/client'

// GET: 获取单个模板
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = getAuthFromRequest(req)
    if (!user || !hasPermission(user, 'USER')) return forbidden()

    const template = await prisma.subSkuTemplate.findUnique({
      where: { id },
      include: {
        sku: {
          include: { category: true },
        },
        items: {
          take: 10, // 只返回最近10个基于此模板创建的 Item
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!template) return notFound('TEMPLATE_NOT_FOUND')

    return ok(template)
  } catch (e) {
    console.error('Get template error:', e)
    return serverError('TEMPLATE_GET_FAILED')
  }
}

// PUT: 更新模板
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = getAuthFromRequest(req)
    if (!user || !hasPermission(user, 'USER')) return forbidden()

    const body = await req.json()
    const {
      itemSize,
      itemCondition,
      photos,
      variantLabel,
      itemColor,
      itemRemarks,
      recommendedPrice,
      recommendedPriceCurrency,
      optionalAttributes,
      isActive,
    } = body || {}

    // 检查模板是否存在
    const existing = await prisma.subSkuTemplate.findUnique({
      where: { id },
      include: { sku: true },
    })
    if (!existing) return notFound('TEMPLATE_NOT_FOUND')

    // 如果修改了会影响唯一约束的字段，需要检查是否冲突
    if (itemSize !== undefined || itemCondition !== undefined || variantLabel !== undefined || itemColor !== undefined) {
      const finalItemSize = itemSize !== undefined ? itemSize : existing.itemSize
      const finalItemCondition = itemCondition !== undefined ? itemCondition : existing.itemCondition
      const finalVariantLabel = variantLabel !== undefined ? variantLabel : existing.variantLabel
      const finalItemColor = itemColor !== undefined ? itemColor : existing.itemColor

      // 如果规格改变了，需要重新生成 itemName
      if (itemSize !== undefined || itemCondition !== undefined || variantLabel !== undefined) {
        const { generateItemName } = await import('@/src/modules/sku/utils/item-name-generator')
        const newItemName = generateItemName({
          skuName: existing.sku.name,
          itemSize: finalItemSize || '均码',
          itemCondition: finalItemCondition || 'NEW',
          variantLabel: finalVariantLabel || null,
        })

        // 检查新规格是否与其他模板冲突
        const conflict = await prisma.subSkuTemplate.findFirst({
          where: {
            skuId: existing.skuId,
            itemSize: finalItemSize,
            itemCondition: finalItemCondition,
            variantLabel: finalVariantLabel || null,
            itemColor: finalItemColor || null,
            id: { not: id }, // 排除自己
          },
        })

        if (conflict) {
          return badRequest('TEMPLATE_DUPLICATE', {
            message: '修改后的规格与现有模板冲突。',
          })
        }

        // 更新模板
        const updated = await prisma.subSkuTemplate.update({
          where: { id },
          data: {
            itemName: newItemName,
            itemSize: finalItemSize,
            itemCondition: finalItemCondition,
            variantLabel: finalVariantLabel,
            itemColor: finalItemColor,
            photos: photos !== undefined ? (Array.isArray(photos) ? photos : []) : undefined,
            recommendedPrice: recommendedPrice !== undefined 
              ? (recommendedPrice ? new Prisma.Decimal(recommendedPrice) : null) 
              : undefined,
            recommendedPriceCurrency: recommendedPriceCurrency !== undefined 
              ? recommendedPriceCurrency 
              : undefined,
            optionalAttributes: optionalAttributes !== undefined ? optionalAttributes : undefined,
            itemRemarks: itemRemarks !== undefined ? itemRemarks : undefined,
            isActive: isActive !== undefined ? !!isActive : undefined,
          },
        })

        if (user?.id) {
          await logActivity(user.id, 'TEMPLATE_UPDATE', 'SubSkuTemplate', updated.id)
        }

        return ok(updated)
      }
    }

    // 只更新非规格字段
    const updated = await prisma.subSkuTemplate.update({
      where: { id },
      data: {
        photos: photos !== undefined ? (Array.isArray(photos) ? photos : []) : undefined,
        recommendedPrice: recommendedPrice !== undefined 
          ? (recommendedPrice ? new Prisma.Decimal(recommendedPrice) : null) 
          : undefined,
        recommendedPriceCurrency: recommendedPriceCurrency !== undefined 
          ? recommendedPriceCurrency 
          : undefined,
        optionalAttributes: optionalAttributes !== undefined ? optionalAttributes : undefined,
        itemRemarks: itemRemarks !== undefined ? itemRemarks : undefined,
        isActive: isActive !== undefined ? !!isActive : undefined,
      },
    })

    if (user?.id) {
      await logActivity(user.id, 'TEMPLATE_UPDATE', 'SubSkuTemplate', updated.id)
    }

    return ok(updated)
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === 'P2002') {
        return badRequest('TEMPLATE_DUPLICATE', {
          message: '模板规格冲突。',
        })
      }
    }
    console.error('Update template error:', e)
    return serverError('UPDATE_TEMPLATE_FAILED')
  }
}

// DELETE: 删除模板（软删除，设置为 isActive = false）
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = getAuthFromRequest(req)
    if (!user || !hasPermission(user, 'USER')) return forbidden()

    const template = await prisma.subSkuTemplate.findUnique({
      where: { id },
    })
    if (!template) return notFound('TEMPLATE_NOT_FOUND')

    // 检查是否有基于此模板创建的 Item
    const itemCount = await prisma.item.count({
      where: { templateId: id },
    })

    if (itemCount > 0) {
      // 如果有 Item 关联，只做软删除
      const updated = await prisma.subSkuTemplate.update({
        where: { id },
        data: { isActive: false },
      })

      if (user?.id) {
        await logActivity(user.id, 'TEMPLATE_DEACTIVATE', 'SubSkuTemplate', updated.id)
      }

      return ok({ 
        success: true, 
        message: `模板已停用（有 ${itemCount} 个 Item 基于此模板创建）`,
        deactivated: true,
      })
    } else {
      // 如果没有 Item 关联，可以硬删除
      await prisma.subSkuTemplate.delete({
        where: { id },
      })

      if (user?.id) {
        await logActivity(user.id, 'TEMPLATE_DELETE', 'SubSkuTemplate', id)
      }

      return ok({ success: true, message: '模板已删除' })
    }
  } catch (e) {
    console.error('Delete template error:', e)
    return serverError('DELETE_TEMPLATE_FAILED')
  }
}

