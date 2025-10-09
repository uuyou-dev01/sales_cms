import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { transactionId } = body;

    if (!transactionId) {
      return NextResponse.json(
        { success: false, error: "缺少交易记录ID" },
        { status: 400 }
      );
    }

    // 检查交易记录是否存在
    const existingTransaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { item: true }
    });

    if (!existingTransaction) {
      return NextResponse.json(
        { success: false, error: "交易记录不存在" },
        { status: 404 }
      );
    }

    // 在事务中删除交易记录和相关的商品记录（如果需要）
    await prisma.$transaction(async (tx) => {
      // 删除交易记录
      await tx.transaction.delete({
        where: { id: transactionId }
      });

      // 检查是否还有其他交易记录关联到这个商品
      const remainingTransactions = await tx.transaction.count({
        where: { itemId: existingTransaction.itemId }
      });

      // 如果没有其他交易记录，可以考虑删除商品记录或标记为删除
      if (remainingTransactions === 0) {
        await tx.item.update({
          where: { itemId: existingTransaction.itemId },
          data: { deleted: true }
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: "交易记录删除成功"
    });

  } catch (error) {
    console.error("删除交易记录失败:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "删除交易记录失败", 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}
