import { NextRequest } from 'next/server';
import { getAuthFromRequest, hasPermission } from '@/lib/auth';
import { ok, notFound, forbidden, serverError } from '@/src/modules/shared/api/response';
import { getTransactionById, updateTransaction, deleteTransaction } from '@/src/modules/sales/services/transaction.service';
import { createFinanceRecord, calcProfit } from '@/lib/finance';
import { logActivity } from '@/lib/audit';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthFromRequest(req);
    if (!user || !hasPermission(user, 'USER')) return forbidden();

    const tx = await getTransactionById(params.id);
    if (!tx) return notFound('TRANSACTION_NOT_FOUND');
    return ok(tx);
  } catch (e) {
    return serverError('TRANSACTION_GET_FAILED');
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthFromRequest(req);
    if (!user || !hasPermission(user, 'USER')) return forbidden();

    const body = await req.json();
    if (body.soldPrice && (body.soldPriceExchangeRate || body.soldPriceCurrency)) {
      const soldPrice = Number(body.soldPrice)
      const soldRate = Number(body.soldPriceExchangeRate || 1)
      const purchasePrice = Number(body.purchasePrice || 0)
      const purchaseRate = Number(body.purchasePriceExchangeRate || 1)
      const gross = calcProfit({ soldPrice, purchasePrice, rate: soldRate })
      body.itemGrossProfit = String(gross)
      body.itemNetProfit = body.itemGrossProfit
    }
    const updated = await updateTransaction(params.id, body);

    if (updated.soldPrice && updated.soldPriceExchangeRate) {
      const soldCny = Number(updated.soldPrice) * Number(updated.soldPriceExchangeRate)
      await createFinanceRecord('TRANSACTION', updated.id, 'IN', soldCny, 'CNY', { itemId: updated.itemId }, user.id)
    }
    await logActivity(user.id, 'UPDATE_TRANSACTION', 'Transaction', params.id)
    return ok(updated);
  } catch (e) {
    return serverError('TRANSACTION_UPDATE_FAILED');
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthFromRequest(req);
    if (!user || !hasPermission(user, 'USER')) return forbidden();

    await deleteTransaction(params.id);
    await logActivity(user.id, 'DELETE_TRANSACTION', 'Transaction', params.id)
    return ok({ success: true });
  } catch (e) {
    return serverError('TRANSACTION_DELETE_FAILED');
  }
}


