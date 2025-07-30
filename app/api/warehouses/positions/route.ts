import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 创建新仓位
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, capacity, warehouseId } = body;

    if (!name || !capacity || !warehouseId) {
      return NextResponse.json(
        { error: "仓位名称、容量和仓库ID不能为空" },
        { status: 400 }
      );
    }

    // 检查仓库是否存在
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: warehouseId },
    });

    if (!warehouse) {
      return NextResponse.json(
        { error: "仓库不存在" },
        { status: 404 }
      );
    }

    const position = await prisma.warehousePosition.create({
      data: {
        name,
        capacity: parseInt(capacity),
        warehouseId,
      },
      include: {
        warehouse: true,
        items: true,
      },
    });

    return NextResponse.json(position);
  } catch (error) {
    console.error("创建仓位失败:", error || "未知错误");
    return NextResponse.json(
      { error: "创建仓位失败" },
      { status: 500 }
    );
  }
} 