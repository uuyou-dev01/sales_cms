import { NextResponse } from "next/server";
import { getCachedItems } from "@/lib/cache";
import { prisma } from "@/lib/prisma";

// 潮玩系列聚合数据接口
interface ToySeriesGrouped {
  seriesId: string;
  seriesName: string;
  brandName: string;
  seriesImage?: string;
  description?: string;
  totalItems: number;
  inStockCount: number;
  soldCount: number;
  totalPurchaseValue: number;
  totalSoldValue: number;
  totalProfit: number;
  averageProfitRate: number;
  characters: Array<{
    characterName: string;
    variant: string;
    count: number;
    inStock: number;
    sold: number;
    items: Array<{
      itemId: string;
      itemName: string;
      purchasePrice: number;
      soldPrice?: number;
      orderStatus: string;
      purchaseDate: string;
      soldDate?: string;
      profit?: number;
    }>;
  }>;
  latestPurchaseDate: string;
  oldestPurchaseDate: string;
}

// GET /api/toys/series-grouped - 获取按系列聚合的潮玩商品数据
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "24", 10);
    const search = searchParams.get("search") || undefined;
    const itemType = searchParams.get("itemType") || undefined;

    // 如果筛选的不是潮玩类，直接返回空结果
    if (itemType && itemType !== "潮玩类" && itemType !== "all") {
      return NextResponse.json({
        success: true,
        data: [],
        pagination: {
          page,
          pageSize,
          totalCount: 0,
          totalPages: 0,
          hasMore: false,
        },
      });
    }

    // 从缓存获取所有潮玩类商品
    const allItems = await getCachedItems();
    const toyItems = allItems.filter(item => item.itemType === "潮玩类" && item.toyCharacterId);

    // 获取所有相关的系列信息
    const characterIds = [...new Set(toyItems.map(item => item.toyCharacterId).filter(Boolean))];
    const characters = await prisma.toyCharacter.findMany({
      where: { id: { in: characterIds } },
      include: {
        series: {
          include: {
            brand: true
          }
        }
      }
    });

    // 按系列分组
    const seriesMap = new Map<string, any[]>();
    
    toyItems.forEach(item => {
      const character = characters.find(c => c.id === item.toyCharacterId);
      if (!character) return;
      
      const seriesId = character.series.id;
      if (!seriesMap.has(seriesId)) {
        seriesMap.set(seriesId, []);
      }
      seriesMap.get(seriesId)!.push({ ...item, character });
    });

    // 转换为聚合数据
    let groupedSeries: ToySeriesGrouped[] = Array.from(seriesMap.entries()).map(([seriesId, items]) => {
      const firstItem = items[0];
      const series = firstItem.character.series;
      
      // 按角色和变体分组统计
      const characterMap = new Map<string, any>();
      let totalPurchaseValue = 0;
      let totalSoldValue = 0;
      let totalProfit = 0;
      let inStockCount = 0;
      let soldCount = 0;
      let purchaseDates: string[] = [];

      items.forEach(item => {
        const transaction = item.transactions?.[0];
        const characterKey = `${item.character.name}-${item.toyVariant || "正常款"}`;
        const purchasePrice = parseFloat(transaction?.purchasePrice || "0");
        const soldPrice = transaction?.soldPrice ? parseFloat(transaction.soldPrice) : undefined;
        const isSold = !!transaction?.soldDate;
        
        // 使用结汇时的汇率计算利润
        let profit = 0;
        let soldPriceCNY = 0;
        if (soldPrice && transaction?.soldPriceExchangeRate) {
          soldPriceCNY = soldPrice * parseFloat(transaction.soldPriceExchangeRate);
          profit = soldPriceCNY - purchasePrice;
        }

        // 收集购买日期
        if (transaction?.purchaseDate) {
          purchaseDates.push(transaction.purchaseDate);
        }

        // 统计总值
        totalPurchaseValue += purchasePrice;
        if (soldPrice && transaction?.soldPriceExchangeRate) {
          totalSoldValue += soldPriceCNY;
          totalProfit += profit;
        }

        // 统计数量
        if (isSold) {
          soldCount++;
        } else {
          inStockCount++;
        }

        // 按角色和变体统计
        if (!characterMap.has(characterKey)) {
          characterMap.set(characterKey, {
            characterName: item.character.name,
            variant: item.toyVariant || "正常款",
            count: 0,
            inStock: 0,
            sold: 0,
            items: []
          });
        }

        const characterData = characterMap.get(characterKey);
        characterData.count++;
        
        if (isSold) {
          characterData.sold++;
        } else {
          characterData.inStock++;
        }

        characterData.items.push({
          itemId: item.itemId,
          itemName: item.itemName,
          purchasePrice,
          soldPrice,
          orderStatus: transaction?.orderStatus || "在途（国内）",
          purchaseDate: transaction?.purchaseDate || "",
          soldDate: transaction?.soldDate,
          profit: soldPrice ? profit : undefined,
        });
      });

      // 计算平均利润率
      const averageProfitRate = totalSoldValue > 0 ? (totalProfit / totalSoldValue) * 100 : 0;

      // 排序购买日期
      purchaseDates.sort();

      return {
        seriesId,
        seriesName: series.name,
        brandName: series.brand.name,
        seriesImage: series.image,
        description: series.description,
        totalItems: items.length,
        inStockCount,
        soldCount,
        totalPurchaseValue: Math.round(totalPurchaseValue * 100) / 100,
        totalSoldValue: Math.round(totalSoldValue * 100) / 100,
        totalProfit: Math.round(totalProfit * 100) / 100,
        averageProfitRate: Math.round(averageProfitRate * 10) / 10,
        characters: Array.from(characterMap.values()),
        latestPurchaseDate: purchaseDates[purchaseDates.length - 1] || "",
        oldestPurchaseDate: purchaseDates[0] || "",
      };
    });

    // 应用搜索过滤
    if (search) {
      const searchLower = search.toLowerCase();
      groupedSeries = groupedSeries.filter(series =>
        series.seriesName.toLowerCase().includes(searchLower) ||
        series.brandName.toLowerCase().includes(searchLower) ||
        series.characters.some(char => char.characterName.toLowerCase().includes(searchLower))
      );
    }

    // 按最新购买日期排序
    groupedSeries.sort((a, b) => {
      if (!a.latestPurchaseDate && !b.latestPurchaseDate) return 0;
      if (!a.latestPurchaseDate) return 1;
      if (!b.latestPurchaseDate) return -1;
      return new Date(b.latestPurchaseDate).getTime() - new Date(a.latestPurchaseDate).getTime();
    });

    // 分页
    const totalCount = groupedSeries.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedItems = groupedSeries.slice(startIndex, endIndex);

    return NextResponse.json({
      success: true,
      data: paginatedItems,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages,
        hasMore: page < totalPages,
      },
    });

  } catch (error) {
    console.error("获取潮玩系列聚合数据失败:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "获取数据失败", 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}
