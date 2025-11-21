import { NextRequest } from 'next/server';
import { getAuthFromRequest, hasPermission } from '@/lib/auth';
import { ok, notFound, forbidden, serverError, badRequest } from '@/src/modules/shared/api/response';
import { getOrderById, updateOrder, deleteOrder, refreshAwaitingWarehouseFlag } from '@/src/modules/purchase/services/order.service';
import { createFinanceRecord } from '@/lib/finance';
import { logActivity } from '@/lib/audit';

export async function GET(req: NextRequest, { params }: { params: { orderId: string } }) {
  try {
    const data = await getOrderById(params.orderId);
    if (!data) return notFound('PURCHASE_ORDER_NOT_FOUND');
    return ok(data);
  } catch (e) {
    return serverError('PURCHASE_ORDER_GET_FAILED');
  }
}

export async function PUT(req: NextRequest, { params }: { params: { orderId: string } }) {
  try {
    const user = getAuthFromRequest(req);
    if (!user || !hasPermission(user, 'USER')) return forbidden();
    
    const body = await req.json();
    const order = await getOrderById(params.orderId);
    if (!order) return notFound('PURCHASE_ORDER_NOT_FOUND');

    // 检查是否已入库
    const hasItems = order.details?.some((d: any) => d.items?.length > 0);
    if (hasItems && body.details) {
      return badRequest('CANNOT_UPDATE_DETAILS_AFTER_SYNC');
    }

    const updated = await updateOrder(params.orderId, body);
    if (updated?.id) {
      await refreshAwaitingWarehouseFlag(updated.id);
    }
    
    // 如果金额变化，更新财务记录
    if (updated.totalAmount && updated.currency && Number(updated.totalAmount) !== Number(order.totalAmount)) {
      await createFinanceRecord('PURCHASE_ORDER', updated.id, 'OUT', Number(updated.totalAmount), updated.currency, { adjust: true }, user.id);
    }
    
    await logActivity(user.id, 'UPDATE_PURCHASE_ORDER', 'PurchaseOrder', params.orderId);
    return ok(updated);
  } catch (e) {
    return serverError('PURCHASE_ORDER_UPDATE_FAILED');
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { orderId: string } }) {
  try {
    const user = getAuthFromRequest(req);
    if (!user || !hasPermission(user, 'ADMIN')) return forbidden();
    
    const order = await getOrderById(params.orderId);
    if (!order) return notFound('PURCHASE_ORDER_NOT_FOUND');

    // 检查是否已入库
    const hasItems = order.details?.some((d: any) => d.items?.length > 0);
    if (hasItems) {
      return badRequest('CANNOT_DELETE_AFTER_SYNC');
    }

    await deleteOrder(params.orderId);
    await logActivity(user.id, 'DELETE_PURCHASE_ORDER', 'PurchaseOrder', params.orderId);
    return ok({ success: true });
  } catch (e) {
    return serverError('PURCHASE_ORDER_DELETE_FAILED');
  }
}


