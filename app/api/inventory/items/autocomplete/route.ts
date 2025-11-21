import { NextRequest } from 'next/server';
import { getAuthFromRequest, hasPermission } from '@/lib/auth';
import { ok, serverError, forbidden } from '@/src/modules/shared/api/response';
import { getCachedItems } from '@/lib/cache';

export async function GET(req: NextRequest) {
  try {
    const user = getAuthFromRequest(req);
    if (!user || !hasPermission(user, 'USER')) return forbidden();

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q')?.toLowerCase() || '';
    const type = searchParams.get('type') || 'name';
    if (!query || query.length < 2) return ok({ suggestions: [] });

    const allItems = await getCachedItems();
    const unique = new Map<string, { itemName: string; itemNumber: string; itemBrand?: string; itemType?: string; itemColor?: string; count: number }>();
    allItems.forEach((item: any) => {
      const key = `${item.itemName}-${item.itemNumber}`;
      if (unique.has(key)) unique.get(key)!.count += 1; else unique.set(key, {
        itemName: item.itemName,
        itemNumber: item.itemNumber || '',
        itemBrand: item.itemBrand,
        itemType: item.itemType,
        itemColor: item.itemColor,
        count: 1,
      });
    });

    let suggestions: any[] = [];
    if (type === 'name') {
      suggestions = Array.from(unique.values())
        .filter((it) => it.itemName.toLowerCase().includes(query) || (it.itemBrand && it.itemBrand.toLowerCase().includes(query)))
        .map((it) => ({
          type: 'name',
          itemName: it.itemName,
          itemNumber: it.itemNumber,
          itemBrand: it.itemBrand,
          itemType: it.itemType,
          count: it.count,
          displayText: `${it.itemName}${it.itemBrand ? ` (${it.itemBrand})` : ''}`,
          secondaryText: it.itemNumber ? `货号: ${it.itemNumber}` : '无货号',
        }))
        .slice(0, 10);
    } else if (type === 'number') {
      suggestions = Array.from(unique.values())
        .filter((it) => it.itemNumber && it.itemNumber.toLowerCase().includes(query))
        .map((it) => ({
          type: 'number',
          itemName: it.itemName,
          itemNumber: it.itemNumber,
          itemBrand: it.itemBrand,
          itemType: it.itemType,
          count: it.count,
          displayText: it.itemNumber,
          secondaryText: `${it.itemName}${it.itemBrand ? ` (${it.itemBrand})` : ''}`,
        }))
        .slice(0, 10);
    }

    return ok({ suggestions });
  } catch (e) {
    return serverError('INVENTORY_AUTOCOMPLETE_FAILED');
  }
}


