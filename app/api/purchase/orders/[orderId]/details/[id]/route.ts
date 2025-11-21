import { NextRequest } from 'next/server';
import { getAuthFromRequest, hasPermission } from '@/lib/auth';
import { ok, notFound, forbidden, serverError } from '@/src/modules/shared/api/response';
import { getDetailById, updateDetail, deleteDetail } from '@/src/modules/purchase/services/detail.service';

export async function GET(req: NextRequest, { params }: { params: { orderId: string; id: string } }) {
  try {
    const user = getAuthFromRequest(req);
    if (!user || !hasPermission(user, 'USER')) return forbidden();
    const data = await getDetailById(params.id);
    if (!data) return notFound('PURCHASE_DETAIL_NOT_FOUND');
    return ok(data);
  } catch (e) {
    return serverError('PURCHASE_DETAIL_GET_FAILED');
  }
}

export async function PUT(req: NextRequest, { params }: { params: { orderId: string; id: string } }) {
  try {
    const user = getAuthFromRequest(req);
    if (!user || !hasPermission(user, 'USER')) return forbidden();
    const body = await req.json();
    const updated = await updateDetail(params.id, body);
    return ok(updated);
  } catch (e) {
    return serverError('PURCHASE_DETAIL_UPDATE_FAILED');
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { orderId: string; id: string } }) {
  try {
    const user = getAuthFromRequest(req);
    if (!user || !hasPermission(user, 'USER')) return forbidden();
    await deleteDetail(params.id);
    return ok({ success: true });
  } catch (e) {
    return serverError('PURCHASE_DETAIL_DELETE_FAILED');
  }
}


