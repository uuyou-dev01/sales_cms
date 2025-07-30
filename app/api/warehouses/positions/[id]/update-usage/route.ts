import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 更新仓位使用量
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { action } = body; // "add" 或 "remove"

    if (!action || !["add", "remove"].includes(action)) {
      return NextResponse.json(
        { error: "无效的操作类型" },
        { status: 400 }
      );
    }

    const position = await prisma.warehousePosition.findUnique({
      where: { id: params.id },
    });

    if (!position) {
      return NextResponse.json(
        { error: "仓位不存在" },
        { status: 404 }
      );
    }

    let newUsed = position.used;
    if (action === "add") {
      if (position.used >= position.capacity) {
        return NextResponse.json(
          { error: "仓位已满，无法添加更多商品" },
          { status: 400 }
        );
      }
      newUsed = position.used + 1;
    } else if (action === "remove") {
      if (position.used <= 0) {
        return NextResponse.json(
          { error: "仓位已空，无法移除商品" },
          { status: 400 }
        );
      }
      newUsed = position.used - 1;
    }

    const updatedPosition = await prisma.warehousePosition.update({
      where: { id: params.id },
      data: {
        used: newUsed,
      },
      include: {
        warehouse: true,
        items: true,
      },
    });

    return NextResponse.json(updatedPosition);
  } catch (error) {
    console.error("更新仓位使用量失败:", error || "未知错误");
    return NextResponse.json(
      { error: "更新仓位使用量失败" },
      { status: 500 }
    );
  }
} 