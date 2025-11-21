import { NextRequest } from 'next/server';
import { getAuthFromRequest, hasPermission } from '@/lib/auth';
import { ok, badRequest, forbidden, serverError } from '@/src/modules/shared/api/response';
import { listItems, createItem } from '@/src/modules/inventory/services/item.service';
import { logActivity } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const user = getAuthFromRequest(req);
    if (!user || !hasPermission(user, 'USER')) return forbidden();

    const items = await listItems();
    return ok(items);
  } catch (e) {
    return serverError('INVENTORY_LIST_FAILED');
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getAuthFromRequest(req);
    if (!user || !hasPermission(user, 'USER')) return forbidden();

    const body = await req.json();
    if (!body?.itemId || !body?.itemName || !body?.itemNumber || !body?.itemType || !body?.itemBrand || !body?.itemCondition || !body?.itemSize) {
      return badRequest('MISSING_REQUIRED_FIELDS');
    }

    const created = await createItem(body);
    if (user?.id) await logActivity(user.id, 'CREATE_ITEM', 'Item', created.itemId)
    return ok(created, 201);
  } catch (e) {
    return serverError('INVENTORY_CREATE_FAILED');
  }
}


