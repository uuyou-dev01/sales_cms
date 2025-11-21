import { NextRequest } from 'next/server';
import { getAuthFromRequest, hasPermission } from '@/lib/auth';
import { ok, notFound, forbidden, serverError } from '@/src/modules/shared/api/response';
import { getExchangeRateById, updateExchangeRate, deleteExchangeRate } from '@/src/modules/finance/services/exchange-rate.service';
import { logActivity } from '@/lib/audit';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthFromRequest(req);
    if (!user || !hasPermission(user, 'USER')) return forbidden();
    const data = await getExchangeRateById(params.id);
    if (!data) return notFound('EXCHANGE_RATE_NOT_FOUND');
    return ok(data);
  } catch (e) {
    return serverError('EXCHANGE_RATE_GET_FAILED');
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthFromRequest(req);
    if (!user || !hasPermission(user, 'USER')) return forbidden();
    const body = await req.json();
    const updated = await updateExchangeRate(params.id, body);
    await logActivity(user.id, 'UPDATE_EXCHANGE_RATE', 'ExchangeRate', params.id)
    return ok(updated);
  } catch (e) {
    return serverError('EXCHANGE_RATE_UPDATE_FAILED');
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthFromRequest(req);
    if (!user || !hasPermission(user, 'USER')) return forbidden();
    await deleteExchangeRate(params.id);
    await logActivity(user.id, 'DELETE_EXCHANGE_RATE', 'ExchangeRate', params.id)
    return ok({ success: true });
  } catch (e) {
    return serverError('EXCHANGE_RATE_DELETE_FAILED');
  }
}


