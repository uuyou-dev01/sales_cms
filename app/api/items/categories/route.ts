import { NextResponse } from "next/server";
import { getCachedItems } from "@/lib/cache";

// 商品类型配置
const ITEM_TYPE_CONFIG = {
  "服装": { icon: "👕", color: "bg-blue-100 text-blue-800" },
  "鞋子": { icon: "👟", color: "bg-green-100 text-green-800" },
  "包包": { icon: "👜", color: "bg-purple-100 text-purple-800" },
  "配饰": { icon: "💍", color: "bg-pink-100 text-pink-800" },
  "电子产品": { icon: "📱", color: "bg-orange-100 text-orange-800" },
  "3C&配件": { icon: "📱", color: "bg-orange-100 text-orange-800" },
  "潮玩类": { icon: "🧸", color: "bg-yellow-100 text-yellow-800" },
  "其他": { icon: "📦", color: "bg-gray-100 text-gray-800" },
};

// GET /api/items/categories - 获取商品类型统计
export async function GET() {
  try {
    const allItems = await getCachedItems();
    
    // 统计每个类型的商品数量
    const categoryStats = new Map<string, {
      total: number;
      inStock: number;
      sold: number;
      totalValue: number;
      soldValue: number;
    }>();

    // 统计数据 - 动态发现所有分类
    allItems.forEach(item => {
      const itemType = item.itemType || "其他";
      const transaction = item.transactions?.[0];
      const isSold = transaction?.soldDate;
      const purchasePrice = parseFloat(transaction?.purchasePrice || "0");
      const soldPrice = parseFloat(transaction?.soldPrice || "0");

      if (!categoryStats.has(itemType)) {
        categoryStats.set(itemType, {
          total: 0,
          inStock: 0,
          sold: 0,
          totalValue: 0,
          soldValue: 0,
        });
      }

      const stats = categoryStats.get(itemType)!;
      stats.total += 1;
      stats.totalValue += purchasePrice;

      if (isSold) {
        stats.sold += 1;
        stats.soldValue += soldPrice;
      } else {
        stats.inStock += 1;
      }
    });

    // 转换为数组格式并添加配置信息，只显示有商品的分类
    const categories = Array.from(categoryStats.entries())
      .filter(([type, stats]) => stats.total > 0) // 只显示有商品的分类
      .map(([type, stats]) => ({
        type,
        ...stats,
        config: ITEM_TYPE_CONFIG[type as keyof typeof ITEM_TYPE_CONFIG] || ITEM_TYPE_CONFIG["其他"],
      }))
      .sort((a, b) => b.total - a.total); // 按商品总数排序

    return NextResponse.json({
      success: true,
      categories,
      totalCategories: categories.length,
    });
  } catch (error) {
    console.error("获取商品类型统计失败:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "获取商品类型统计失败" 
      },
      { status: 500 }
    );
  }
}
