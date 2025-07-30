import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
    });

    // 计算统计数据
    let totalWarehouses = warehouses.length;
    let totalPositions = 0;
    let totalCapacity = 0;
    let totalUsed = 0;
    let fullPositions = 0;

    warehouses.forEach(warehouse => {
      warehouse.positions.forEach(position => {
        totalPositions++;
        totalCapacity += position.capacity;
        totalUsed += position.used;
        if (position.used >= position.capacity) {
          fullPositions++;
        }
      });
    });

    const usageRate = totalCapacity > 0 ? Math.round((totalUsed / totalCapacity) * 100) : 0;

    return NextResponse.json({
      totalWarehouses,
      totalPositions,
      totalCapacity,
      totalUsed,
      fullPositions,
      usageRate,
      warehouses: warehouses.map(warehouse => ({
        id: warehouse.id,
        name: warehouse.name,
        description: warehouse.description,
        positions: warehouse.positions.map(position => ({
          id: position.id,
          name: position.name,
          capacity: position.capacity,
          used: position.used,
          items: position.items.length,
        })),
      })),
    });
  } catch (error) {
    console.error("获取仓库统计失败:", error || "未知错误");
    return NextResponse.json(
      { error: "获取仓库统计失败" },
      { status: 500 }
    );
  }
} 