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
            purchaseDate: true,
            soldDate: true,
            purchasePriceCurrency: true,
            purchasePriceExchangeRate: true,
            soldPriceCurrency: true,
            soldPriceExchangeRate: true,
          },
        },
      },
    });

    // 货币转换函数：将各种货币转换为人民币
    const convertToCNY = (amount: string, currency: string, exchangeRate: string): number => {
      if (!amount || !currency || !exchangeRate) return 0;
      
      const numAmount = parseFloat(amount);
      const numExchangeRate = parseFloat(exchangeRate);
      
      if (isNaN(numAmount) || isNaN(numExchangeRate)) return 0;
      
      // 如果已经是人民币，直接返回
      if (currency.toUpperCase() === 'CNY') return numAmount;
      
      // 使用汇率转换为人民币
      return numAmount * numExchangeRate;
    };

    // 计算总购入金额（转换为人民币）
    const totalPurchase = items.reduce((sum: number, item: any) => {
      const transaction = item.transactions[0];
      if (!transaction) return sum;
      
      return sum + convertToCNY(
        transaction.purchasePrice,
        transaction.purchasePriceCurrency,
        transaction.purchasePriceExchangeRate
      );
    }, 0);

    // 计算总销售金额（转换为人民币）
    const totalSold = items.reduce((sum: number, item: any) => {
      const transaction = item.transactions[0];
      if (!transaction || !transaction.soldPrice) return sum;
      
      return sum + convertToCNY(
        transaction.soldPrice,
        transaction.soldPriceCurrency,
        transaction.soldPriceExchangeRate
      );
    }, 0);

    // 计算总净利润（转换为人民币）
    const totalProfit = items.reduce((sum: number, item: any) => {
      const transaction = item.transactions[0];
      if (!transaction || !transaction.itemNetProfit) return sum;
      
      // 净利润通常已经是人民币，但为了安全起见，检查货币类型
      const profitCurrency = transaction.soldPriceCurrency || 'CNY';
      const profitExchangeRate = transaction.soldPriceExchangeRate || '1';
      
      return sum + convertToCNY(
        transaction.itemNetProfit,
        profitCurrency,
        profitExchangeRate
      );
    }, 0);

    // 计算平均利润率
    const averageProfitRate = totalPurchase > 0 ? ((totalProfit / totalPurchase) * 100).toFixed(2) : "0.00";

    // 库存状态统计
    const inStockCount = items.filter((item: any) => {
      const transaction = item.transactions[0];
      return transaction && ['未上架', '已上架', '交易中', '退货中'].includes(transaction.orderStatus);
    }).length;
    
    const soldCount = items.filter((item: any) => {
      const transaction = item.transactions[0];
      return transaction && transaction.orderStatus === '已完成';
    }).length;

    // 获取仓库数量
    const warehouseCount = await prisma.warehouse.count();

    // 计算本月统计数据
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // 本月购入商品
    const thisMonthItems = items.filter((item: any) => {
      const transaction = item.transactions[0];
      if (!transaction) return false;
      
      const purchaseDate = new Date(transaction.purchaseDate);
      return purchaseDate.getMonth() === currentMonth && purchaseDate.getFullYear() === currentYear;
    });

    // 本月销售商品
    const thisMonthSoldItems = items.filter((item: any) => {
      const transaction = item.transactions[0];
      if (!transaction || !transaction.soldPrice) return false;
      
      const soldDate = new Date(transaction.soldDate);
      return soldDate.getMonth() === currentMonth && soldDate.getFullYear() === currentYear;
    });

    // 本月销售金额（转换为人民币）
    const thisMonthSoldAmount = thisMonthSoldItems.reduce((sum: number, item: any) => {
      const transaction = item.transactions[0];
      return sum + convertToCNY(
        transaction.soldPrice,
        transaction.soldPriceCurrency,
        transaction.soldPriceExchangeRate
      );
    }, 0);

    const thisMonthSoldCount = thisMonthSoldItems.length;

    // 本月净利润（转换为人民币）
    const thisMonthSoldProfit = thisMonthSoldItems.reduce((sum: number, item: any) => {
      const transaction = item.transactions[0];
      if (!transaction.itemNetProfit) return sum;
      
      return sum + convertToCNY(
        transaction.itemNetProfit,
        transaction.soldPriceCurrency || 'CNY',
        transaction.soldPriceExchangeRate || '1'
      );
    }, 0);

    // 本月购入金额（转换为人民币）
    const thisMonthPurchaseAmount = thisMonthItems.reduce((sum: number, item: any) => {
      const transaction = item.transactions[0];
      return sum + convertToCNY(
        transaction.purchasePrice,
        transaction.purchasePriceCurrency,
        transaction.purchasePriceExchangeRate
      );
    }, 0);

    const thisMonthPurchaseCount = thisMonthItems.length;

    // 计算库存周转率
    const turnoverRate = items.length > 0 ? ((soldCount / items.length) * 100).toFixed(1) : "0.0";

    return {
      totalPurchase: Math.round(totalPurchase * 100) / 100, // 保留两位小数
      totalSold: Math.round(totalSold * 100) / 100,
      totalProfit: Math.round(totalProfit * 100) / 100,
      averageProfitRate,
      inStockCount,
      soldCount,
      totalItems: items.length,
      warehouseCount,
      thisMonthSoldAmount: Math.round(thisMonthSoldAmount * 100) / 100,
      thisMonthSoldCount,
      thisMonthSoldProfit: Math.round(thisMonthSoldProfit * 100) / 100,
      thisMonthPurchaseAmount: Math.round(thisMonthPurchaseAmount * 100) / 100,
      thisMonthPurchaseCount,
      turnoverRate,
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