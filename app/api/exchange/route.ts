import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { ExchangeRateUpsert } from "@/lib/types";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const base = searchParams.get('base');
  const quote = searchParams.get('quote');
  const where: any = {};
  if (base) where.baseCurrency = base;
  if (quote) where.quoteCurrency = quote;
  const rates = await prisma.exchangeRate.findMany({ where, orderBy: { rateDate: 'desc' } });
  return NextResponse.json({ success: true, data: rates });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ExchangeRateUpsert;
    const rate = await prisma.exchangeRate.upsert({
      where: { baseCurrency_quoteCurrency_rateDate: { baseCurrency: body.baseCurrency, quoteCurrency: body.quoteCurrency, rateDate: new Date(body.rateDate) } },
      update: { rate: body.rate as any, source: body.source },
      create: { baseCurrency: body.baseCurrency, quoteCurrency: body.quoteCurrency, rate: body.rate as any, rateDate: new Date(body.rateDate), source: body.source },
    });
    return NextResponse.json({ success: true, data: rate });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || "Server error" }, { status: 500 });
  }
}










