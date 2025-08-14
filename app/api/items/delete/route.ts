import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidateTag } from "next/cache";

export async function DELETE(req: Request) {
  try {
    const { itemId } = await req.json();

    // 获取商品信息以检查是否有仓库位置
    const item = await prisma.item.findUnique({
      where: { itemId },
      select: { warehousePositionId: true },
    });

    // 开始事务
    await prisma.$transaction(async (tx) => {
      // 软删除商品
      await tx.item.update({
        where: { itemId },
        data: { 
          deleted: true,
          updatedAt: new Date()
        },
      });

      // 如果商品在仓库位置中，减少使用量
      if (item?.warehousePositionId) {
        await tx.warehousePosition.update({
          where: { id: item.warehousePositionId },
          data: {
            used: {
              decrement: 1,
            },
          },
        });
      }
    });

    // 重新验证缓存
    revalidateTag('items');
    revalidateTag('stats');
    revalidateTag('months');
    if (item?.warehousePositionId) {
      revalidateTag('warehouses');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除商品错误:", error || "未知错误");
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "删除商品失败" },
      { status: 500 }
    );
  }
} 