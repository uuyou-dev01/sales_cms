import { NextResponse } from "next/server";
import { getCachedStats } from "@/lib/cache";

export async function GET() {
  try {
    const stats = await getCachedStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error("获取统计数据错误:", error || "未知错误");
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "获取统计数据失败" },
      { status: 500 }
    );
  }
} 