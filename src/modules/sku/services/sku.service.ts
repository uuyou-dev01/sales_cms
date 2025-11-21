/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

type ItemWithRelations = Prisma.ItemGetPayload<{
  include: {
    transactionDetails: {
      include: {
        transaction: {
          select: {
            soldDate: true
          }
        }
      }
    }
    stockAdjustments: true
  }
}>

export interface SubSkuTemplate {
  id: string
  itemName: string
  itemSize?: string | null
  itemCondition?: string | null
  variantLabel?: string | null // 变体标签（替代 toyCharacterName）
  toyCharacterName?: string | null // 向后兼容
  itemColor?: string | null
  photos: string[]
  recommendedPrice?: number | null
  recommendedPriceCurrency?: string | null
  optionalAttributes?: any
  itemRemarks?: string | null
  isActive?: boolean
  availableQuantity?: number
  listedQuantity?: number
  reservedQuantity?: number
  soldQuantity?: number
  stats: {
    total: number
    inStock: number
    sold: number
    inTransit: number
  }
  representativeItemId?: string
  transactionDetails?: ItemWithRelations['transactionDetails']
}

export interface ListSkuParams {
  page?: number
  pageSize?: number
  categoryId?: string
  brand?: string
  status?: 'draft' | 'live' | 'soldout'
  search?: string
}

export interface InventorySnapshot {
  totalItems: number
  inStockCount: number
  soldCount: number
  inTransitCount: number
  reservedCount: number
  damagedCount: number
}

const skuInclude = {
  category: true,
  items: {
    include: {
      transactionDetails: {
        include: {
          transaction: {
            select: {
              soldDate: true,
            },
          },
        },
      },
      stockAdjustments: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  },
  purchaseDetails: true,
} satisfies Prisma.SKUInclude

function getCurrentStockForItem(item: ItemWithRelations) {
  const latestAdjustment = item.stockAdjustments?.[0]
  if (typeof latestAdjustment?.newStock === 'number') {
    return Math.max(0, latestAdjustment.newStock)
  }
  return item.status === 'IN_STOCK' ? 1 : 0
}

export function buildSubSkuTemplates(items: ItemWithRelations[]): SubSkuTemplate[] {
  const map = new Map<string, SubSkuTemplate & { items: ItemWithRelations[] }>()

  items.forEach((item) => {
    const groupingKey = [
      item.skuId || '',
      item.itemName || '',
      item.itemSize || '',
      item.itemCondition || '',
      item.toyCharacterName || '',
      item.itemColor || '',
    ].join('|')

    if (!map.has(groupingKey)) {
      map.set(groupingKey, {
        id: groupingKey || item.itemId,
        itemName: item.itemName,
        itemSize: item.itemSize,
        itemCondition: item.itemCondition,
        toyCharacterName: item.toyCharacterName,
        itemColor: item.itemColor,
        photos: item.photos || [],
        stats: {
          total: 0,
          inStock: 0,
          sold: 0,
          inTransit: 0,
        },
        representativeItemId: item.itemId,
        transactionDetails: item.transactionDetails,
        items: [],
      })
    }

    const group = map.get(groupingKey)!

    if ((!group.photos || group.photos.length === 0) && item.photos?.length) {
      group.photos = item.photos
    }
    if ((!group.transactionDetails || group.transactionDetails.length === 0) && item.transactionDetails?.length) {
      group.transactionDetails = item.transactionDetails
    }

    group.items.push(item)
    group.stats.total += 1
    group.stats.inStock += getCurrentStockForItem(item)
    if (item.status === 'SOLD') {
      group.stats.sold += 1
    }
    if (item.status === 'IN_TRANSIT') {
      group.stats.inTransit += 1
    }
  })

  return Array.from(map.values()).map((group) => {
    const { items: unusedItems, ...rest } = group
    void unusedItems
    return rest
  })
}

// 统一命名：listSkus 作为主要函数
export async function listSkus(params: ListSkuParams = {}) {
  return getAllSkus(params)
}

export type SkuListItem = Prisma.SKUGetPayload<{ include: typeof skuInclude }> & {
  subSkuTemplates?: SubSkuTemplate[]
  inventorySnapshot?: InventorySnapshot
}

export async function getAllSkus(params: ListSkuParams = {}) {
  const { page = 1, pageSize = 20, categoryId, brand, status, search } = params

  const where: Prisma.SKUWhereInput = {
    ...(categoryId ? { categoryId } : {}),
    ...(brand ? { brand: { contains: brand } } : {}),
    ...(search ? { 
      OR: [
        { name: { contains: search } },
        { skuNumber: { contains: search } }, // 支持按货号搜索
      ]
    } : {}),
    ...(status === 'draft' ? { isActive: false } : {}),
    ...(status === 'live' ? { isActive: true } : {}),
    ...(status === 'soldout' ? { items: { none: {} } } : {}),
  }

  const [total, data] = await prisma.$transaction([
    prisma.sKU.count({ where }),
    prisma.sKU.findMany({
      where,
      include: skuInclude,
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  const enrichedData: SkuListItem[] = data.map((sku) => {
    const items = (sku.items as ItemWithRelations[]) || []
    const subSkuTemplates = buildSubSkuTemplates(items)
    const inventoryStats = calculateInventoryStats(items)

    const inTransitCount = items.filter((item) => item.status === 'IN_TRANSIT').length
    const reservedCount = items.filter((item) => item.status === 'RESERVED').length
    const damagedCount = items.filter((item) => item.status === 'DAMAGED').length

    const inventorySnapshot: InventorySnapshot = {
      totalItems: inventoryStats.totalItems,
      inStockCount: inventoryStats.inStockCount,
      soldCount: inventoryStats.soldCount,
      inTransitCount,
      reservedCount,
      damagedCount,
    }

    return {
      ...sku,
      subSkuTemplates: subSkuTemplates.slice(0, 6),
      inventorySnapshot,
    }
  })

  return { total, data: enrichedData }
}

export async function getSkuById(id: string) {
  return prisma.sKU.findUnique({ where: { id }, include: skuInclude })
}

export async function createSku(data: Prisma.SKUCreateInput) {
  return prisma.sKU.create({ data, include: skuInclude })
}

export async function updateSku(id: string, data: Prisma.SKUUpdateInput) {
  return prisma.sKU.update({ where: { id }, data, include: skuInclude })
}

export async function deleteSku(id: string) {
  return prisma.sKU.update({ where: { id }, data: { isActive: false } })
}

// 获取 SKU 详情（包含统计信息）
export async function getSkuDetailWithStats(id: string) {
  const sku = await prisma.sKU.findUnique({
    where: { id },
    include: {
      category: true,
      items: {
        include: {
          transactionDetails: {
            include: {
              transaction: true,
            },
          },
          purchaseDetail: {
            include: {
              purchaseOrder: true,
            },
          },
          stockAdjustments: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      },
      purchaseDetails: {
        include: {
          purchaseOrder: true,
        },
      },
    },
  })
  
  if (!sku) return null
  
  // 计算统计信息
  const items = (sku.items as ItemWithRelations[]) || []
  const allTransactionDetails = items.flatMap(item => item.transactionDetails || [])
  
  // 从 SubSkuTemplate 表读取模板（新方式）
  const subSkuTemplates = await listSubSkuTemplatesBySkuId(id)
  
  // 销售统计
  const salesStats = calculateSalesStats(allTransactionDetails)
  
  // 库存统计（只统计真实 Item，不包括模板）
  const inventoryStats = calculateInventoryStats(items)
  
  // 采购统计
  const purchaseStats = calculatePurchaseStats(sku.purchaseDetails || [])
  
  return {
    ...sku,
    stats: {
      sales: salesStats,
      inventory: inventoryStats,
      purchase: purchaseStats,
    },
    subSkuTemplates,
  }
}

// 从 SubSkuTemplate 表读取模板并计算统计信息
export async function listSubSkuTemplatesBySkuId(skuId: string): Promise<SubSkuTemplate[]> {
  try {
    // 获取所有模板
    const templates = await prisma.subSkuTemplate.findMany({
      where: { 
        skuId,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    if (templates.length === 0) {
      // 没有显式模板，回退到老的聚合方式（基于 Item 分组）
      return fallbackTemplatesFromItems(skuId)
    }

    // 获取所有基于这些模板创建的 Item（用于统计）
    const templateIds = templates.map(t => t.id)
    let items: ItemWithRelations[] = []
    if (templateIds.length > 0) {
      const rawItems = await prisma.item.findMany({
        where: { 
          templateId: { in: templateIds },
        },
        include: {
          transactionDetails: {
            include: {
              transaction: {
                select: {
                  soldDate: true,
                },
              },
            },
          },
          stockAdjustments: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      })
      items = rawItems as ItemWithRelations[]
    }

    // 按 templateId 分组 Item
    const itemsByTemplate = new Map<string, ItemWithRelations[]>()
    items.forEach(item => {
      if (item.templateId) {
        const existing = itemsByTemplate.get(item.templateId) || []
        existing.push(item as ItemWithRelations)
        itemsByTemplate.set(item.templateId, existing)
      }
    })

    // 构建返回的模板列表，包含统计信息
    return templates.map(template => {
      const templateItems = itemsByTemplate.get(template.id) || []
      
      // 计算统计
      const stats = {
        total: templateItems.length,
        inStock: templateItems.filter(item => item.status === 'IN_STOCK').length,
        sold: templateItems.filter(item => item.status === 'SOLD').length,
        inTransit: templateItems.filter(item => item.status === 'IN_TRANSIT').length,
      }

      // 获取代表性 Item（用于显示图片等）
      const representativeItem = templateItems.find(item => item.photos && item.photos.length > 0) 
        || templateItems[0]

      return {
        id: template.id,
        itemName: template.itemName,
        itemSize: template.itemSize,
        itemCondition: template.itemCondition,
        variantLabel: template.variantLabel,
        toyCharacterName: template.variantLabel, // 向后兼容
        itemColor: template.itemColor,
        photos: template.photos.length > 0 ? template.photos : (representativeItem?.photos || []),
        recommendedPrice: template.recommendedPrice ? Number(template.recommendedPrice) : null,
        recommendedPriceCurrency: template.recommendedPriceCurrency || null,
        optionalAttributes: template.optionalAttributes,
        itemRemarks: template.itemRemarks,
        isActive: template.isActive,
        availableQuantity: template.availableQuantity,
        listedQuantity: template.listedQuantity,
        reservedQuantity: template.reservedQuantity,
        soldQuantity: template.soldQuantity,
        stats,
        representativeItemId: representativeItem?.itemId,
        transactionDetails: representativeItem?.transactionDetails || [],
      }
    })
  } catch (error: any) {
    console.warn('[SubSkuTemplate] failed to load templates, fallback to item aggregation', {
      skuId,
      error: error?.code || error?.message || error,
    })
    return fallbackTemplatesFromItems(skuId)
  }
}

async function fallbackTemplatesFromItems(skuId: string): Promise<SubSkuTemplate[]> {
  const fallbackItems = await prisma.item.findMany({
    where: { skuId },
    include: {
      transactionDetails: {
        include: {
          transaction: {
            select: { soldDate: true },
          },
        },
      },
      stockAdjustments: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  })
  return buildSubSkuTemplates(fallbackItems as ItemWithRelations[])
}

// 计算销售统计
function calculateSalesStats(details: any[]) {
  const soldDetails = details.filter(d => d.transaction?.soldDate)
  
  let totalRevenue = 0
  let totalCost = 0
  let totalQuantity = 0
  
  soldDetails.forEach(detail => {
    const tx = detail.transaction
    if (!tx) return
    
    const unitPrice = detail.unitPrice ? Number(detail.unitPrice) : 0
    const quantity = detail.quantity || 1
    const soldPrice = tx.soldPrice ? Number(tx.soldPrice) : unitPrice
    const exchangeRate = tx.soldPriceExchangeRate ? Number(tx.soldPriceExchangeRate) : 1
    const purchasePrice = tx.purchasePrice ? Number(tx.purchasePrice) : 0
    
    totalRevenue += soldPrice * quantity * exchangeRate
    totalCost += purchasePrice * quantity
    totalQuantity += quantity
  })
  
  const totalProfit = totalRevenue - totalCost
  const profitRate = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0
  
  return {
    totalRevenue,
    totalCost,
    totalProfit,
    profitRate,
    totalQuantity,
    salesCount: soldDetails.length,
  }
}

// 计算库存统计
function calculateInventoryStats(items: ItemWithRelations[]) {
  const totalItems = items.length
  const inStockCount = items.reduce((sum, item) => {
    return sum + (getCurrentStockForItem(item) > 0 ? 1 : 0)
  }, 0)
  const soldCount = items.filter(item => item.status === 'SOLD').length
  
  return {
    totalItems,
    inStockCount,
    soldCount,
  }
}

// 计算采购统计
function calculatePurchaseStats(details: any[]) {
  const pendingOrders = details.filter(d => {
    const order = d.purchaseOrder
    if (!order) return false
    // 根据采购单状态判断
    return true // 简化处理，实际应从订单状态判断
  })
  
  let totalQuantity = 0
  let totalAmount = 0
  
  details.forEach(detail => {
    totalQuantity += detail.quantity || 0
    const unitPrice = detail.unitPrice ? Number(detail.unitPrice) : 0
    totalAmount += unitPrice * (detail.quantity || 0)
  })
  
  return {
    totalQuantity,
    totalAmount,
    pendingOrdersCount: pendingOrders.length,
  }
}

// 获取 Top SKU 统计（按销量或销售额）
export async function getTopSkuStats(period: '7d' | '30d', limit: number = 10) {
  const days = period === '7d' ? 7 : 30
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  
  // 查询销售明细
  const transactionDetails = await prisma.transactionDetail.findMany({
    where: {
      transaction: {
        soldDate: {
          gte: startDate,
        },
      },
    },
    include: {
      item: {
        include: {
          sku: true,
        },
      },
      transaction: true,
    },
  })
  
  // 按 SKU 分组统计
  const skuStatsMap = new Map<string, {
    skuId: string
    skuName: string
    totalRevenue: number
    totalQuantity: number
    totalProfit: number
  }>()
  
  transactionDetails.forEach((detail: any) => {
    const sku = detail.item?.sku
    if (!sku) return
    
    const skuId = sku.id
    const unitPrice = detail.unitPrice ? Number(detail.unitPrice) : 0
    const quantity = detail.quantity || 1
    const tx = detail.transaction
    const soldPrice = tx?.soldPrice ? Number(tx.soldPrice) : unitPrice
    const exchangeRate = tx?.soldPriceExchangeRate ? Number(tx.soldPriceExchangeRate) : 1
    const purchasePrice = tx?.purchasePrice ? Number(tx.purchasePrice) : 0
    
    const revenue = soldPrice * quantity * exchangeRate
    const cost = purchasePrice * quantity
    const profit = revenue - cost
    
    if (!skuStatsMap.has(skuId)) {
      skuStatsMap.set(skuId, {
        skuId,
        skuName: sku.name,
        totalRevenue: 0,
        totalQuantity: 0,
        totalProfit: 0,
      })
    }
    
    const stats = skuStatsMap.get(skuId)!
    stats.totalRevenue += revenue
    stats.totalQuantity += quantity
    stats.totalProfit += profit
  })
  
  // 排序并返回 Top
  const topSkus = Array.from(skuStatsMap.values())
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, limit)
  
  return topSkus
}

// 获取 SKU 销售趋势（近30天）
export async function getSkuSalesTrend(skuId: string, days: number = 30) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  
  const items = await prisma.item.findMany({
    where: { skuId },
    include: {
      transactionDetails: {
        where: {
          transaction: {
            soldDate: {
              gte: startDate,
            },
          },
        },
        include: {
          transaction: true,
        },
      },
    },
  })
  
  // 按日期分组
  const dailyStats = new Map<string, { date: string; revenue: number; quantity: number }>()
  
  items.forEach((item: any) => {
    item.transactionDetails.forEach((detail: any) => {
      const tx = detail.transaction
      if (!tx?.soldDate) return
      
      const date = new Date(tx.soldDate).toISOString().split('T')[0]
      const unitPrice = detail.unitPrice ? Number(detail.unitPrice) : 0
      const quantity = detail.quantity || 1
      const soldPrice = tx.soldPrice ? Number(tx.soldPrice) : unitPrice
      const exchangeRate = tx.soldPriceExchangeRate ? Number(tx.soldPriceExchangeRate) : 1
      const revenue = soldPrice * quantity * exchangeRate
      
      if (!dailyStats.has(date)) {
        dailyStats.set(date, { date, revenue: 0, quantity: 0 })
      }
      
      const stats = dailyStats.get(date)!
      stats.revenue += revenue
      stats.quantity += quantity
    })
  })
  
  return Array.from(dailyStats.values()).sort((a, b) => a.date.localeCompare(b.date))
}

// 获取总体统计
export async function getSkuOverallStats() {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [totalSkus, activeSkus, totalItems, recentTransactions7d, recentTransactions30d, purchaseDetails] = await prisma.$transaction([
    prisma.sKU.count(),
    prisma.sKU.count({ where: { isActive: true } }),
    prisma.item.count({ where: { deleted: false } }),
    prisma.transactionDetail.findMany({
      where: {
        transaction: {
          soldDate: {
            gte: sevenDaysAgo,
          },
        },
      },
      include: {
        transaction: true,
        item: {
          include: {
            sku: true,
          },
        },
      },
    }),
    prisma.transactionDetail.findMany({
      where: {
        transaction: {
          soldDate: {
            gte: thirtyDaysAgo,
          },
        },
      },
      include: {
        transaction: true,
        item: {
          include: {
            sku: true,
          },
        },
      },
    }),
    prisma.purchaseDetail.findMany({
      where: {
        purchaseOrder: {
          purchaseDate: {
            gte: sevenDaysAgo,
          },
        },
      },
    }),
  ])

  // 计算近7天销售额
  let totalRevenue7d = 0
  let totalProfit7d = 0

  recentTransactions7d.forEach((detail: any) => {
    const tx = detail.transaction
    if (!tx?.soldDate) return

    const unitPrice = detail.unitPrice ? Number(detail.unitPrice) : 0
    const quantity = detail.quantity || 1
    const soldPrice = tx.soldPrice ? Number(tx.soldPrice) : unitPrice
    const exchangeRate = tx.soldPriceExchangeRate ? Number(tx.soldPriceExchangeRate) : 1
    const purchasePrice = tx.purchasePrice ? Number(tx.purchasePrice) : 0

    const revenue = soldPrice * quantity * exchangeRate
    const cost = purchasePrice * quantity

    totalRevenue7d += revenue
    totalProfit7d += (revenue - cost)
  })

  // 计算近30天销售额
  let totalRevenue30d = 0

  recentTransactions30d.forEach((detail: any) => {
    const tx = detail.transaction
    if (!tx?.soldDate) return

    const unitPrice = detail.unitPrice ? Number(detail.unitPrice) : 0
    const quantity = detail.quantity || 1
    const soldPrice = tx.soldPrice ? Number(tx.soldPrice) : unitPrice
    const exchangeRate = tx.soldPriceExchangeRate ? Number(tx.soldPriceExchangeRate) : 1
    const revenue = soldPrice * quantity * exchangeRate
    totalRevenue30d += revenue
  })

  // 计算在途数量（近7天采购数量）
  const inTransitQuantity = purchaseDetails.reduce((sum: number, detail: any) => sum + (detail.quantity || 0), 0)

  const avgProfitRate = totalRevenue7d > 0 ? (totalProfit7d / totalRevenue7d) * 100 : 0

  return {
    totalSkus,
    activeSkus,
    totalItems, // 总库存数
    totalRevenue7d,
    totalRevenue30d, // 近30天销售额
    avgProfitRate,
    inTransitQuantity, // 在途数量
  }
}

// Item CRUD 函数
export interface ListItemParams {
  skuId: string
  page?: number
  pageSize?: number
  search?: string
}

export async function listItemsBySku(params: ListItemParams) {
  const { skuId, page = 1, pageSize = 20, search } = params

  const where: Prisma.ItemWhereInput = {
    skuId,
    ...(search ? {
      OR: [
        { itemName: { contains: search } },
        { itemNumber: { contains: search } },
      ],
    } : {}),
  }

  const [total, data] = await prisma.$transaction([
    prisma.item.count({ where }),
    prisma.item.findMany({
      where,
      include: {
        sku: true,
        transactionDetails: {
          include: {
            transaction: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  return { total, data }
}

export async function getItemById(itemId: string) {
  return prisma.item.findUnique({
    where: { itemId },
    include: {
      sku: true,
      transactionDetails: {
        include: {
          transaction: true,
        },
      },
      purchaseDetail: {
        include: {
          purchaseOrder: true,
        },
      },
    },
  })
}

export async function createItem(skuId: string, data: Prisma.ItemCreateInput) {
  return prisma.item.create({
    data: {
      ...data,
      sku: { connect: { id: skuId } },
    },
  })
}

export async function updateItem(itemId: string, data: Prisma.ItemUpdateInput) {
  return prisma.item.update({
    where: { itemId },
    data,
  })
}

export async function deleteItem(itemId: string) {
  return prisma.item.update({
    where: { itemId },
    data: { deleted: true },
  })
}

export async function getItemDetailWithStats(itemId: string) {
  const item = await prisma.item.findUnique({
    where: { itemId },
    include: {
      sku: {
        include: {
          category: true,
        },
      },
      transactionDetails: {
        include: {
          transaction: true,
        },
        orderBy: { createdAt: 'desc' },
      },
      purchaseDetail: {
        include: {
          purchaseOrder: true,
          items: true,
        },
      },
      stockAdjustments: {
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!item) return null

  const soldDetails = (item.transactionDetails || []).filter(
    (detail: any) => detail.transaction?.soldDate,
  )
  const totalSoldQuantity = soldDetails.reduce(
    (sum: number, detail: any) => sum + (detail.quantity ?? 1),
    0,
  )

  let totalRevenue = 0
  let totalCost = 0
  let totalProfit = 0

  soldDetails.forEach((detail: any) => {
    const tx = detail.transaction
    if (!tx?.soldDate) return
    const quantity = detail.quantity || 1

    const soldPrice = tx.soldPrice ? Number(tx.soldPrice) : detail.unitPrice ? Number(detail.unitPrice) : 0
    const exchangeRate = tx.soldPriceExchangeRate ? Number(tx.soldPriceExchangeRate) : 1
    const purchasePrice = tx.purchasePrice ? Number(tx.purchasePrice) : 0

    const revenue = soldPrice * quantity * exchangeRate
    const cost = purchasePrice * quantity
    totalRevenue += revenue
    totalCost += cost
    totalProfit += revenue - cost
  })

  const profitRate = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0

  // 根据Item状态判断库存（简化：IN_STOCK=1, SOLD=0）
  const estimatedStock = item.status === 'IN_STOCK' ? 1 : 0
  const adjustments = item.stockAdjustments || []
  const latestAdjustment = adjustments[0]

  const purchaseDetail = item.purchaseDetail
  const inTransit =
    purchaseDetail && typeof purchaseDetail.quantity === 'number'
      ? Math.max(
          0,
          purchaseDetail.quantity - (purchaseDetail.items ? purchaseDetail.items.length : 0),
        )
      : 0

  return {
    item,
    stock: {
      inStock: estimatedStock,
      sold: totalSoldQuantity,
      inTransit,
      lastAdjustment: latestAdjustment,
      adjustments,
    },
    sales: {
      totalRevenue,
      totalCost,
      totalProfit,
      profitRate,
      totalQuantity: totalSoldQuantity,
      recent: soldDetails.slice(0, 5),
    },
    purchase: purchaseDetail
      ? {
          detail: purchaseDetail,
          order: purchaseDetail.purchaseOrder,
        }
      : null,
  }
}
