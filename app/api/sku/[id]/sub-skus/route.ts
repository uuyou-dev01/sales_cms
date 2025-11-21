import { NextRequest } from 'next/server'
import { getAuthFromRequest, hasPermission } from '@/lib/auth'
import { ok, forbidden, serverError } from '@/src/modules/shared/api/response'
import { listSubSkuTemplatesBySkuId } from '@/src/modules/sku/services/sku.service'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = getAuthFromRequest(req)
    if (!user || !hasPermission(user, 'USER')) return forbidden()

    const templates = await listSubSkuTemplatesBySkuId(id)
    return ok(templates)
  } catch (error) {
    console.error('LIST_SUB_SKU_TEMPLATES_FAILED', error)
    return serverError('LIST_SUB_SKU_TEMPLATES_FAILED')
  }
}

