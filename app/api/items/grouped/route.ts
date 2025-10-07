import { NextResponse } from "next/server";
import { getCachedItems } from "@/lib/cache";

// 按货号聚合的商品数据接口
interface GroupedItem {
  itemNumber: string;
  itemName: string;
  itemBrand: string;
  itemType: string;
  itemColor?: string;
  itemCondition?: string;
  totalItems: number;
  inStockCount: number;
  soldCount: number;
  totalPurchaseValue: number;
  totalSoldValue: number;
  totalProfit: number;
  averageProfitRate: number;
  sizes: Array<{
    size: string;
    count: number;
    inStock: number;
    sold: number;
    avgPurchasePrice: number;
    avgSoldPrice: number;
    items: Array<{
      itemId: string;
      itemSize: string;
      purchasePrice: number;
      soldPrice?: number;
      orderStatus: string;
      purchaseDate: string;
      soldDate?: string;
      profit?: number;
    }>;
  }>;
  photos: string[];
  latestPurchaseDate: string;
  oldestPurchaseDate: string;
}

// GET /api/items/grouped - 获取按货号聚合的商品数据
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "24", 10);
    const search = searchParams.get("search") || undefined;
    const itemType = searchParams.get("itemType") || undefined;
    const status = searchParams.get("status") || undefined;

    // 从缓存获取所有数据
    const allItems = await getCachedItems();

    // 按货号分组
    const groupedMap = new Map<string, any[]>();
    
    allItems.forEach(item => {
      const itemNumber = item.itemNumber || "未知货号";
      if (!groupedMap.has(itemNumber)) {
        groupedMap.set(itemNumber, []);
      }
      groupedMap.get(itemNumber)!.push(item);
    });

    // 转换为聚合数据
    let groupedItems: GroupedItem[] = Array.from(groupedMap.entries()).map(([itemNumber, items]) => {
      // 使用第一个商品的基本信息作为代表
      const representativeItem = items[0];
      
      // 按尺码分组统计
      const sizeMap = new Map<string, any>();
      let totalPurchaseValue = 0;
      let totalSoldValue = 0;
      let totalProfit = 0;
      let inStockCount = 0;
      let soldCount = 0;
      let allPhotos: string[] = [];

      items.forEach(item => {
        const transaction = item.transactions?.[0];
        const size = item.itemSize;
        const purchasePrice = parseFloat(transaction?.purchasePrice || "0");
        const soldPrice = transaction?.soldPrice ? parseFloat(transaction.soldPrice) : undefined;
        const isSold = !!transaction?.soldDate;
        
        // 使用结汇时的汇率计算利润（如果已结算）
        let profit = 0;
        let soldPriceCNY = 0;
        if (soldPrice && transaction?.soldPriceExchangeRate) {
          soldPriceCNY = soldPrice * parseFloat(transaction.soldPriceExchangeRate);
          profit = soldPriceCNY - purchasePrice;
        }

        // 收集所有图片
        if (item.photos && item.photos.length > 0) {
          allPhotos.push(...item.photos);
        }

        // 统计总值
        totalPurchaseValue += purchasePrice;
        if (soldPrice && transaction?.soldPriceExchangeRate) {
          totalSoldValue += soldPriceCNY; // 使用人民币计算总售价
          totalProfit += profit;
        }

        // 统计数量
        if (isSold) {
          soldCount++;
        } else {
          inStockCount++;
        }

        // 按尺码统计
        if (!sizeMap.has(size)) {
          sizeMap.set(size, {
            size,
            count: 0,
            inStock: 0,
            sold: 0,
            totalPurchasePrice: 0,
            totalSoldPrice: 0,
            items: []
          });
        }

        const sizeData = sizeMap.get(size);
        sizeData.count++;
        sizeData.totalPurchasePrice += purchasePrice;
        
        if (isSold) {
          sizeData.sold++;
          // 使用结汇汇率转换的人民币价格
          if (soldPrice && transaction?.soldPriceExchangeRate) {
            sizeData.totalSoldPrice += soldPriceCNY;
          }
        } else {
          sizeData.inStock++;
        }

        sizeData.items.push({
          itemId: item.itemId,
          itemSize: item.itemSize,
          purchasePrice,
          soldPrice,
          orderStatus: transaction?.orderStatus || "在途（国内）",
          purchaseDate: transaction?.purchaseDate || "",
          soldDate: transaction?.soldDate,
          profit: soldPrice ? profit : undefined,
        });
      });

      // 计算平均利润率（基于售价）
      const averageProfitRate = totalSoldValue > 0 ? (totalProfit / totalSoldValue) * 100 : 0;

      // 转换尺码数据
      const sizes = Array.from(sizeMap.values()).map(sizeData => ({
        size: sizeData.size,
        count: sizeData.count,
        inStock: sizeData.inStock,
        sold: sizeData.sold,
        avgPurchasePrice: sizeData.count > 0 ? sizeData.totalPurchasePrice / sizeData.count : 0,
        avgSoldPrice: sizeData.sold > 0 ? sizeData.totalSoldPrice / sizeData.sold : 0,
        items: sizeData.items,
      })).sort((a, b) => {
        // 尺码排序：数字尺码按数值排序，字母尺码按字母排序
        const aNum = parseFloat(a.size);
        const bNum = parseFloat(b.size);
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return aNum - bNum;
        }
        return a.size.localeCompare(b.size);
      });

      // 获取最早和最晚购买日期
      const purchaseDates = items
        .map(item => item.transactions?.[0]?.purchaseDate)
        .filter(date => date)
        .sort();
      
      return {
        itemNumber,
        itemName: representativeItem.itemName,
        itemBrand: representativeItem.itemBrand || "",
        itemType: representativeItem.itemType || "",
        itemColor: representativeItem.itemColor,
        itemCondition: representativeItem.itemCondition,
        totalItems: items.length,
        inStockCount,
        soldCount,
        totalPurchaseValue,
        totalSoldValue,
        totalProfit,
        averageProfitRate,
        sizes,
        photos: [...new Set(allPhotos)].slice(0, 5), // 去重并限制数量
        latestPurchaseDate: purchaseDates[purchaseDates.length - 1] || "",
        oldestPurchaseDate: purchaseDates[0] || "",
      };
    });

    // 筛选逻辑
    if (search && search.trim()) {
      const searchTerm = search.trim().toLowerCase();
      groupedItems = groupedItems.filter(item =>
        item.itemName.toLowerCase().includes(searchTerm) ||
        item.itemNumber.toLowerCase().includes(searchTerm) ||
        item.itemBrand.toLowerCase().includes(searchTerm)
      );
    }

    if (itemType && itemType !== "all") {
      groupedItems = groupedItems.filter(item => item.itemType === itemType);
    }

    if (status && status !== "all") {
      if (status === "in_stock") {
        groupedItems = groupedItems.filter(item => item.inStockCount > 0);
      } else if (status === "sold") {
        groupedItems = groupedItems.filter(item => item.soldCount > 0);
      }
    }

    // 排序：按总商品数量降序
    groupedItems.sort((a, b) => b.totalItems - a.totalItems);

    // 分页
    const total = groupedItems.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedItems = groupedItems.slice(startIndex, endIndex);

    return NextResponse.json({
      success: true,
      items: paginatedItems,
      total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("获取聚合商品数据失败:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "获取聚合商品数据失败" 
      },
      { status: 500 }
    );
  }
}
