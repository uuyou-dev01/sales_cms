import { NextRequest } from 'next/server';
import { getAuthFromRequest, hasPermission } from '@/lib/auth';
import { ok, badRequest, forbidden, serverError } from '@/src/modules/shared/api/response';
import { listOrders, createOrder, createOrderWithDetails } from '@/src/modules/purchase/services/order.service';
import { syncInventoryFromPurchaseOrder } from '@/src/modules/stock/services/inventory.service';
import { createFinanceRecord } from '@/lib/finance';
import { logActivity } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const user = getAuthFromRequest(req);
    if (!user || !hasPermission(user, 'USER')) return forbidden();
    
    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get('page') || '1');
    const pageSize = Number(searchParams.get('pageSize') || '20');
    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') || undefined;
    const platform = searchParams.get('platform') || undefined;
    
    const result = await listOrders({ page, pageSize, search, status, platform });
    return ok(result);
  } catch (e) {
    return serverError('PURCHASE_ORDER_LIST_FAILED');
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getAuthFromRequest(req);
    if (!user || !hasPermission(user, 'USER')) return forbidden();
    const body = await req.json();
    
    // 支持新的多SKU创建方式
    if (body.details && Array.isArray(body.details)) {
      if (!body?.orderNumber || !body?.currency || !body?.purchaseDate || !body.details.length) {
        return badRequest('MISSING_REQUIRED_FIELDS');
      }
      
      const created = await createOrderWithDetails({
        ...body,
        purchaseDate: new Date(body.purchaseDate),
        createdById: user.id,
      });
      
      // 如果指定了自动入库，立即同步库存
      if (body.autoSyncInventory === true) {
        try {
          await syncInventoryFromPurchaseOrder(created.id);
          await logActivity(user.id, 'SYNC_INVENTORY_FROM_PURCHASE', 'PurchaseOrder', created.id);
        } catch (error: any) {
          console.error('Auto sync inventory error:', error);
          // 如果自动入库失败，记录错误但不停止流程
          // 用户可以稍后手动入库
        }
      }
      
      // 财务：采购总金额记为支出
      await createFinanceRecord('PURCHASE_ORDER', created.id, 'OUT', Number(created.totalAmount), created.currency, {}, user.id);
      await logActivity(user.id, 'CREATE_PURCHASE_ORDER', 'PurchaseOrder', created.id);
      return ok(created, 201);
    }
    
    // 兼容旧方式
    if (!body?.orderNumber || !body?.totalAmount || !body?.currency || !body?.purchaseDate) {
      return badRequest('MISSING_REQUIRED_FIELDS');
    }
    body.createdBy = { connect: { id: user.id } };
    const created = await createOrder(body);
    await createFinanceRecord('PURCHASE_ORDER', created.id, 'OUT', Number(created.totalAmount), created.currency, {}, user.id);
      await logActivity(user.id, 'CREATE_PURCHASE_ORDER', 'PurchaseOrder', created.id);
    return ok(created, 201);
  } catch (e: any) {
    console.error('Create purchase order error:', e);
    console.error('Error stack:', e?.stack);
    console.error('Error message:', e?.message);
    return serverError(e?.message || 'PURCHASE_ORDER_CREATE_FAILED');
  }
}


