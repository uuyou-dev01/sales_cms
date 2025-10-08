import { NextResponse } from "next/server";
import { getCachedItems } from "@/lib/cache";
import { prisma } from "@/lib/prisma";

// GET /api/toys/series/[seriesId] - 获取特定系列的详细信息
export async function GET(req: Request, { params }: { params: Promise<{ seriesId: string }> }) {
  try {
    const { seriesId } = await params;

    // 获取系列信息
    const series = await prisma.toySeries.findUnique({
      where: { id: seriesId },
      include: {
        brand: true,
        characters: {
          where: { isActive: true },
          include: {
            items: {
              where: { 
                deleted: false,
                itemType: "潮玩类"
              },
              include: {
                transactions: {
                  orderBy: { createdAt: 'desc' },
                  take: 1
                }
              }
            }
          }
        }
      }
    });

    if (!series) {
      return NextResponse.json(
        { success: false, error: "系列不存在" },
        { status: 404 }
      );
    }

    // 统计数据
    let totalItems = 0;
    let inStockCount = 0;
    let soldCount = 0;
    let totalPurchaseValue = 0;
    let totalSoldValue = 0;
    let totalProfit = 0;

    // 按角色和变体分组
    const characterMap = new Map<string, any>();

    series.characters.forEach(character => {
      character.items.forEach(item => {
        const transaction = item.transactions?.[0];
        const characterKey = `${character.name}-${item.toyVariant || "正常款"}`;
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

        // 统计总值
        totalItems++;
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
            characterName: character.name,
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
          characterName: character.name,
          variant: item.toyVariant || "正常款",
          condition: item.toyCondition || item.itemCondition,
          purchasePrice,
          soldPrice,
          orderStatus: transaction?.orderStatus || "在途（国内）",
          purchaseDate: transaction?.purchaseDate || "",
          soldDate: transaction?.soldDate,
          profit: soldPrice ? profit : undefined,
        });
      });
    });

    // 计算平均利润率
    const averageProfitRate = totalSoldValue > 0 ? (totalProfit / totalSoldValue) * 100 : 0;

    const result = {
      seriesId: series.id,
      seriesName: series.name,
      brandName: series.brand.name,
      seriesImage: series.image,
      description: series.description,
      totalItems,
      inStockCount,
      soldCount,
      totalPurchaseValue: Math.round(totalPurchaseValue * 100) / 100,
      totalSoldValue: Math.round(totalSoldValue * 100) / 100,
      totalProfit: Math.round(totalProfit * 100) / 100,
      averageProfitRate: Math.round(averageProfitRate * 10) / 10,
      characters: Array.from(characterMap.values()),
    };

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error("获取系列详情失败:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "获取系列详情失败", 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}
