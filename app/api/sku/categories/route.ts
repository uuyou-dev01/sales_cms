import { NextRequest } from 'next/server'
import { getAuthFromRequest, hasPermission } from '@/lib/auth'
import { ok, forbidden, serverError } from '@/src/modules/shared/api/response'
import { getCachedItems } from '@/lib/cache'

// 复用 /api/items/categories 的逻辑，输出为 SKU 维度的分类统计
export async function GET(req: NextRequest) {
  try {
    const user = getAuthFromRequest(req)
    if (!user || !hasPermission(user, 'USER')) return forbidden()

    const allItems = await getCachedItems()
    const typeToStats = new Map<string, { total: number; inStock: number; sold: number }>()

    allItems.forEach((item: any) => {
      const type = item.itemType || '其他'
      if (!typeToStats.has(type)) typeToStats.set(type, { total: 0, inStock: 0, sold: 0 })
      const stats = typeToStats.get(type)!
      stats.total += 1
      const isSold = !!item.transactions?.[0]?.soldDate
      if (isSold) stats.sold += 1; else stats.inStock += 1
    })

    const categories = Array.from(typeToStats.entries())
      .map(([type, stats]) => ({ type, ...stats }))
      .sort((a, b) => b.total - a.total)

    return ok({ success: true, categories, totalCategories: categories.length })
  } catch (e) {
    return serverError('SKU_CATEGORIES_FAILED')
  }
}


