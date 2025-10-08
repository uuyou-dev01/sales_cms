import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const {
      itemId,
      type, // 'purchase' | 'sale'
      unitPrice,
      quantity,
      totalAmount,
      currency,
      exchangeRate,
      date,
      platform,
      domesticShipping,
      internationalShipping,
      otherFees,
      trackingNumber,
      orderStatus,
      remarks,
    } = await req.json();

    // 验证必需字段
    if (!itemId || !type || !unitPrice || !quantity) {
      return NextResponse.json(
        { success: false, error: "缺少必需字段" },
        { status: 400 }
      );
    }

    // 验证商品是否存在
    const item = await prisma.item.findUnique({
      where: { itemId },
    });

    if (!item) {
      return NextResponse.json(
        { success: false, error: "商品不存在" },
        { status: 404 }
      );
    }

    // 创建交易记录
    const transactionData: any = {
      itemId,
      purchaseDate: new Date(date || new Date()),
      purchasePlatform: platform || "",
      orderStatus: orderStatus || (type === 'purchase' ? "在途（国内）" : "已完成"),
      otherFees: otherFees ? { description: otherFees } : null,
    };

    if (type === 'purchase') {
      // 采购记录
      transactionData.purchasePrice = (unitPrice * quantity).toString();
      transactionData.purchasePriceCurrency = currency || "CNY";
      transactionData.purchasePriceExchangeRate = exchangeRate?.toString() || "1";
      transactionData.domesticShipping = domesticShipping?.toString() || "0";
      transactionData.internationalShipping = internationalShipping?.toString() || "0";
      transactionData.domesticTrackingNumber = trackingNumber || "";
    } else {
      // 销售记录
      transactionData.soldDate = new Date(date || new Date());
      transactionData.soldPrice = (unitPrice * quantity).toString();
      transactionData.soldPriceCurrency = currency || "JPY";
      transactionData.soldPriceExchangeRate = exchangeRate?.toString() || "0.05";
      transactionData.soldPlatform = platform || "";
    }

    const transaction = await prisma.transaction.create({
      data: transactionData,
    });

    return NextResponse.json({
      success: true,
      data: {
        transactionId: transaction.id,
        message: `${type === 'purchase' ? '采购' : '销售'}记录创建成功`,
      },
    });
  } catch (error) {
    console.error("交易记录创建失败:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "交易记录创建失败",
      },
      { status: 500 }
    );
  }
}
