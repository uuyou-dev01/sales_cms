import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function DELETE(req: Request) {
  try {
    const { itemId } = await req.json();
    // 假删除：只标记deleted为true，不物理删除
    await prisma.item.update({
        where: { itemId },
      data: { deleted: true },
      });
    // 可选：如需同步删除相关transaction，可加逻辑
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除商品错误:", error || "未知错误");
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "删除失败" },
      { status: 500 }
    );
  }
} 