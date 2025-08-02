import { unstable_cache } from 'next/cache';
import { prisma } from './prisma';

// 缓存所有商品数据
export const getCachedItems = unstable_cache(
  async () => {
    return await prisma.item.findMany({
      where: { deleted: false },
      orderBy: { createdAt: 'desc' }, // 按创建时间降序，新商品在最上面
      include: {
        transactions: {
          orderBy: { purchaseDate: 'desc' },
          select: {
            purchaseDate: true,
            purchasePrice: true,
            soldPrice: true,
            itemNetProfit: true,
            itemGrossProfit: true,
            purchasePlatform: true,
            transactionStatues: true,
          },
        },
        warehousePosition: {
          include: {
            warehouse: true,
          },
        },
      },
    });
  },
  ['all-items'],
  {
    tags: ['items'],
    revalidate: 3600, // 1小时重新验证
  }
);

// 缓存商品统计信息
export const getCachedStats = unstable_cache(
  async () => {
    const items = await prisma.item.findMany({
      where: { deleted: false },
      include: {
        transactions: {
          select: {
            purchasePrice: true,
            soldPrice: true,
            itemNetProfit: true,
            itemGrossProfit: true,
            purchasePlatform: true,
            transactionStatues: true,
          },
        },
      },
    });

    const totalPurchase = items.reduce((sum: number, item: any) => {
      const transaction = item.transactions[0];
      return sum + (transaction ? parseFloat(transaction.purchasePrice) : 0);
    }, 0);

    const totalSold = items.reduce((sum: number, item: any) => {
      const transaction = item.transactions[0];
      return sum + (transaction && transaction.soldPrice ? parseFloat(transaction.soldPrice) : 0);
    }, 0);

    // 在库商品：包括未上架、已上架、交易中、退货中的商品
    const inStockCount = items.filter((item: any) => 
      ['未上架', '已上架', '交易中', '退货中'].includes(item.itemStatus)
    ).length;
    
    // 已售出商品：状态为已完成的商品
    const soldCount = items.filter((item: any) => item.itemStatus === '已完成').length;

    const totalProfit = items.reduce((sum: number, item: any) => {
      const transaction = item.transactions[0];
      return sum + (transaction && transaction.itemNetProfit ? parseFloat(transaction.itemNetProfit) : 0);
    }, 0);

    const averageProfitRate = totalPurchase > 0 ? ((totalProfit / totalPurchase) * 100).toFixed(2) : "0.00";

    // 获取仓库数量
    const warehouseCount = await prisma.warehouse.count();

    return {
      totalPurchase,
      totalSold,
      averageProfitRate,
      inStockCount,
      soldCount,
      totalItems: items.length,
      warehouseCount,
    };
  },
  ['stats'],
  {
    tags: ['stats'],
    revalidate: 1800, // 30分钟重新验证
  }
);

// 缓存仓库统计信息
export const getCachedWarehouseStats = unstable_cache(
  async () => {
    const warehouses = await prisma.warehouse.findMany({
      include: {
        positions: {
          include: {
            items: true,
          },
        },
      },
    });

    const totalWarehouses = warehouses.length;
    let totalPositions = 0;
    let totalCapacity = 0;
    let totalUsed = 0;
    let fullPositions = 0;

    warehouses.forEach((warehouse: any) => {
      warehouse.positions.forEach((position: any) => {
        totalPositions++;
        totalCapacity += position.capacity;
        totalUsed += position.used;
        if (position.used >= position.capacity) {
          fullPositions++;
        }
      });
    });

    const usageRate = totalCapacity > 0 ? ((totalUsed / totalCapacity) * 100).toFixed(1) : "0.0";

    return {
      totalWarehouses,
      totalPositions,
      totalCapacity,
      totalUsed,
      fullPositions,
      usageRate,
    };
  },
  ['warehouse-stats'],
  {
    tags: ['warehouses'],
    revalidate: 1800, // 30分钟重新验证
  }
);

// 缓存月份数据
export const getCachedMonths = unstable_cache(
  async () => {
    const transactions = await prisma.transaction.findMany({
      select: { purchaseDate: true },
      where: {
        item: { deleted: false },
      },
    });

    const months = new Set<string>();
    transactions.forEach((transaction: any) => {
      const date = new Date(transaction.purchaseDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.add(monthKey);
    });

    return Array.from(months).sort().reverse();
  },
  ['months'],
  {
    tags: ['items'],
    revalidate: 3600, // 1小时重新验证
  }
); 