import { NextRequest } from 'next/server'
import { getAuthFromRequest, hasPermission } from '@/lib/auth'
import { ok, forbidden, notFound, serverError } from '@/src/modules/shared/api/response'
import { getItemDetailWithStats } from '@/src/modules/sku/services/sku.service'

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ itemId: string }> }
) {
  try {
    const user = getAuthFromRequest(req)
    if (!user || !hasPermission(user, 'USER')) return forbidden()

    const params = await props.params;
    const data = await getItemDetailWithStats(params.itemId)
    if (!data) return notFound('ITEM_NOT_FOUND')

    return ok(data)
  } catch (error) {
    console.error('ITEM_DETAIL_FAILED', error)
    return serverError('ITEM_DETAIL_FAILED')
  }
}
