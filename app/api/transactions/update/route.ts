import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      transactionId,
      amount,
      currency,
      exchangeRate,
      date,
      platform,
      orderStatus,
      trackingNumber,
      domesticShipping,
      internationalShipping,
      otherFees,
      remarks,
    } = body;

    // 检查交易记录是否存在
    const existingTransaction = await prisma.transaction.findUnique({
      where: { id: transactionId }
    });

    if (!existingTransaction) {
      return NextResponse.json(
        { success: false, error: "交易记录不存在" },
        { status: 404 }
      );
    }

    // 更新交易记录
    const updatedTransaction = await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        purchasePrice: amount.toString(),
        purchasePriceCurrency: currency,
        purchasePriceExchangeRate: exchangeRate.toString(),
        purchaseDate: new Date(date),
        purchasePlatform: platform,
        orderStatus,
        domesticTrackingNumber: trackingNumber || null,
        domesticShipping: domesticShipping.toString(),
        internationalShipping: internationalShipping.toString(),
        otherFees: otherFees ? [{ name: "其他费用", amount: parseFloat(otherFees), currency }] : null,
        remarks,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: "交易记录更新成功",
      data: updatedTransaction
    });

  } catch (error) {
    console.error("更新交易记录失败:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "更新交易记录失败", 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}
