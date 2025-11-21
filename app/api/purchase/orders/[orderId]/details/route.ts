import { NextRequest } from 'next/server';
import { getAuthFromRequest, hasPermission } from '@/lib/auth';
import { ok, badRequest, forbidden, serverError } from '@/src/modules/shared/api/response';
import { listDetailsByOrder, createDetail } from '@/src/modules/purchase/services/detail.service';

export async function GET(req: NextRequest, { params }: { params: { orderId: string } }) {
  try {
    const user = getAuthFromRequest(req);
    if (!user || !hasPermission(user, 'USER')) return forbidden();
    const data = await listDetailsByOrder(params.orderId);
    return ok(data);
  } catch (e) {
    return serverError('PURCHASE_DETAIL_LIST_FAILED');
  }
}

export async function POST(req: NextRequest, { params }: { params: { orderId: string } }) {
  try {
    const user = getAuthFromRequest(req);
    if (!user || !hasPermission(user, 'USER')) return forbidden();
    const body = await req.json();
    if (!body?.sku?.connect?.id && !body?.skuId) return badRequest('MISSING_SKU');
    // 强制关联订单
    if (!body.purchaseOrder && !body.purchaseOrderId) {
      body.purchaseOrder = { connect: { id: params.orderId } };
    }
    const created = await createDetail(body);
    return ok(created, 201);
  } catch (e) {
    return serverError('PURCHASE_DETAIL_CREATE_FAILED');
  }
}


