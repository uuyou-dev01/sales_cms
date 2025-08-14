import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidateTag } from "next/cache";

export async function POST() {
  try {
    // 清空数据库
    await prisma.$transaction(async (tx) => {
      // 删除所有交易记录
      await tx.transaction.deleteMany({});
      
      // 删除所有商品记录
      await tx.item.deleteMany({});
      
      // 删除所有仓位记录
      await tx.warehousePosition.deleteMany({});
      
      // 删除所有仓库记录
      await tx.warehouse.deleteMany({});
    });

    // 强制清除所有相关缓存
    revalidateTag('items');
    revalidateTag('stats');
    revalidateTag('months');
    revalidateTag('warehouses');
    
    // 清除更多可能的缓存标签
    revalidateTag('all');
    
    // 强制重新验证所有缓存
    await Promise.all([
      revalidateTag('items'),
      revalidateTag('stats'),
      revalidateTag('months'),
      revalidateTag('warehouses'),
    ]);

    return NextResponse.json({
      success: true,
      message: "数据库已成功清空，所有缓存已清除",
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("清空数据库错误:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "清空数据库失败",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
