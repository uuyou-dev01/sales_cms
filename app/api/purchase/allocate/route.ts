import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { PurchaseAllocateRequest } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as PurchaseAllocateRequest;
    const order = await prisma.purchaseOrder.findUnique({ where: { id: body.purchaseOrderId }, include: { details: true } });
    if (!order) return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });

    const totalAmount = parseFloat(order.totalAmount as any);
    if (!order.details.length) return NextResponse.json({ success: true });

    if (body.method === 'AVERAGE') {
      const per = totalAmount / order.details.length;
      await prisma.$transaction(order.details.map((d) => prisma.purchaseDetail.update({ where: { id: d.id }, data: { allocatedCost: per as any, allocationMethod: 'AUTO' } })));
    } else if (body.method === 'RATIO') {
      const map = new Map(body.ratios?.map((r) => [r.detailId, r.weight]) || []);
      const sum = Array.from(map.values()).reduce((a, b) => a + b, 0) || 1;
      await prisma.$transaction(
        order.details.map((d) => {
          const w = map.get(d.id) || 0;
          const alloc = (totalAmount * w) / sum;
          return prisma.purchaseDetail.update({ where: { id: d.id }, data: { allocatedCost: alloc as any, allocationMethod: 'RATIO' } });
        })
      );
    } else if (body.method === 'MANUAL') {
      const map = new Map(body.manual?.map((m) => [m.detailId, m.amount]) || []);
      await prisma.$transaction(
        order.details.map((d) => {
          const amt = parseFloat((map.get(d.id) as any) || '0');
          return prisma.purchaseDetail.update({ where: { id: d.id }, data: { allocatedCost: amt as any, allocationMethod: 'MANUAL' } });
        })
      );
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || "Server error" }, { status: 500 });
  }
}










