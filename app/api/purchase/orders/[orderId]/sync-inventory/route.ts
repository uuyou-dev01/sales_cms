import { NextRequest } from 'next/server';
import { getAuthFromRequest, hasPermission } from '@/lib/auth';
import { ok, forbidden, serverError, notFound } from '@/src/modules/shared/api/response';
import { syncInventoryFromPurchaseOrder } from '@/src/modules/stock/services/inventory.service';
import { logActivity } from '@/lib/audit';

export async function POST(req: NextRequest, { params }: { params: { orderId: string } }) {
  try {
    const user = getAuthFromRequest(req);
    if (!user || !hasPermission(user, 'USER')) return forbidden();

    await syncInventoryFromPurchaseOrder(params.orderId);
    await logActivity(user.id, 'SYNC_INVENTORY_FROM_PURCHASE', 'PurchaseOrder', params.orderId);

    return ok({ success: true, message: '库存同步成功' });
  } catch (e: any) {
    if (e.message?.includes('不存在')) {
      return notFound('PURCHASE_ORDER_NOT_FOUND');
    }
    if (e.message?.includes('已入库')) {
      return serverError('ALREADY_SYNCED');
    }
    return serverError('INVENTORY_SYNC_FAILED');
  }
}

