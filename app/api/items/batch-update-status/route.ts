import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidateTag } from "next/cache";

export async function POST(req: Request) {
  try {
    const { itemIds, status } = await req.json();
    
    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json(
        { error: "请提供有效的商品ID列表" },
        { status: 400 }
      );
    }

    if (!status) {
      return NextResponse.json(
        { error: "请提供状态" },
        { status: 400 }
      );
    }

    // 批量更新商品状态
    const result = await prisma.$transaction(async (tx) => {
      // 更新商品状态 - itemStatus 字段已删除，只更新交易状态
      const updatedItems = await tx.item.updateMany({
        where: {
          itemId: { in: itemIds },
        },
        data: {
          // itemStatus 字段已删除
        },
      });

      // 更新交易状态
      const updatedTransactions = await tx.transaction.updateMany({
        where: {
          itemId: { in: itemIds },
        },
        data: {
                  orderStatus: status,
        },
      });

      return {
        updatedItems: updatedItems.count,
        updatedTransactions: updatedTransactions.count,
      };
    });

    // 重新验证缓存
    revalidateTag('items');
    revalidateTag('stats');
    revalidateTag('months');

    return NextResponse.json({
      success: true,
      message: `成功更新 ${result.updatedItems} 个商品的状态`,
      result,
    });
  } catch (error) {
    console.error("批量更新状态错误:", error || "未知错误");
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "批量更新状态失败" },
      { status: 500 }
    );
  }
} 