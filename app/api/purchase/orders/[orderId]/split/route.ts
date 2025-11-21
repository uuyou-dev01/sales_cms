import { NextRequest } from 'next/server';
import { getAuthFromRequest, hasPermission } from '@/lib/auth';
import { ok, badRequest, forbidden, serverError, notFound } from '@/src/modules/shared/api/response';
import { splitBoxedSet } from '@/src/modules/inventorySplit/services/split.service';
import { logActivity } from '@/lib/audit';

export async function POST(req: NextRequest, { params }: { params: { orderId: string } }) {
  try {
    const user = getAuthFromRequest(req);
    if (!user || !hasPermission(user, 'USER')) return forbidden();

    const body = await req.json();
    if (!body?.parentItemId || !body?.childItems || !Array.isArray(body.childItems) || body.childItems.length === 0) {
      return badRequest('MISSING_REQUIRED_FIELDS');
    }

    const result = await splitBoxedSet({
      parentItemId: body.parentItemId,
      childItems: body.childItems,
      totalCost: body.totalCost || 0,
      createdById: user.id,
    });

    await logActivity(user.id, 'SPLIT_BOXED_SET', 'PurchaseOrder', params.orderId);

    return ok({ success: true, splits: result });
  } catch (e: any) {
    if (e.message?.includes('不存在')) {
      return notFound('ITEM_OR_SKU_NOT_FOUND');
    }
    return serverError('SPLIT_FAILED');
  }
}

