import { NextRequest } from 'next/server';
import { getAuthFromRequest, hasPermission } from '@/lib/auth';
import { ok, serverError, forbidden } from '@/src/modules/shared/api/response';
import { getCachedItems } from '@/lib/cache';

export async function GET(req: NextRequest) {
  try {
    const user = getAuthFromRequest(req);
    if (!user || !hasPermission(user, 'USER')) return forbidden();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '24', 10);
    const search = searchParams.get('search') || undefined;
    const itemType = searchParams.get('itemType') || undefined;
    const status = searchParams.get('status') || undefined;

    const allItems = await getCachedItems();

    const groupedMap = new Map<string, any[]>();
    allItems.forEach((item: any) => {
      const itemNumber = item.itemNumber || '未知货号';
      if (!groupedMap.has(itemNumber)) groupedMap.set(itemNumber, []);
      groupedMap.get(itemNumber)!.push(item);
    });

    let groupedItems = Array.from(groupedMap.entries()).map(([itemNumber, items]) => {
      const representativeItem = items[0];
      const sizeMap = new Map<string, any>();
      let totalPurchaseValue = 0;
      let totalSoldValue = 0;
      let totalProfit = 0;
      let inStockCount = 0;
      let soldCount = 0;
      const allPhotos: string[] = [];

      items.forEach((item: any) => {
        const transaction = item.transactions?.[0];
        const size = item.itemSize;
        const purchasePrice = parseFloat(transaction?.purchasePrice || '0');
        const soldPrice = transaction?.soldPrice ? parseFloat(transaction.soldPrice) : undefined;
        const isSold = !!transaction?.soldDate;

        let profit = 0;
        let soldPriceCNY = 0;
        if (soldPrice && transaction?.soldPriceExchangeRate) {
          soldPriceCNY = soldPrice * parseFloat(transaction.soldPriceExchangeRate);
          profit = soldPriceCNY - purchasePrice;
        }

        if (item.photos && item.photos.length > 0) allPhotos.push(...item.photos);

        totalPurchaseValue += purchasePrice;
        if (soldPrice && transaction?.soldPriceExchangeRate) {
          totalSoldValue += soldPriceCNY;
          totalProfit += profit;
        }

        if (isSold) soldCount++; else inStockCount++;

        if (!sizeMap.has(size)) {
          sizeMap.set(size, {
            size,
            count: 0,
            inStock: 0,
            sold: 0,
            totalPurchasePrice: 0,
            totalSoldPrice: 0,
            items: [],
          });
        }

        const sizeData = sizeMap.get(size);
        sizeData.count++;
        sizeData.totalPurchasePrice += purchasePrice;
        if (isSold) {
          sizeData.sold++;
          if (soldPrice && transaction?.soldPriceExchangeRate) sizeData.totalSoldPrice += soldPriceCNY;
        } else {
          sizeData.inStock++;
        }
        sizeData.items.push({
          itemId: item.itemId,
          itemSize: item.itemSize,
          purchasePrice,
          soldPrice,
          orderStatus: transaction?.orderStatus || '在途（国内）',
          purchaseDate: transaction?.purchaseDate || '',
          soldDate: transaction?.soldDate,
          profit: soldPrice ? profit : undefined,
        });
      });

      const averageProfitRate = totalSoldValue > 0 ? (totalProfit / totalSoldValue) * 100 : 0;
      const sizes = Array.from(sizeMap.values()).map((sizeData: any) => ({
        size: sizeData.size,
        count: sizeData.count,
        inStock: sizeData.inStock,
        sold: sizeData.sold,
        avgPurchasePrice: sizeData.count > 0 ? sizeData.totalPurchasePrice / sizeData.count : 0,
        avgSoldPrice: sizeData.sold > 0 ? sizeData.totalSoldPrice / sizeData.sold : 0,
        items: sizeData.items,
      })).sort((a: any, b: any) => {
        const aNum = parseFloat(a.size); const bNum = parseFloat(b.size);
        if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
        return a.size.localeCompare(b.size);
      });

      const purchaseDates = items.map((it: any) => it.transactions?.[0]?.purchaseDate).filter((d: any) => d).sort();
      return {
        itemNumber,
        itemName: representativeItem.itemName,
        itemBrand: representativeItem.itemBrand || '',
        itemType: representativeItem.itemType || '',
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
        photos: [...new Set(allPhotos)].slice(0, 5),
        latestPurchaseDate: purchaseDates[purchaseDates.length - 1] || '',
        oldestPurchaseDate: purchaseDates[0] || '',
      };
    });

    if (search && search.trim()) {
      const term = search.trim().toLowerCase();
      groupedItems = groupedItems.filter((item: any) =>
        item.itemName.toLowerCase().includes(term) ||
        item.itemNumber.toLowerCase().includes(term) ||
        item.itemBrand.toLowerCase().includes(term)
      );
    }
    if (itemType && itemType !== 'all') {
      groupedItems = groupedItems.filter((i: any) => i.itemType === itemType);
    }
    if (status && status !== 'all') {
      if (status === 'in_stock') groupedItems = groupedItems.filter((i: any) => i.inStockCount > 0);
      else if (status === 'sold') groupedItems = groupedItems.filter((i: any) => i.soldCount > 0);
    }

    groupedItems.sort((a: any, b: any) => b.totalItems - a.totalItems);
    const total = groupedItems.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedItems = groupedItems.slice(startIndex, endIndex);
    return ok({ items: paginatedItems, total, page, pageSize });
  } catch (e) {
    return serverError('INVENTORY_GROUPED_FAILED');
  }
}


