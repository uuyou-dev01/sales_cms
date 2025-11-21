import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { SplitRequest } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SplitRequest;
    const parent = await prisma.item.findUnique({ where: { itemId: body.parentItemId } });
    if (!parent) return NextResponse.json({ success: false, error: "Parent item not found" }, { status: 404 });

    // 计算分摊金额（平均 / 比例 / 手动）
    const parentTx = await prisma.transaction.findFirst({ where: { itemId: parent.itemId } });
    const baseCost = parentTx ? parseFloat(parentTx.purchasePrice || '0') : 0;
    const totalRatio = body.allocations.reduce((s, a) => s + (a.ratio || 0), 0);

    const splits = body.allocations.map((a) => {
      let allocated = 0;
      if (a.method === 'AVERAGE') allocated = baseCost / body.allocations.length;
      else if (a.method === 'RATIO') allocated = totalRatio > 0 ? (baseCost * (a.ratio || 0)) / totalRatio : 0;
      else if (a.method === 'MANUAL') allocated = parseFloat(a.amount || '0');
      return { childItemId: a.childItemId, allocated };
    });

    await prisma.$transaction(async (tx) => {
      for (const s of splits) {
        await tx.inventorySplit.create({
          data: {
            parentItemId: parent.itemId,
            childItemId: s.childItemId,
            method: 'MANUAL',
            allocatedCost: s.allocated.toString(),
          },
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || "Server error" }, { status: 500 });
  }
}










