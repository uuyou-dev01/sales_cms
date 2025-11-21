import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, hasPermission } from '@/lib/auth';
import { badRequest, forbidden, serverError } from '@/src/modules/shared/api/response';
import { prisma } from '@/lib/prisma';
import { revalidateTag } from 'next/cache';

export async function POST(request: NextRequest) {
  try {
    const user = getAuthFromRequest(request);
    if (!user || !hasPermission(user, 'USER')) return forbidden();

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) return badRequest('NO_FILE_UPLOADED');

    const csvText = await file.text();
    const lines = csvText.split('\n').filter((line) => line.trim());
    if (lines.length < 2) return badRequest('CSV_NEED_HEADER_AND_ROWS');

    const headers = lines[0].split(',').map((h) => h.trim());
    const records = lines.slice(1).map((line) => {
      const values = line.split(',').map((v) => v.trim());
      const record: Record<string, string> = {};
      headers.forEach((header, index) => {
        record[header] = values[index] || '';
      });
      return record;
    });

    const parseDate = (dateStr: string | undefined): Date | null => {
      if (!dateStr || dateStr.trim() === '') return null;
      const tryDate = new Date(dateStr);
      return isNaN(tryDate.getTime()) ? null : tryDate;
    };

    const result = await prisma.$transaction(async (tx) => {
      let importedCount = 0;
      const errors: Array<{ row: number; error: string; data: Record<string, string> }> = [];

      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const rowNumber = i + 2;
        try {
          const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
          const gen = () => `${letters[Math.floor(Math.random() * 26)]}${letters[Math.floor(Math.random() * 26)]}${Math.floor(Math.random() * 1_000_000).toString().padStart(6, '0')}`;
          let itemId = gen();
          for (let attempts = 0; attempts < 10; attempts++) {
            const exists = await tx.item.findUnique({ where: { itemId } });
            if (!exists) break;
            itemId = gen();
          }

          await tx.item.create({
            data: {
              itemId,
              itemName: record.itemName || '未命名',
              itemMfgDate: record.itemMfgDate || '未知',
              itemNumber: record.itemNumber || '',
              itemType: record.itemType || '未知',
              itemBrand: record.itemBrand || '',
              itemCondition: record.itemCondition || 'UNKNOWN',
              itemRemarks: record.itemRemarks || '',
              itemColor: record.itemColor || '黑色',
              itemSize: record.itemSize || '',
              position: record.position || null,
              photos: record.photos ? record.photos.split(';').map((p) => p.trim()) : [],
              accessories: record.accessories || null,
            },
          });

          await tx.transaction.create({
            data: {
              itemId,
              orderStatus: record.orderStatus || '在途（国内）',
              purchaseDate: parseDate(record.purchaseDate) ?? new Date(),
              soldDate: parseDate(record.soldDate),
              launchDate: parseDate(record.launchDate),
              purchasePlatform: record.purchasePlatform || '',
              soldPlatform: record.soldPlatform || null,
              listingPlatforms: record.listingPlatforms ? record.listingPlatforms.split(',').map((p) => p.trim()) : [],
              otherFees: undefined,
              purchasePrice: String(record.purchasePrice || '0'),
              purchasePriceCurrency: record.purchasePriceCurrency || 'CNY',
              purchasePriceExchangeRate: String(record.purchasePriceExchangeRate || '1'),
              soldPrice: record.soldPrice || null,
              soldPriceCurrency: record.soldPriceCurrency || null,
              soldPriceExchangeRate: record.soldPriceExchangeRate || null,
              domesticShipping: record.domesticShipping || null,
              internationalShipping: record.internationalShipping || null,
              domesticTrackingNumber: record.domesticTrackingNumber || null,
              internationalTrackingNumber: record.internationalTrackingNumber || null,
              itemGrossProfit: record.itemGrossProfit || null,
              itemNetProfit: record.itemNetProfit || null,
              isReturn: record.isReturn === 'yes' || record.isReturn === 'true' || null,
              storageDuration: record.storageDuration || null,
            },
          });

          importedCount++;
        } catch (error) {
          errors.push({ row: rowNumber, error: error instanceof Error ? error.message : '未知错误', data: record });
        }
      }

      return {
        success: errors.length === 0,
        importedCount,
        errors,
        summary: {
          totalRows: records.length,
          successCount: importedCount,
          errorCount: errors.length,
        },
      };
    });

    revalidateTag('items');
    revalidateTag('stats');
    revalidateTag('months');
    revalidateTag('warehouses');

    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (e) {
    return serverError('IMPORT_FAILED');
  }
}


