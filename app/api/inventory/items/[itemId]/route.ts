import { NextRequest } from 'next/server';
import { getAuthFromRequest, hasPermission } from '@/lib/auth';
import { ok, notFound, forbidden, serverError, badRequest } from '@/src/modules/shared/api/response';
import { getItemById, updateItem, deleteItem } from '@/src/modules/inventory/services/item.service';
import { logActivity } from '@/lib/audit';

export async function GET(req: NextRequest, { params }: { params: { itemId: string } }) {
  try {
    const user = getAuthFromRequest(req);
    if (!user || !hasPermission(user, 'USER')) return forbidden();

    const item = await getItemById(params.itemId);
    if (!item) return notFound('ITEM_NOT_FOUND');
    return ok(item);
  } catch (e) {
    return serverError('INVENTORY_GET_FAILED');
  }
}

export async function PUT(req: NextRequest, { params }: { params: { itemId: string } }) {
  try {
    const user = getAuthFromRequest(req);
    if (!user || !hasPermission(user, 'USER')) return forbidden();

    const body = await req.json();
    const updated = await updateItem(params.itemId, body);
    if (user?.id) await logActivity(user.id, 'UPDATE_ITEM', 'Item', params.itemId)
    return ok(updated);
  } catch (e) {
    return serverError('INVENTORY_UPDATE_FAILED');
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { itemId: string } }) {
  try {
    const user = getAuthFromRequest(req);
    if (!user || !hasPermission(user, 'USER')) return forbidden();

    if (!params.itemId) return badRequest('MISSING_ITEM_ID');
    await deleteItem(params.itemId);
    if (user?.id) await logActivity(user.id, 'DELETE_ITEM', 'Item', params.itemId)
    return ok({ success: true });
  } catch (e) {
    return serverError('INVENTORY_DELETE_FAILED');
  }
}


