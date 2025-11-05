import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderIds } = body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json(
        { success: false, message: "请选择要入库的订单" },
        { status: 400 }
      );
    }

    // 使用事务处理批量入库
    const result = await prisma.$transaction(async (tx) => {
      // 获取要入库的订单
      const orders = await tx.toyPurchaseOrder.findMany({
        where: {
          id: { in: orderIds },
          status: { in: ["JAPAN_IN_TRANSIT", "DOMESTIC_IN_TRANSIT"] }
        },
        include: {
          sku: true
        }
      });

      if (orders.length === 0) {
        throw new Error("没有找到有效的在途订单");
      }

      const results = [];

      for (const order of orders) {
        // 更新订单状态为已到达
        const updatedOrder = await tx.toyPurchaseOrder.update({
          where: { id: order.id },
          data: {
            status: "JAPAN_ARRIVED",
            arrivalTime: new Date()
          }
        });

        // 创建库存批次
        const inventoryBatch = await tx.inventoryBatch.create({
          data: {
            skuId: order.skuId,
            quantity: order.quantity,
            inboundDate: new Date(),
            purchaseOrderId: order.id,
            unitCostPrice: order.amount / order.quantity, // 计算单价
          }
        });

        // 更新SKU库存
        await tx.toySKU.update({
          where: { id: order.skuId },
          data: {
            currentStock: {
              increment: order.quantity
            }
          }
        });

        results.push({
          order: updatedOrder,
          inventoryBatch,
          skuName: order.sku.name
        });
      }

      return results;
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: `成功入库 ${result.length} 个订单`
    });
  } catch (error) {
    console.error("批量入库失败:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "批量入库失败" },
      { status: 500 }
    );
  }
}
