import { NextRequest } from 'next/server';
import { getAuthFromRequest, hasPermission } from '@/lib/auth';
import { ok, forbidden, serverError } from '@/src/modules/shared/api/response';
import { prisma } from '@/lib/prisma';
import Decimal from 'decimal.js';

export async function GET(req: NextRequest) {
  try {
    const user = getAuthFromRequest(req);
    if (!user || !hasPermission(user, 'USER')) return forbidden();

    // 获取所有采购单
    const orders = await prisma.purchaseOrder.findMany({
      include: {
        details: true,
      },
    });

    // 计算总采购金额
    const totalAmount = orders.reduce((sum, order) => {
      return sum.plus(new Decimal(order.totalAmount || 0));
    }, new Decimal(0));

    // 按状态统计
    const statusCounts = {
      PENDING: 0,
      IN_TRANSIT: 0,
      AT_WAREHOUSE: 0,
      COMPLETED: 0,
      EXCEPTION: 0,
    };

    orders.forEach(order => {
      const remarks = order.remarks || '{}';
      try {
        const meta = JSON.parse(remarks);
        const status = meta.status || 'PENDING';
        if (status in statusCounts) {
          statusCounts[status as keyof typeof statusCounts]++;
        }
      } catch {
        statusCounts.PENDING++;
      }
    });

    // 本月采购统计
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const thisMonthOrders = orders.filter(order => {
      const purchaseDate = new Date(order.purchaseDate);
      return purchaseDate.getMonth() === currentMonth && purchaseDate.getFullYear() === currentYear;
    });

    const thisMonthAmount = thisMonthOrders.reduce((sum, order) => {
      return sum.plus(new Decimal(order.totalAmount || 0));
    }, new Decimal(0));

    // 已入库数量
    const completedCount = statusCounts.COMPLETED;

    // 总SKU数量（去重）
    const allSkuIds = new Set<string>();
    orders.forEach(order => {
      order.details.forEach(detail => {
        allSkuIds.add(detail.skuId);
      });
    });

    // 总订单数
    const totalOrders = orders.length;

    return ok({
      totalAmount: totalAmount.toNumber(),
      totalOrders,
      completedCount,
      pendingCount: statusCounts.PENDING,
      inTransitCount: statusCounts.IN_TRANSIT,
      atWarehouseCount: statusCounts.AT_WAREHOUSE,
      exceptionCount: statusCounts.EXCEPTION,
      thisMonthAmount: thisMonthAmount.toNumber(),
      thisMonthOrders: thisMonthOrders.length,
      totalSkus: allSkuIds.size,
    });
  } catch (e) {
    console.error('Purchase stats error:', e);
    return serverError('PURCHASE_STATS_FAILED');
  }
}

