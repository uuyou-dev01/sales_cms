import { prisma } from '@/lib/prisma';
import { adjustTemplateStockCounts } from '@/src/modules/listings/services/template-stock.service';
import { clearItemsCache } from '@/lib/cache';

/**
 * 采购单入库后同步库存
 */
export async function syncInventoryFromPurchaseOrder(purchaseOrderId: string) {
  const order = await prisma.purchaseOrder.findUnique({
    where: { id: purchaseOrderId },
    include: {
      exchangeRate: true,
      details: {
        include: {
          sku: {
            include: {
              category: true,
            },
          },
          items: true,
        },
      },
    },
  });

  if (!order) {
    throw new Error('采购单不存在');
  }

  // 检查是否已入库（通过 details.items 判断）
  const hasItems = order.details.some(detail => detail.items.length > 0);
  if (hasItems) {
    throw new Error('该采购单已入库，无需重复同步');
  }

  // 为每个明细创建库存 Item
  return prisma.$transaction(async (tx) => {
    const createdItems = [];
    
    for (let detailIndex = 0; detailIndex < order.details.length; detailIndex++) {
      const detail = order.details[detailIndex];
      const sku = detail.sku;
      if (!sku) continue;

      // 生成批次号（同一采购单的所有Item使用相同的批次号前缀）
      const batchNumberPrefix = `PO-${order.orderNumber}-${String(detailIndex + 1).padStart(3, '0')}`

      // 从采购明细的allocationMethod字段中获取规格信息（如果存在）
      // allocationMethod字段可能包含JSON格式的规格信息
      let itemSize = '均码'
      let itemCondition = 'NEW'
      let itemColor: string | null = null
      let toyCharacterName: string | null = null
      let templateId: string | null = null
      
      try {
        if (detail.allocationMethod && detail.allocationMethod.startsWith('{')) {
          const allocationData = JSON.parse(detail.allocationMethod)
          if (allocationData.specs) {
            templateId = allocationData.specs.templateId || null
            itemSize = allocationData.specs.itemSize || '均码'
            itemCondition = allocationData.specs.itemCondition || 'NEW'
            itemColor = allocationData.specs.itemColor || null
            toyCharacterName = allocationData.specs.toyCharacterName || null
          }
        }
      } catch (error) {
        // 如果解析失败，使用默认值
        console.warn('Failed to parse allocationMethod:', error)
      }

      // 如果指定了templateId，从子SKU模板获取规格信息
      let template: any = null
      if (templateId) {
        try {
          template = await tx.subSkuTemplate.findUnique({
            where: { id: templateId },
          })
          
          if (template && template.skuId === sku.id) {
            // 使用模板的规格信息覆盖默认值
            itemSize = template.itemSize || itemSize || '均码'
            itemCondition = template.itemCondition || itemCondition || 'NEW'
            itemColor = template.itemColor || itemColor || null
            toyCharacterName = template.variantLabel || template.toyCharacterName || toyCharacterName || null
          } else {
            console.warn(`Template ${templateId} not found or doesn't match SKU ${sku.id}`)
            template = null
          }
        } catch (error) {
          console.warn('Failed to fetch template:', error)
          template = null
        }
      }

      // 如果采购明细中指定了itemIds，直接关联这些Item（这些Item已经存在，只是关联采购单）
        // Calculate purchaseCostCNY for this detail
        let purchaseCostCNY = 0;
        const unitPrice = detail.unitPrice ? Number(detail.unitPrice) : 0;
        
        if (order.currency === 'CNY') {
          purchaseCostCNY = unitPrice;
        } else if (order.exchangeRate) {
          const rate = Number(order.exchangeRate.rate);
          if (order.exchangeRate.baseCurrency === order.currency && order.exchangeRate.quoteCurrency === 'CNY') {
            purchaseCostCNY = unitPrice * rate;
          } else if (order.exchangeRate.baseCurrency === 'CNY' && order.exchangeRate.quoteCurrency === order.currency) {
            purchaseCostCNY = unitPrice / rate;
          }
        }

        if (detail.itemIds && detail.itemIds.length > 0) {
          // 关联已存在的Item
          const existingItems = await tx.item.findMany({
            where: {
              itemId: { in: detail.itemIds },
            },
          });

          if (existingItems.length !== detail.itemIds.length) {
            throw new Error(`部分Item不存在`);
          }

          // 更新Item信息（关联采购单和批次号，保持原有状态）
          for (let i = 0; i < existingItems.length; i++) {
            const item = existingItems[i];
            const batchNumber = `${batchNumberPrefix}-${String(i + 1).padStart(3, '0')}`

            await tx.item.update({
              where: { itemId: item.itemId },
              data: {
                purchaseOrderId: purchaseOrderId,
                purchaseDetailId: detail.id,
                batchNumber,
                purchaseCostCNY, // 更新采购成本
              },
            });

            createdItems.push(item);
          }
        } else {
          // 如果没有指定itemIds，自动创建Item
          // 使用从allocationMethod字段中解析的规格信息（已在上面解析）
          
          for (let i = 0; i < detail.quantity; i++) {
            const itemId = `ITEM-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
            const timestamp = Date.now();
            const batchNumber = `${batchNumberPrefix}-${String(i + 1).padStart(3, '0')}`;
            
            // 自动生成Item名称
            const { generateItemName } = await import('@/src/modules/sku/utils/item-name-generator')
            const itemName = generateItemName({
              skuName: sku.name || '未命名商品',
              itemSize: itemSize || '均码',
              itemCondition: itemCondition || 'NEW',
              variantLabel: toyCharacterName || null,
            })
            
            // 如果基于模板创建，使用模板的图片和备注
            const itemPhotos = template?.photos && template.photos.length > 0 
              ? template.photos 
              : []
            const itemRemarks = template?.itemRemarks || null

            const item = await tx.item.create({
              data: {
                itemId,
                itemName,
                itemNumber: itemId,
                itemType: sku.category?.name || '其他',
                itemBrand: sku.brand || '',
                itemCondition: itemCondition || 'NEW',
                itemSize: itemSize || '均码',
                itemColor: itemColor || null,
                toyCharacterName: toyCharacterName || null,
                itemRemarks: itemRemarks,
                skuId: detail.skuId,
                purchaseOrderId: purchaseOrderId,
                purchaseDetailId: detail.id,
                templateId: templateId || null, // 关联模板
                status: 'IN_TRANSIT',
                warehousePositionId: null,
                batchNumber,
                photos: itemPhotos,
                purchaseCostCNY, // 记录采购成本
                createdAt: new Date(timestamp + i), // 确保每个 Item 有唯一时间戳
              },
            });

          // 创建库存调整记录
          await tx.stockAdjustment.create({
            data: {
              itemId: item.itemId,
              adjustmentType: 'INBOUND',
              quantity: 1,
              previousStock: 0,
              newStock: 0,
              reason: '采购入库（在途）',
              remarks: `采购单 ${order.orderNumber} 已创建在途库存`,
            },
          });

          createdItems.push(item);
        }

        // 入库阶段不再增加模板可售库存，待到仓后统一更新
      }
    }

    // 更新采购明细的itemIds
    for (let detailIndex = 0; detailIndex < order.details.length; detailIndex++) {
      const detail = order.details[detailIndex];
      const detailItems = createdItems.filter(item => item.purchaseDetailId === detail.id);
      
      if (detailItems.length > 0) {
        await tx.purchaseDetail.update({
          where: { id: detail.id },
          data: {
            itemIds: detailItems.map(item => item.itemId),
          },
        });
      }
    }

    return createdItems;
  });
}

export async function markItemsInStockByPurchaseOrder(
  purchaseOrderId: string,
  options?: { trigger?: string }
) {
  const order = await prisma.purchaseOrder.findUnique({
    where: { id: purchaseOrderId },
    include: {
      details: {
        include: {
          items: true,
        },
      },
    },
  });

  if (!order) {
    throw new Error('PURCHASE_ORDER_NOT_FOUND');
  }

  const allItems = order.details.flatMap((detail) => detail.items || []);
  if (allItems.length === 0) {
    return { updated: 0, total: 0 };
  }

  const pendingItems = allItems.filter((item) => item.status !== 'IN_STOCK');
  if (pendingItems.length === 0) {
    return { updated: 0, total: allItems.length };
  }

  const updatedCount = await prisma.$transaction(async (tx) => {
    let updated = 0;
    for (const item of pendingItems) {
      await tx.item.update({
        where: { itemId: item.itemId },
        data: { status: 'IN_STOCK' },
      });

      const previousStock = item.status === 'IN_STOCK' ? 1 : 0;
      await tx.stockAdjustment.create({
        data: {
          itemId: item.itemId,
          adjustmentType: 'INBOUND',
          quantity: 1 - previousStock,
          previousStock,
          newStock: 1,
          reason: options?.trigger ? `自动入库 (${options.trigger})` : '自动入库',
          remarks: `采购单 ${order.orderNumber} 到仓`,
        },
      });

      if (item.templateId) {
        await adjustTemplateStockCounts(item.templateId, { available: 1 - previousStock }, tx);
      }

      updated++;
    }

    return updated;
  });

  await clearItemsCache();
  return { updated: updatedCount, total: allItems.length };
}

