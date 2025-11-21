import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest, hasPermission } from '@/lib/auth'
import { ok, badRequest, forbidden, serverError } from '@/src/modules/shared/api/response'

export async function GET(req: NextRequest) {
  try {
    const user = getAuthFromRequest(req)
    if (!user || !hasPermission(user, 'USER')) return forbidden()
    const data = await prisma.platform.findMany({ orderBy: { updatedAt: 'desc' } })
    return ok({ items: data })
  } catch (e) {
    console.error('PLATFORM_LIST_FAILED', e)
    return serverError('PLATFORM_LIST_FAILED')
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getAuthFromRequest(req)
    if (!user || !hasPermission(user, 'ADMIN')) return forbidden()
    const body = await req.json()
    if (!body?.name || body.baseFeeRate === undefined) return badRequest('MISSING_FIELDS')
    const payload = {
      name: body.name,
      baseFeeRate: Number(body.baseFeeRate),
      shippingFee: body.shippingFee !== undefined ? Number(body.shippingFee) : null,
      tierRules: body.tierRules || undefined,
      region: body.region || null,
      market: body.market || null,
      currency: body.currency || 'JPY',
      feeSchema: body.feeSchema || undefined,
      shippingTemplates: body.shippingTemplates || undefined,
      config: body.config || undefined,
      isActive: body.isActive !== undefined ? !!body.isActive : true,
    }
    const created = await prisma.platform.create({ data: payload })
    return ok(created, 201)
  } catch (e) {
    console.error('PLATFORM_CREATE_FAILED', e)
    return serverError('PLATFORM_CREATE_FAILED')
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = getAuthFromRequest(req)
    if (!user || !hasPermission(user, 'ADMIN')) return forbidden()
    const body = await req.json()
    if (!body?.id) return badRequest('MISSING_ID')
    const updated = await prisma.platform.update({
      where: { id: body.id },
      data: {
        name: body.name,
        baseFeeRate: body.baseFeeRate !== undefined ? Number(body.baseFeeRate) : undefined,
        shippingFee: body.shippingFee !== undefined ? Number(body.shippingFee) : undefined,
        tierRules: body.tierRules,
        region: body.region,
        market: body.market,
        currency: body.currency,
        feeSchema: body.feeSchema,
        shippingTemplates: body.shippingTemplates,
        config: body.config,
        isActive: body.isActive !== undefined ? !!body.isActive : undefined,
      },
    })
    return ok(updated)
  } catch (e) {
    console.error('PLATFORM_UPDATE_FAILED', e)
    return serverError('PLATFORM_UPDATE_FAILED')
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = getAuthFromRequest(req)
    if (!user || !hasPermission(user, 'ADMIN')) return forbidden()
    const body = await req.json()
    if (!body?.id) return badRequest('MISSING_ID')
    await prisma.platform.delete({ where: { id: body.id } })
    return ok({ success: true })
  } catch (e) {
    console.error('PLATFORM_DELETE_FAILED', e)
    return serverError('PLATFORM_DELETE_FAILED')
  }
}


