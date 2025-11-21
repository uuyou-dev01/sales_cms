import { NextRequest } from 'next/server'
import { getAuthFromRequest, hasPermission } from '@/lib/auth'
import { ok, forbidden, serverError } from '@/src/modules/shared/api/response'
import { getSkuOverallStats } from '@/src/modules/sku/services/sku.service'

export async function GET(req: NextRequest) {
  try {
    const user = getAuthFromRequest(req)
    if (!user || !hasPermission(user, 'USER')) return forbidden()
    
    const result = await getSkuOverallStats()
    return ok(result)
  } catch (e) {
    console.error('SKU overall stats error:', e)
    return serverError('SKU_OVERALL_STATS_FAILED')
  }
}

