import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { CreateCompositeSkuRequest } from "@/lib/types";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parentSkuId = searchParams.get("parentSkuId");
  const where = parentSkuId ? { parentSkuId } : {};
  const composites = await prisma.compositeSKU.findMany({ where });
  return NextResponse.json({ success: true, data: composites });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CreateCompositeSkuRequest;
    if (!body.parentSkuId || !Array.isArray(body.children)) {
      return NextResponse.json({ success: false, error: "Invalid payload" }, { status: 400 });
    }

    const data = body.children.map((c) => ({ parentSkuId: body.parentSkuId, childSkuId: c.skuId, quantity: c.quantity || 1 }));
    await prisma.$transaction([
      prisma.compositeSKU.deleteMany({ where: { parentSkuId: body.parentSkuId } }),
      prisma.compositeSKU.createMany({ data }),
      prisma.sKU.update({ where: { id: body.parentSkuId }, data: { isComposite: true } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || "Server error" }, { status: 500 });
  }
}










