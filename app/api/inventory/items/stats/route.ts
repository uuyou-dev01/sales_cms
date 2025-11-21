import { NextRequest } from 'next/server';
import { getAuthFromRequest, hasPermission } from '@/lib/auth';
import { ok, serverError, forbidden } from '@/src/modules/shared/api/response';
import { getCachedStats } from '@/lib/cache';

export async function GET(req: NextRequest) {
  try {
    const user = getAuthFromRequest(req);
    if (!user || !hasPermission(user, 'USER')) return forbidden();
    const stats = await getCachedStats();
    return ok(stats);
  } catch (e) {
    return serverError('INVENTORY_STATS_FAILED');
  }
}


