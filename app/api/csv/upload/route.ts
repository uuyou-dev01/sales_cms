import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parse } from "csv-parse";
import { Readable } from "stream";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json(
        { error: "没有上传文件" },
        { status: 400 }
      );
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const records: any[] = [];

    // 解析 CSV
    const parser = parse({
      columns: true,
      skip_empty_lines: true,
    });

    // 将文件内容转换为可读流
    const stream = Readable.from(fileBuffer.toString());

    // 处理解析后的数据
    for await (const record of stream.pipe(parser)) {
      records.push(record);
    }

    // 开始数据库事务
    const result = await prisma.$transaction(async (tx) => {
      let importedCount = 0;

      for (const record of records) {
        // 创建商品记录
        const item = await tx.item.create({
          data: {
            itemId: record.itemId,
            itemName: record.itemName,
            itemMfgDate: record.itemMfgDate ? new Date(record.itemMfgDate) : new Date(),
            itemType: record.itemType,
            itemBrand: record.itemBrand,
            itemCondition: record.itemCondition,
            itemRemarks: record.itemRemarks || "",
            itemColor: record.itemColor || "",
            // itemStatus 字段已删除，使用 orderStatus
            itemSize: record.itemSize || "",
          },
        });

        // 创建交易记录
        await tx.transaction.create({
          data: {
            itemId: record.itemId,
            shipping: record.shipping || "0",
                    orderStatus: record.orderStatus || "在途（国内）",
            purchaseDate: new Date(record.purchaseDate),
            soldDate: record.soldDate ? new Date(record.soldDate) : null,
            launchDate: record.launchDate ? new Date(record.launchDate) : null,
            purchasePlatform: record.purchasePlatform || "",
            soldPlatform: record.soldPlatform || "",
            purchasePrice: record.purchasePrice || "0",
            purchasePriceCurrency: record.purchasePriceCurrency || "CNY",
            purchasePriceExchangeRate: "1",
            soldPrice: record.soldPrice || "0",
            soldPriceCurrency: record.soldCurrency || "CNY",
            soldPriceExchangeRate: "1",
            itemGrossProfit: record.itemGrossProfit || "0",
            itemNetProfit: record.itemNetProfit || "0",
            isReturn: record.isReturn === "yes",
            storageDuration: "0",
          },
        });

        importedCount++;
      }

      return { importedCount };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("CSV 导入错误:", error || "未知错误");
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "导入失败" },
      { status: 500 }
    );
  }
} 