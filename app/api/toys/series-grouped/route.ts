import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 获取潮玩系列聚合数据
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const search = searchParams.get("search") || "";

    const where: any = {
      isActive: true,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { brand: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [series, total] = await Promise.all([
      prisma.toySeries.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          brand: true,
          characters: {
            include: {
              skus: {
                include: {
                  inventoryBatches: true,
                  purchaseOrders: true,
                  salesRecords: true,
                }
              }
            }
          }
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.toySeries.count({ where }),
    ]);

    // 转换为聚合数据格式
    const groupedSeries = series.map(series => {
      const allSKUs = series.characters.flatMap(char => char.skus);
      const allSalesRecords = allSKUs.flatMap(sku => sku.salesRecords);
      const allPurchaseOrders = allSKUs.flatMap(sku => sku.purchaseOrders);

      const totalItems = allSKUs.reduce((sum, sku) => sum + sku.currentStock, 0);
      const inStockCount = allSKUs.reduce((sum, sku) => sum + sku.currentStock, 0);
      const soldCount = allSalesRecords.reduce((sum, record) => sum + record.quantity, 0);
      
      const totalPurchaseValue = allPurchaseOrders.reduce((sum, order) => sum + order.amount, 0);
      const totalSoldValue = allSalesRecords.reduce((sum, record) => sum + record.amount, 0);
      const totalProfit = allSalesRecords.reduce((sum, record) => sum + record.profit, 0);
      
      const averageProfitRate = totalPurchaseValue > 0 ? (totalProfit / totalPurchaseValue) * 100 : 0;

      const characters = series.characters.map(char => ({
        characterName: char.name,
        variant: char.rarity || "正常款",
        count: char.skus.reduce((sum, sku) => sum + sku.currentStock, 0),
        inStock: char.skus.reduce((sum, sku) => sum + sku.currentStock, 0),
        sold: char.skus.flatMap(sku => sku.salesRecords).reduce((sum, record) => sum + record.quantity, 0),
      }));

      const latestPurchaseDate = allPurchaseOrders.length > 0 
        ? Math.max(...allPurchaseOrders.map(order => new Date(order.shippingDate).getTime()))
        : 0;
      
      const oldestPurchaseDate = allPurchaseOrders.length > 0 
        ? Math.min(...allPurchaseOrders.map(order => new Date(order.shippingDate).getTime()))
        : 0;

      return {
        seriesId: series.id,
        seriesName: series.name,
        brandName: series.brand.name,
        seriesImage: series.image,
        description: series.description,
        totalItems,
        inStockCount,
        soldCount,
        totalPurchaseValue,
        totalSoldValue,
        totalProfit,
        averageProfitRate,
        characters,
        latestPurchaseDate: latestPurchaseDate ? new Date(latestPurchaseDate).toISOString() : "",
        oldestPurchaseDate: oldestPurchaseDate ? new Date(oldestPurchaseDate).toISOString() : "",
        // 添加管理功能需要的数据
        skus: allSKUs,
        purchaseOrders: allPurchaseOrders,
        salesRecords: allSalesRecords,
      };
    });

    return NextResponse.json({
      success: true,
      data: groupedSeries,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("获取潮玩系列聚合数据失败:", error);
    return NextResponse.json(
      { success: false, error: "获取潮玩系列聚合数据失败" },
      { status: 500 }
    );
  }
}