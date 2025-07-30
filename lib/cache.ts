import { unstable_cache } from 'next/cache';
import { prisma } from './prisma';

// 缓存所有商品数据
export const getCachedItems = unstable_cache(
  async () => {
    return await prisma.item.findMany({
      where: { deleted: false },
      include: {
        transactions: {
          orderBy: { purchaseDate: 'desc' },
          select: {
            purchaseDate: true,
            purchaseAmount: true,
            soldPrice: true,
            itemNetProfit: true,
            itemGrossProfit: true,
            purchasePlatform: true,
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
        transactions: true,
      },
    });

    const totalPurchase = items.reduce((sum, item) => {
      const transaction = item.transactions[0];
      return sum + (transaction ? parseFloat(transaction.purchaseAmount) : 0);
    }, 0);

    const totalSold = items.reduce((sum, item) => {
      const transaction = item.transactions[0];
      return sum + (transaction && transaction.soldPrice ? parseFloat(transaction.soldPrice) : 0);
    }, 0);

    const inStockCount = items.filter(item => item.itemStatus === 'pending').length;
    const soldCount = items.filter(item => item.itemStatus === 'completed').length;

    const totalProfit = items.reduce((sum, item) => {
      const transaction = item.transactions[0];
      return sum + (transaction && transaction.itemNetProfit ? parseFloat(transaction.itemNetProfit) : 0);
    }, 0);

    const averageProfitRate = totalPurchase > 0 ? ((totalProfit / totalPurchase) * 100).toFixed(2) : "0.00";

    return {
      totalPurchase,
      totalSold,
      averageProfitRate,
      inStockCount,
      soldCount,
      totalItems: items.length,
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

    let totalWarehouses = warehouses.length;
    let totalPositions = 0;
    let totalCapacity = 0;
    let totalUsed = 0;
    let fullPositions = 0;

    warehouses.forEach(warehouse => {
      warehouse.positions.forEach(position => {
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
    transactions.forEach(transaction => {
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