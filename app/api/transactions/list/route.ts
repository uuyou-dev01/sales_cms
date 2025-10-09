import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get("itemId");

    if (!itemId) {
      return NextResponse.json(
        { success: false, error: "缺少商品ID" },
        { status: 400 }
      );
    }

    // 获取该商品的所有交易记录
    const transactions = await prisma.transaction.findMany({
      where: { itemId },
      orderBy: { createdAt: 'desc' }
    });

    // 处理交易记录数据
    const formattedTransactions = transactions.map(transaction => {
      const isPurchase = transaction.purchaseDate !== null;
      const isSale = transaction.soldDate !== null;
      
      // 确定交易类型
      let type: 'purchase' | 'sale' = 'purchase';
      let amount = 0;
      let currency = 'CNY';
      let exchangeRate = 1;
      let date = '';
      let platform = '';
      
      if (isSale) {
        type = 'sale';
        amount = parseFloat(transaction.soldPrice || "0");
        currency = transaction.soldPriceCurrency || 'JPY';
        exchangeRate = parseFloat(transaction.soldPriceExchangeRate || "1");
        date = transaction.soldDate ? transaction.soldDate.toISOString().split('T')[0] : '';
        platform = transaction.soldPlatform || '';
      } else {
        type = 'purchase';
        amount = parseFloat(transaction.purchasePrice || "0");
        currency = transaction.purchasePriceCurrency || 'CNY';
        exchangeRate = parseFloat(transaction.purchasePriceExchangeRate || "1");
        date = transaction.purchaseDate ? transaction.purchaseDate.toISOString().split('T')[0] : '';
        platform = transaction.purchasePlatform || '';
      }
      
      // 计算人民币金额
      const amountCNY = currency === 'CNY' ? amount : amount * exchangeRate;
      
      // 计算利润（仅销售记录）
      let profit = undefined;
      if (isSale) {
        const purchasePrice = parseFloat(transaction.purchasePrice || "0");
        const purchaseCurrency = transaction.purchasePriceCurrency || 'CNY';
        const purchaseExchangeRate = parseFloat(transaction.purchasePriceExchangeRate || "1");
        const purchasePriceCNY = purchaseCurrency === 'CNY' ? purchasePrice : purchasePrice * purchaseExchangeRate;
        
        const soldPriceCNY = amountCNY;
        const domesticShipping = parseFloat(transaction.domesticShipping || "0");
        const internationalShipping = parseFloat(transaction.internationalShipping || "0");
        
        profit = soldPriceCNY - purchasePriceCNY - domesticShipping - internationalShipping;
      }

      return {
        id: transaction.id,
        type,
        amount,
        currency,
        exchangeRate,
        amountCNY,
        date,
        platform,
        orderStatus: transaction.orderStatus || '',
        trackingNumber: transaction.domesticTrackingNumber || transaction.internationalTrackingNumber || undefined,
        domesticShipping: parseFloat(transaction.domesticShipping || "0"),
        internationalShipping: parseFloat(transaction.internationalShipping || "0"),
        otherFees: transaction.otherFees ? JSON.stringify(transaction.otherFees) : undefined,
        remarks: transaction.remarks || undefined,
        profit,
      };
    });

    return NextResponse.json({
      success: true,
      transactions: formattedTransactions
    });

  } catch (error) {
    console.error("获取交易记录失败:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "获取交易记录失败", 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

