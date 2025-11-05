import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 更新系列
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, image } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, message: "系列名称不能为空" },
        { status: 400 }
      );
    }

    const series = await prisma.toySeries.update({
      where: { id },
      data: {
        name: name.trim(),
        description: description || "",
        image: image || "",
      },
    });

    return NextResponse.json({
      success: true,
      data: series,
      message: "系列更新成功",
    });
  } catch (error) {
    console.error("更新系列失败:", error);
    return NextResponse.json(
      { success: false, message: "更新系列失败" },
      { status: 500 }
    );
  }
}

// 删除系列
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // 使用事务删除系列及其相关数据
    await prisma.$transaction(async (tx) => {
      // 删除销售记录
      await tx.toySalesRecord.deleteMany({
        where: {
          sku: {
            character: {
              seriesId: id
            }
          }
        }
      });

      // 删除采购订单
      await tx.toyPurchaseOrder.deleteMany({
        where: {
          sku: {
            character: {
              seriesId: id
            }
          }
        }
      });

      // 删除库存批次
      await tx.inventoryBatch.deleteMany({
        where: {
          sku: {
            character: {
              seriesId: id
            }
          }
        }
      });

      // 删除SKU
      await tx.toySKU.deleteMany({
        where: {
          character: {
            seriesId: id
          }
        }
      });

      // 删除角色
      await tx.toyCharacter.deleteMany({
        where: {
          seriesId: id
        }
      });

      // 删除系列
      await tx.toySeries.delete({
        where: { id }
      });
    });

    return NextResponse.json({
      success: true,
      message: "系列删除成功",
    });
  } catch (error) {
    console.error("删除系列失败:", error);
    return NextResponse.json(
      { success: false, message: "删除系列失败" },
      { status: 500 }
    );
  }
}
