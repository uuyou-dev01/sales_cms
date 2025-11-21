import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, hasPermission } from '@/lib/auth';
import { ok, badRequest, forbidden, serverError } from '@/src/modules/shared/api/response';
import { prisma } from '@/lib/prisma';
import { createFinanceRecord } from '@/lib/finance';
import { logActivity } from '@/lib/audit';
import { markItemsInStockByPurchaseOrder } from '@/src/modules/stock/services/inventory.service';
import { refreshAwaitingWarehouseFlag } from '@/src/modules/purchase/services/order.service';

interface LogisticsSegment {
  fromNode?: string
  toNode?: string
  departedAt?: string
  arrivedAt?: string
  carrier?: string
  weight?: number
  cost?: number
  currency?: string
  meta?: Record<string, unknown>
}

interface LogisticsAllocation {
  purchaseOrderId?: string
  relatedId?: string
  weight?: number
  amount?: number
  currency?: string
  note?: string
}

export async function GET(req: NextRequest) {
  try {
    const user = getAuthFromRequest(req);
    if (!user || !hasPermission(user, 'USER')) return forbidden();
    const { searchParams } = new URL(req.url);
    const relatedType = searchParams.get('type') || undefined;
    const relatedId = searchParams.get('id') || undefined;
    const where: any = {};
    if (relatedType) where.relatedType = relatedType;
    if (relatedId) where.relatedId = relatedId;
    const data = await prisma.logistics.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return ok(data);
  } catch (e) {
    console.error('LOGISTICS_LIST_FAILED', e)
    return serverError('LOGISTICS_LIST_FAILED');
  }
}

function mapPurchaseStatusFromLogistics(status?: string | null) {
  switch (status) {
    case 'IN_TRANSIT':
    case 'AT_FORWARDER':
    case 'LEAVING_CHINA':
      return 'IN_TRANSIT';
    case 'AT_WAREHOUSE':
    case 'DELIVERED':
      return 'COMPLETED';
    case 'EXCEPTION':
      return 'EXCEPTION';
    default:
      return 'PENDING';
  }
}

async function syncPurchaseStatusFromLogistics(relatedId?: string | null, status?: string | null) {
  if (!relatedId || !status) return
  const order = await prisma.purchaseOrder.findUnique({
    where: { id: relatedId },
    select: { remarks: true },
  })
  if (!order) return
  let meta: Record<string, any>
  try {
    meta = order.remarks ? JSON.parse(order.remarks) : {}
  } catch {
    meta = {}
  }
  const nextStatus = mapPurchaseStatusFromLogistics(status)
  if (meta.status === nextStatus) return
  meta.status = nextStatus
  await prisma.purchaseOrder.update({
    where: { id: relatedId },
    data: { remarks: JSON.stringify(meta) },
  })
}

export async function POST(req: NextRequest) {
  try {
    const user = getAuthFromRequest(req);
    if (!user || !hasPermission(user, 'USER')) return forbidden();
    const body = await req.json();
    if (!body?.relatedType || !body?.relatedId) return badRequest('MISSING_RELATED');

    const segments = Array.isArray(body.segments) ? body.segments as LogisticsSegment[] : []
    const allocations = Array.isArray(body.allocations) ? body.allocations as LogisticsAllocation[] : []

    const created = await prisma.logistics.create({ data: {
      relatedType: body.relatedType,
      relatedId: body.relatedId,
      fromCountry: body.fromCountry,
      toCountry: body.toCountry,
      fromNode: body.fromNode,
      toNode: body.toNode,
      trackingNo: body.trackingNo,
      cost: body.cost ?? undefined,
      currency: body.currency ?? undefined,
      departedAt: body.departedAt ? new Date(body.departedAt) : undefined,
      arrivedAt: body.arrivedAt ? new Date(body.arrivedAt) : undefined,
      status: body.status ?? 'PENDING',
      destination: body.destination ?? 'WAREHOUSE',
      segments: segments.length > 0 ? segments : undefined,
      allocations: allocations.length > 0 ? allocations : undefined,
    } })

    if (allocations.length > 0) {
      for (const allocation of allocations) {
        if (allocation.amount && allocation.currency) {
          await createFinanceRecord(
            'LOGISTICS',
            created.id,
            'OUT',
            Number(allocation.amount),
            allocation.currency,
            {
              relatedType: allocation.purchaseOrderId ? 'PURCHASE_ORDER' : created.relatedType,
              relatedId: allocation.purchaseOrderId || allocation.relatedId || created.relatedId,
            },
            user.id
          )
        }
      }
    } else if (created.cost && created.currency) {
      await createFinanceRecord(
        'LOGISTICS',
        created.id,
        'OUT',
        Number(created.cost),
        created.currency,
        { relatedType: created.relatedType, relatedId: created.relatedId },
        user.id
      )
    }

    if (created.relatedType === 'PURCHASE_ORDER') {
      await syncPurchaseStatusFromLogistics(created.relatedId, created.status)
      if (created.relatedId) {
        await refreshAwaitingWarehouseFlag(created.relatedId)
        const isWarehouseStatus = created.status === 'AT_WAREHOUSE' || created.status === 'DELIVERED';
        if (isWarehouseStatus) {
          await markItemsInStockByPurchaseOrder(created.relatedId, { trigger: 'LOGISTICS_CREATE' })
        }
      }
    }

    await logActivity(user.id, 'CREATE_LOGISTICS', 'Logistics', created.id, { relatedType: created.relatedType })
    return ok(created, 201);
  } catch (e) {
    console.error('LOGISTICS_CREATE_FAILED', e)
    return serverError('LOGISTICS_CREATE_FAILED');
  }
}



