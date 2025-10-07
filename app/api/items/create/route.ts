import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidateTag } from "next/cache";
import { calculateProfit } from "@/lib/profit-calculator";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // 生成唯一的商品ID（与批量导入逻辑保持一致）
    const generateItemId = () => {
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const letter1 = letters[Math.floor(Math.random() * letters.length)];
      const letter2 = letters[Math.floor(Math.random() * letters.length)];
      const numbers = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
      return `${letter1}${letter2}${numbers}`;
    };
    
    // 生成唯一ID，检查重复
    let itemId = body.itemId || generateItemId();
    if (!body.itemId) {
      // 如果没有提供itemId，则生成新的并检查重复
      let attempts = 0;
      const maxAttempts = 10;
      while (attempts < maxAttempts) {
        const existingItem = await prisma.item.findUnique({ where: { itemId } });
        if (!existingItem) {
          break;
        }
        itemId = generateItemId();
        attempts++;
      }
      
      if (attempts === maxAttempts) {
        throw new Error("无法生成唯一的商品ID，请重试");
      }
    }
    
    // 处理其他费用数据
    const otherFees = body.otherFees || [];

    // 自动计算利润（如果有售价）
    let grossProfit = "0";
    let netProfit = "0";
    
    if (body.soldPrice && parseFloat(body.soldPrice) > 0) {
      const profitResult = calculateProfit({
        soldPrice: body.soldPrice,
        soldPriceCurrency: body.soldPriceCurrency,
        soldPriceExchangeRate: body.soldPriceExchangeRate,
        purchasePrice: body.purchasePrice,
        purchasePriceCurrency: body.purchasePriceCurrency,
        purchasePriceExchangeRate: body.purchasePriceExchangeRate,
        domesticShipping: body.domesticShipping,
        internationalShipping: body.internationalShipping,
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
      const willOut = outStatuses.includes(String(body.orderStatus || "在途（国内）"));
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
          itemSize: body.itemSize || "",
          photos: body.photos || [],
          position: body.position || null,
          warehousePositionId: willOut ? null : (body.warehousePositionId || null),
          accessories: body.accessories || null,
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
                      orderStatus: body.orderStatus || "在途（国内）",
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
          itemGrossProfit: grossProfit,
          itemNetProfit: netProfit,
          isReturn: body.isReturn || false,
          storageDuration: String(body.storageDuration || "0"),
        },
      });

      // 如果是占库状态且指定了仓库位置，更新使用量
      if (!willOut && body.warehousePositionId) {
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