import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AdjustToyStockRequest, CompleteBatchInboundRequest, ShipUnassignedBatchRequest } from "@/lib/toy-types";

// 调整库存
export async function POST(request: NextRequest) {
  try {
    const body: AdjustToyStockRequest = await request.json();
    
    // 验证必填字段
    if (!body.skuId || !body.adjustmentType || body.quantity === undefined || !body.reason) {
      return NextResponse.json(
        { success: false, error: "缺少必填字段" },
        { status: 400 }
      );
    }

    // 检查SKU是否存在
    const sku = await prisma.toySKU.findUnique({
      where: { id: body.skuId },
    });
    
    if (!sku) {
      return NextResponse.json(
        { success: false, error: "SKU不存在" },
        { status: 404 }
      );
    }

    // 计算新库存
    let newStock: number;
    switch (body.adjustmentType) {
      case "set":
        newStock = body.quantity;
        break;
      case "add":
        newStock = sku.currentStock + body.quantity;
        break;
      case "subtract":
        newStock = sku.currentStock - body.quantity;
        break;
      default:
        return NextResponse.json(
          { success: false, error: "无效的调整类型" },
          { status: 400 }
        );
    }

    // 检查库存不能为负数
    if (newStock < 0) {
      return NextResponse.json(
        { success: false, error: "库存不能为负数" },
        { status: 400 }
      );
    }

    // 使用事务处理库存调整
    const result = await prisma.$transaction(async (tx) => {
      // 更新SKU库存
      const updatedSKU = await tx.toySKU.update({
        where: { id: body.skuId },
        data: { currentStock: newStock },
        include: {
          character: {
            include: {
              series: {
                include: {
                  brand: true
                }
              }
            }
          }
        }
      });

      // 创建库存调整记录
      await tx.stockAdjustment.create({
        data: {
          itemId: body.skuId,
          adjustmentType: body.adjustmentType,
          quantity: body.quantity,
          previousStock: sku.currentStock,
          newStock: newStock,
          reason: body.reason,
          remarks: body.remarks,
        }
      });

      return updatedSKU;
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("调整库存失败:", error);
    return NextResponse.json(
      { success: false, error: "调整库存失败" },
      { status: 500 }
    );
  }
}

// 完成批次入库
export async function PUT(request: NextRequest) {
  try {
    const body: CompleteBatchInboundRequest = await request.json();
    
    // 验证必填字段
    if (!body.purchaseOrderIds || body.purchaseOrderIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "缺少采购订单ID" },
        { status: 400 }
      );
    }

    // 检查采购订单是否存在且状态正确
    const orders = await prisma.toyPurchaseOrder.findMany({
      where: {
        id: { in: body.purchaseOrderIds },
        status: { not: "JAPAN_ARRIVED" }
      },
      include: {
        sku: true
      }
    });

    if (orders.length !== body.purchaseOrderIds.length) {
      return NextResponse.json(
        { success: false, error: "部分采购订单不存在或状态不正确" },
        { status: 400 }
      );
    }

    const arrivalTime = body.arrivalTime ? new Date(body.arrivalTime) : new Date();
    const today = arrivalTime.toISOString().split('T')[0];

    // 使用事务处理批次入库
    const result = await prisma.$transaction(async (tx) => {
      const newBatches = [];
      const skuUpdates = new Map<string, { totalQuantity: number, skuId: string }>();

      // 为每个订单创建库存批次
      for (const order of orders) {
        const unitCostPrice = order.amount / order.quantity + (order.shippingCost || 0);
        
        const batch = await tx.inventoryBatch.create({
          data: {
            skuId: order.skuId,
            quantity: order.quantity,
            inboundDate: arrivalTime,
            purchaseOrderId: order.id,
            unitCostPrice: unitCostPrice,
          }
        });

        newBatches.push(batch);

        // 累计SKU库存更新
        if (skuUpdates.has(order.skuId)) {
          const update = skuUpdates.get(order.skuId)!;
          update.totalQuantity += order.quantity;
        } else {
          skuUpdates.set(order.skuId, {
            totalQuantity: order.quantity,
            skuId: order.skuId
          });
        }
      }

      // 更新SKU库存
      for (const [skuId, update] of skuUpdates) {
        await tx.toySKU.update({
          where: { id: skuId },
          data: {
            currentStock: {
              increment: update.totalQuantity
            }
          }
        });
      }

      // 更新采购订单状态
      await tx.toyPurchaseOrder.updateMany({
        where: {
          id: { in: body.purchaseOrderIds }
        },
        data: {
          status: "JAPAN_ARRIVED",
          arrivalTime: arrivalTime
        }
      });

      return {
        batches: newBatches,
        updatedOrders: orders.length,
        updatedSKUs: skuUpdates.size
      };
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("完成批次入库失败:", error);
    return NextResponse.json(
      { success: false, error: "完成批次入库失败" },
      { status: 500 }
    );
  }
}

// 发货未分配批次
export async function PATCH(request: NextRequest) {
  try {
    const body: ShipUnassignedBatchRequest = await request.json();
    
    // 验证必填字段
    if (!body.skuId || !body.batch || !body.totalShippingAmount || !body.totalShippingWeight) {
      return NextResponse.json(
        { success: false, error: "缺少必填字段" },
        { status: 400 }
      );
    }

    // 检查SKU是否存在
    const sku = await prisma.toySKU.findUnique({
      where: { id: body.skuId },
    });
    
    if (!sku) {
      return NextResponse.json(
        { success: false, error: "SKU不存在" },
        { status: 404 }
      );
    }

    // 获取该SKU未分配批次的订单
    const unassignedOrders = await prisma.toyPurchaseOrder.findMany({
      where: {
        skuId: body.skuId,
        status: "DOMESTIC_IN_TRANSIT",
        batch: null
      }
    });

    if (unassignedOrders.length === 0) {
      return NextResponse.json(
        { success: false, error: "没有未分配的订单" },
        { status: 400 }
      );
    }

    const today = new Date().toISOString().split('T')[0];

    // 使用事务处理发货
    const result = await prisma.$transaction(async (tx) => {
      // 计算每个订单的单个邮费
      const updatedOrders = [];
      for (const order of unassignedOrders) {
        const shippingCost = body.totalShippingWeight > 0 
          ? (order.weight / body.totalShippingWeight) * body.totalShippingAmount / order.quantity
          : 0;
        
        const updatedOrder = await tx.toyPurchaseOrder.update({
          where: { id: order.id },
          data: {
            batch: body.batch,
            status: "JAPAN_IN_TRANSIT",
            shippingDate: new Date(today),
            shippingCost: shippingCost,
            totalShippingAmount: body.totalShippingAmount,
            totalShippingWeight: body.totalShippingWeight,
          }
        });

        updatedOrders.push(updatedOrder);
      }

      return {
        updatedOrders,
        totalQuantity: unassignedOrders.reduce((sum, order) => sum + order.quantity, 0)
      };
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("发货未分配批次失败:", error);
    return NextResponse.json(
      { success: false, error: "发货未分配批次失败" },
      { status: 500 }
    );
  }
}
