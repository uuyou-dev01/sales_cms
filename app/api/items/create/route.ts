import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const data = await req.json();
    
    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.item.create({
        data: {
          itemId: data.itemId,
          itemName: data.itemName,
          itemMfgDate: data.itemMfgDate ? new Date(data.itemMfgDate) : new Date(),
          itemNumber: data.itemNumber || "",
          itemType: data.itemType,
          itemBrand: data.itemBrand,
          itemCondition: data.itemCondition,
          itemRemarks: data.itemRemarks || "",
          itemColor: data.itemColor || "",
          itemStatus: data.transactionStatues || "pending",
          itemSize: data.itemSize || "",
          warehousePositionId: data.warehousePositionId || null,
        },
      });
      
      const transaction = await tx.transaction.create({
        data: {
          itemId: data.itemId,
          shipping: data.shipping || "0",
          transactionStatues: data.transactionStatues || "pending",
          purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : new Date(),
          soldDate: data.soldDate ? new Date(data.soldDate) : null,
          purchaseAmount: data.purchasePriceRMB?.toString() || "0",
          launchDate: data.launchDate ? new Date(data.launchDate) : null,
          purchasePlatform: data.purchasePlatform || "",
          soldPlatform: data.soldPlatform || "",
          purchasePrice: data.purchasePriceRMB?.toString() || "0",
          purchasePriceCurrency: data.purchaseCurrency || "CNY",
          purchasePriceExchangeRate: "1",
          soldPrice: data.soldPriceRMB?.toString() || "0",
          soldPriceCurrency: data.soldCurrency || "CNY",
          soldPriceExchangeRate: "1",
          itemGrossProfit: data.itemGrossProfit?.toString() || "0",
          itemNetProfit: data.itemNetProfit?.toString() || "0",
          isReturn: data.isReturn === "yes",
          returnFee: data.returnFee?.toString() || "0",
          storageDuration: "0",
        },
      });

      // 如果指定了仓库位置，更新仓位使用量
      if (data.warehousePositionId) {
        await tx.warehousePosition.update({
          where: { id: data.warehousePositionId },
          data: {
            used: {
              increment: 1,
            },
          },
        });
      }
      
      return { item, transaction };
    });
    
    return NextResponse.json(result);
  } catch (error) {
    console.error("创建商品错误:", error || "未知错误");
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "创建失败" },
      { status: 500 }
    );
  }
} 