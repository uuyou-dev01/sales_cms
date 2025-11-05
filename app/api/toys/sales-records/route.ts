import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CreateToySalesRecordRequest, ToySalesRecordQueryParams } from "@/lib/toy-types";

// 获取销售记录列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams: ToySalesRecordQueryParams = {
      skuId: searchParams.get("skuId") || undefined,
      characterId: searchParams.get("characterId") || undefined,
      seriesId: searchParams.get("seriesId") || undefined,
      brandId: searchParams.get("brandId") || undefined,
      dateFrom: searchParams.get("dateFrom") || undefined,
      dateTo: searchParams.get("dateTo") || undefined,
      page: parseInt(searchParams.get("page") || "1"),
      pageSize: parseInt(searchParams.get("pageSize") || "20"),
      sortBy: searchParams.get("sortBy") || "date",
      sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") || "desc",
    };

    const where: any = {};
    
    if (queryParams.skuId) {
      where.skuId = queryParams.skuId;
    }
    
    if (queryParams.characterId) {
      where.sku = {
        characterId: queryParams.characterId
      };
    }
    
    if (queryParams.seriesId) {
      where.sku = {
        character: {
          seriesId: queryParams.seriesId
        }
      };
    }
    
    if (queryParams.brandId) {
      where.sku = {
        character: {
          series: {
            brandId: queryParams.brandId
          }
        }
      };
    }
    
    if (queryParams.dateFrom || queryParams.dateTo) {
      where.date = {};
      if (queryParams.dateFrom) {
        where.date.gte = new Date(queryParams.dateFrom);
      }
      if (queryParams.dateTo) {
        where.date.lte = new Date(queryParams.dateTo);
      }
    }

    const orderBy: any = {};
    orderBy[queryParams.sortBy] = queryParams.sortOrder;

    const [records, total] = await Promise.all([
      prisma.toySalesRecord.findMany({
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
          }
        },
      }),
      prisma.toySalesRecord.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        items: records,
        total,
        page: queryParams.page,
        pageSize: queryParams.pageSize,
        totalPages: Math.ceil(total / queryParams.pageSize),
      },
    });
  } catch (error) {
    console.error("获取销售记录列表失败:", error);
    return NextResponse.json(
      { success: false, error: "获取销售记录列表失败" },
      { status: 500 }
    );
  }
}

// 创建销售记录
export async function POST(request: NextRequest) {
  try {
    const body: CreateToySalesRecordRequest = await request.json();
    
    // 验证必填字段
    if (!body.skuId || !body.date || !body.amount || !body.quantity || body.cost === undefined || body.profit === undefined) {
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

    // 检查库存是否足够
    if (sku.currentStock < body.quantity) {
      return NextResponse.json(
        { success: false, error: "库存不足" },
        { status: 400 }
      );
    }

    // 使用事务处理销售记录创建和库存更新
    const result = await prisma.$transaction(async (tx) => {
      // 创建销售记录
      const salesRecord = await tx.toySalesRecord.create({
        data: {
          skuId: body.skuId,
          date: new Date(body.date),
          amount: body.amount,
          quantity: body.quantity,
          cost: body.cost,
          profit: body.profit,
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
          }
        },
      });

      // 更新SKU库存
      await tx.toySKU.update({
        where: { id: body.skuId },
        data: {
          currentStock: {
            decrement: body.quantity
          }
        }
      });

      return salesRecord;
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("创建销售记录失败:", error);
    return NextResponse.json(
      { success: false, error: "创建销售记录失败" },
      { status: 500 }
    );
  }
}
