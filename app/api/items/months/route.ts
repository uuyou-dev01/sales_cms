import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/items/months - 获取所有商品的购入时间月份
export async function GET() {
  try {
    const transactions = await prisma.transaction.findMany({
      select: {
        purchaseDate: true,
      },
      orderBy: {
        purchaseDate: "desc",
      },
    });

    // 提取所有月份并去重
    const months = new Set<string>();
    transactions.forEach((transaction) => {
      if (transaction.purchaseDate) {
        const date = new Date(transaction.purchaseDate);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        months.add(monthKey);
      }
    });

    // 转换为数组并排序
    const monthList = Array.from(months).sort().reverse();

    return NextResponse.json({ months: monthList });
  } catch (error) {
    console.error("获取月份数据错误:", error || "未知错误");
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "获取月份数据失败" },
      { status: 500 }
    );
  }
} 