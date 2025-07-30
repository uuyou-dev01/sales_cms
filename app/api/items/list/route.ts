import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/items/list?page=1&pageSize=20&status=xxx&position=xxx&start=2024-01-01&end=2024-02-01&search=xxx
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);
    const status = searchParams.get("status") || undefined;
    const start = searchParams.get("start") ? new Date(searchParams.get("start")!) : undefined;
    const end = searchParams.get("end") ? new Date(searchParams.get("end")!) : undefined;
    const search = searchParams.get("search") || undefined;

    const where: {
      itemStatus?: string;
      OR?: Array<{
        itemName?: { contains: string; mode: "insensitive" };
        itemId?: { contains: string; mode: "insensitive" };
        itemBrand?: { contains: string; mode: "insensitive" };
        itemType?: { contains: string; mode: "insensitive" };
        itemSize?: { contains: string; mode: "insensitive" };
      }>;
      transactions?: {
        some: {
          purchaseDate: {
            gte?: Date;
            lte?: Date;
          };
        };
      };
    } = {};

    if (status) where.itemStatus = status;
    
    // 搜索功能
    if (search && search.trim()) {
      where.OR = [
        { itemName: { contains: search.trim(), mode: "insensitive" } },
        { itemId: { contains: search.trim(), mode: "insensitive" } },
        { itemBrand: { contains: search.trim(), mode: "insensitive" } },
        { itemType: { contains: search.trim(), mode: "insensitive" } },
        { itemSize: { contains: search.trim(), mode: "insensitive" } },
      ];
    }

    if (start || end) {
      where.transactions = {
        some: {
          purchaseDate: {},
        },
      };
      if (start) where.transactions.some.purchaseDate.gte = start;
      if (end) where.transactions.some.purchaseDate.lte = end;
    }

    const items = await prisma.item.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        itemId: true,
        itemName: true,
        itemSize: true,
        itemStatus: true,
        itemBrand: true,
        itemType: true,
        itemCondition: true,
        itemColor: true,
        itemRemarks: true,
        createdAt: true,
        updatedAt: true,
        transactions: {
          orderBy: { purchaseDate: "desc" },
          select: {
            purchaseDate: true,
            purchaseAmount: true,
            soldPrice: true,
            itemNetProfit: true,
            itemGrossProfit: true,
            purchasePlatform: true,
          },
        },
      },
    });
    
    const total = await prisma.item.count({ where });

    return NextResponse.json({ items, total, page, pageSize });
  } catch (error) {
    console.error("获取商品列表错误:", error);
    console.error("错误详情:", {
      message: error instanceof Error ? error.message : "未知错误",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "获取商品列表失败" },
      { status: 500 }
    );
  }
} 