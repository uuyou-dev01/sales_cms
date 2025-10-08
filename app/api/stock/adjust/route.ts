import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const {
      itemId,
      adjustmentType,
      quantity,
      currentStock,
      reason,
      remarks,
    } = await req.json();

    // 验证必需字段
    if (!itemId || !adjustmentType || quantity === undefined) {
      return NextResponse.json(
        { success: false, error: "缺少必需字段" },
        { status: 400 }
      );
    }

    // 计算新的库存数量
    let newStock: number;
    switch (adjustmentType) {
      case "set":
        newStock = quantity;
        break;
      case "add":
        newStock = currentStock + quantity;
        break;
      case "subtract":
        newStock = Math.max(0, currentStock - quantity);
        break;
      default:
        return NextResponse.json(
          { success: false, error: "无效的调整类型" },
          { status: 400 }
        );
    }

    // 验证库存不能为负数
    if (newStock < 0) {
      return NextResponse.json(
        { success: false, error: "库存数量不能为负数" },
        { status: 400 }
      );
    }

    // 开始数据库事务
    const result = await prisma.$transaction(async (tx) => {
      // 验证商品是否存在
      const item = await tx.item.findUnique({
        where: { id: itemId },
      });

      if (!item) {
        throw new Error("商品不存在");
      }

      // 创建库存调整记录
      const stockAdjustment = await tx.stockAdjustment.create({
        data: {
          itemId,
          adjustmentType,
          quantity,
          previousStock: currentStock,
          newStock,
          reason: reason || "手动调整",
          remarks: remarks || "",
          createdAt: new Date(),
        },
      });

      // 更新商品的库存状态（这里假设有一个库存字段，如果没有可以忽略）
      // 注意：这里需要根据实际的数据库结构来调整
      // 如果Item表中没有直接的库存字段，可能需要通过Transaction记录来计算

      return {
        stockAdjustment,
        newStock,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        adjustmentId: result.stockAdjustment.id,
        newStock: result.newStock,
        message: "库存调整成功",
      },
    });
  } catch (error) {
    console.error("库存调整失败:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "库存调整失败",
      },
      { status: 500 }
    );
  }
}
