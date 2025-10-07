import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidateTag } from "next/cache";
import { calculateProfit } from "@/lib/profit-calculator";

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { itemId, ...data } = body;

    // 添加调试日志
    console.log("更新商品数据:", {
      itemId,
      itemNumber: data.itemNumber,
      domesticShipping: data.domesticShipping,
      internationalShipping: data.internationalShipping,
      domesticTrackingNumber: data.domesticTrackingNumber,
      internationalTrackingNumber: data.internationalTrackingNumber,
      itemMfgDate: data.itemMfgDate,
      launchDate: data.launchDate,
      soldDate: data.soldDate,
      soldPriceCurrency: data.soldPriceCurrency,
      soldPriceExchangeRate: data.soldPriceExchangeRate,
      soldPlatform: data.soldPlatform,
    });

    // 添加更详细的调试信息
    console.log("所有更新字段:", Object.keys(data));
    console.log("字段值详情:", data);

    // 如果只更新备注，走轻量路径，避免误改其它字段
    if (Object.keys(data).length === 1 && Object.prototype.hasOwnProperty.call(data, 'itemRemarks')) {
      try {
        const updated = await prisma.item.update({
          where: { itemId },
          data: { itemRemarks: data.itemRemarks ?? '' },
        });
        revalidateTag('items');
        revalidateTag('stats');
        revalidateTag('months');
        return NextResponse.json({ success: true, item: updated });
      } catch (err) {
        console.error('仅备注更新失败:', err);
        return NextResponse.json({ error: '备注更新失败' }, { status: 500 });
      }
    }

    // 处理其他费用数据
    const otherFees = data.otherFees || [];

    // 自动计算利润（如果有售价）
    let grossProfit = "0";
    let netProfit = "0";
    
    if (data.soldPrice && parseFloat(data.soldPrice) > 0) {
      const profitResult = calculateProfit({
        soldPrice: data.soldPrice,
        soldPriceCurrency: data.soldPriceCurrency,
        soldPriceExchangeRate: data.soldPriceExchangeRate,
        purchasePrice: data.purchasePrice,
        purchasePriceCurrency: data.purchasePriceCurrency,
        purchasePriceExchangeRate: data.purchasePriceExchangeRate,
        domesticShipping: data.domesticShipping,
        internationalShipping: data.internationalShipping,
        otherFees: otherFees.map(fee => ({
          amount: fee.amount,
          currency: fee.currency
        }))
      });
      
      grossProfit = String(profitResult.grossProfitCNY);
      netProfit = String(profitResult.netProfitCNY);
    }

    const result = await prisma.$transaction(async (tx) => {
      const outStatuses = ["已完成", "已完成未结算", "交易中"]; // 出库状态
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
          itemName: data.itemName || "",
          itemMfgDate: data.itemMfgDate || "",
          itemNumber: data.itemNumber || "",
          itemType: data.itemType || "",
          itemBrand: data.itemBrand || "",
          itemCondition: data.itemCondition || "",
          itemRemarks: data.itemRemarks || "",
          itemColor: data.itemColor || "",
          itemSize: data.itemSize || "",
          photos: data.photos || [],
          position: data.position || null,
          warehousePositionId: outStatuses.includes(String(data.orderStatus || "")) ? null : (data.warehousePositionId || null),
          accessories: data.accessories || null,
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
            domesticShipping: String(data.domesticShipping || "0"),
            internationalShipping: String(data.internationalShipping || "0"),
            domesticTrackingNumber: data.domesticTrackingNumber || null,
            internationalTrackingNumber: data.internationalTrackingNumber || null,
                    orderStatus: data.orderStatus || existingTransaction.orderStatus || "在途（国内）",
            purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : existingTransaction.purchaseDate,
            soldDate: data.soldDate ? new Date(data.soldDate) : null,
            launchDate: data.launchDate ? new Date(data.launchDate) : null,
            purchasePlatform: data.purchasePlatform || "",
            soldPlatform: data.soldPlatform || "",
            listingPlatforms: data.listingPlatforms || [],
            otherFees: otherFees.length > 0 ? otherFees : null,
            purchasePrice: String(data.purchasePrice || "0"),
            purchasePriceCurrency: data.purchasePriceCurrency || "CNY",
            purchasePriceExchangeRate: String(data.purchasePriceExchangeRate || "1"),
            soldPrice: String(data.soldPrice || "0"),
            soldPriceCurrency: data.soldPriceCurrency || "CNY",
            soldPriceExchangeRate: String(data.soldPriceExchangeRate || "1"),
            itemGrossProfit: grossProfit,
            itemNetProfit: netProfit,
            isReturn: data.isReturn || false,
            storageDuration: String(data.storageDuration || "0"),
          },
        });
      }

      // 处理仓库位置变更
      const oldWarehousePositionId = originalItem?.warehousePositionId;
      const newWarehousePositionId = outStatuses.includes(String(data.orderStatus || "")) ? null : data.warehousePositionId;

      if (oldWarehousePositionId && oldWarehousePositionId !== newWarehousePositionId) {
        // 减少旧位置的使用量（非负保护）
        const oldPos = await tx.warehousePosition.findUnique({
          where: { id: oldWarehousePositionId },
          select: { used: true },
        });
        if (oldPos) {
          if (oldPos.used > 0) {
            await tx.warehousePosition.update({
              where: { id: oldWarehousePositionId },
              data: { used: { decrement: 1 } },
            });
          } else {
            await tx.warehousePosition.update({
              where: { id: oldWarehousePositionId },
              data: { used: 0 },
            });
          }
        }
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

      // 如果切换到了出库状态，且原来有仓位，占用需要安全扣减
      if (!newWarehousePositionId && oldWarehousePositionId) {
        const oldPos = await tx.warehousePosition.findUnique({
          where: { id: oldWarehousePositionId },
          select: { used: true },
        });
        if (oldPos) {
          if (oldPos.used > 0) {
            await tx.warehousePosition.update({
              where: { id: oldWarehousePositionId },
              data: { used: { decrement: 1 } },
            });
          } else {
            await tx.warehousePosition.update({
              where: { id: oldWarehousePositionId },
              data: { used: 0 },
            });
          }
        }
      }

      return updatedItem;
    });

    // 重新验证缓存
    revalidateTag('items');
    revalidateTag('stats');
    revalidateTag('months');
    revalidateTag('warehouses');

    return NextResponse.json({ success: true, item: result });
  } catch (error) {
    console.error("更新商品失败:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "更新商品失败" },
      { status: 500 }
    );
  }
} 