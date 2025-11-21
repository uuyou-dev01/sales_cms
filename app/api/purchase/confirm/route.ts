import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { PurchaseConfirmRequest } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as PurchaseConfirmRequest;
    const order = await prisma.purchaseOrder.findUnique({ where: { id: body.purchaseOrderId }, include: { details: true } });
    if (!order) return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });

    // 将分摊成本落到 Item（若已创建）；此处只绑定已有 itemIds
    await prisma.$transaction(async (tx) => {
      for (const d of order.details) {
        if (!d.itemIds.length) continue;
        await tx.item.updateMany({ where: { itemId: { in: d.itemIds } }, data: { purchaseOrderId: order.id, purchaseDetailId: d.id } });
      }
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || "Server error" }, { status: 500 });
  }
}










