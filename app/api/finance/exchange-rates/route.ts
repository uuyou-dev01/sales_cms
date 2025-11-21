import { NextRequest } from 'next/server';
import { getAuthFromRequest, hasPermission } from '@/lib/auth';
import { ok, badRequest, forbidden, serverError } from '@/src/modules/shared/api/response';
import { listExchangeRates, createExchangeRate } from '@/src/modules/finance/services/exchange-rate.service';
import { logActivity } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const user = getAuthFromRequest(req);
    if (!user || !hasPermission(user, 'USER')) return forbidden();
    const data = await listExchangeRates();
    return ok(data);
  } catch (e) {
    return serverError('EXCHANGE_RATE_LIST_FAILED');
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getAuthFromRequest(req);
    if (!user || !hasPermission(user, 'USER')) return forbidden();
    const body = await req.json();
    if (!body?.baseCurrency || !body?.quoteCurrency || !body?.rate || !body?.rateDate) {
      return badRequest('MISSING_REQUIRED_FIELDS');
    }
    const created = await createExchangeRate(body);
    await logActivity(user.id, 'CREATE_EXCHANGE_RATE', 'ExchangeRate', created.id)
    return ok(created, 201);
  } catch (e) {
    return serverError('EXCHANGE_RATE_CREATE_FAILED');
  }
}


