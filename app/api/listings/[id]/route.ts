import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest, hasPermission } from '@/lib/auth'
import { ok, forbidden, notFound, serverError } from '@/src/modules/shared/api/response'
import { adjustTemplateStockCounts } from '@/src/modules/listings/services/template-stock.service'
import { logListingActivity } from '@/src/modules/listings/services/activity.service'

const RELEASE_STATUSES = new Set(['ARCHIVED', 'CANCELLED', 'ENDED', 'INACTIVE'])

function isReleasedStatus(status?: string | null) {
  if (!status) return false
  return RELEASE_STATUSES.has(status.toUpperCase())
}

function buildListingMeta(listing: any) {
  return {
    platformId: listing.platformId,
    platformName: listing.platform?.name,
    status: listing.status,
    sourceType: listing.sourceType,
    quantity: listing.quantity,
    templateId: listing.templateId,
    itemId: listing.itemId,
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthFromRequest(req)
    if (!user || !hasPermission(user, 'USER')) return forbidden()
    const listing = await prisma.itemListing.findUnique({
      where: { id: params.id },
      include: {
        item: {
          include: {
            sku: true,
            template: true,
          },
        },
        template: {
          include: {
            sku: true,
          },
        },
        platform: true,
      },
    })
    if (!listing) return notFound('LISTING_NOT_FOUND')
    return ok(listing)
  } catch (e) {
    console.error('LISTING_GET_FAILED', e)
    return serverError('LISTING_GET_FAILED')
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthFromRequest(req)
    if (!user || !hasPermission(user, 'USER')) return forbidden()
    const body = await req.json()

    const existing = await prisma.itemListing.findUnique({
      where: { id: params.id },
      include: {
        template: true,
      },
    })
    if (!existing) return notFound('LISTING_NOT_FOUND')

    const listing = await prisma.itemListing.update({
      where: { id: params.id },
      data: {
        status: body.status ?? existing.status,
        listingPrice:
          body.listingPrice !== undefined && body.listingPrice !== null
            ? Number(body.listingPrice)
            : undefined,
        listingCurrency: body.listingCurrency ?? existing.listingCurrency,
        listingUrl: body.listingUrl ?? existing.listingUrl,
        warehouseId: body.warehouseId ?? existing.warehouseId,
        note: body.note ?? existing.note,
        listedAt: body.listedAt ? new Date(body.listedAt) : existing.listedAt,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : existing.expiresAt,
        metadata: body.metadata ?? existing.metadata,
      },
      include: {
        item: {
          include: {
            sku: true,
            template: true,
          },
        },
        template: {
          include: { sku: true },
        },
        platform: true,
      },
    })

    if (existing.sourceType === 'TEMPLATE' && existing.templateId) {
      const previousReleased = isReleasedStatus(existing.status)
      const nextReleased = isReleasedStatus(listing.status)
      const remaining = Math.max(0, listing.quantity - listing.fulfilledQuantity)

      if (!previousReleased && nextReleased) {
        await adjustTemplateStockCounts(existing.templateId, {
          available: remaining,
          listed: -remaining,
        })
      } else if (previousReleased && !nextReleased) {
        await adjustTemplateStockCounts(existing.templateId, {
          available: -remaining,
          listed: remaining,
        })
      }
    }

    await logListingActivity({
      listingId: listing.id,
      sourceType: listing.sourceType,
      templateId: listing.templateId,
      itemId: listing.itemId,
      platformId: listing.platformId,
      action: 'UPDATE',
      status: listing.status,
      quantity: listing.quantity,
      operatorId: user.id ?? null,
      payload: buildListingMeta(listing),
    })
    return ok(listing)
  } catch (e) {
    console.error('LISTING_UPDATE_FAILED', e)
    return serverError('LISTING_UPDATE_FAILED')
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthFromRequest(req)
    if (!user || !hasPermission(user, 'USER')) return forbidden()

    const existing = await prisma.itemListing.findUnique({
      where: { id: params.id },
      include: {
        platform: true,
        item: {
          include: { sku: true, template: true },
        },
        template: {
          include: { sku: true },
        },
      },
    })
    if (!existing) return notFound('LISTING_NOT_FOUND')

    await prisma.itemListing.delete({
      where: { id: params.id },
    })

    if (existing.sourceType === 'TEMPLATE' && existing.templateId && !isReleasedStatus(existing.status)) {
      const remaining = Math.max(0, existing.quantity - existing.fulfilledQuantity)
      if (remaining > 0) {
        await adjustTemplateStockCounts(existing.templateId, {
          available: remaining,
          listed: -remaining,
        })
      }
    }

    await logListingActivity({
      listingId: existing.id,
      sourceType: existing.sourceType,
      templateId: existing.templateId,
      itemId: existing.itemId,
      platformId: existing.platformId,
      action: 'DELETE',
      status: existing.status,
      quantity: existing.quantity,
      operatorId: user.id ?? null,
      payload: buildListingMeta(existing),
    })
    return ok({ success: true })
  } catch (e) {
    console.error('LISTING_DELETE_FAILED', e)
    return serverError('LISTING_DELETE_FAILED')
  }
}
