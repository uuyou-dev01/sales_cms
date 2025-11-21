import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { UserActivityLog } from "@/lib/types";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId') || undefined;
  const where: any = {};
  if (userId) where.userId = userId;
  const logs = await prisma.userActivity.findMany({ where, orderBy: { createdAt: 'desc' }, take: 200 });
  return NextResponse.json({ success: true, data: logs });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as UserActivityLog & { userId: string };
    if (!body.userId || !body.action) return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
    const created = await prisma.userActivity.create({
      data: {
        userId: body.userId,
        action: body.action,
        entityType: body.entityType,
        entityId: body.entityId,
        meta: body.meta as any,
      },
    });
    return NextResponse.json({ success: true, data: created });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || "Server error" }, { status: 500 });
  }
}










