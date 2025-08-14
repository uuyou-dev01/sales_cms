import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "没有上传文件" },
        { status: 400 }
      );
    }

    const csvText = await file.text();
    const lines = csvText.split("\n").filter((line) => line.trim());

    if (lines.length < 2) {
      return NextResponse.json(
        { success: false, error: "CSV文件至少需要标题行和一行数据" },
        { status: 400 }
      );
    }

    const headers = lines[0].split(",").map((h) => h.trim());
    const records = lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim());
      const record: Record<string, string> = {};
      headers.forEach((header, index) => {
        record[header] = values[index] || "";
      });
      return record;
    });

    // 第一步：验证所有数据
    const validationErrors: Array<{
      row: number;
      error: string;
      data: Record<string, string>;
    }> = [];

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const rowNumber = i + 2; // +2 因为第一行是标题，数组索引从0开始

      // 验证必填字段
      if (!record.itemName || !record.itemName.trim()) {
        validationErrors.push({
          row: rowNumber,
          error: "商品名称不能为空",
          data: record,
        });
        continue;
      }

      if (!record.itemType || !record.itemType.trim()) {
        validationErrors.push({
          row: rowNumber,
          error: "商品类型不能为空",
          data: record,
        });
        continue;
      }

      if (!record.itemCondition || !record.itemCondition.trim()) {
        validationErrors.push({
          row: rowNumber,
          error: "商品成色不能为空",
          data: record,
        });
        continue;
      }

      if (!record.itemSize || !record.itemSize.trim()) {
        validationErrors.push({
          row: rowNumber,
          error: "商品尺寸不能为空",
          data: record,
        });
        continue;
      }

      // 商品颜色可以为空，如果为空则设置为默认值"黑色"
      if (!record.itemColor || !record.itemColor.trim()) {
        record.itemColor = "黑色"; // 设置默认颜色
      }

      // 日期验证和转换函数
      const parseDate = (dateStr: string | undefined, fieldName: string): Date | null => {
        if (!dateStr || dateStr.trim() === '') return null;
        
        // 尝试多种日期格式
        const dateFormats = [
          'YYYY-MM-DD',           // 2024-01-21
          'YYYY/MM/DD',           // 2024/01/21
          'DD/MM/YYYY',           // 21/01/2024
          'MM/DD/YYYY',           // 01/21/2024
          'YYYY年MM月DD日',        // 2024年01月21日
          'YYYY.MM.DD',           // 2024.01.21
        ];
        
        for (const format of dateFormats) {
          try {
            let parsedDate: Date | null = null;
            
            if (format === 'YYYY-MM-DD' || format === 'YYYY/MM/DD') {
              parsedDate = new Date(dateStr);
            } else if (format === 'DD/MM/YYYY') {
              const [day, month, year] = dateStr.split('/');
              parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            } else if (format === 'MM/DD/YYYY') {
              const [month, day, year] = dateStr.split('/');
              parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            } else if (format === 'YYYY年MM月DD日') {
              const match = dateStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
              if (match) {
                const [, year, month, day] = match;
                parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
              }
            } else if (format === 'YYYY.MM.DD') {
              const [year, month, day] = dateStr.split('.');
              parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            }
            
            if (parsedDate && !isNaN(parsedDate.getTime())) {
              return parsedDate;
            }
          } catch {
            continue;
          }
        }
        
        // 如果所有格式都失败，记录错误并返回null
        console.warn(`无法解析日期: ${fieldName} = "${dateStr}"`);
        return null;
      };

      // 验证必填的购买日期
      const purchaseDate = parseDate(record.purchaseDate, 'purchaseDate');
      if (!purchaseDate) {
        validationErrors.push({
          row: rowNumber,
          error: `无效的购买日期格式: "${record.purchaseDate}"，请使用 YYYY-MM-DD 格式`,
          data: record,
        });
        continue;
      }

      // 验证其他字段格式
      if (record.purchasePrice && isNaN(parseFloat(record.purchasePrice))) {
        validationErrors.push({
          row: rowNumber,
          error: `无效的购买价格: "${record.purchasePrice}"`,
          data: record,
        });
        continue;
      }

      if (record.soldPrice && isNaN(parseFloat(record.soldPrice))) {
        validationErrors.push({
          row: rowNumber,
          error: `无效的销售价格: "${record.soldPrice}"`,
          data: record,
        });
        continue;
      }

      if (record.purchasePriceExchangeRate && isNaN(parseFloat(record.purchasePriceExchangeRate))) {
        validationErrors.push({
          row: rowNumber,
          error: `无效的购买汇率: "${record.purchasePriceExchangeRate}"`,
          data: record,
        });
        continue;
      }

      if (record.soldPriceExchangeRate && isNaN(parseFloat(record.soldPriceExchangeRate))) {
        validationErrors.push({
          row: rowNumber,
          error: `无效的销售汇率: "${record.soldPriceExchangeRate}"`,
          data: record,
        });
        continue;
      }
    }

    // 如果有验证错误，直接返回错误信息，不进行导入
    if (validationErrors.length > 0) {
      return NextResponse.json({
        success: false,
        error: "数据验证失败，请修正以下错误后重新导入",
        summary: {
          totalRows: records.length,
          successCount: 0,
          errorCount: validationErrors.length,
        },
        errors: validationErrors,
      }, { status: 400 });
    }

    // 第二步：所有数据验证通过后，开始导入
    const result = await prisma.$transaction(async (tx) => {
      // 使用类型断言来避免类型检查问题
      const prismaTx = tx as typeof prisma;
      const result: ImportResult = {
        success: false,
        importedCount: 0,
        errors: [],
        summary: {
          totalRows: records.length,
          successCount: 0,
          errorCount: 0,
        },
      };

      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const rowNumber = i + 2; // +2 因为第一行是标题，数组索引从0开始

        try {
          // 生成商品ID
          const generateItemId = () => {
            const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            const letter1 = letters[Math.floor(Math.random() * letters.length)];
            const letter2 = letters[Math.floor(Math.random() * letters.length)];
            const numbers = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
            return `${letter1}${letter2}${numbers}`;
          };

          let itemId = generateItemId();
          let attempts = 0;
          const maxAttempts = 10;
          while (attempts < maxAttempts) {
            const existingItem = await prismaTx.item.findUnique({ where: { itemId } });
            if (!existingItem) {
              break;
            }
            itemId = generateItemId();
            attempts++;
          }
          record.itemId = itemId;

          // 处理仓库位置
          let warehousePositionId: string | null = null;
          if (record.warehouseName && record.positionName) {
            // 查找或创建仓库
            let warehouse = await prismaTx.warehouse.findFirst({
              where: { name: record.warehouseName },
            });

            if (!warehouse) {
              warehouse = await prismaTx.warehouse.create({
                data: {
                  name: record.warehouseName,
                  description: record.warehouseDescription || record.warehouseName,
                },
              });
            }

            // 查找或创建仓位
            let position = await prismaTx.warehousePosition.findFirst({
              where: {
                name: record.positionName,
                warehouseId: warehouse.id,
              },
            });

            if (!position) {
              position = await prismaTx.warehousePosition.create({
                data: {
                  name: record.positionName,
                  capacity: parseInt(record.positionCapacity || "100"),
                  warehouseId: warehouse.id,
                  used: 0,
                },
              });
            }

            warehousePositionId = position.id;
          }

          // 处理其他费用
          let otherFees: Array<{
            type: string;
            amount: number;
            currency: string;
            description: string;
          }> = [];
          if (record.otherFees) {
            try {
              const feeStrings = record.otherFees.split(',').map((f: string) => f.trim());
              otherFees = feeStrings.map((feeStr: string) => {
                const parts = feeStr.split(':');
                if (parts.length >= 3) {
                  return {
                    type: parts[0].trim(),
                    amount: parseFloat(parts[1]) || 0,
                    currency: parts[2].trim(),
                    description: parts[3] ? parts[3].trim() : parts[0].trim(),
                  };
                }
                return null;
              }).filter((fee): fee is NonNullable<typeof fee> => fee !== null);
                      } catch {
            console.warn('解析其他费用失败');
          }
          }

          // 处理上架平台列表
          let listingPlatforms: string[] = [];
          if (record.listingPlatforms) {
            try {
              listingPlatforms = record.listingPlatforms.split(',').map((p: string) => p.trim());
                      } catch {
            console.warn('解析上架平台失败');
          }
          }

          // 重新解析日期（验证阶段已经确认有效）
          const parseDate = (dateStr: string | undefined): Date | null => {
            if (!dateStr || dateStr.trim() === '') return null;
            
            // 尝试多种日期格式
            const dateFormats = [
              'YYYY-MM-DD',           // 2024-01-21
              'YYYY/MM/DD',           // 2024/01/21
              'DD/MM/YYYY',           // 21/01/2024
              'MM/DD/YYYY',           // 01/21/2024
              'YYYY年MM月DD日',        // 2024年01月21日
              'YYYY.MM.DD',           // 2024.01.21
            ];
            
            for (const format of dateFormats) {
              try {
                let parsedDate: Date | null = null;
                
                if (format === 'YYYY-MM-DD' || format === 'YYYY/MM/DD') {
                  parsedDate = new Date(dateStr);
                } else if (format === 'DD/MM/YYYY') {
                  const [day, month, year] = dateStr.split('/');
                  parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                } else if (format === 'MM/DD/YYYY') {
                  const [month, day, year] = dateStr.split('/');
                  parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                } else if (format === 'YYYY年MM月DD日') {
                  const match = dateStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
                  if (match) {
                    const [, year, month, day] = match;
                    parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                  }
                } else if (format === 'YYYY.MM.DD') {
                  const [year, month, day] = dateStr.split('.');
                  parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                }
                
                if (parsedDate && !isNaN(parsedDate.getTime())) {
                  return parsedDate;
                }
              } catch {
                continue;
              }
            }
            
            return null;
          };

          const purchaseDate = parseDate(record.purchaseDate)!; // 验证阶段已确认有效

          // 创建商品记录
          await prismaTx.item.create({
            data: {
              itemId: record.itemId,
              itemName: record.itemName,
              itemMfgDate: record.itemMfgDate || "未知", // 如果为空则使用默认值
              itemNumber: record.itemNumber || "",
              itemType: record.itemType,
              itemBrand: record.itemBrand || "",
              itemCondition: record.itemCondition,
              itemRemarks: record.itemRemarks || "",
              itemColor: record.itemColor || "黑色", // 如果为空则使用默认颜色
              itemSize: record.itemSize,
              position: record.position || null,
              warehousePositionId,
              photos: record.photos ? record.photos.split(';').map((p: string) => p.trim()) : [],
              accessories: record.accessories || null,
            },
          });

          // 创建交易记录
          await prismaTx.transaction.create({
            data: {
              itemId: record.itemId,
              shipping: record.shipping || null,
              domesticShipping: record.domesticShipping || null,
              internationalShipping: record.internationalShipping || null,
              domesticTrackingNumber: record.domesticTrackingNumber || null,
              internationalTrackingNumber: record.internationalTrackingNumber || null,
              orderStatus: record.orderStatus || "在途（国内）",
              purchaseDate: purchaseDate,
              soldDate: parseDate(record.soldDate),
              launchDate: parseDate(record.launchDate),
              purchasePlatform: record.purchasePlatform || "",
              soldPlatform: record.soldPlatform || null,
              listingPlatforms,
              otherFees,
              purchasePrice: String(record.purchasePrice || "0"),
              purchasePriceCurrency: record.purchasePriceCurrency || "CNY",
              purchasePriceExchangeRate: String(record.purchasePriceExchangeRate || "1"),
              soldPrice: record.soldPrice || null,
              soldPriceCurrency: record.soldPriceCurrency || null,
              soldPriceExchangeRate: record.soldPriceExchangeRate || null,
              itemGrossProfit: record.itemGrossProfit || null,
              itemNetProfit: record.itemNetProfit || null,
              isReturn: record.isReturn === "yes" || record.isReturn === "true" || null,
              storageDuration: record.storageDuration || null,
            },
          });

          // 如果指定了仓库位置，更新仓位使用量
          if (warehousePositionId) {
            await prismaTx.warehousePosition.update({
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

      result.success = result.summary.errorCount === 0;
      return result;
    });

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