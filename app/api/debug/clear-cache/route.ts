import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

export async function POST() {
  try {
    // 清除所有相关缓存
    const cacheTags = [
      'items',
      'stats', 
      'months',
      'warehouses',
      'all'
    ];

    // 并行清除所有缓存
    await Promise.all(
      cacheTags.map(tag => revalidateTag(tag))
    );

    return NextResponse.json({
      success: true,
      message: "所有缓存已成功清除",
      clearedTags: cacheTags,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("清除缓存错误:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "清除缓存失败",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
