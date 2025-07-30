import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/items/stats?start=2024-01-01&end=2024-01-31
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const start = searchParams.get("start") ? new Date(searchParams.get("start")!) : undefined;
    const end = searchParams.get("end") ? new Date(searchParams.get("end")!) : undefined;

    const where: {
      itemStatus?: string;
      transactions?: {
        some: {
          purchaseDate: {
            gte?: Date;
            lte?: Date;
          };
        };
      };
    } = {};
    if (start || end) {
      where.transactions = {
        some: {
          purchaseDate: {},
        },
      };
      if (start) where.transactions.some.purchaseDate.gte = start;
      if (end) where.transactions.some.purchaseDate.lte = end;
    }

    // 获取所有符合条件的商品
    const items = await prisma.item.findMany({
      where,
      select: {
        itemStatus: true,
        itemSize: true,
        transactions: {
          orderBy: { purchaseDate: "desc" },
          take: 1,
          select: {
            purchaseAmount: true,
            soldPrice: true,
            itemNetProfit: true,
            itemGrossProfit: true,
          },
        },
      },
    });

    // 计算统计数据
    let totalPurchase = 0;
    let totalSold = 0;
    let totalProfit = 0;
    let inStockCount = 0;
    let soldCount = 0;
    const totalItems = items.length;
    const warehousePositions = new Set<string>();

    items.forEach((item: {
      itemStatus: string;
      itemSize: string;
      transactions: Array<{
        purchaseAmount: string | null;
        soldPrice: string | null;
        itemNetProfit: string | null;
        itemGrossProfit: string | null;
      }>;
    }) => {
      const transaction = item.transactions[0];
      if (transaction) {
        totalPurchase += parseFloat(transaction.purchaseAmount || "0");
        if (transaction.soldPrice && parseFloat(transaction.soldPrice) > 0) {
          totalSold += parseFloat(transaction.soldPrice);
          soldCount++;
        }
        totalProfit += parseFloat(transaction.itemNetProfit || "0");
      }
      
      if (item.itemStatus !== "completed" && item.itemStatus !== "cancelled") {
        inStockCount++;
        // 添加库位信息（这里用itemSize作为示例，实际应该从数据库字段获取）
        if (item.itemSize) {
          warehousePositions.add(item.itemSize);
        }
      }
    });

    const averageProfitRate = totalPurchase > 0 ? ((totalProfit / totalPurchase) * 100).toFixed(2) : "0.00";
    const warehouseInfo = warehousePositions.size > 0 ? `${warehousePositions.size}个库位` : "无库位信息";

    return NextResponse.json({
      // 总览数据
      totalPurchase: Math.round(totalPurchase * 100) / 100,
      totalSold: Math.round(totalSold * 100) / 100,
      averageProfitRate,
      inStockCount,
      soldCount,
      totalItems,
      warehouseInfo,
      
      // 月度数据（当有日期筛选时）
      monthlyPurchase: start && end ? Math.round(totalPurchase * 100) / 100 : 0,
      monthlySold: start && end ? Math.round(totalSold * 100) / 100 : 0,
      monthlyProfitRate: start && end ? averageProfitRate : "0.00",
      monthlySoldCount: start && end ? soldCount : 0,
      
      // 是否为月度视图
      isMonthlyView: !!(start && end),
    });
  } catch (error) {
    console.error("获取统计数据错误:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "获取统计数据失败" },
      { status: 500 }
    );
  }
} 