import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 更新仓库
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json(
        { error: "仓库名称不能为空" },
        { status: 400 }
      );
    }

    const warehouse = await prisma.warehouse.update({
      where: { id: params.id },
      data: {
        name,
        description,
      },
      include: {
        positions: {
          include: {
            items: true,
          },
        },
      },
    });

    return NextResponse.json(warehouse);
  } catch (error) {
    console.error("更新仓库失败:", error || "未知错误");
    return NextResponse.json(
      { error: "更新仓库失败" },
      { status: 500 }
    );
  }
}

// 删除仓库
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 检查仓库是否有商品
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: params.id },
      include: {
        positions: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!warehouse) {
      return NextResponse.json(
        { error: "仓库不存在" },
        { status: 404 }
      );
    }

    // 检查是否有商品在仓库中
    const hasItems = warehouse.positions.some(position => position.items.length > 0);
    if (hasItems) {
      return NextResponse.json(
        { error: "仓库中还有商品，无法删除" },
        { status: 400 }
      );
    }

    await prisma.warehouse.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "仓库删除成功" });
  } catch (error) {
    console.error("删除仓库失败:", error || "未知错误");
    return NextResponse.json(
      { error: "删除仓库失败" },
      { status: 500 }
    );
  }
} 