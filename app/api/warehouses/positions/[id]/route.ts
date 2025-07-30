import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 更新仓位
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, capacity } = body;

    if (!name || !capacity) {
      return NextResponse.json(
        { error: "仓位名称和容量不能为空" },
        { status: 400 }
      );
    }

    const position = await prisma.warehousePosition.update({
      where: { id: params.id },
      data: {
        name,
        capacity: parseInt(capacity),
      },
      include: {
        warehouse: true,
        items: true,
      },
    });

    return NextResponse.json(position);
  } catch (error) {
    console.error("更新仓位失败:", error || "未知错误");
    return NextResponse.json(
      { error: "更新仓位失败" },
      { status: 500 }
    );
  }
}

// 删除仓位
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 检查仓位是否有商品
    const position = await prisma.warehousePosition.findUnique({
      where: { id: params.id },
      include: {
        items: true,
      },
    });

    if (!position) {
      return NextResponse.json(
        { error: "仓位不存在" },
        { status: 404 }
      );
    }

    if (position.items.length > 0) {
      return NextResponse.json(
        { error: "仓位中还有商品，无法删除" },
        { status: 400 }
      );
    }

    await prisma.warehousePosition.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "仓位删除成功" });
  } catch (error) {
    console.error("删除仓位失败:", error || "未知错误");
    return NextResponse.json(
      { error: "删除仓位失败" },
      { status: 500 }
    );
  }
} 