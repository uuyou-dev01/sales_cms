import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { PurchaseCreateRequest } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as PurchaseCreateRequest;
    const order = await prisma.purchaseOrder.create({
      data: {
        orderNumber: body.orderNumber,
        totalAmount: body.totalAmount as any,
        currency: body.currency,
        purchaseDate: new Date(body.purchaseDate),
        exchangeRateId: body.exchangeRateId ?? undefined,
        remarks: body.remarks,
        details: {
          create: body.details.map((d) => ({
            skuId: d.skuId,
            quantity: d.quantity,
            unitPrice: (d.unitPrice as any) ?? undefined,
            allocationMethod: d.allocationMethod ?? 'AUTO',
            itemIds: [],
          })),
        },
      },
      include: { details: true },
    });
    return NextResponse.json({ success: true, data: order });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || "Server error" }, { status: 500 });
  }
}










