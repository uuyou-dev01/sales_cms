import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidateTag } from "next/cache";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // 使用表单中的itemId，如果没有则生成新的
    const itemId = body.itemId || `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 处理其他费用数据
    const otherFees = body.otherFees || [];
    
    const result = await prisma.$transaction(async (tx) => {
      // 创建商品
      const item = await tx.item.create({
        data: {
          itemId,
          itemName: body.itemName || "",
          itemMfgDate: body.itemMfgDate || "",
          itemNumber: body.itemNumber || "",
          itemType: body.itemType || "",
          itemBrand: body.itemBrand || "",
          itemCondition: body.itemCondition || "",
          itemRemarks: body.itemRemarks || "",
          itemColor: body.itemColor || "",
          itemStatus: body.itemStatus || "",
          itemSize: body.itemSize || "",
          photos: body.photos || [],
          position: body.position || null,
          warehousePositionId: body.warehousePositionId || null,
        },
      });

      // 创建交易记录
      const transaction = await tx.transaction.create({
        data: {
          itemId,
          shipping: body.shipping || "",
          domesticShipping: String(body.domesticShipping || "0"),
          internationalShipping: String(body.internationalShipping || "0"),
          domesticTrackingNumber: body.domesticTrackingNumber || null,
          internationalTrackingNumber: body.internationalTrackingNumber || null,
          transactionStatues: body.transactionStatues || "",
          purchaseDate: new Date(body.purchaseDate),
          soldDate: body.soldDate ? new Date(body.soldDate) : null,
          launchDate: body.launchDate ? new Date(body.launchDate) : null,
          purchasePlatform: body.purchasePlatform || "",
          soldPlatform: body.soldPlatform || "",
          listingPlatforms: body.listingPlatforms || [],
          otherFees: otherFees.length > 0 ? otherFees : null,
          purchasePrice: String(body.purchasePrice || "0"),
          purchasePriceCurrency: body.purchasePriceCurrency || "CNY",
          purchasePriceExchangeRate: String(body.purchasePriceExchangeRate || "1"),
          soldPrice: String(body.soldPrice || "0"),
          soldPriceCurrency: body.soldPriceCurrency || "CNY",
          soldPriceExchangeRate: String(body.soldPriceExchangeRate || "1"),
          itemGrossProfit: String(body.itemGrossProfit || "0"),
          itemNetProfit: String(body.itemNetProfit || "0"),
          isReturn: body.isReturn || false,
          storageDuration: String(body.storageDuration || "0"),
        },
      });

      // 如果指定了仓库位置，更新使用量
      if (body.warehousePositionId) {
        await tx.warehousePosition.update({
          where: { id: body.warehousePositionId },
          data: { used: { increment: 1 } },
        });
      }

      return { item, transaction };
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
    console.error("创建商品失败:", error || "未知错误");
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "创建商品失败" },
      { status: 500 }
    );
  }
} 