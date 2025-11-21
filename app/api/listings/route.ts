import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest, hasPermission } from '@/lib/auth'
import { ok, badRequest, forbidden, serverError, notFound } from '@/src/modules/shared/api/response'
import { adjustTemplateStockCounts } from '@/src/modules/listings/services/template-stock.service'
import { logListingActivity } from '@/src/modules/listings/services/activity.service'
import { Prisma } from '@prisma/client'
import { subDays, formatISO } from 'date-fns'

const RELEASE_STATUSES = new Set(['ARCHIVED', 'CANCELLED', 'ENDED', 'INACTIVE'])
const DEFAULT_PAGE_SIZE = 20
const TREND_LOOKBACK_DAYS = 6
const STALE_THRESHOLD_DAYS = 14
const SAMPLE_LIMIT = 300
const HIGHLIGHT_LIMIT = 5

function isReleasedStatus(status?: string | null) {
  if (!status) return false
  return RELEASE_STATUSES.has(status.toUpperCase())
}

function toNumber(value?: Prisma.Decimal | number | null) {
  if (value === undefined || value === null) return null
  if (typeof value === 'number') return value
  return Number(value)
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

async function fetchTemplateSummaries(params: {
  skuId?: string | null
  platformId?: string | null
  status?: string | null
  search?: string | null
}) {
  const { skuId, platformId, status, search } = params
  const where: Prisma.SubSkuTemplateWhereInput = {
    ...(skuId ? { skuId } : {}),
    ...(search
      ? {
          OR: [
            { itemName: { contains: search, mode: 'insensitive' } },
            { sku: { name: { contains: search, mode: 'insensitive' } } },
          ],
        }
      : {}),
    ...(status === 'ARCHIVED' ? { isActive: false } : {}),
  }
  if (status && status !== 'ARCHIVED') {
    where.isActive = true
  }
  const listingStatusFilter =
    status && status !== 'ARCHIVED'
      ? {
          status,
        }
      : {}

  const templates = await prisma.subSkuTemplate.findMany({
    where,
    include: {
      sku: {
        select: {
          id: true,
          name: true,
          brand: true,
        },
      },
      listings: {
        where: {
          ...(platformId ? { platformId } : {}),
          ...listingStatusFilter,
        },
        include: {
          platform: true,
        },
        orderBy: { updatedAt: 'desc' },
      },
    },
    orderBy: [{ updatedAt: 'desc' }],
  })

  return templates.map((template) => ({
    id: template.id,
    skuId: template.skuId,
    sku: template.sku,
    itemName: template.itemName,
    itemSize: template.itemSize,
    itemCondition: template.itemCondition,
    variantLabel: template.variantLabel,
    itemColor: template.itemColor,
    photos: template.photos ?? [],
    stats: {
      available: template.availableQuantity,
      listed: template.listedQuantity,
      reserved: template.reservedQuantity,
      sold: template.soldQuantity,
    },
    optionalAttributes: template.optionalAttributes,
    recommendedPrice: toNumber(template.recommendedPrice),
    recommendedPriceCurrency: template.recommendedPriceCurrency,
    listings: template.listings.map((listing) => ({
      id: listing.id,
      status: listing.status,
      platform: listing.platform,
      quantity: listing.quantity,
      fulfilledQuantity: listing.fulfilledQuantity,
      updatedAt: listing.updatedAt,
    })),
  }))
}

async function fetchOverviewData(filters: {
  platformId?: string | null
  status?: string | null
  sourceType?: string | null
}) {
  const listingWhere: Prisma.ItemListingWhereInput = {
    ...(filters.platformId ? { platformId: filters.platformId } : {}),
    ...(filters.sourceType && filters.sourceType !== 'ALL'
      ? { sourceType: filters.sourceType as Prisma.ListingSourceType }
      : {}),
  }
  if (filters.status) {
    listingWhere.status = filters.status
  } else {
    listingWhere.status = { notIn: Array.from(RELEASE_STATUSES) }
  }

  const now = new Date()
  const trendStartDate = subDays(now, TREND_LOOKBACK_DAYS)
  const staleThreshold = subDays(now, STALE_THRESHOLD_DAYS)

  const activityWhere: Prisma.ListingActivityWhereInput = {
    createdAt: { gte: trendStartDate },
    ...(filters.platformId ? { platformId: filters.platformId } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.sourceType && filters.sourceType !== 'ALL'
      ? { sourceType: filters.sourceType as Prisma.ListingSourceType }
      : {}),
  }

  const readyItemsWhere: Prisma.ItemWhereInput = {
    status: 'IN_STOCK',
    deleted: false,
    listings: {
      none: {
        status: {
          notIn: Array.from(RELEASE_STATUSES),
        },
      },
    },
  }

  const staleListingsWhere: Prisma.ItemListingWhereInput = {
    status: {
      notIn: Array.from(RELEASE_STATUSES),
    },
    OR: [
      { listedAt: { lt: staleThreshold } },
      { AND: [{ listedAt: null }, { createdAt: { lt: staleThreshold } }] },
    ],
    ...(filters.platformId ? { platformId: filters.platformId } : {}),
    ...(filters.sourceType && filters.sourceType !== 'ALL'
      ? { sourceType: filters.sourceType as Prisma.ListingSourceType }
      : {}),
  }

  const [templateSummary, platformGroup, sourceGroup, activities, listingDurationSamples, sellDurationSamples, staleListings, staleTotal, readyItems, readyTotal] =
    await Promise.all([
    prisma.subSkuTemplate.aggregate({
      _sum: {
        availableQuantity: true,
        listedQuantity: true,
        reservedQuantity: true,
        soldQuantity: true,
      },
      _count: { id: true },
    }),
    prisma.itemListing.groupBy({
      by: ['platformId'],
      _count: { _all: true },
      where: listingWhere,
    }),
    prisma.itemListing.groupBy({
      by: ['sourceType'],
      _count: { _all: true },
      where: listingWhere,
    }),
    prisma.listingActivity.findMany({
      where: {
        ...activityWhere,
        action: { in: ['CREATE', 'DELETE'] },
      },
      select: { createdAt: true, action: true },
    }),
    prisma.itemListing.findMany({
      where: {
        listedAt: { not: null },
      },
      select: {
        createdAt: true,
        listedAt: true,
        item: {
          select: { createdAt: true },
        },
      },
      orderBy: { listedAt: 'desc' },
      take: SAMPLE_LIMIT,
    }),
    prisma.transaction.findMany({
      where: {
        soldDate: { not: null },
      },
      select: {
        id: true,
        soldDate: true,
        createdAt: true,
        item: {
          select: {
            itemId: true,
            listings: {
              select: { createdAt: true },
              orderBy: { createdAt: 'asc' },
              take: 1,
            },
            createdAt: true,
          },
        },
      },
      orderBy: { soldDate: 'desc' },
      take: SAMPLE_LIMIT,
    }),
    prisma.itemListing.findMany({
      where: staleListingsWhere,
      include: {
        item: {
          select: {
            itemId: true,
            itemName: true,
            sku: { select: { id: true, name: true } },
            purchaseCostCNY: true,
            createdAt: true,
          },
        },
        platform: { select: { id: true, name: true } },
      },
      orderBy: [
        { listedAt: 'asc' },
        { createdAt: 'asc' },
      ],
      take: HIGHLIGHT_LIMIT,
    }),
    prisma.itemListing.count({ where: staleListingsWhere }),
    prisma.item.findMany({
      where: readyItemsWhere,
      include: {
        sku: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: HIGHLIGHT_LIMIT,
    }),
    prisma.item.count({ where: readyItemsWhere }),
  ])

  const platforms = await prisma.platform.findMany({
    select: { id: true, name: true },
  })

  const platformStats = platformGroup
    .map((group) => {
      const platform = platforms.find((p) => p.id === group.platformId)
      return {
        platformId: group.platformId,
        platformName: platform?.name || '未知平台',
        count: group._count._all,
      }
    })
    .sort((a, b) => b.count - a.count)

  const sourceStats = sourceGroup.map((group) => ({
    sourceType: group.sourceType,
    count: group._count._all,
  }))

  const trendMap: Record<string, { created: number; closed: number }> = {}
  for (let i = TREND_LOOKBACK_DAYS; i >= 0; i--) {
    const date = formatISO(subDays(now, i), { representation: 'date' })
    trendMap[date] = { created: 0, closed: 0 }
  }
  activities.forEach((activity) => {
    const date = formatISO(activity.createdAt, { representation: 'date' })
    if (!trendMap[date]) trendMap[date] = { created: 0, closed: 0 }
    if (activity.action === 'CREATE') trendMap[date].created += 1
    if (activity.action === 'DELETE') trendMap[date].closed += 1
  })

  const listingDurations = listingDurationSamples
    .map((sample) => {
      const listedAt = sample.listedAt ?? sample.createdAt
      const itemCreatedAt = sample.item?.createdAt
      if (!listedAt || !itemCreatedAt) return null
      return listedAt.getTime() - itemCreatedAt.getTime()
    })
    .filter((duration): duration is number => typeof duration === 'number' && duration >= 0)

  const sellDurations = sellDurationSamples
    .map((sample) => {
      const soldAt = sample.soldDate ?? sample.createdAt
      const firstListingAt = sample.item?.listings?.[0]?.createdAt ?? sample.item?.createdAt
      if (!soldAt || !firstListingAt) return null
      return soldAt.getTime() - firstListingAt.getTime()
    })
    .filter((duration): duration is number => typeof duration === 'number' && duration >= 0)

  const avgListingHours =
    listingDurations.length > 0
      ? Number((listingDurations.reduce((sum, d) => sum + d, 0) / listingDurations.length / (1000 * 60 * 60)).toFixed(1))
      : null

  const avgSellThroughHours =
    sellDurations.length > 0
      ? Number((sellDurations.reduce((sum, d) => sum + d, 0) / sellDurations.length / (1000 * 60 * 60)).toFixed(1))
      : null

  return {
    summary: {
      templateCount: templateSummary._count.id,
      templateAvailable: templateSummary._sum.availableQuantity ?? 0,
      templateListed: templateSummary._sum.listedQuantity ?? 0,
      templateReserved: templateSummary._sum.reservedQuantity ?? 0,
      templateSold: templateSummary._sum.soldQuantity ?? 0,
      activeListings: platformStats.reduce((sum, item) => sum + item.count, 0),
      avgListingHours,
      avgSellThroughHours,
    },
    platformStats,
    sourceStats,
    trend: Object.entries(trendMap).map(([date, value]) => ({
      date,
      ...value,
    })),
    staleListings: staleListings.map((listing) => ({
      id: listing.id,
      itemId: listing.item?.itemId,
      itemName: listing.item?.itemName || '未知商品',
      skuId: listing.item?.sku?.id,
      skuName: listing.item?.sku?.name,
      platformId: listing.platform?.id,
      platformName: listing.platform?.name || '未知平台',
      listedAt: listing.listedAt ?? listing.createdAt,
      daysListed: Math.round(
        (now.getTime() - (listing.listedAt ?? listing.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      ),
      purchaseCostCNY: listing.item?.purchaseCostCNY ?? null,
    })),
    staleListingsTotal: staleTotal,
    readyToList: readyItems.map((item) => ({
      itemId: item.itemId,
      itemName: item.itemName,
      skuId: item.sku?.id,
      skuName: item.sku?.name,
      purchaseCostCNY: item.purchaseCostCNY,
      createdAt: item.createdAt,
      daysInStock: Math.round((now.getTime() - item.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
    })),
    readyToListTotal: readyTotal,
  }
}

async function fetchHistoryData({
  page,
  pageSize,
  platformId,
  status,
  action,
  sourceType,
}: {
  page: number
  pageSize: number
  platformId?: string | null
  status?: string | null
  action?: string | null
  sourceType?: string | null
}) {
  const where: Prisma.ListingActivityWhereInput = {
    ...(platformId ? { platformId } : {}),
    ...(status ? { status } : {}),
    ...(action
      ? { action }
      : {
          action: {
            in: ['CREATE', 'UPDATE', 'DELETE'],
          },
        }),
    ...(sourceType ? { sourceType: sourceType as Prisma.ListingSourceType } : {}),
  }

  const [total, activities] = await prisma.$transaction([
    prisma.listingActivity.count({ where }),
    prisma.listingActivity.findMany({
      where,
      include: {
        listing: {
          include: {
            platform: true,
            item: {
              include: { sku: true },
            },
            template: {
              include: { sku: true },
            },
          },
        },
        platform: true,
        operator: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  return {
    items: activities.map((activity) => ({
      id: activity.id,
      action: activity.action,
      timestamp: activity.createdAt,
      operator: activity.operator,
      status: activity.status,
      quantity: activity.quantity,
      platform: activity.platform,
      sourceType: activity.sourceType,
      listing: activity.listing,
      templateId: activity.templateId,
      itemId: activity.itemId,
      payload: activity.payload,
    })),
    page,
    pageSize,
    total,
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = getAuthFromRequest(req)
    if (!user || !hasPermission(user, 'USER')) return forbidden()
    const { searchParams } = new URL(req.url)
    const mode = searchParams.get('mode') || 'item'

    if (mode === 'overview') {
      const platformId = searchParams.get('platformId')
      const status = searchParams.get('status')
      const sourceType = searchParams.get('sourceType')
      const data = await fetchOverviewData({ platformId, status, sourceType })
      return ok(data)
    }

    if (mode === 'history') {
      const page = Math.max(1, Number(searchParams.get('page') || '1'))
      const pageSize = Math.min(100, Number(searchParams.get('pageSize') || DEFAULT_PAGE_SIZE))
      const platformId = searchParams.get('platformId')
      const status = searchParams.get('status')
      const action = searchParams.get('action')
      const sourceType = searchParams.get('sourceType')
      const data = await fetchHistoryData({ page, pageSize, platformId, status, action, sourceType })
      return ok(data)
    }

    if (mode === 'template') {
      const skuId = searchParams.get('skuId')
      const platformId = searchParams.get('platformId')
      const status = searchParams.get('status')
      const search = searchParams.get('q')
      const result = await fetchTemplateSummaries({ skuId, platformId, status, search })
      return ok({ items: result })
    }

    const platformId = searchParams.get('platformId')
    const status = searchParams.get('status')
    const sourceType = searchParams.get('sourceType')
    const search = searchParams.get('q')
    const skuId = searchParams.get('skuId')
    const page = Math.max(1, Number(searchParams.get('page') || '1'))
    const pageSize = Math.min(100, Number(searchParams.get('pageSize') || 50))

    const where: Prisma.ItemListingWhereInput = {
      ...(platformId ? { platformId } : {}),
      ...(status ? { status } : { status: { notIn: Array.from(RELEASE_STATUSES) } }), // 如果没有指定status，排除已结束的状态
      ...(sourceType ? { sourceType: sourceType as Prisma.ListingSourceType } : {}),
      ...(search
        ? {
            OR: [
              { item: { itemName: { contains: search, mode: 'insensitive' } } },
              { template: { itemName: { contains: search, mode: 'insensitive' } } },
              { platform: { name: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    }
    if (skuId) {
      where.AND = [
        ...(where.AND ?? []),
        {
          OR: [{ item: { skuId } }, { template: { skuId } }],
        },
      ]
    }

    const listings = await prisma.itemListing.findMany({
      where,
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
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    const normalized = listings.map((listing) => ({
      ...listing,
      listingPrice: toNumber(listing.listingPrice),
    }))

    return ok({ items: normalized, page, pageSize })
  } catch (e) {
    console.error('LISTINGS_LIST_FAILED', e)
    return serverError('LISTINGS_LIST_FAILED')
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getAuthFromRequest(req)
    if (!user || !hasPermission(user, 'USER')) return forbidden()
    const body = await req.json()
    if (!body?.platformId) return badRequest('MISSING_FIELDS')

    const sourceType = body?.sourceType === 'TEMPLATE' ? 'TEMPLATE' : 'ITEM'

    if (sourceType === 'ITEM') {
      if (!body?.itemId) return badRequest('MISSING_ITEM_ID')
      const item = await prisma.item.findUnique({
        where: { itemId: body.itemId },
        select: { templateId: true },
      })
      if (!item) return notFound('ITEM_NOT_FOUND')

      const existingListing = await prisma.itemListing.findUnique({
        where: {
          itemId_platformId: {
            itemId: body.itemId,
            platformId: body.platformId,
          },
        },
      })

      const data = {
        sourceType: 'ITEM' as const,
        itemId: body.itemId,
        templateId: item.templateId,
        platformId: body.platformId,
        externalId: body.externalId || null,
        status: body.status || 'DRAFT',
        listingPrice:
          body.listingPrice !== undefined && body.listingPrice !== null ? Number(body.listingPrice) : null,
        listingCurrency: body.listingCurrency || 'JPY',
        quantity: 1,
        fulfilledQuantity: 0,
        listingUrl: body.listingUrl || null,
        warehouseId: body.warehouseId || null,
        note: body.note || null,
        listedAt: body.listedAt ? new Date(body.listedAt) : null,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        metadata: body.metadata || undefined,
      }

      const listing = await prisma.itemListing.upsert({
        where: {
          itemId_platformId: {
            itemId: body.itemId,
            platformId: body.platformId,
          },
        },
        create: data,
        update: data,
        include: {
          item: {
            include: {
              sku: true,
              template: true,
            },
          },
          platform: true,
        },
      })

      await logListingActivity({
        listingId: listing.id,
        sourceType: 'ITEM',
        templateId: listing.templateId,
        itemId: listing.itemId,
        platformId: listing.platformId,
        action: existingListing ? 'UPDATE' : 'CREATE',
        status: listing.status,
        quantity: listing.quantity,
        operatorId: user.id ?? null,
        payload: buildListingMeta(listing),
      })

      return ok(listing, 201)
    }

    if (!body?.templateId) return badRequest('MISSING_TEMPLATE_ID')
    const template = await prisma.subSkuTemplate.findUnique({
      where: { id: body.templateId },
      include: {
        sku: true,
      },
    })
    if (!template) return notFound('TEMPLATE_NOT_FOUND')

    const requestedItemIds: string[] = Array.isArray(body.itemIds)
      ? body.itemIds.filter((id: any): id is string => typeof id === 'string' && id.trim().length > 0)
      : []
    const requestedQuantity = requestedItemIds.length > 0 ? requestedItemIds.length : Math.max(1, Number(body.quantity ?? 1))

    const listingPrice =
      body.listingPrice !== undefined && body.listingPrice !== null ? Number(body.listingPrice) : null
    const listingCurrency = body.listingCurrency || template.recommendedPriceCurrency || 'JPY'
    const status = body.status || 'DRAFT'

    // 查找可用的Item（排除已被其他平台占用的）
    const candidateItems = await prisma.item.findMany({
      where: {
        templateId: template.id,
        status: 'IN_STOCK',
        deleted: false,
        ...(requestedItemIds.length > 0 ? { itemId: { in: requestedItemIds } } : {}),
        // 排除已被其他活跃上架占用的Item
        listings: {
          none: {
            status: {
              notIn: Array.from(RELEASE_STATUSES), // 排除已结束状态的上架
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      ...(requestedItemIds.length === 0 ? { take: requestedQuantity } : {}),
      include: {
        sku: true,
        template: true,
      },
    })

    if (requestedItemIds.length > 0) {
      if (candidateItems.length !== requestedQuantity) {
        return badRequest('TEMPLATE_ITEMS_NOT_AVAILABLE')
      }
    } else if (candidateItems.length < requestedQuantity) {
      return badRequest('TEMPLATE_STOCK_NOT_ENOUGH')
    }

    const selectedItems =
      requestedItemIds.length > 0
        ? requestedItemIds.map((id) => {
            const match = candidateItems.find((item) => item.itemId === id)
            if (!match) {
              throw new Error(`TEMPLATE_ITEM_NOT_FOUND:${id}`)
            }
            return match
          })
        : candidateItems.slice(0, requestedQuantity)

    const createdListings = await prisma.$transaction(async (tx) => {
      const listings = []
      for (const item of selectedItems) {
        const listing = await tx.itemListing.upsert({
          where: {
            itemId_platformId: {
              itemId: item.itemId,
              platformId: body.platformId,
            },
          },
          create: {
            sourceType: 'ITEM', // 绑定真实Item，sourceType为ITEM，但保留templateId追溯来源
            itemId: item.itemId,
            templateId: template.id,
            platformId: body.platformId,
            quantity: 1,
            fulfilledQuantity: 0,
            externalId: body.externalId || null,
            status,
            listingPrice,
            listingCurrency,
            listingUrl: body.listingUrl || null,
            warehouseId: body.warehouseId || null,
            note: body.note || null,
            listedAt: body.listedAt ? new Date(body.listedAt) : null,
            expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
            metadata: body.metadata || undefined,
          },
          update: {
            status,
            listingPrice,
            listingCurrency,
            templateId: template.id, // 更新时也保持templateId
            externalId: body.externalId ?? undefined,
            listingUrl: body.listingUrl ?? undefined,
            warehouseId: body.warehouseId ?? undefined,
            note: body.note ?? undefined,
            listedAt: body.listedAt ? new Date(body.listedAt) : undefined,
            expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
            metadata: body.metadata ?? undefined,
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
        listings.push(listing)
      }

      await adjustTemplateStockCounts(
        template.id,
        {
          available: -selectedItems.length,
          listed: selectedItems.length,
        },
        tx
      )

      return listings
    })

      await Promise.all(
      createdListings.map((listing) =>
        logListingActivity({
          listingId: listing.id,
          sourceType: 'ITEM', // 绑定真实Item，activity记录也使用ITEM
          templateId: listing.templateId,
          itemId: listing.itemId,
          platformId: listing.platformId,
          action: 'CREATE',
          status: listing.status,
          quantity: listing.quantity,
          operatorId: user.id ?? null,
          payload: buildListingMeta(listing),
        })
      )
    )

    return ok({ items: createdListings }, 201)
  } catch (e) {
    console.error('LISTING_CREATE_FAILED', e)
    const errorMessage = e instanceof Error ? e.message : String(e)
    const errorStack = e instanceof Error ? e.stack : undefined
    console.error('Error details:', { errorMessage, errorStack, body: req.body })
    return serverError(errorMessage || 'LISTING_CREATE_FAILED')
  }
}

