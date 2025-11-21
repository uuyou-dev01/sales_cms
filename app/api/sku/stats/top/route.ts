import { NextRequest } from 'next/server'
import { getAuthFromRequest, hasPermission } from '@/lib/auth'
import { ok, forbidden, serverError } from '@/src/modules/shared/api/response'
import { getTopSkuStats } from '@/src/modules/sku/services/sku.service'

export async function GET(req: NextRequest) {
  try {
    const user = getAuthFromRequest(req)
    if (!user || !hasPermission(user, 'USER')) return forbidden()
    
    const { searchParams } = new URL(req.url)
    const period = (searchParams.get('period') || '7d') as '7d' | '30d'
    const limit = Number(searchParams.get('limit') || '10')
    
    const result = await getTopSkuStats(period, limit)
    return ok(result)
  } catch (e) {
    console.error('SKU stats error:', e)
    return serverError('SKU_STATS_FAILED')
  }
}

