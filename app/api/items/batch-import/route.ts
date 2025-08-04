import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parse } from "csv-parse";
import { Readable } from "stream";
import { revalidateTag } from "next/cache";

interface ImportResult {
  success: boolean;
  importedCount: number;
  errors: Array<{
    row: number;
    error: string;
    data: Record<string, string>;
  }>;
  summary: {
    totalRows: number;
    successCount: number;
    errorCount: number;
  };
}

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

    const result: ImportResult = {
      success: true,
      importedCount: 0,
      errors: [],
      summary: {
        totalRows: records.length,
        successCount: 0,
        errorCount: 0,
      },
    };

    // 开始数据库事务
    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const rowNumber = i + 2; // +2 因为第1行是标题，数据从第2行开始

        try {
          // 验证必填字段
          if (!record.itemId || !record.itemName || !record.itemType || !record.itemBrand) {
            result.errors.push({
              row: rowNumber,
              error: "缺少必填字段：itemId、itemName、itemType、itemBrand",
              data: record,
            });
            result.summary.errorCount++;
            continue;
          }

          // 检查商品ID是否已存在
          const existingItem = await tx.item.findUnique({
            where: { itemId: record.itemId },
          });

          if (existingItem) {
            result.errors.push({
              row: rowNumber,
              error: `商品ID ${record.itemId} 已存在`,
              data: record,
            });
            result.summary.errorCount++;
            continue;
          }

          // 处理仓库位置
          let warehousePositionId = null;
          if (record.warehouseName && record.positionName) {
            // 查找或创建仓库
            let warehouse = await tx.warehouse.findFirst({
              where: { name: record.warehouseName },
            });

            if (!warehouse) {
              warehouse = await tx.warehouse.create({
                data: {
                  name: record.warehouseName,
                  description: record.warehouseDescription || "",
                },
              });
            }

            // 查找或创建仓位
            let position = await tx.warehousePosition.findFirst({
              where: {
                name: record.positionName,
                warehouseId: warehouse.id,
              },
            });

            if (!position) {
              const capacity = parseInt(record.positionCapacity) || 30;
              position = await tx.warehousePosition.create({
                data: {
                  name: record.positionName,
                  capacity,
                  warehouseId: warehouse.id,
                },
              });
            }

            // 检查仓位容量
            if (position.used >= position.capacity) {
              result.errors.push({
                row: rowNumber,
                error: `仓位 ${record.positionName} 已满`,
                data: record,
              });
              result.summary.errorCount++;
              continue;
            }

            warehousePositionId = position.id;
          }

          // 创建商品记录
          const item = await tx.item.create({
            data: {
              itemId: record.itemId,
              itemName: record.itemName,
              itemMfgDate: record.itemMfgDate ? new Date(record.itemMfgDate) : new Date(),
              itemNumber: record.itemNumber || "",
              itemType: record.itemType,
              itemBrand: record.itemBrand,
              itemCondition: record.itemCondition || "new",
              itemRemarks: record.itemRemarks || "",
              itemColor: record.itemColor || "",
              itemStatus: record.itemStatus || "pending",
              itemSize: record.itemSize || "",
              position: record.position || null,
              warehousePositionId,
              photos: record.photos ? record.photos.split(',').map((p: string) => p.trim()) : [],
            },
          });

          // 处理其他费用
          let otherFees = null;
          if (record.otherFees) {
            try {
              // 解析其他费用格式：类型:金额:货币:描述
              const fees = record.otherFees.split(',').map((fee: string) => {
                const [type, amount, currency, description] = fee.split(':');
                return {
                  id: Math.random().toString(36).substr(2, 9),
                  type: type || '',
                  amount: amount || '0',
                  currency: currency || 'CNY',
                  description: description || '',
                };
              });
              otherFees = fees;
            } catch (error) {
              console.warn('解析其他费用失败:', error);
            }
          }

          // 处理上架平台列表
          let listingPlatforms = [];
          if (record.listingPlatforms) {
            try {
              listingPlatforms = record.listingPlatforms.split(',').map((p: string) => p.trim());
            } catch (error) {
              console.warn('解析上架平台失败:', error);
            }
          }

          // 创建交易记录
          await tx.transaction.create({
            data: {
              itemId: record.itemId,
              shipping: record.shipping || "0",
              domesticShipping: String(record.domesticShipping || "0"),
              internationalShipping: String(record.internationalShipping || "0"),
              domesticTrackingNumber: record.domesticTrackingNumber || null,
              internationalTrackingNumber: record.internationalTrackingNumber || null,
              transactionStatues: record.transactionStatues || record.itemStatus || "未上架",
              purchaseDate: record.purchaseDate ? new Date(record.purchaseDate) : new Date(),
              soldDate: record.soldDate ? new Date(record.soldDate) : null,
              launchDate: record.launchDate ? new Date(record.launchDate) : null,
              purchasePlatform: record.purchasePlatform || "",
              soldPlatform: record.soldPlatform || "",
              listingPlatforms,
              otherFees,
              purchasePrice: String(record.purchasePrice || "0"),
              purchasePriceCurrency: record.purchasePriceCurrency || "CNY",
              purchasePriceExchangeRate: String(record.purchasePriceExchangeRate || "1"),
              soldPrice: String(record.soldPrice || "0"),
              soldPriceCurrency: record.soldPriceCurrency || "JPY",
              soldPriceExchangeRate: String(record.soldPriceExchangeRate || "0.05"),
              itemGrossProfit: String(record.itemGrossProfit || "0"),
              itemNetProfit: String(record.itemNetProfit || "0"),
              isReturn: record.isReturn === "yes" || record.isReturn === "true",
              storageDuration: String(record.storageDuration || "0"),
            },
          });

          // 如果指定了仓库位置，更新仓位使用量
          if (warehousePositionId) {
            await tx.warehousePosition.update({
              where: { id: warehousePositionId },
              data: {
                used: {
                  increment: 1,
                },
              },
            });
          }

          result.importedCount++;
          result.summary.successCount++;

        } catch (error) {
          result.errors.push({
            row: rowNumber,
            error: error instanceof Error ? error.message : "未知错误",
            data: record,
          });
          result.summary.errorCount++;
        }
      }
    });

    result.success = result.summary.errorCount === 0;

    // 重新验证缓存
    revalidateTag('items');
    revalidateTag('stats');
    revalidateTag('months');
    revalidateTag('warehouses');

    return NextResponse.json(result);
  } catch (error) {
    console.error("批量导入错误:", error || "未知错误");
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : "导入失败",
        summary: {
          totalRows: 0,
          successCount: 0,
          errorCount: 1,
        },
        errors: [{
          row: 0,
          error: error instanceof Error ? error.message : "未知错误",
          data: {},
        }],
      },
      { status: 500 }
    );
  }
} 