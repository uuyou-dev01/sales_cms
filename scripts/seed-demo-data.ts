import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 开始创建演示数据…')

  // 1. 分类
  const sneakerCategory = await prisma.category.upsert({
    where: { name_parentId: { name: '运动鞋', parentId: null } },
    update: {},
    create: {
      name: '运动鞋',
      code: 'SNEAKER',
      level: 1,
      isActive: true,
    },
  })

  const toyCategory = await prisma.category.upsert({
    where: { name_parentId: { name: '潮玩系列', parentId: null } },
    update: {},
    create: {
      name: '潮玩系列',
      code: 'TOY_SERIES',
      level: 1,
      isActive: true,
    },
  })

  // 2. SKU
  const sneakerSku = await prisma.sKU.upsert({
    where: { skuNumber: 'SKU-DEMO-001' },
    update: {
      brand: 'Nike',
      unit: '双',
      isActive: true,
      categoryId: sneakerCategory.id,
    },
    create: {
      name: 'Nike Air Max 97 Bred',
      skuNumber: 'SKU-DEMO-001',
      brand: 'Nike',
      unit: '双',
      attributes: {
        description: '演示用运动鞋 SKU，含多个尺码与销售记录',
      },
      isActive: true,
      category: { connect: { id: sneakerCategory.id } },
    },
  })

  const toySku = await prisma.sKU.upsert({
    where: { skuNumber: 'SKU-DEMO-TOY-001' },
    update: {
      brand: 'POP MART',
      unit: '盒',
      isActive: true,
      categoryId: toyCategory.id,
    },
    create: {
      name: 'POP MART 星空系列',
      skuNumber: 'SKU-DEMO-TOY-001',
      brand: 'POP MART',
      unit: '盒',
      attributes: {
        description: '演示用潮玩 SKU，包含不同角色子 SKU',
      },
      isActive: true,
      category: { connect: { id: toyCategory.id } },
    },
  })

  // 3. Items (子 SKU)
  const sneakerItem = await prisma.item.upsert({
    where: { itemId: 'ITEM-DEMO-SNK-27' },
    update: {},
    create: {
      itemId: 'ITEM-DEMO-SNK-27',
      itemName: 'Air Max 97 - 27cm 新品',
      itemNumber: 'SNK-27-001',
      itemType: '运动鞋',
      itemBrand: 'Nike',
      itemCondition: 'NEW',
      itemSize: '27cm',
      itemRemarks: '演示数据：已售出且产生利润',
      photos: [
        'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop',
      ],
      sku: { connect: { id: sneakerSku.id } },
    },
  })

  const sneakerItemUsed = await prisma.item.upsert({
    where: { itemId: 'ITEM-DEMO-SNK-26' },
    update: {},
    create: {
      itemId: 'ITEM-DEMO-SNK-26',
      itemName: 'Air Max 97 - 26cm 中古A',
      itemNumber: 'SNK-26-001',
      itemType: '运动鞋',
      itemBrand: 'Nike',
      itemCondition: 'USED_A',
      itemSize: '26cm',
      itemRemarks: '演示数据：目前在库，可用于库存调节',
      photos: [
        'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=400&h=400&fit=crop',
      ],
      sku: { connect: { id: sneakerSku.id } },
    },
  })

  const toyItem = await prisma.item.upsert({
    where: { itemId: 'ITEM-DEMO-TOY-MICKEY' },
    update: {},
    create: {
      itemId: 'ITEM-DEMO-TOY-MICKEY',
      itemName: '星空系列 - 米奇',
      itemNumber: 'TOY-STAR-MICKEY',
      itemType: '潮玩',
      itemBrand: 'POP MART',
      itemCondition: 'NEW',
      itemSize: '盲盒',
      toyCharacterName: '米奇',
      itemRemarks: '演示数据：已入库，尚未售出',
      photos: [
        'https://images.unsplash.com/photo-1559648475-9d0de77b73c4?w=400&h=400&fit=crop',
      ],
      sku: { connect: { id: toySku.id } },
    },
  })

  // 4. 初始库存调整记录（设定库存基础值）
  await prisma.stockAdjustment.upsert({
    where: { id: 'ADJ-DEMO-SNK-26-INIT' },
    update: {},
    create: {
      id: 'ADJ-DEMO-SNK-26-INIT',
      itemId: sneakerItemUsed.itemId,
      adjustmentType: 'SET',
      quantity: 1,
      previousStock: 0,
      newStock: 1,
      reason: '初始盘点',
      remarks: '演示数据初始化',
    },
  })

  await prisma.stockAdjustment.upsert({
    where: { id: 'ADJ-DEMO-TOY-MICKEY-INIT' },
    update: {},
    create: {
      id: 'ADJ-DEMO-TOY-MICKEY-INIT',
      itemId: toyItem.itemId,
      adjustmentType: 'SET',
      quantity: 1,
      previousStock: 0,
      newStock: 1,
      reason: '初始盘点',
      remarks: '演示数据初始化',
    },
  })

  // 5. 采购单 + 明细
  const purchaseOrder = await prisma.purchaseOrder.upsert({
    where: { orderNumber: 'PO-DEMO-001' },
    update: {},
    create: {
      orderNumber: 'PO-DEMO-001',
      totalAmount: new Prisma.Decimal(5200),
      currency: 'JPY',
      purchaseDate: new Date('2025-01-05'),
      remarks: '演示采购单：包含运动鞋 SKU',
    },
  })

  const purchaseDetail = await prisma.purchaseDetail.upsert({
    where: { id: 'PO-DETAIL-DEMO-SNK' },
    update: {},
    create: {
      id: 'PO-DETAIL-DEMO-SNK',
      purchaseOrderId: purchaseOrder.id,
      skuId: sneakerSku.id,
      quantity: 2,
      unitPrice: new Prisma.Decimal(2200),
      allocatedCost: new Prisma.Decimal(2200),
      allocationMethod: 'AUTO',
      itemIds: [],
    },
  })

  // 将 Item 关联到采购记录
  await prisma.item.update({
    where: { itemId: sneakerItemUsed.itemId },
    data: {
      purchaseOrderId: purchaseOrder.id,
      purchaseDetailId: purchaseDetail.id,
    },
  })

  // 6. 销售记录（将 27cm 子 SKU 售出）
  const transaction = await prisma.transaction.upsert({
    where: { id: 'TX-DEMO-SNK-27' },
    update: {},
    create: {
      id: 'TX-DEMO-SNK-27',
      itemId: sneakerItem.itemId,
      purchaseDate: new Date('2025-01-08'),
      purchasePlatform: 'Mercari',
      purchasePrice: '2200',
      purchasePriceCurrency: 'JPY',
      purchasePriceExchangeRate: '1',
      soldDate: new Date('2025-01-18'),
      soldPlatform: 'Mercari',
      soldPrice: '3100',
      soldPriceCurrency: 'JPY',
      soldPriceExchangeRate: '1',
      itemGrossProfit: '900',
      itemNetProfit: '800',
      orderStatus: '已完成',
      listingPlatforms: ['Mercari'],
      otherFees: {
        platformFee: '10%',
      },
      createdAt: new Date('2025-01-18T10:00:00Z'),
    },
  })

  await prisma.transactionDetail.upsert({
    where: { id: 'TX-DETAIL-DEMO-SNK-27' },
    update: {},
    create: {
      id: 'TX-DETAIL-DEMO-SNK-27',
      transactionId: transaction.id,
      itemId: sneakerItem.itemId,
      quantity: 1,
      unitPrice: new Prisma.Decimal(3100),
      currency: 'JPY',
    },
  })

  // 7. 额外库存调整示例（手动减少潮玩库存）
  await prisma.stockAdjustment.upsert({
    where: { id: 'ADJ-DEMO-TOY-MICKEY-MINUS' },
    update: {},
    create: {
      id: 'ADJ-DEMO-TOY-MICKEY-MINUS',
      itemId: toyItem.itemId,
      adjustmentType: 'SUBTRACT',
      quantity: -1,
      previousStock: 1,
      newStock: 0,
      reason: '展示：损耗',
      remarks: '演示数据：手动扣减库存',
    },
  })

  console.log('✅ 演示数据创建完成！')
  console.log('  - 创建 SKU:', sneakerSku.name, toySku.name)
  console.log('  - 创建 Item:', sneakerItem.itemId, sneakerItemUsed.itemId, toyItem.itemId)
  console.log('  - 采购单号: PO-DEMO-001')
  console.log('  - 销售单号:', transaction.id)
}

main()
  .catch((error) => {
    console.error('❌ 演示数据创建失败', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })


