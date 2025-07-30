import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidateTag } from "next/cache";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // 开始事务
    const result = await prisma.$transaction(async (tx) => {
      // 创建商品
      const item = await tx.item.create({
        data: {
          itemId: body.itemId,
          itemName: body.itemName,
          itemMfgDate: body.itemMfgDate ? new Date(body.itemMfgDate) : new Date(),
          itemNumber: body.itemNumber || "",
          itemType: body.itemType,
          itemBrand: body.itemBrand,
          itemCondition: body.itemCondition || "new",
          itemRemarks: body.itemRemarks || "",
          itemColor: body.itemColor || "",
          itemStatus: body.itemStatus || "pending",
          itemSize: body.itemSize || "",
          position: body.position || null,
          warehousePositionId: body.warehousePositionId || null,
          photos: body.photos || [],
        },
      });

      // 创建交易记录
      await tx.transaction.create({
        data: {
          itemId: body.itemId,
          shipping: body.shipping || "0",
          transactionStatues: body.transactionStatues || body.itemStatus || "pending",
          purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : new Date(),
          soldDate: body.soldDate ? new Date(body.soldDate) : null,
          purchaseAmount: body.purchaseAmount || "0",
          launchDate: body.launchDate ? new Date(body.launchDate) : null,
          purchasePlatform: body.purchasePlatform || "",
          soldPlatform: body.soldPlatform || "",
          purchasePrice: body.purchasePrice || body.purchaseAmount || "0",
          purchasePriceCurrency: body.purchasePriceCurrency || "CNY",
          purchasePriceExchangeRate: body.purchasePriceExchangeRate || "1",
          soldPrice: body.soldPrice || "0",
          soldPriceCurrency: body.soldPriceCurrency || "CNY",
          soldPriceExchangeRate: body.soldPriceExchangeRate || "1",
          itemGrossProfit: body.itemGrossProfit || "0",
          itemNetProfit: body.itemNetProfit || "0",
          isReturn: body.isReturn || false,
          returnFee: body.returnFee || "0",
          storageDuration: body.storageDuration || "0",
        },
      });

      // 如果指定了仓库位置，更新使用量
      if (body.warehousePositionId) {
        await tx.warehousePosition.update({
          where: { id: body.warehousePositionId },
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
    if (body.warehousePositionId) {
      revalidateTag('warehouses');
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("创建商品错误:", error || "未知错误");
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "创建商品失败" },
      { status: 500 }
    );
  }
} 