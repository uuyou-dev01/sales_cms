import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidateTag } from "next/cache";

export async function DELETE(req: Request) {
  try {
    const { itemId } = await req.json();

    // 获取商品信息以检查是否有仓库位置
    const item = await prisma.item.findUnique({
      where: { itemId },
      select: { warehousePositionId: true, deleted: true },
    });

    // 已删除的商品不再重复扣减库存占用，直接返回成功（幂等）
    if (!item) {
      return NextResponse.json({ success: true });
    }
    if (item.deleted) {
      return NextResponse.json({ success: true });
    }

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
        const pos = await tx.warehousePosition.findUnique({
          where: { id: item.warehousePositionId },
          select: { used: true },
        });
        if (pos) {
          if (pos.used > 0) {
            await tx.warehousePosition.update({
              where: { id: item.warehousePositionId },
              data: { used: { decrement: 1 } },
            });
          } else {
            // 兜底：保持非负
            await tx.warehousePosition.update({
              where: { id: item.warehousePositionId },
              data: { used: 0 },
            });
          }
        }
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