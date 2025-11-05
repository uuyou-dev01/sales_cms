import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UpdateToyPurchaseOrderRequest } from "@/lib/toy-types";

// 获取采购订单详情
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const order = await prisma.toyPurchaseOrder.findUnique({
      where: { id: params.id },
      include: {
        sku: {
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
        },
        inventoryBatches: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: "采购订单不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error("获取采购订单详情失败:", error);
    return NextResponse.json(
      { success: false, error: "获取采购订单详情失败" },
      { status: 500 }
    );
  }
}

// 更新采购订单
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body: UpdateToyPurchaseOrderRequest = await request.json();

    // 检查采购订单是否存在
    const existingOrder = await prisma.toyPurchaseOrder.findUnique({
      where: { id: params.id },
    });

    if (!existingOrder) {
      return NextResponse.json(
        { success: false, error: "采购订单不存在" },
        { status: 404 }
      );
    }

    // 如果更新国内单号，检查是否重复
    if (body.domesticOrderNumber && body.domesticOrderNumber !== existingOrder.domesticOrderNumber) {
      const duplicateOrder = await prisma.toyPurchaseOrder.findFirst({
        where: { 
          domesticOrderNumber: body.domesticOrderNumber,
          id: { not: params.id }
        },
      });

      if (duplicateOrder) {
        return NextResponse.json(
          { success: false, error: "国内单号已存在" },
          { status: 400 }
        );
      }
    }

    const order = await prisma.toyPurchaseOrder.update({
      where: { id: params.id },
      data: {
        ...(body.domesticOrderNumber && { domesticOrderNumber: body.domesticOrderNumber }),
        ...(body.status && { status: body.status }),
        ...(body.weight !== undefined && { weight: body.weight }),
        ...(body.quantity !== undefined && { quantity: body.quantity }),
        ...(body.amount !== undefined && { amount: body.amount }),
        ...(body.batch !== undefined && { batch: body.batch }),
        ...(body.shippingDate && { shippingDate: new Date(body.shippingDate) }),
        ...(body.arrivalTime !== undefined && { arrivalTime: body.arrivalTime ? new Date(body.arrivalTime) : null }),
        ...(body.shippingCost !== undefined && { shippingCost: body.shippingCost }),
        ...(body.totalShippingAmount !== undefined && { totalShippingAmount: body.totalShippingAmount }),
        ...(body.totalShippingWeight !== undefined && { totalShippingWeight: body.totalShippingWeight }),
      },
      include: {
        sku: {
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
        },
        inventoryBatches: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error("更新采购订单失败:", error);
    return NextResponse.json(
      { success: false, error: "更新采购订单失败" },
      { status: 500 }
    );
  }
}

// 删除采购订单
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 检查采购订单是否存在
    const existingOrder = await prisma.toyPurchaseOrder.findUnique({
      where: { id: params.id },
    });

    if (!existingOrder) {
      return NextResponse.json(
        { success: false, error: "采购订单不存在" },
        { status: 404 }
      );
    }

    // 检查是否有关联的库存批次
    const inventoryCount = await prisma.inventoryBatch.count({
      where: { purchaseOrderId: params.id },
    });

    if (inventoryCount > 0) {
      return NextResponse.json(
        { success: false, error: "采购订单存在关联的库存批次，无法删除" },
        { status: 400 }
      );
    }

    await prisma.toyPurchaseOrder.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: "采购订单删除成功",
    });
  } catch (error) {
    console.error("删除采购订单失败:", error);
    return NextResponse.json(
      { success: false, error: "删除采购订单失败" },
      { status: 500 }
    );
  }
}
