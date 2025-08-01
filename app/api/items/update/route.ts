import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

export async function PUT(req: Request) {
  try {
    const data = await req.json();
    
    // 获取原商品信息以检查仓库位置变更
    const originalItem = await prisma.item.findUnique({
      where: { itemId: data.itemId },
      select: { warehousePositionId: true },
    });

    if (!originalItem) {
      return NextResponse.json(
        { error: "商品不存在" },
        { status: 404 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // 更新商品信息
      const item = await tx.item.update({
        where: { itemId: data.itemId },
        data: {
          itemName: data.itemName,
          itemMfgDate: data.itemMfgDate ? new Date(data.itemMfgDate) : new Date(),
          itemNumber: data.itemNumber || "",
          itemType: data.itemType,
          itemBrand: data.itemBrand,
          itemCondition: data.itemCondition || "new",
          itemRemarks: data.itemRemarks || "",
          itemColor: data.itemColor || "",
          itemStatus: data.itemStatus || "pending",
          itemSize: data.itemSize || "",
          position: data.position || null,
          warehousePositionId: data.warehousePositionId || null,
          photos: data.photos || [],
        },
      });
      
      // 查找并更新交易记录
      const existingTransaction = await tx.transaction.findFirst({
        where: { itemId: data.itemId },
      });

      if (existingTransaction) {
        await tx.transaction.update({
          where: { id: existingTransaction.id },
          data: {
            shipping: data.shipping || "0",
            transactionStatues: data.transactionStatues || data.itemStatus || "pending",
            purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : new Date(),
            soldDate: data.soldDate ? new Date(data.soldDate) : null,
            purchaseAmount: data.purchaseAmount || data.purchasePrice || "0",
            launchDate: data.launchDate ? new Date(data.launchDate) : null,
            purchasePlatform: data.purchasePlatform || "",
            soldPlatform: data.soldPlatform || "",
            purchasePrice: data.purchasePrice || data.purchaseAmount || "0",
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

      // 如果从旧位置移除商品
      if (oldWarehousePositionId && oldWarehousePositionId !== newWarehousePositionId) {
        await tx.warehousePosition.update({
          where: { id: oldWarehousePositionId },
          data: {
            used: {
              decrement: 1,
            },
          },
        });
      }

      // 如果添加到新位置
      if (newWarehousePositionId && newWarehousePositionId !== oldWarehousePositionId) {
        // 检查新位置容量
        const newPosition = await tx.warehousePosition.findUnique({
          where: { id: newWarehousePositionId },
        });

        if (newPosition && newPosition.used >= newPosition.capacity) {
          throw new Error(`仓位 ${newPosition.name} 已满`);
        }

        await tx.warehousePosition.update({
          where: { id: newWarehousePositionId },
          data: {
            used: {
              increment: 1,
            },
          },
        });
      }
      
      return item;
    });

    // 重新验证缓存
    revalidateTag('items');
    revalidateTag('stats');
    revalidateTag('months');
    if (originalItem?.warehousePositionId || data.warehousePositionId) {
      revalidateTag('warehouses');
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("更新商品错误:", error || "未知错误");
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "更新商品失败" },
      { status: 500 }
    );
  }
} 