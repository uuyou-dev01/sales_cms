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
            orderStatus: true,
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
    const inStockCount = items.filter((item: any) => {
      const transaction = item.transactions[0];
      return transaction && ['未上架', '已上架', '交易中', '退货中'].includes(transaction.orderStatus);
    }).length;
    
    // 已售出商品：状态为已完成的商品
    const soldCount = items.filter((item: any) => {
      const transaction = item.transactions[0];
      return transaction && transaction.orderStatus === '已完成';
    }).length;

    const totalProfit = items.reduce((sum: number, item: any) => {
      const transaction = item.transactions[0];
      return sum + (transaction && transaction.itemNetProfit ? parseFloat(transaction.itemNetProfit) : 0);
    }, 0);

    const averageProfitRate = totalPurchase > 0 ? ((totalProfit / totalPurchase) * 100).toFixed(2) : "0.00";

    // 获取仓库数量
    const warehouseCount = await prisma.warehouse.count();

    // 计算本月统计数据
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const thisMonthItems = items.filter((item: any) => {
      const transaction = item.transactions[0];
      if (!transaction) return false;
      
      const purchaseDate = new Date(transaction.purchaseDate);
      return purchaseDate.getMonth() === currentMonth && purchaseDate.getFullYear() === currentYear;
    });

    const thisMonthSoldItems = items.filter((item: any) => {
      const transaction = item.transactions[0];
      if (!transaction || !transaction.soldPrice) return false;
      
      const soldDate = new Date(transaction.soldDate);
      return soldDate.getMonth() === currentMonth && soldDate.getFullYear() === currentYear;
    });

    const thisMonthSoldAmount = thisMonthSoldItems.reduce((sum: number, item: any) => {
      const transaction = item.transactions[0];
      return sum + parseFloat(transaction.soldPrice);
    }, 0);

    const thisMonthSoldCount = thisMonthSoldItems.length;

    const thisMonthSoldProfit = thisMonthSoldItems.reduce((sum: number, item: any) => {
      const transaction = item.transactions[0];
      return sum + (transaction.itemNetProfit ? parseFloat(transaction.itemNetProfit) : 0);
    }, 0);

    const thisMonthPurchaseAmount = thisMonthItems.reduce((sum: number, item: any) => {
      const transaction = item.transactions[0];
      return sum + parseFloat(transaction.purchasePrice);
    }, 0);

    const thisMonthPurchaseCount = thisMonthItems.length;

    return {
      totalPurchase,
      totalSold,
      averageProfitRate,
      inStockCount,
      soldCount,
      totalItems: items.length,
      warehouseCount,
      thisMonthSoldAmount,
      thisMonthSoldCount,
      thisMonthSoldProfit,
      thisMonthPurchaseAmount,
      thisMonthPurchaseCount,
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
    try {
      const transactions = await prisma.transaction.findMany({
        select: { purchaseDate: true },
        where: {
          item: { deleted: false },
        },
      });

      const months = new Set<string>();
      transactions.forEach((transaction: any) => {
        try {
          const date = new Date(transaction.purchaseDate);
          
          // 验证日期是否有效
          if (isNaN(date.getTime())) {
            console.warn("无效的购买日期:", transaction.purchaseDate);
            return;
          }
          
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          months.add(monthKey);
        } catch (error) {
          console.warn("处理交易日期失败:", transaction.purchaseDate, error);
        }
      });

      const monthArray = Array.from(months).sort().reverse();
      console.log("生成的月份列表:", monthArray);
      return monthArray;
    } catch (error) {
      console.error("获取月份数据失败:", error);
      return [];
    }
  },
  ['months'],
  {
    tags: ['items'],
    revalidate: 3600, // 1小时重新验证
  }
); 