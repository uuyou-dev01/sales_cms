import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import Decimal from 'decimal.js';

export interface PurchaseMeta {
  status?: string | null;
  platform?: string | null;
  supplier?: string | null;
  logisticsTrackingNo?: string | null;
  notes?: string | null;
  awaitingWarehouse?: boolean;
}

export function parsePurchaseMeta(remarks?: string | null): PurchaseMeta {
  if (!remarks) return {};
  try {
    const meta = JSON.parse(remarks);
    return {
      status: meta.status ?? null,
      platform: meta.platform ?? null,
      supplier: meta.supplier ?? null,
      logisticsTrackingNo: meta.logisticsTrackingNo ?? null,
      notes: meta.notes ?? null,
      awaitingWarehouse: Boolean(meta.awaitingWarehouse),
    };
  } catch {
    return {};
  }
}

export function buildRemarks(meta: PurchaseMeta): string {
  const payload: Record<string, unknown> = {
    status: meta.status ?? 'PENDING',
    platform: meta.platform ?? null,
    supplier: meta.supplier ?? null,
    logisticsTrackingNo: meta.logisticsTrackingNo ?? null,
    notes: meta.notes ?? null,
  };
  if (meta.awaitingWarehouse) {
    payload.awaitingWarehouse = true;
  }
  return JSON.stringify(payload);
}

const orderInclude = {
  exchangeRate: true,
  createdBy: true,
  details: {
    include: {
      sku: true,
      items: {
        include: {
          template: true,
        },
      },
    },
  },
  items: true,
} satisfies Prisma.PurchaseOrderInclude;

export interface ListOrdersParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  platform?: string;
}

export interface PurchaseDetailInput {
  skuId: string;
  quantity: number;
  unitPrice: number;
  itemIds?: string[]; // 新增：选择的已有Item ID列表（如果指定，则quantity应该等于itemIds.length）
  templateId?: string;
  // 创建新Item时的规格信息
  itemSize?: string;
  itemCondition?: string;
  itemColor?: string;
  toyCharacterName?: string;
  variant?: string;
  warehouseId?: string;
  type?: 'SINGLE' | 'VARIANTS' | 'BOXED_SET';
  boxedSetCount?: number;
}

export interface CreateOrderInput {
  orderNumber: string;
  totalAmount?: number;
  currency: string;
  purchaseDate: Date;
  platform?: string;
  supplier?: string;
  logisticsTrackingNo?: string;
  status?: string;
  remarks?: string;
  createdById: string;
  details: PurchaseDetailInput[];
}

export async function listOrders(params: ListOrdersParams = {}) {
  const { page = 1, pageSize = 20, search, status, platform } = params;
  
  const where: Prisma.PurchaseOrderWhereInput = {
    ...(search ? {
      OR: [
        { orderNumber: { contains: search } },
        { remarks: { contains: search } },
        { createdBy: { name: { contains: search } } },
        { details: { some: { sku: { name: { contains: search } } } } },
      ],
    } : {}),
    ...(status ? { remarks: { contains: `"status":"${status}"` } } : {}),
    ...(platform ? { remarks: { contains: `"platform":"${platform}"` } } : {}),
  };

  const [total, data] = await prisma.$transaction([
    prisma.purchaseOrder.count({ where }),
    prisma.purchaseOrder.findMany({
      where,
      include: orderInclude,
      orderBy: { purchaseDate: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return { total, data };
}

export function getOrderById(id: string) {
  return prisma.purchaseOrder.findUnique({ where: { id }, include: orderInclude });
}

export async function createOrderWithDetails(input: CreateOrderInput) {
  const { details, ...orderData } = input;
  
  // 计算总金额
  let totalAmount = new Decimal(0);
  details.forEach(detail => {
    totalAmount = totalAmount.plus(new Decimal(detail.unitPrice).times(detail.quantity));
  });

  const meta = buildRemarks({
    platform: input.platform || null,
    status: input.status || 'PENDING',
    supplier: input.supplier || null,
    logisticsTrackingNo: input.logisticsTrackingNo || null,
    notes: input.remarks || null,
  });

  return prisma.$transaction(async (tx) => {
    const order = await tx.purchaseOrder.create({
      data: {
        orderNumber: input.orderNumber,
        totalAmount: totalAmount.toNumber(),
        currency: input.currency,
        purchaseDate: input.purchaseDate,
        remarks: meta,
        createdBy: { connect: { id: input.createdById } },
        details: {
          create: details.map(detail => {
            // 构建meta信息（存储规格信息）
            const meta: any = {}
            if (detail.itemSize) meta.itemSize = detail.itemSize
            if (detail.itemCondition) meta.itemCondition = detail.itemCondition
            if (detail.itemColor) meta.itemColor = detail.itemColor
            if (detail.toyCharacterName) meta.toyCharacterName = detail.toyCharacterName
            if (detail.templateId) meta.templateId = detail.templateId
            
            // 将规格信息存储在allocationMethod字段中（作为JSON字符串）
            // 或者我们可以使用一个临时方案：将这些信息存储在itemIds的第一个元素之前
            // 更好的方案是扩展PurchaseDetail模型，但现在我们先使用allocationMethod字段存储JSON
            const allocationMethodData = {
              method: 'MANUAL',
              ...(Object.keys(meta).length > 0 && { specs: meta }),
            }
            
            return {
              skuId: detail.skuId,
              quantity: detail.quantity,
              unitPrice: detail.unitPrice,
              allocatedCost: new Decimal(detail.unitPrice).times(detail.quantity).toNumber(),
              allocationMethod: Object.keys(meta).length > 0 ? JSON.stringify(allocationMethodData) : 'MANUAL',
              itemIds: detail.itemIds || [], // 如果指定了itemIds，使用它
            }
          }),
        },
      },
      include: orderInclude,
    });

    // 如果提供了物流单号，创建物流记录
    if (input.logisticsTrackingNo) {
      await tx.logistics.create({
        data: {
          relatedType: 'PURCHASE_ORDER',
          relatedId: order.id,
          trackingNo: input.logisticsTrackingNo,
          status: 'IN_TRANSIT',
        },
      });
    }

    return order;
  });
}

export function createOrder(data: Prisma.PurchaseOrderCreateInput) {
  return prisma.purchaseOrder.create({ data, include: orderInclude });
}

export async function updateOrder(id: string, data: Prisma.PurchaseOrderUpdateInput) {
  // 如果更新了 details，重新计算总金额
  if (data.details) {
    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { details: true },
    });
    if (order) {
      let totalAmount = new Decimal(0);
      order.details.forEach(detail => {
        totalAmount = totalAmount.plus(new Decimal(detail.unitPrice || 0).times(detail.quantity));
      });
      data.totalAmount = totalAmount.toNumber();
    }
  }
  return prisma.purchaseOrder.update({ where: { id }, data, include: orderInclude });
}

export function deleteOrder(id: string) {
  // 检查是否已入库（可通过 details.items 判断）
  return prisma.purchaseOrder.delete({ where: { id } });
}

export async function refreshAwaitingWarehouseFlag(orderId: string) {
  const order = await prisma.purchaseOrder.findUnique({
    where: { id: orderId },
    select: { remarks: true },
  });
  if (!order) return null;

  let meta: Record<string, any>;
  try {
    meta = order.remarks ? JSON.parse(order.remarks) : {};
  } catch {
    meta = {};
  }

  const status = meta.status;
  if (!status) return null;

  const hasWarehouseLogistics = await prisma.logistics.findFirst({
    where: {
      relatedType: 'PURCHASE_ORDER',
      relatedId: orderId,
      status: 'AT_WAREHOUSE',
    },
    select: { id: true },
  });

  const shouldAwait = status === 'COMPLETED' && !hasWarehouseLogistics;
  const currentAwait = Boolean(meta.awaitingWarehouse);

  if (shouldAwait === currentAwait) {
    return shouldAwait;
  }

  if (shouldAwait) {
    meta.awaitingWarehouse = true;
  } else {
    delete meta.awaitingWarehouse;
  }

  await prisma.purchaseOrder.update({
    where: { id: orderId },
    data: { remarks: JSON.stringify(meta) },
  });

  return shouldAwait;
}


