import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest, hasPermission } from '@/lib/auth'
import { ok, badRequest, forbidden, serverError } from '@/src/modules/shared/api/response'
import { logListingActivity } from '@/src/modules/listings/services/activity.service'

export async function PATCH(req: NextRequest) {
  try {
    const user = getAuthFromRequest(req)
    if (!user || !hasPermission(user, 'USER')) return forbidden()

    const body = await req.json()
    const { ids, action, data } = body

    if (!Array.isArray(ids) || ids.length === 0) {
      return badRequest('MISSING_IDS')
    }
    if (!['UPDATE_PRICE', 'DELIST', 'RELIST'].includes(action)) {
      return badRequest('INVALID_ACTION')
    }

    const listings = await prisma.itemListing.findMany({
      where: { id: { in: ids } },
      include: { platform: true }
    })

    const updatedListings = []

    for (const listing of listings) {
      let updateData: any = {}
      let activityAction = 'UPDATE'
      let activityPayload: any = {}

      if (action === 'DELIST') {
        if (listing.status === 'ENDED' || listing.status === 'sold') continue
        updateData = { status: 'ENDED' }
        activityAction = 'END'
        activityPayload = { reason: 'BULK_DELIST' }
      } else if (action === 'RELIST') {
        if (listing.status === 'LISTED') continue
        updateData = { status: 'LISTED', listedAt: new Date() }
        activityAction = 'RELIST'
        activityPayload = { reason: 'BULK_RELIST' }
      } else if (action === 'UPDATE_PRICE') {
        if (!data) continue
        
        let newPrice = Number(listing.listingPrice)
        if (data.mode === 'FIXED') {
          newPrice = Number(data.value)
        } else if (data.mode === 'ADJUST_FIXED') {
          newPrice += Number(data.value)
        } else if (data.mode === 'ADJUST_PERCENT') {
          newPrice = newPrice * (1 + Number(data.value) / 100)
        }

        if (isNaN(newPrice) || newPrice < 0) continue
        
        // Keep currency consistent or allow update? For now assume keeping listing currency
        updateData = { listingPrice: newPrice }
        activityAction = 'UPDATE_PRICE'
        activityPayload = { oldPrice: listing.listingPrice, newPrice, mode: data.mode }
      }

      if (Object.keys(updateData).length > 0) {
        const updated = await prisma.itemListing.update({
          where: { id: listing.id },
          data: updateData
        })
        updatedListings.push(updated)

        await logListingActivity({
          listingId: listing.id,
          platformId: listing.platformId,
          itemId: listing.itemId,
          templateId: listing.templateId,
          sourceType: listing.sourceType,
          action: activityAction,
          status: updated.status,
          operatorId: user.id,
          payload: activityPayload
        })
      }
    }

    return ok({ success: true, updatedCount: updatedListings.length })
  } catch (e) {
    console.error('BATCH_UPDATE_FAILED', e)
    return serverError('BATCH_UPDATE_FAILED')
  }
}

