import { NextResponse } from "next/server";
import { getCachedItems } from "@/lib/cache";

// GET /api/items/autocomplete?q=搜索词&type=name|number
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.toLowerCase() || "";
    const type = searchParams.get("type") || "name"; // name 或 number

    if (!query || query.length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    const allItems = await getCachedItems();
    
    // 去重并收集唯一的商品信息
    const uniqueItems = new Map<string, {
      itemName: string;
      itemNumber: string;
      itemBrand?: string;
      itemType?: string;
      itemColor?: string;
      count: number;
    }>();

    allItems.forEach(item => {
      const key = `${item.itemName}-${item.itemNumber}`;
      if (uniqueItems.has(key)) {
        const existing = uniqueItems.get(key)!;
        existing.count += 1;
      } else {
        uniqueItems.set(key, {
          itemName: item.itemName,
          itemNumber: item.itemNumber || "",
          itemBrand: item.itemBrand,
          itemType: item.itemType,
          itemColor: item.itemColor,
          count: 1,
        });
      }
    });

    let suggestions: any[] = [];

    if (type === "name") {
      // 按商品名称搜索，返回匹配的商品及其货号
      suggestions = Array.from(uniqueItems.values())
        .filter(item => 
          item.itemName.toLowerCase().includes(query) ||
          (item.itemBrand && item.itemBrand.toLowerCase().includes(query))
        )
        .map(item => ({
          type: "name",
          itemName: item.itemName,
          itemNumber: item.itemNumber,
          itemBrand: item.itemBrand,
          itemType: item.itemType,
          count: item.count,
          displayText: `${item.itemName}${item.itemBrand ? ` (${item.itemBrand})` : ""}`,
          secondaryText: item.itemNumber ? `货号: ${item.itemNumber}` : "无货号",
        }))
        .slice(0, 10);
    } else if (type === "number") {
      // 按货号搜索，返回匹配的货号及其商品名称
      suggestions = Array.from(uniqueItems.values())
        .filter(item => 
          item.itemNumber && item.itemNumber.toLowerCase().includes(query)
        )
        .map(item => ({
          type: "number",
          itemName: item.itemName,
          itemNumber: item.itemNumber,
          itemBrand: item.itemBrand,
          itemType: item.itemType,
          count: item.count,
          displayText: item.itemNumber,
          secondaryText: `${item.itemName}${item.itemBrand ? ` (${item.itemBrand})` : ""}`,
        }))
        .slice(0, 10);
    }

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("自动补全搜索失败:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "自动补全搜索失败",
        suggestions: []
      },
      { status: 500 }
    );
  }
}
