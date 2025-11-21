import { NextRequest } from 'next/server';
import { getAuthFromRequest, hasPermission } from '@/lib/auth';
import { ok, notFound, forbidden, serverError } from '@/src/modules/shared/api/response';
import { getLogisticsById, updateLogistics, deleteLogistics } from '@/src/modules/logistics/services/logistics.service';
import { createFinanceRecord } from '@/lib/finance';
import { logActivity } from '@/lib/audit';
import { prisma } from '@/lib/prisma';
import { markItemsInStockByPurchaseOrder } from '@/src/modules/stock/services/inventory.service';
import { refreshAwaitingWarehouseFlag } from '@/src/modules/purchase/services/order.service';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthFromRequest(req);
    if (!user || !hasPermission(user, 'USER')) return forbidden();
    const data = await getLogisticsById(params.id);
    if (!data) return notFound('LOGISTICS_NOT_FOUND');

    let linkedItems: any[] = [];

    if (data.relatedType === 'PURCHASE_ORDER' && data.relatedId) {
      const order = await prisma.purchaseOrder.findUnique({
        where: { id: data.relatedId },
        include: {
          details: {
            include: {
              sku: true,
              items: true,
            },
          },
        },
      });

      if (order) {
        linkedItems = order.details.flatMap((detail) =>
          detail.items.map((item) => ({
            itemId: item.itemId,
            itemName: item.itemName,
            itemSize: item.itemSize,
            itemCondition: item.itemCondition,
            status: item.status,
            batchNumber: item.batchNumber,
            skuId: detail.skuId,
            skuName: detail.sku?.name || detail.skuId,
          }))
        );
      }
    }

    return ok({ ...data, linkedItems });
  } catch (e) {
    return serverError('LOGISTICS_GET_FAILED');
  }
}

function mapPurchaseStatusFromLogistics(status?: string | null) {
  switch (status) {
    case 'IN_TRANSIT':
    case 'AT_FORWARDER':
    case 'LEAVING_CHINA':
      return 'IN_TRANSIT';
    case 'AT_WAREHOUSE':
    case 'DELIVERED':
      return 'COMPLETED';
    case 'EXCEPTION':
      return 'EXCEPTION';
    default:
      return 'PENDING';
  }
}

async function syncPurchaseStatusFromLogistics(relatedId?: string | null, status?: string | null) {
  if (!relatedId || !status) return
  const order = await prisma.purchaseOrder.findUnique({
    where: { id: relatedId },
    select: { remarks: true },
  })
  if (!order) return
  let meta: Record<string, any>
  try {
    meta = order.remarks ? JSON.parse(order.remarks) : {}
  } catch {
    meta = {}
  }
  const nextStatus = mapPurchaseStatusFromLogistics(status)
  if (meta.status === nextStatus) return
  meta.status = nextStatus
  await prisma.purchaseOrder.update({
    where: { id: relatedId },
    data: { remarks: JSON.stringify(meta) },
  })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthFromRequest(req);
    if (!user || !hasPermission(user, 'USER')) return forbidden();
    const body = await req.json();
    const existing = await getLogisticsById(params.id);
    const updated = await updateLogistics(params.id, body);
    
    // 检查是否更新了allocations，如果是，则同步更新Items的shippingCostCNY
    if (body.allocations && Array.isArray(body.allocations)) {
      for (const alloc of body.allocations) {
        if (alloc.itemId && alloc.amount !== undefined) {
          let shippingCostCNY = Number(alloc.amount);
          const allocCurrency = alloc.currency || updated.currency || 'CNY';

          if (allocCurrency !== 'CNY') {
             // 尝试获取汇率
             const rateRecord = await prisma.exchangeRate.findFirst({
                 where: {
                     baseCurrency: allocCurrency,
                     quoteCurrency: 'CNY'
                 },
                 orderBy: { rateDate: 'desc' }
             });
             if (rateRecord) {
                 shippingCostCNY = shippingCostCNY * Number(rateRecord.rate);
             } else {
                 // 尝试反向汇率
                 const reverseRate = await prisma.exchangeRate.findFirst({
                     where: {
                         baseCurrency: 'CNY',
                         quoteCurrency: allocCurrency
                     },
                     orderBy: { rateDate: 'desc' }
                 });
                  if (reverseRate) {
                      shippingCostCNY = shippingCostCNY / Number(reverseRate.rate);
                  }
             }
          }

          await prisma.item.update({
            where: { itemId: alloc.itemId },
            data: { shippingCostCNY },
          });
        }
      }
    }
    
    if (updated.relatedType === 'PURCHASE_ORDER') {
      await syncPurchaseStatusFromLogistics(updated.relatedId, updated.status)
      if (updated.relatedId) {
        await refreshAwaitingWarehouseFlag(updated.relatedId)
        const isWarehouseStatus = updated.status === 'AT_WAREHOUSE' || updated.status === 'DELIVERED';
        const hadWarehouseStatus = existing?.status === 'AT_WAREHOUSE' || existing?.status === 'DELIVERED';
        const becameWarehouse = isWarehouseStatus && !hadWarehouseStatus;
        if (becameWarehouse) {
          await markItemsInStockByPurchaseOrder(updated.relatedId, { trigger: 'LOGISTICS_UPDATE' })
        }
      }
    }
    
    if (updated.cost && updated.currency) {
      await createFinanceRecord('LOGISTICS', updated.id, 'OUT', Number(updated.cost), updated.currency, { relatedType: updated.relatedType, relatedId: updated.relatedId }, user.id)
    }
    await logActivity(user.id, 'UPDATE_LOGISTICS', 'Logistics', params.id)
    return ok(updated);
  } catch (e) {
    return serverError('LOGISTICS_UPDATE_FAILED');
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthFromRequest(req);
    if (!user || !hasPermission(user, 'USER')) return forbidden();
    await deleteLogistics(params.id);
    await logActivity(user.id, 'DELETE_LOGISTICS', 'Logistics', params.id)
    return ok({ success: true });
  } catch (e) {
    return serverError('LOGISTICS_DELETE_FAILED');
  }
}


