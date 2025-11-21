import { NextRequest } from 'next/server'
import { getAuthFromRequest, hasPermission } from '@/lib/auth'
import { ok, forbidden, serverError } from '@/src/modules/shared/api/response'
import { getAvailableItemsForSale } from '@/src/modules/sales/services/sale.service'

export async function GET(req: NextRequest) {
  try {
    const user = getAuthFromRequest(req)
    if (!user || !hasPermission(user, 'USER')) return forbidden()

    const { searchParams } = new URL(req.url)
    const skuId = searchParams.get('skuId')
    const itemSize = searchParams.get('itemSize')
    const itemCondition = searchParams.get('itemCondition')
    const itemColor = searchParams.get('itemColor')
    const toyCharacterName = searchParams.get('toyCharacterName')
    const platformId = searchParams.get('platformId')
    const listingStatus = searchParams.get('listingStatus')
    const requiresListing = searchParams.get('requiresListing') === 'true'
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined

    const items = await getAvailableItemsForSale({
      skuId: skuId || undefined,
      itemSize: itemSize || undefined,
      itemCondition: itemCondition || undefined,
      itemColor: itemColor || undefined,
      toyCharacterName: toyCharacterName || undefined,
      platformId: platformId || undefined,
      listingStatus: listingStatus || undefined,
      requiresListing,
      limit,
    })

    return ok(items)
  } catch (e: any) {
    console.error('Get available items error:', e)
    return serverError(e?.message || 'GET_AVAILABLE_ITEMS_FAILED')
  }
}

