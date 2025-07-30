import { NextResponse } from "next/server";
import { getCachedWarehouseStats } from "@/lib/cache";

export async function GET() {
  try {
    const stats = await getCachedWarehouseStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error("获取仓库统计数据错误:", error || "未知错误");
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "获取仓库统计数据失败" },
      { status: 500 }
    );
  }
} 