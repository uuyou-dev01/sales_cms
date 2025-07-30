import { NextResponse } from "next/server";
import { getCachedMonths } from "@/lib/cache";

export async function GET() {
  try {
    const months = await getCachedMonths();
    return NextResponse.json(months);
  } catch (error) {
    console.error("获取月份数据错误:", error || "未知错误");
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "获取月份数据失败" },
      { status: 500 }
    );
  }
} 