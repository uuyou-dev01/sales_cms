import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

export async function POST() {
  try {
    // 清理所有相关缓存
    revalidateTag('items');
    revalidateTag('stats');
    revalidateTag('months');
    
    return NextResponse.json({ 
      success: true, 
      message: "缓存已清理，数据将重新计算" 
    });
  } catch (error) {
    console.error("清理缓存失败:", error);
    return NextResponse.json(
      { error: "清理缓存失败" },
      { status: 500 }
    );
  }
}


