import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CreateToyPurchaseOrderRequest, UpdateToyPurchaseOrderRequest, ToyPurchaseOrderQueryParams } from "@/lib/toy-types";

// 获取采购订单列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams: ToyPurchaseOrderQueryParams = {
      skuId: searchParams.get("skuId") || undefined,
      status: searchParams.get("status") as any || undefined,
      batch: searchParams.get("batch") || undefined,
      dateFrom: searchParams.get("dateFrom") || undefined,
      dateTo: searchParams.get("dateTo") || undefined,
      page: parseInt(searchParams.get("page") || "1"),
      pageSize: parseInt(searchParams.get("pageSize") || "20"),
      sortBy: searchParams.get("sortBy") || "createdAt",
      sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") || "desc",
    };

    const where: any = {};
    
    if (queryParams.skuId) {
      where.skuId = queryParams.skuId;
    }
    
    if (queryParams.status) {
      where.status = queryParams.status;
    }
    
    if (queryParams.batch) {
      where.batch = { contains: queryParams.batch, mode: "insensitive" };
    }
    
    if (queryParams.dateFrom || queryParams.dateTo) {
      where.shippingDate = {};
      if (queryParams.dateFrom) {
        where.shippingDate.gte = new Date(queryParams.dateFrom);
      }
      if (queryParams.dateTo) {
        where.shippingDate.lte = new Date(queryParams.dateTo);
      }
    }

    const orderBy: any = {};
    orderBy[queryParams.sortBy] = queryParams.sortOrder;

    const [orders, total] = await Promise.all([
      prisma.toyPurchaseOrder.findMany({
        where,
        orderBy,
        skip: (queryParams.page - 1) * queryParams.pageSize,
        take: queryParams.pageSize,
        include: {
          sku: {
            include: {
              character: {
                include: {
                  series: {
                    include: {
                      brand: true
                    }
                  }
                }
              }
            }
          },
          inventoryBatches: true,
        },
      }),
      prisma.toyPurchaseOrder.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        items: orders,
        total,
        page: queryParams.page,
        pageSize: queryParams.pageSize,
        totalPages: Math.ceil(total / queryParams.pageSize),
      },
    });
  } catch (error) {
    console.error("获取采购订单列表失败:", error);
    return NextResponse.json(
      { success: false, error: "获取采购订单列表失败" },
      { status: 500 }
    );
  }
}

// 创建采购订单
export async function POST(request: NextRequest) {
  try {
    const body: CreateToyPurchaseOrderRequest = await request.json();
    
    // 验证必填字段
    if (!body.skuId || !body.domesticOrderNumber || !body.quantity || !body.amount) {
      return NextResponse.json(
        { success: false, error: "缺少必填字段" },
        { status: 400 }
      );
    }

    // 检查SKU是否存在
    const sku = await prisma.toySKU.findUnique({
      where: { id: body.skuId },
    });
    
    if (!sku) {
      return NextResponse.json(
        { success: false, error: "SKU不存在" },
        { status: 404 }
      );
    }

    // 检查国内单号是否重复
    const existingOrder = await prisma.toyPurchaseOrder.findFirst({
      where: { domesticOrderNumber: body.domesticOrderNumber },
    });

    if (existingOrder) {
      return NextResponse.json(
        { success: false, error: "国内单号已存在" },
        { status: 400 }
      );
    }

    const order = await prisma.toyPurchaseOrder.create({
      data: {
        skuId: body.skuId,
        domesticOrderNumber: body.domesticOrderNumber,
        status: body.status,
        weight: body.weight,
        quantity: body.quantity,
        amount: body.amount,
        batch: body.batch,
        shippingDate: new Date(body.shippingDate),
        arrivalTime: body.arrivalTime ? new Date(body.arrivalTime) : null,
        shippingCost: body.shippingCost,
        totalShippingAmount: body.totalShippingAmount,
        totalShippingWeight: body.totalShippingWeight,
      },
      include: {
        sku: {
          include: {
            character: {
              include: {
                series: {
                  include: {
                    brand: true
                  }
                }
              }
            }
          }
        },
        inventoryBatches: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error("创建采购订单失败:", error);
    return NextResponse.json(
      { success: false, error: "创建采购订单失败" },
      { status: 500 }
    );
  }
}
