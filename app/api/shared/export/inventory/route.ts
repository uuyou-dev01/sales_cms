import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, hasPermission } from '@/lib/auth';
import { forbidden, serverError, badRequest } from '@/src/modules/shared/api/response';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const user = getAuthFromRequest(request);
    if (!user || !hasPermission(user, 'USER')) return forbidden();

    const { monthFilter, startDate, endDate } = await request.json();

    type DateFilter = { gte?: Date; lte?: Date };
    let whereClause: any = {};
    let dateFilter: DateFilter = {};

    if (monthFilter === 'current') {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      dateFilter = { gte: startOfMonth, lte: endOfMonth };
    } else if (monthFilter === 'specific') {
      if (!startDate || !endDate) return badRequest('MISSING_DATE_RANGE');
      dateFilter = { gte: new Date(startDate), lte: new Date(endDate) };
    }

    if (Object.keys(dateFilter).length > 0) {
      whereClause = { transactions: { some: { purchaseDate: dateFilter } } };
    }

    const items = await prisma.item.findMany({
      where: whereClause,
      include: {
        transactions: { orderBy: { createdAt: 'desc' }, take: 1 },
        warehousePosition: { include: { warehouse: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const csvHeaders = [
      '商品ID','商品名称','货号','商品类型','品牌','成色','尺寸','颜色','备注','配件信息','购入日期','购入价格','购入平台','购入汇率','购入货币','国内运费','国际运费','国内单号','国际单号','上架日期','销售日期','销售价格','销售平台','销售汇率','销售货币','毛利','净利润','订单状态','是否退货','在库时长(天)','仓库名称','仓位名称','其他费用','上架平台'
    ];

    const rows = items.map((item) => {
      const t = item.transactions[0];
      const wh = item.warehousePosition?.warehouse;
      const pos = item.warehousePosition;
      const purchaseDate = t?.purchaseDate ? new Date(t.purchaseDate) : null;
      const daysInStock = purchaseDate ? Math.floor((Date.now() - purchaseDate.getTime()) / 86400000) : 0;
      const otherFeesStr = '';
      const listingPlatformsStr = t?.listingPlatforms ? t.listingPlatforms.join(',') : '';
      return [
        item.itemId,
        item.itemName || '',
        item.itemNumber || '',
        item.itemType || '',
        item.itemBrand || '',
        item.itemCondition || '',
        item.itemSize || '',
        item.itemColor || '',
        item.itemRemarks || '',
        item.accessories || '',
        t?.purchaseDate ? new Date(t.purchaseDate).toISOString().split('T')[0] : '',
        t?.purchasePrice || '',
        t?.purchasePlatform || '',
        t?.purchasePriceExchangeRate || '',
        t?.purchasePriceCurrency || '',
        t?.domesticShipping || '',
        t?.internationalShipping || '',
        t?.domesticTrackingNumber || '',
        t?.internationalTrackingNumber || '',
        t?.launchDate ? new Date(t.launchDate).toISOString().split('T')[0] : '',
        t?.soldDate ? new Date(t.soldDate).toISOString().split('T')[0] : '',
        t?.soldPrice || '',
        t?.soldPlatform || '',
        t?.soldPriceExchangeRate || '',
        t?.soldPriceCurrency || '',
        t?.itemGrossProfit || '',
        t?.itemNetProfit || '',
        t?.orderStatus || '',
        t?.isReturn ? '是' : '否',
        String(daysInStock),
        wh?.name || '',
        pos?.name || '',
        otherFeesStr,
        listingPlatformsStr,
      ];
    });

    const csvContent = [csvHeaders.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const now = new Date();
    const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-');
    let filename = '商品数据';
    if (monthFilter === 'current') {
      filename += `_${now.getFullYear()}年${now.getMonth() + 1}月`;
    } else if (monthFilter === 'specific' && startDate && endDate) {
      const s = new Date(startDate); const e = new Date(endDate);
      filename += `_${s.getFullYear()}年${s.getMonth() + 1}月-${e.getFullYear()}年${e.getMonth() + 1}月`;
    } else {
      filename += '_全部数据';
    }
    filename += `_${timestamp}.csv`;

    const csvWithBom = '\uFEFF' + csvContent;
    const body = new TextEncoder().encode(csvWithBom);
    return new NextResponse(body, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="export.csv"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (e) {
    return serverError('EXPORT_FAILED');
  }
}


