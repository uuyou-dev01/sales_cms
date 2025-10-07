import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidateTag } from "next/cache";
import { calculateProfit } from "@/lib/profit-calculator";

export async function POST(req: Request) {
  try {
    const { itemIds, exchangeRate } = await req.json();

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json(
        { error: "请选择要结算的订单" },
        { status: 400 }
      );
    }

    if (!exchangeRate || isNaN(parseFloat(exchangeRate)) || parseFloat(exchangeRate) <= 0) {
      return NextResponse.json(
        { error: "请输入有效的汇率" },
        { status: 400 }
      );
    }

    const rate = parseFloat(exchangeRate);
    let successCount = 0;
    let errorCount = 0;

    // 批量处理结算
    for (const itemId of itemIds) {
      try {
        // 获取商品和交易信息
        const item = await prisma.item.findUnique({
          where: { itemId },
          include: {
            transactions: {
              where: { itemId },
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          }
        });

        if (!item || !item.transactions[0]) {
          errorCount++;
          continue;
        }

        const transaction = item.transactions[0];

        // 检查是否为已售出未结算状态
        if (transaction.orderStatus !== "已售出未结算") {
          errorCount++;
          continue;
        }

        // 使用统一的利润计算函数
        const profitResult = calculateProfit({
          soldPrice: transaction.soldPrice,
          soldPriceCurrency: "JPY", // 批量结算时售价为日元
          soldPriceExchangeRate: rate,
          purchasePrice: transaction.purchasePrice,
          purchasePriceCurrency: transaction.purchasePriceCurrency || "CNY",
          purchasePriceExchangeRate: transaction.purchasePriceExchangeRate || "1",
          domesticShipping: transaction.domesticShipping,
          internationalShipping: transaction.internationalShipping,
          otherFees: transaction.otherFees ? (transaction.otherFees as Array<{amount: string; currency?: string}>).map(fee => ({
            amount: fee.amount,
            currency: fee.currency || "JPY"
          })) : []
        });

        // 更新交易记录
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            orderStatus: "已完成",
            soldPriceCurrency: "JPY",
            soldPriceExchangeRate: String(rate),
            itemGrossProfit: String(profitResult.grossProfitCNY),
            itemNetProfit: String(profitResult.netProfitCNY),
            updatedAt: new Date()
          }
        });

        successCount++;
      } catch (error) {
        console.error(`结算商品 ${itemId} 失败:`, error);
        errorCount++;
      }
    }

    // 重新验证缓存
    revalidateTag('items');
    revalidateTag('stats');
    revalidateTag('months');

    return NextResponse.json({
      success: true,
      successCount,
      errorCount,
      message: `成功结算 ${successCount} 个订单，失败 ${errorCount} 个`
    });

  } catch (error) {
    console.error("批量结算失败:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "批量结算失败" },
      { status: 500 }
    );
  }
}

