import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { monthFilter, startDate, endDate } = await request.json();

    let whereClause: any = {};
    let dateFilter: any = {};

    // 根据月份筛选条件构建查询
    if (monthFilter === "current") {
      // 当月数据
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      dateFilter = {
        gte: startOfMonth,
        lte: endOfMonth,
      };
    } else if (monthFilter === "specific" && startDate && endDate) {
      // 指定月份数据
      dateFilter = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }
    // monthFilter === "all" 时不添加日期筛选

    // 构建查询条件
    if (Object.keys(dateFilter).length > 0) {
      whereClause = {
        transactions: {
          some: {
            purchaseDate: dateFilter,
          },
        },
      };
    }

    // 查询商品数据
    const items = await prisma.item.findMany({
      where: whereClause,
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        warehousePosition: {
          include: {
            warehouse: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 转换为CSV格式
    const csvHeaders = [
      '商品ID',
      '商品名称',
      '货号',
      '商品类型',
      '品牌',
      '成色',
      '尺寸',
      '颜色',
      '备注',
      '配件信息',
      '购入日期',
      '购入价格',
      '购入平台',
      '购入汇率',
      '购入货币',
      '国内运费',
      '国际运费',
      '国内单号',
      '国际单号',
      '上架日期',
      '销售日期',
      '销售价格',
      '销售平台',
      '销售汇率',
      '销售货币',
      '毛利',
      '净利润',
      '订单状态',
      '交易状态',
      '是否退货',
      '在库时长(天)',
      '仓库名称',
      '仓位名称',
      '其他费用',
      '上架平台',
    ];

    const csvRows = items.map((item) => {
      const transaction = item.transactions[0];
      const warehouse = item.warehousePosition?.warehouse;
      const position = item.warehousePosition;
      
      // 计算在库时长
      const purchaseDate = transaction?.purchaseDate ? new Date(transaction.purchaseDate) : null;
      const daysInStock = purchaseDate ? Math.floor((Date.now() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;

      // 格式化其他费用
      const otherFeesStr = transaction?.otherFees 
        ? transaction.otherFees.map(fee => `${fee.type}:${fee.amount}:${fee.currency}:${fee.description}`).join(';')
        : '';

      // 格式化上架平台
      const listingPlatformsStr = transaction?.listingPlatforms 
        ? transaction.listingPlatforms.join(',')
        : '';

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
        transaction?.purchaseDate ? new Date(transaction.purchaseDate).toISOString().split('T')[0] : '',
        transaction?.purchasePrice || '',
        transaction?.purchasePlatform || '',
        transaction?.purchasePriceExchangeRate || '',
        transaction?.purchasePriceCurrency || '',
        transaction?.domesticShipping || '',
        transaction?.internationalShipping || '',
        transaction?.domesticTrackingNumber || '',
        transaction?.internationalTrackingNumber || '',
        transaction?.launchDate ? new Date(transaction.launchDate).toISOString().split('T')[0] : '',
        transaction?.soldDate ? new Date(transaction.soldDate).toISOString().split('T')[0] : '',
        transaction?.soldPrice || '',
        transaction?.soldPlatform || '',
        transaction?.soldPriceExchangeRate || '',
        transaction?.soldPriceCurrency || '',
        transaction?.itemGrossProfit || '',
        transaction?.itemNetProfit || '',
                          transaction?.orderStatus || '',
        transaction?.isReturn ? '是' : '否',
        daysInStock.toString(),
        warehouse?.name || '',
        position?.name || '',
        otherFeesStr,
        listingPlatformsStr,
      ];
    });

    // 组合CSV内容
    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // 生成文件名
    const now = new Date();
    const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-');
    let filename = '商品数据';
    
    if (monthFilter === "current") {
      filename += `_${now.getFullYear()}年${now.getMonth() + 1}月`;
    } else if (monthFilter === "specific" && startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      filename += `_${start.getFullYear()}年${start.getMonth() + 1}月-${end.getFullYear()}年${end.getMonth() + 1}月`;
    } else {
      filename += '_全部数据';
    }
    
    filename += `_${timestamp}.csv`;

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error("导出数据错误:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "导出失败",
      },
      { status: 500 }
    );
  }
}
