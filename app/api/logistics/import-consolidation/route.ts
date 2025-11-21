import { NextRequest } from 'next/server';
import { getAuthFromRequest, hasPermission } from '@/lib/auth';
import { ok, badRequest, forbidden, serverError } from '@/src/modules/shared/api/response';
import { prisma } from '@/lib/prisma';
import { createFinanceRecord } from '@/lib/finance';
import { logActivity } from '@/lib/audit';
import { getLatestRate, convert } from '@/lib/exchange';

export async function POST(req: NextRequest) {
  try {
    const user = getAuthFromRequest(req);
    if (!user || !hasPermission(user, 'USER')) return forbidden();
    
    const body = await req.json();
    const { consolidationTrackingNo, totalCost, currency, packages } = body;
    // packages: { trackingNo: string, weight: number, arrivedAt?: string }[]

    if (!consolidationTrackingNo) {
      return badRequest('MISSING_CONSOLIDATION_TRACKING_NO');
    }

    if (!packages || !Array.isArray(packages) || packages.length === 0) {
      return badRequest('NO_PACKAGES');
    }

    if (!totalCost || Number(totalCost) <= 0) {
      return badRequest('INVALID_TOTAL_COST');
    }

    // 1. 查找匹配的物流记录和采购单
    const trackingNos = packages.map((pkg: any) => pkg.trackingNo).filter(Boolean);
    
    // 先通过物流单号匹配（Logistics.trackingNo）
    const matchedLogisticsByTracking = await prisma.logistics.findMany({
      where: {
        trackingNo: { in: trackingNos },
      },
    });

    // 再通过采购单号匹配（PurchaseOrder.orderNumber）
    const matchedOrders = await prisma.purchaseOrder.findMany({
      where: {
        orderNumber: { in: trackingNos },
      },
    });

    // 查找这些采购单关联的物流记录
    const orderIds = matchedOrders.map((o) => o.id);
    const matchedLogisticsByOrder = orderIds.length > 0
      ? await prisma.logistics.findMany({
          where: {
            relatedType: 'PURCHASE_ORDER',
            relatedId: { in: orderIds },
          },
        })
      : [];

    // 创建物流记录到采购单的映射
    const logisticsByOrderId = new Map<string, any>();
    matchedLogisticsByOrder.forEach((log) => {
      if (log.relatedId && !logisticsByOrderId.has(log.relatedId)) {
        logisticsByOrderId.set(log.relatedId, log);
      }
    });

    // Create maps for quick lookup
    const logisticsMap = new Map<string, any>();
    
    // 添加通过物流单号匹配的记录
    matchedLogisticsByTracking.forEach((log) => {
      if (log.trackingNo) {
        logisticsMap.set(log.trackingNo, log);
      }
    });

    // 添加通过采购单号匹配的记录
    matchedOrders.forEach((order) => {
      if (order.orderNumber && !logisticsMap.has(order.orderNumber)) {
        // 查找采购单关联的物流记录
        const relatedLogistics = logisticsByOrderId.get(order.id);
        if (relatedLogistics) {
          logisticsMap.set(order.orderNumber, relatedLogistics);
        } else {
          // 如果没有物流记录，创建虚拟记录标记
          logisticsMap.set(order.orderNumber, {
            id: `PO-${order.id}`,
            relatedType: 'PURCHASE_ORDER',
            relatedId: order.id,
            trackingNo: order.orderNumber,
            isVirtual: true, // 标记为虚拟记录
          });
        }
      }
    });

    // 2. 计算总重量
    const totalWeight = packages.reduce((sum: number, pkg: any) => sum + (Number(pkg.weight) || 0), 0);
    if (totalWeight <= 0) {
      return badRequest('INVALID_TOTAL_WEIGHT');
    }

    // 3. 转换费用为 CNY
    let costCNY = Number(totalCost);
    if (currency && currency !== 'CNY') {
      const rate = await getLatestRate(currency, 'CNY');
      if (rate) {
        costCNY = convert(costCNY, rate);
      }
    }

    // 4. 创建转运物流记录
    const consolidationLogistics = await prisma.logistics.create({
      data: {
        relatedType: 'CONSOLIDATION',
        relatedId: `IMP-${Date.now()}`,
        trackingNo: consolidationTrackingNo,
        status: 'FORWARDER_INBOUND',
        destination: 'FORWARDER',
        cost: totalCost,
        currency: currency || 'CNY',
        segments: {
          packages: packages.map((pkg: any) => ({
            trackingNo: pkg.trackingNo,
            weight: pkg.weight,
            arrivedAt: pkg.arrivedAt,
          })),
        },
      },
    });

    // 5. 更新匹配到的物流记录，并分摊费用到 Items
    const results = {
      matched: 0,
      notMatched: [] as string[],
      updatedItems: 0,
    };

    await prisma.$transaction(async (tx) => {
      for (const pkg of packages) {
        const { trackingNo, weight } = pkg;
        if (!trackingNo) continue;

        const logisticsRecord = logisticsMap.get(trackingNo);
        
        if (logisticsRecord) {
          // 如果不是虚拟记录，更新原物流记录状态和标记
          if (!(logisticsRecord as any).isVirtual) {
            await tx.logistics.update({
              where: { id: logisticsRecord.id },
              data: {
                status: 'CONSOLIDATED',
                destination: 'FORWARDER',
                segments: {
                  ...(logisticsRecord.segments as any || {}),
                  consolidatedInto: consolidationLogistics.id,
                  weight: Number(weight),
                  arrivedAt: pkg.arrivedAt,
                },
              },
            });
          } else {
            // 对于虚拟记录（通过采购单号匹配但无物流记录），可以创建一个新的物流记录
            // 或者仅处理费用分摊，跳过物流记录的更新
            // 这里我们选择创建新的物流记录
            await tx.logistics.create({
              data: {
                relatedType: logisticsRecord.relatedType,
                relatedId: logisticsRecord.relatedId,
                trackingNo: trackingNo,
                status: 'CONSOLIDATED',
                destination: 'FORWARDER',
                segments: {
                  consolidatedInto: consolidationLogistics.id,
                  weight: Number(weight),
                  arrivedAt: pkg.arrivedAt,
                },
              },
            });
          }

          results.matched++;

          // 计算该包裹的费用分摊
          const weightRatio = totalWeight > 0 ? (Number(weight) / totalWeight) : 0;
          const packageCostCNY = costCNY * weightRatio;

          if (packageCostCNY > 0) {
            // 查找关联的 Items
            let itemIds: string[] = [];

            if (logisticsRecord.relatedType === 'PURCHASE_ORDER') {
              const order = await tx.purchaseOrder.findUnique({
                where: { id: logisticsRecord.relatedId },
                include: {
                  details: {
                    include: {
                      items: true,
                    },
                  },
                },
              });
              if (order) {
                order.details.forEach((detail) => {
                  detail.items.forEach((item) => {
                    itemIds.push(item.itemId);
                  });
                });
              }
            } else if (logisticsRecord.relatedType === 'ITEM') {
              itemIds.push(logisticsRecord.relatedId);
            }

            // 分摊费用到 Items (平均分摊到该包裹的所有 items)
            if (itemIds.length > 0) {
              const costPerItem = packageCostCNY / itemIds.length;
              
              for (const itemId of itemIds) {
                await tx.item.update({
                  where: { itemId },
                  data: {
                    purchaseCostCNY: {
                      increment: costPerItem,
                    },
                  },
                });
                results.updatedItems++;
              }
            }
          }
        } else {
          results.notMatched.push(trackingNo);
        }
      }
    });

    // 6. 创建财务记录
    if (totalCost && currency) {
      await createFinanceRecord(
        'LOGISTICS',
        consolidationLogistics.id,
        'OUT',
        Number(totalCost),
        currency,
        {
          relatedType: 'CONSOLIDATION',
          relatedId: consolidationLogistics.relatedId,
          imported: true,
        },
        user.id
      );
    }

    await logActivity(user.id, 'IMPORT_CONSOLIDATION', 'Logistics', consolidationLogistics.id, {
      matched: results.matched,
      notMatched: results.notMatched.length,
    });

    return ok({
      logisticsId: consolidationLogistics.id,
      ...results,
    });

  } catch (e) {
    console.error('IMPORT_CONSOLIDATION_FAILED', e);
    return serverError('IMPORT_CONSOLIDATION_FAILED');
  }
}

