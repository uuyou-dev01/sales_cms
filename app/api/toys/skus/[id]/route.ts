import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UpdateToySKURequest } from "@/lib/toy-types";

// 获取SKU详情
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sku = await prisma.toySKU.findUnique({
      where: { id: params.id },
      include: {
        character: {
          include: {
            series: {
              include: {
                brand: true
              }
            }
          }
        },
        inventoryBatches: {
          orderBy: { inboundDate: "asc" }
        },
        purchaseOrders: {
          orderBy: { createdAt: "desc" }
        },
        salesRecords: {
          orderBy: { date: "desc" }
        },
      },
    });

    if (!sku) {
      return NextResponse.json(
        { success: false, error: "SKU不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: sku,
    });
  } catch (error) {
    console.error("获取SKU详情失败:", error);
    return NextResponse.json(
      { success: false, error: "获取SKU详情失败" },
      { status: 500 }
    );
  }
}

// 更新SKU
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body: UpdateToySKURequest = await request.json();

    // 检查SKU是否存在
    const existingSKU = await prisma.toySKU.findUnique({
      where: { id: params.id },
    });

    if (!existingSKU) {
      return NextResponse.json(
        { success: false, error: "SKU不存在" },
        { status: 404 }
      );
    }

    // 如果更新名称，检查是否重复
    if (body.name && body.name !== existingSKU.name) {
      const duplicateSKU = await prisma.toySKU.findUnique({
        where: {
          characterId_name: {
            characterId: existingSKU.characterId,
            name: body.name,
          },
        },
      });

      if (duplicateSKU) {
        return NextResponse.json(
          { success: false, error: "该角色下已存在同名SKU" },
          { status: 400 }
        );
      }
    }

    const sku = await prisma.toySKU.update({
      where: { id: params.id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.image !== undefined && { image: body.image }),
        ...(body.suggestedPrice !== undefined && { suggestedPrice: body.suggestedPrice }),
        ...(body.costPrice !== undefined && { costPrice: body.costPrice }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
      include: {
        character: {
          include: {
            series: {
              include: {
                brand: true
              }
            }
          }
        },
        inventoryBatches: true,
        purchaseOrders: true,
        salesRecords: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: sku,
    });
  } catch (error) {
    console.error("更新SKU失败:", error);
    return NextResponse.json(
      { success: false, error: "更新SKU失败" },
      { status: 500 }
    );
  }
}

// 删除SKU
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 检查SKU是否存在
    const existingSKU = await prisma.toySKU.findUnique({
      where: { id: params.id },
    });

    if (!existingSKU) {
      return NextResponse.json(
        { success: false, error: "SKU不存在" },
        { status: 404 }
      );
    }

    // 检查是否有库存、采购订单或销售记录
    const [inventoryCount, purchaseCount, salesCount] = await Promise.all([
      prisma.inventoryBatch.count({ where: { skuId: params.id } }),
      prisma.toyPurchaseOrder.count({ where: { skuId: params.id } }),
      prisma.toySalesRecord.count({ where: { skuId: params.id } }),
    ]);

    if (inventoryCount > 0 || purchaseCount > 0 || salesCount > 0) {
      return NextResponse.json(
        { success: false, error: "SKU存在相关数据，无法删除" },
        { status: 400 }
      );
    }

    await prisma.toySKU.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: "SKU删除成功",
    });
  } catch (error) {
    console.error("删除SKU失败:", error);
    return NextResponse.json(
      { success: false, error: "删除SKU失败" },
      { status: 500 }
    );
  }
}
