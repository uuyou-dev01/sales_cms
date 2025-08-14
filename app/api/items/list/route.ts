import { NextResponse } from "next/server";
import { getCachedItems } from "@/lib/cache";

// GET /api/items/list?page=1&pageSize=20&status=xxx&size=xxx&platform=xxx&dateSort=asc&priceSort=desc&search=xxx
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);
    const status = searchParams.get("status") || undefined;
    const size = searchParams.get("size") || undefined;
    const platform = searchParams.get("platform") || undefined;
    const dateSort = searchParams.get("dateSort") || undefined;
    const priceSort = searchParams.get("priceSort") || undefined;
    const durationSort = searchParams.get("durationSort") || undefined;
    const search = searchParams.get("search") || undefined;
    const start = searchParams.get("start") ? new Date(searchParams.get("start")!) : undefined;
    const end = searchParams.get("end") ? new Date(searchParams.get("end")!) : undefined;

    // 从缓存获取所有数据
    const allItems = await getCachedItems();

    // 前端筛选
    let filteredItems = allItems.filter(item => {
      // 状态筛选 - 使用订单状态而不是商品状态
      if (status && status !== "all") {
        const transaction = item.transactions[0];
        if (!transaction || transaction.orderStatus !== status) {
          return false;
        }
      }

      // 尺寸筛选
      if (size && size !== "all" && item.itemSize !== size) {
        return false;
      }

      // 平台筛选
      if (platform && platform !== "all") {
        const transaction = item.transactions[0];
        if (!transaction || transaction.purchasePlatform !== platform) {
          return false;
        }
      }

      // 日期范围筛选
      if (start || end) {
        const transaction = item.transactions[0];
        if (!transaction) return false;
        
        const purchaseDate = new Date(transaction.purchaseDate);
        if (start && purchaseDate < start) return false;
        if (end && purchaseDate > end) return false;
      }

      // 搜索筛选
      if (search && search.trim()) {
        const searchTerm = search.trim().toLowerCase();
        const matchesSearch = 
          item.itemName.toLowerCase().includes(searchTerm) ||
          item.itemId.toLowerCase().includes(searchTerm) ||
          (item.itemBrand && item.itemBrand.toLowerCase().includes(searchTerm)) ||
          (item.itemType && item.itemType.toLowerCase().includes(searchTerm)) ||
          (item.itemSize && item.itemSize.toLowerCase().includes(searchTerm));
        
        if (!matchesSearch) return false;
      }

      return true;
    });

    // 前端排序
    if (dateSort) {
      filteredItems.sort((a, b) => {
        const dateA = a.transactions[0]?.purchaseDate || "";
        const dateB = b.transactions[0]?.purchaseDate || "";
        
        // 确保日期是字符串格式进行比较
        if (typeof dateA === "string" && typeof dateB === "string") {
          return dateSort === "asc" 
            ? dateA.localeCompare(dateB)
            : dateB.localeCompare(dateA);
        }
        
        // 如果日期是Date对象，转换为字符串再比较
        const dateAStr = dateA instanceof Date ? dateA.toISOString() : String(dateA);
        const dateBStr = dateB instanceof Date ? dateB.toISOString() : String(dateB);
        
        return dateSort === "asc" 
          ? dateAStr.localeCompare(dateBStr)
          : dateBStr.localeCompare(dateAStr);
      });
    } else if (priceSort) {
      filteredItems.sort((a, b) => {
        const priceA = parseFloat(a.transactions[0]?.purchasePrice || "0");
        const priceB = parseFloat(b.transactions[0]?.purchasePrice || "0");
        return priceSort === "asc" ? priceA - priceB : priceB - priceA;
      });
    } else if (durationSort) {
      filteredItems.sort((a, b) => {
        const transactionA = a.transactions[0];
        const transactionB = b.transactions[0];
        
        if (!transactionA || !transactionB) return 0;
        
        const durationA = Date.now() - new Date(transactionA.purchaseDate).getTime();
        const durationB = Date.now() - new Date(transactionB.purchaseDate).getTime();
        
        return durationSort === "asc" ? durationA - durationB : durationB - durationA;
      });
    } else {
      // 默认排序：按购入时间降序（越晚购买的越在上面）
      filteredItems.sort((a, b) => {
        const dateA = a.transactions[0]?.purchaseDate || "";
        const dateB = b.transactions[0]?.purchaseDate || "";
        
        // 确保日期是字符串格式进行比较
        if (typeof dateA === "string" && typeof dateB === "string") {
          // 降序排列：越晚的日期越在上面
          return dateB.localeCompare(dateA);
        }
        
        // 如果日期是Date对象，转换为字符串再比较
        const dateAStr = dateA instanceof Date ? dateA.toISOString() : String(dateA);
        const dateBStr = dateB instanceof Date ? dateB.toISOString() : String(dateB);
        
        // 降序排列：越晚的日期越在上面
        return dateBStr.localeCompare(dateAStr);
      });
    }

    // 分页
    const total = filteredItems.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedItems = filteredItems.slice(startIndex, endIndex);

    return NextResponse.json({ 
      items: paginatedItems, 
      total, 
      page, 
      pageSize,
      filteredCount: filteredItems.length,
      totalCount: allItems.length
    });
  } catch (error) {
    console.error("获取商品列表错误:", error || "未知错误");
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "获取商品列表失败" },
      { status: 500 }
    );
  }
} 