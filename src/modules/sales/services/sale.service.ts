import { prisma } from '@/lib/prisma'
import { calculateBundledSaleProfit, BundledSaleParams, BundledSaleResult } from '@/lib/profit-calculator'
import Decimal from 'decimal.js'
import { Prisma } from '@prisma/client'

/**
 * 获取可售Item（FIFO排序：按入库时间）
 */
export async function getAvailableItemsForSale(options: {
  skuId?: string
  itemSize?: string
  itemCondition?: string
  itemColor?: string
  toyCharacterName?: string
  platformId?: string
  listingStatus?: string
  requiresListing?: boolean
  limit?: number
  includeNew?: boolean
}) {
  const {
    skuId,
    itemSize,
    itemCondition,
    itemColor,
    toyCharacterName,
    platformId,
    listingStatus,
    requiresListing = false,
    limit,
    includeNew = false,
  } = options

  const where: Prisma.ItemWhereInput = {
    status: 'IN_STOCK',
    deleted: false,
    ...(skuId && { skuId }),
    ...(itemSize && { itemSize }),
    ...(itemCondition && { itemCondition }),
    ...(itemColor && { itemColor }),
    ...(toyCharacterName && { toyCharacterName }),
    ...(platformId && requiresListing
      ? {
          listings: {
            some: {
              platformId,
              ...(listingStatus && { status: listingStatus }),
            },
          },
        }
      : {}),
  }

  if (!includeNew && !itemCondition) {
    where.itemCondition = { not: 'NEW' }
  }

  const items = await prisma.item.findMany({
    where,
    include: {
      sku: {
        include: {
          category: true,
        },
      },
      purchaseDetail: {
        include: {
          purchaseOrder: true,
        },
      },
      transactionDetails: {
        where: {
          transaction: {
            soldDate: { not: null },
          },
        },
        take: 1, // 仅获取最近的销售记录
      },
      listings: {
        include: {
          platform: true,
        },
        ...(platformId
          ? {
              where: {
                platformId,
                ...(listingStatus && { status: listingStatus }),
              },
            }
          : {}),
      },
    },
    orderBy: [
      // FIFO: 按创建时间排序（入库时间）
      { createdAt: 'asc' },
    ],
    ...(limit && { take: limit }),
  })

  // 计算每个Item的采购成本
  return items.map(item => {
    const purchaseDetail = item.purchaseDetail
    const purchaseCost = purchaseDetail?.unitPrice
      ? Number(purchaseDetail.unitPrice)
      : 0

    return {
      ...item,
      purchaseCost,
      status: item.status || 'IN_STOCK',
      listings: item.listings || [],
    }
  })
}


/**
 * 创建打包销售
 */
export async function createBundledSale(params: {
  items: Array<{ itemId: string; quantity?: number; manualPrice?: number }>
  totalSoldPrice: number
  soldPriceCurrency: string
  soldPriceExchangeRate: number
  platformId?: string
  soldPlatform?: string
  soldDate: Date
  domesticShipping?: number
  internationalShipping?: number
  otherFees?: Array<{ amount: number; currency: string; exchangeRate?: number }>
  priceAllocationMethod?: 'BY_COST' | 'BY_QUANTITY' | 'MANUAL'
  createdById: string
  soldById?: string
  domesticTrackingNumber?: string
  internationalTrackingNumber?: string
  orderStatus?: string
  platformFeeRateOverride?: number
}) {
  const {
    items,
    totalSoldPrice,
    soldPriceCurrency,
    soldPriceExchangeRate,
    platformId,
    soldPlatform,
    soldDate,
    domesticShipping = 0,
    internationalShipping = 0,
    otherFees = [],
    priceAllocationMethod = 'BY_COST',
    createdById,
    soldById,
    domesticTrackingNumber,
    internationalTrackingNumber,
    orderStatus = '已完成',
    platformFeeRateOverride,
  } = params

  // 1. 获取所有Item的详细信息（包括采购成本）
  const itemDetails = await prisma.item.findMany({
    where: {
      itemId: { in: items.map(i => i.itemId) },
      status: 'IN_STOCK', // 确保Item可售
    },
    include: {
      purchaseDetail: {
        include: {
          purchaseOrder: true,
        },
      },
      sku: true,
    },
  })

  // 2. 验证所有Item都存在且可售
  if (itemDetails.length !== items.length) {
    throw new Error('部分Item不存在或不可售')
  }

  // 3. 获取平台配置（如果有platformId）
  let platformConfig = undefined
  if (platformId) {
    const platform = await prisma.platform.findUnique({
      where: { id: platformId },
    })
    if (platform) {
      platformConfig = {
        baseFeeRate: platform.baseFeeRate,
        shippingFee: platform.shippingFee ? Number(platform.shippingFee) : null,
        tierRules: platform.tierRules as any,
      }
    }
  }

  if (platformFeeRateOverride !== undefined && platformFeeRateOverride !== null) {
    platformConfig = {
      baseFeeRate: platformFeeRateOverride,
      shippingFee: platformConfig?.shippingFee,
      tierRules: platformConfig?.tierRules,
    }
  }

  // 4. 构建利润计算参数
  const profitParams: BundledSaleParams = {
    items: items.map(item => {
      const itemDetail = itemDetails.find(d => d.itemId === item.itemId)
      const purchaseCost = itemDetail?.purchaseDetail?.unitPrice
        ? Number(itemDetail.purchaseDetail.unitPrice)
        : 0

      return {
        itemId: item.itemId,
        purchaseCost,
        quantity: item.quantity || 1,
        manualPrice: item.manualPrice,
      }
    }),
    totalSoldPrice,
    soldPriceCurrency,
    soldPriceExchangeRate,
    platformConfig,
    shippingCost: domesticShipping + internationalShipping,
    otherFees,
    priceAllocationMethod,
  }

  // 5. 计算利润
  const profitResult = calculateBundledSaleProfit(profitParams)

  // 6. 创建Transaction和TransactionDetail
  return prisma.$transaction(async (tx) => {
    // 计算平均采购价格（用于Transaction表的purchasePrice字段，兼容旧逻辑）
    const avgPurchasePrice = profitResult.totalCost / items.length

    // 创建Transaction记录
    const transaction = await tx.transaction.create({
      data: {
        itemId: items.length === 1 ? items[0].itemId : null, // 单Item时保留itemId，多Item时设为null
        isBundled: items.length > 1,
        totalSoldPrice: new Decimal(totalSoldPrice),
        priceAllocationMethod,
        platformId: platformId || null,
        soldPlatform: soldPlatform || '',
        soldDate,
        soldPrice: String(totalSoldPrice),
        soldPriceCurrency,
        soldPriceExchangeRate: String(soldPriceExchangeRate),
        purchasePrice: String(avgPurchasePrice), // 平均采购价格
        purchasePriceCurrency: 'CNY',
        purchasePriceExchangeRate: '1',
        purchaseDate: itemDetails[0]?.purchaseDetail?.purchaseOrder?.purchaseDate || new Date(),
        purchasePlatform: itemDetails[0]?.purchaseDetail?.purchaseOrder?.orderNumber || '',
        domesticShipping: String(domesticShipping),
        internationalShipping: String(internationalShipping),
        domesticTrackingNumber: domesticTrackingNumber || null,
        internationalTrackingNumber: internationalTrackingNumber || null,
        orderStatus,
        itemGrossProfit: String(profitResult.totalProfit),
        itemNetProfit: String(profitResult.totalProfit),
        createdBy: { connect: { id: createdById } },
        ...(soldById && { soldBy: { connect: { id: soldById } } }),
        // 创建TransactionDetail
        details: {
          create: profitResult.itemDetails.map(detail => ({
            itemId: detail.itemId,
            quantity: detail.quantity,
            unitPrice: new Decimal(detail.allocatedSoldPrice / detail.quantity),
            currency: 'CNY',
          })),
        },
      },
      include: {
        details: {
          include: {
            item: true,
          },
        },
      },
    })

    // 7. 更新所有Item状态为SOLD，并创建库存调整记录
    for (const item of items) {
      const quantity = item.quantity || 1
      
      // 查询Item的当前库存状态
      const currentItem = await tx.item.findUnique({
        where: { itemId: item.itemId },
      })

      if (!currentItem) {
        throw new Error(`Item ${item.itemId} 不存在`)
      }

      if (currentItem.status !== 'IN_STOCK') {
        throw new Error(`Item ${item.itemId} 状态为 ${currentItem.status}，无法销售`)
      }

      // 对于Item级别的库存，每个Item只有1个（如果status=IN_STOCK）
      // 查询Item的库存调整记录以获取当前库存
      const latestAdjustment = await tx.stockAdjustment.findFirst({
        where: { itemId: item.itemId },
        orderBy: { createdAt: 'desc' },
      })

      // 如果Item状态是IN_STOCK，库存为1，否则为0
      const previousStock = currentItem.status === 'IN_STOCK' ? 1 : 0
      const newStock = 0 // 销售后库存为0

      // 更新Item状态为SOLD
      await tx.item.update({
        where: { itemId: item.itemId },
        data: {
          status: 'SOLD',
          soldById: soldById || createdById,
        },
      })

      // 自动下架该Item在所有平台上的活跃上架记录
      const activeListings = await tx.itemListing.findMany({
        where: {
          itemId: item.itemId,
          status: { in: ['LISTED', 'PENDING', 'DRAFT'] },
        },
      })

      for (const listing of activeListings) {
        await tx.itemListing.update({
          where: { id: listing.id },
          data: {
            status: 'ENDED',
            note: `系统自动下架：商品已在 ${soldPlatform || '其他平台'} 售出`,
            updatedAt: new Date(),
          },
        })

        await tx.listingActivity.create({
          data: {
            listingId: listing.id,
            platformId: listing.platformId,
            itemId: listing.itemId,
            templateId: listing.templateId,
            sourceType: listing.sourceType,
            action: 'AUTO_END',
            status: 'ENDED',
            operatorId: createdById,
            payload: { reason: 'ITEM_SOLD', soldPlatform, transactionId: transaction.id },
          },
        })
      }

      // 创建库存调整记录
      await tx.stockAdjustment.create({
        data: {
          itemId: item.itemId,
          adjustmentType: 'SALE',
          quantity: -quantity,
          previousStock,
          newStock,
          reason: '销售出库',
          remarks: `打包销售，交易ID: ${transaction.id}`,
        },
      })
    }

    return {
      transaction,
      profit: profitResult,
    }
  })
}

