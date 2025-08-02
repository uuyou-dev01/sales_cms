import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidateTag } from "next/cache";

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { itemId, ...data } = body;

    // 处理其他费用数据
    const otherFees = data.otherFees || [];

    const result = await prisma.$transaction(async (tx) => {
      // 获取原始商品信息
      const originalItem = await tx.item.findUnique({
        where: { itemId },
        include: { warehousePosition: true },
      });

      if (!originalItem) {
        throw new Error("商品不存在");
      }

      // 更新商品
      const updatedItem = await tx.item.update({
        where: { itemId },
        data: {
          itemName: data.itemName,
          itemMfgDate: data.itemMfgDate || "",
          itemNumber: data.itemNumber,
          itemType: data.itemType,
          itemBrand: data.itemBrand,
          itemCondition: data.itemCondition,
          itemRemarks: data.itemRemarks || "",
          itemColor: data.itemColor,
          itemStatus: data.itemStatus,
          itemSize: data.itemSize,
          photos: data.photos || [],
          position: data.position || null,
          warehousePositionId: data.warehousePositionId || null,
        },
      });

      // 查找并更新交易记录
      const existingTransaction = await tx.transaction.findFirst({
        where: { itemId },
      });

      if (existingTransaction) {
        await tx.transaction.update({
          where: { id: existingTransaction.id },
          data: {
            shipping: data.shipping || "",
            domesticShipping: data.domesticShipping || "0",
            internationalShipping: data.internationalShipping || "0",
            domesticTrackingNumber: data.domesticTrackingNumber || null,
            internationalTrackingNumber: data.internationalTrackingNumber || null,
            transactionStatues: data.transactionStatues || existingTransaction.transactionStatues,
            purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : existingTransaction.purchaseDate,
            soldDate: data.soldDate ? new Date(data.soldDate) : null,
            launchDate: data.launchDate ? new Date(data.launchDate) : null,
            purchasePlatform: data.purchasePlatform,
            soldPlatform: data.soldPlatform || "",
            listingPlatforms: data.listingPlatforms || [],
            otherFees: otherFees.length > 0 ? otherFees : null,
            purchasePrice: data.purchasePrice || "0",
            purchasePriceCurrency: data.purchasePriceCurrency || "CNY",
            purchasePriceExchangeRate: data.purchasePriceExchangeRate || "1",
            soldPrice: data.soldPrice || "0",
            soldPriceCurrency: data.soldPriceCurrency || "CNY",
            soldPriceExchangeRate: data.soldPriceExchangeRate || "1",
            itemGrossProfit: data.itemGrossProfit || "0",
            itemNetProfit: data.itemNetProfit || "0",
            isReturn: data.isReturn || false,
            returnFee: data.returnFee || "0",
            storageDuration: data.storageDuration || "0",
          },
        });
      }

      // 处理仓库位置变更
      const oldWarehousePositionId = originalItem?.warehousePositionId;
      const newWarehousePositionId = data.warehousePositionId;

      if (oldWarehousePositionId && oldWarehousePositionId !== newWarehousePositionId) {
        // 减少旧位置的使用量
        await tx.warehousePosition.update({
          where: { id: oldWarehousePositionId },
          data: { used: { decrement: 1 } },
        });
      }

      if (newWarehousePositionId && newWarehousePositionId !== oldWarehousePositionId) {
        // 检查新位置是否有足够容量
        const newPosition = await tx.warehousePosition.findUnique({
          where: { id: newWarehousePositionId },
        });
        
        if (newPosition && newPosition.used >= newPosition.capacity) {
          throw new Error(`仓位 ${newPosition.name} 已满`);
        }

        // 增加新位置的使用量
        await tx.warehousePosition.update({
          where: { id: newWarehousePositionId },
          data: { used: { increment: 1 } },
        });
      }

      return updatedItem;
    });

    // 重新验证缓存
    revalidateTag('items');
    revalidateTag('stats');
    revalidateTag('months');
    revalidateTag('warehouses');

    return NextResponse.json(result);
  } catch (error) {
    console.error("更新商品失败:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "更新商品失败" },
      { status: 500 }
    );
  }
} 