import { NextRequest } from 'next/server';
import { getAuthFromRequest, hasPermission } from '@/lib/auth';
import { ok, badRequest, forbidden, serverError } from '@/src/modules/shared/api/response';
import { listTransactions, createTransaction } from '@/src/modules/sales/services/transaction.service';
import { createBundledSale } from '@/src/modules/sales/services/sale.service';
import { prisma } from '@/lib/prisma';
import { createFinanceRecord, calcProfit } from '@/lib/finance';
import { logActivity } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const user = getAuthFromRequest(req);
    if (!user || !hasPermission(user, 'USER')) return forbidden();

    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get('itemId');
    const data = itemId
      ? await prisma.transaction.findMany({ where: { itemId }, orderBy: { createdAt: 'desc' } })
      : await listTransactions();
    return ok(data);
  } catch (e) {
    return serverError('TRANSACTION_LIST_FAILED');
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getAuthFromRequest(req);
    if (!user || !hasPermission(user, 'USER')) return forbidden();

    const body = await req.json();

    // 检查是否为打包销售（新逻辑）
    if (body.items && Array.isArray(body.items) && body.items.length > 0) {
      // 打包销售
      if (!body.totalSoldPrice || !body.soldPriceCurrency || !body.soldPriceExchangeRate || !body.soldDate) {
        return badRequest('MISSING_REQUIRED_FIELDS');
      }

      const result = await createBundledSale({
        items: body.items,
        totalSoldPrice: Number(body.totalSoldPrice),
        soldPriceCurrency: body.soldPriceCurrency,
        soldPriceExchangeRate: Number(body.soldPriceExchangeRate),
        platformId: body.platformId || undefined,
        soldPlatform: body.soldPlatform || undefined,
        soldDate: new Date(body.soldDate),
        domesticShipping: body.domesticShipping ? Number(body.domesticShipping) : 0,
        internationalShipping: body.internationalShipping ? Number(body.internationalShipping) : 0,
        otherFees: body.otherFees || [],
        priceAllocationMethod: body.priceAllocationMethod || 'BY_COST',
        createdById: user.id,
        soldById: body.soldById || user.id,
        domesticTrackingNumber: body.domesticTrackingNumber || undefined,
        internationalTrackingNumber: body.internationalTrackingNumber || undefined,
        orderStatus: body.orderStatus || '已完成',
      });

      // 自动生成财务流水（售出收入）
      const soldCny = Number(body.totalSoldPrice) * Number(body.soldPriceExchangeRate);
      await createFinanceRecord('TRANSACTION', result.transaction.id, 'IN', soldCny, 'CNY', { transactionId: result.transaction.id }, user.id);

      // 审计
      await logActivity(user.id, 'CREATE_BUNDLED_SALE', 'Transaction', result.transaction.id, { itemIds: body.items.map((i: any) => i.itemId) });

      return ok({
        transaction: result.transaction,
        profit: result.profit,
      }, 201);
    }

    // 单Item销售（兼容旧逻辑）
    if (!body?.item?.connect?.itemId && !body?.itemId) return badRequest('MISSING_ITEM');
    // 自动计算利润（若有售出信息）
    if (body.soldPrice && (body.soldPriceExchangeRate || body.soldPriceCurrency)) {
      const soldPrice = Number(body.soldPrice)
      const soldRate = Number(body.soldPriceExchangeRate || 1)
      const purchasePrice = Number(body.purchasePrice || 0)
      const purchaseRate = Number(body.purchasePriceExchangeRate || 1)
      const gross = calcProfit({ soldPrice, purchasePrice, rate: soldRate })
      body.itemGrossProfit = String(gross)
      body.itemNetProfit = body.itemGrossProfit
    }

    // 记录创建者
    body.createdBy = { connect: { id: user.id } }

    const created = await createTransaction(body);

    // 自动生成财务流水（售出收入）
    if (created.soldPrice && created.soldPriceExchangeRate) {
      const soldCny = Number(created.soldPrice) * Number(created.soldPriceExchangeRate)
      await createFinanceRecord('TRANSACTION', created.id, 'IN', soldCny, 'CNY', { itemId: created.itemId }, user.id)
    }

    // 审计
    await logActivity(user.id, 'CREATE_TRANSACTION', 'Transaction', created.id, { itemId: created.itemId })
    return ok(created, 201);
  } catch (e: any) {
    console.error('Create transaction error:', e);
    return serverError(e?.message || 'TRANSACTION_CREATE_FAILED');
  }
}


