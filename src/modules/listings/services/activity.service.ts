import { prisma } from '@/lib/prisma'
import type { ListingSourceType } from '@prisma/client'

interface LogParams {
  listingId?: string | null
  sourceType: ListingSourceType
  templateId?: string | null
  itemId?: string | null
  platformId: string
  action: string
  status?: string | null
  quantity?: number | null
  operatorId?: string | null
  payload?: Record<string, unknown> | null
}

export async function logListingActivity(params: LogParams) {
  try {
    await prisma.listingActivity.create({
      data: {
        listingId: params.listingId ?? null,
        sourceType: params.sourceType,
        templateId: params.templateId ?? null,
        itemId: params.itemId ?? null,
        platformId: params.platformId,
        action: params.action,
        status: params.status ?? null,
        quantity: params.quantity ?? null,
        operatorId: params.operatorId ?? null,
        payload: params.payload ?? undefined,
      },
    })
  } catch (error) {
    console.error('LISTING_ACTIVITY_LOG_FAILED', error)
  }
}

