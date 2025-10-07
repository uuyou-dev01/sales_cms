import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 日本平台销售费用率
const PLATFORM_FEES = {
  "煤炉": 0.10,    // 10%
  "SNKRDUNK": 0.08, // 8%
  "其他": 0.05,     // 5%
};

// 日本邮费（日元）
const JAPAN_SHIPPING_FEE = 800;

// 汇率（日元兑人民币，应该从实时汇率API获取，这里使用近似值）
const JPY_TO_CNY_RATE = 0.05; // 1日元 ≈ 0.05人民币（建议从汇率API获取实时汇率）

export async function POST(req: Request) {
  try {
    const { 
      purchasePrice, 
      domesticShipping, 
      internationalShipping, 
      profitRate = 0.30,
      itemNumber,
      targetPlatform = "煤炉"
    } = await req.json();

    // 1. 计算总成本
    const totalCost = parseFloat(purchasePrice || "0") + 
                     parseFloat(domesticShipping || "0") + 
                     parseFloat(internationalShipping || "0");

    // 2. 计算日本平台费用
    const platformFeeRate = PLATFORM_FEES[targetPlatform as keyof typeof PLATFORM_FEES] || PLATFORM_FEES.其他;
    const japanShippingFeeCNY = JAPAN_SHIPPING_FEE * JPY_TO_CNY_RATE;

    // 3. 计算建议售价（人民币）
    const totalCostWithFees = totalCost + japanShippingFeeCNY;
    const suggestedPriceCNY = totalCostWithFees * (1 + profitRate) / (1 - platformFeeRate);
    
    // 4. 计算建议售价（日元）
    const suggestedPriceJPY = suggestedPriceCNY / JPY_TO_CNY_RATE;

    // 4. 查询同款销售记录
    let similarSales = [];
    if (itemNumber) {
      similarSales = await prisma.transaction.findMany({
        where: {
          item: {
            itemNumber: itemNumber,
            deleted: false,
          },
          soldPrice: {
            not: "0",
          },
        },
        select: {
          soldPrice: true,
          soldDate: true,
          soldPlatform: true,
          item: {
            select: {
              itemName: true,
              itemSize: true,
              itemCondition: true,
            },
          },
        },
        orderBy: {
          soldDate: 'desc',
        },
        take: 10,
      });
    }

    // 5. 计算统计信息
    const salesStats = similarSales.length > 0 ? {
      totalSales: similarSales.length,
      averagePrice: similarSales.reduce((sum, sale) => sum + parseFloat(sale.soldPrice), 0) / similarSales.length,
      minPrice: Math.min(...similarSales.map(sale => parseFloat(sale.soldPrice))),
      maxPrice: Math.max(...similarSales.map(sale => parseFloat(sale.soldPrice))),
      recentSales: similarSales.slice(0, 5).map(sale => ({
        price: sale.soldPrice,
        date: sale.soldDate,
        platform: sale.soldPlatform,
        itemName: sale.item.itemName,
        size: sale.item.itemSize,
        condition: sale.item.itemCondition,
      })),
    } : null;

    return NextResponse.json({
      costBreakdown: {
        purchasePrice: parseFloat(purchasePrice || "0"),
        domesticShipping: parseFloat(domesticShipping || "0"),
        internationalShipping: parseFloat(internationalShipping || "0"),
        totalCost,
        japanShippingFee: japanShippingFeeCNY,
        platformFeeRate: platformFeeRate * 100, // 转换为百分比
        totalCostWithFees,
      },
      pricing: {
        suggestedPriceCNY: Math.round(suggestedPriceCNY * 100) / 100,
        suggestedPriceJPY: Math.round(suggestedPriceJPY * 100) / 100,
        profitRate: profitRate * 100, // 转换为百分比
        targetPlatform,
        profitAmount: suggestedPriceCNY - totalCostWithFees,
        profitMargin: ((suggestedPriceCNY - totalCostWithFees) / suggestedPriceCNY) * 100,
      },
      similarSales: salesStats,
    });
  } catch (error) {
    console.error("价格预测错误:", error || "未知错误");
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "价格预测失败" },
      { status: 500 }
    );
  }
} 