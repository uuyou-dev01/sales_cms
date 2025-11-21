import { prisma } from '@/lib/prisma';
import Decimal from 'decimal.js';

export interface SplitBoxedSetInput {
  parentItemId: string;
  childItems: Array<{ skuId: string; quantity: number; variant?: string; itemCondition?: string }>;
  totalCost: number;
  createdById: string;
}

/**
 * 端盒拆分逻辑：将父 Item（端盒）拆分为多个子 Item
 */
export async function splitBoxedSet(input: SplitBoxedSetInput) {
  const { parentItemId, childItems, totalCost, createdById } = input;
  const totalSplitCount = childItems.reduce((sum, item) => sum + item.quantity, 0);
  
  if (totalSplitCount === 0) {
    throw new Error('拆分数量不能为0');
  }

  const parentItem = await prisma.item.findUnique({ where: { itemId: parentItemId } });
  if (!parentItem) {
    throw new Error('父 Item 不存在');
  }

  const allocatedCostPerUnit = new Decimal(totalCost).dividedBy(totalSplitCount);

  return prisma.$transaction(async (tx) => {
    const splits = [];
    
    for (const child of childItems) {
      const childSku = await tx.sKU.findUnique({ 
        where: { id: child.skuId },
        include: { category: true },
      });
      if (!childSku) {
        throw new Error(`SKU ${child.skuId} 不存在`);
      }

      // 为每个子 Item 创建拆分记录和 Item
      for (let i = 0; i < child.quantity; i++) {
        // 创建子 Item
        const childItemId = `ITEM-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        const childItem = await tx.item.create({
          data: {
            itemId: childItemId,
            itemName: `${childSku.name}${child.variant ? ` - ${child.variant}` : ''}`,
            itemNumber: '',
            itemType: childSku.category?.name || parentItem.itemType || '其他',
            itemBrand: childSku.brand || parentItem.itemBrand || '',
            itemCondition: child.itemCondition || parentItem.itemCondition || '全新',
            itemSize: child.variant || parentItem.itemSize || '均码',
            skuId: child.skuId,
            parentItemId: parentItemId,
            photos: parentItem.photos || [],
          },
        });

        // 创建拆分记录
        const split = await tx.inventorySplit.create({
          data: {
            parentItemId,
            childItemId: childItem.itemId,
            method: 'AVERAGE',
            ratio: { unitCost: allocatedCostPerUnit.toNumber() },
            allocatedCost: allocatedCostPerUnit.toNumber(),
            createdById,
          },
        });
        splits.push(split);
      }
    }

    return splits;
  });
}

/**
 * 获取拆分记录
 */
export async function getSplitsByParentItem(parentItemId: string) {
  return prisma.inventorySplit.findMany({
    where: { parentItemId },
    include: {
      parentItem: true,
      childItem: true,
      createdBy: true,
    },
  });
}

