import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 获取所有仓库
export async function GET() {
  try {
    const warehouses = await prisma.warehouse.findMany({
      include: {
        positions: {
          include: {
            items: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(warehouses);
  } catch (error) {
    console.error("获取仓库失败:", error || "未知错误");
    return NextResponse.json(
      { error: "获取仓库失败" },
      { status: 500 }
    );
  }
}

// 创建新仓库
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json(
        { error: "仓库名称不能为空" },
        { status: 400 }
      );
    }

    const warehouse = await prisma.warehouse.create({
      data: {
        name,
        description,
      },
      include: {
        positions: true,
      },
    });

    return NextResponse.json(warehouse);
  } catch (error) {
    console.error("创建仓库失败:", error || "未知错误");
    return NextResponse.json(
      { error: "创建仓库失败" },
      { status: 500 }
    );
  }
} 