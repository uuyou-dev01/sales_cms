import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest, hasPermission } from '@/lib/auth'
import { ok, badRequest, forbidden, serverError } from '@/src/modules/shared/api/response'

export async function GET(req: NextRequest) {
  try {
    const user = getAuthFromRequest(req)
    if (!user || !hasPermission(user, 'USER')) return forbidden()

    const { searchParams } = new URL(req.url)
    const templateId = searchParams.get('templateId')
    if (!templateId) return badRequest('MISSING_TEMPLATE_ID')

    const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit') || '50')))

    // 查找可用的Item（排除已被其他平台占用的）
    const RELEASE_STATUSES = ['ARCHIVED', 'CANCELLED', 'ENDED', 'INACTIVE']
    const items = await prisma.item.findMany({
      where: {
        templateId,
        status: 'IN_STOCK',
        deleted: false,
        // 排除已被其他活跃上架占用的Item
        listings: {
          none: {
            status: {
              notIn: RELEASE_STATUSES,
            },
          },
        },
      },
      include: {
        sku: {
          select: {
            id: true,
            name: true,
            brand: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    })

    return ok({
      items: items.map((item) => ({
        itemId: item.itemId,
        itemName: item.itemName,
        itemSize: item.itemSize,
        itemCondition: item.itemCondition,
        createdAt: item.createdAt,
        sku: item.sku,
      })),
    })
  } catch (error) {
    console.error('TEMPLATE_ITEMS_FETCH_FAILED', error)
    return serverError('TEMPLATE_ITEMS_FETCH_FAILED')
  }
}


