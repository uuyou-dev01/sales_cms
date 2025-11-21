import { NextRequest } from 'next/server';
import { getAuthFromRequest, hasPermission } from '@/lib/auth';
import { ok, badRequest, forbidden, serverError } from '@/src/modules/shared/api/response';
import { getAllSkus, createSku } from '@/src/modules/sku/services/sku.service';
import { Prisma } from '@prisma/client';
import { logActivity } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const user = getAuthFromRequest(req);
    if (!user || !hasPermission(user, 'USER')) return forbidden();

    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get('page') || '1');
    const pageSize = Number(searchParams.get('pageSize') || '20');
    const categoryId = searchParams.get('categoryId') || undefined;
    const brand = searchParams.get('brand') || undefined;
    const status = searchParams.get('status') as 'draft' | 'live' | 'soldout' | undefined;
    const search = searchParams.get('search') || undefined;

    const data = await getAllSkus({ page, pageSize, categoryId, brand, status, search });
    return ok(data);
  } catch (e) {
    return serverError('SKU_LIST_FAILED');
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getAuthFromRequest(req);
    if (!user || !hasPermission(user, 'USER')) return forbidden();

    const body = await req.json();
    if (!body?.name) {
      return badRequest('MISSING_SKU_NAME', {
        message: 'SKU 名称是必填项，请填写 SKU 名称。',
      });
    }

    const {
      name,
      skuNumber,
      brand,
      unit,
      isActive = true,
      attributes,
      categoryId,
      category,
      categoryName, // 如果分类不存在，可以用名称自动创建
      ...rest
    } = body ?? {};

    if (process.env.NODE_ENV !== 'production') {
      console.log('Incoming SKU payload:', {
        name,
        skuNumber,
        brand,
        unit,
        isActive,
        categoryId,
        restKeys: Object.keys(rest || {}),
      });
    }

    const data: Prisma.SKUCreateInput = {
      name: typeof name === 'string' ? name.trim() : '',
      skuNumber: typeof skuNumber === 'string' && skuNumber.trim().length > 0 ? skuNumber.trim() : undefined,
      brand: typeof brand === 'string' && brand.trim().length > 0 ? brand.trim() : undefined,
      unit: typeof unit === 'string' && unit.trim().length > 0 ? unit.trim() : undefined,
      isActive: Boolean(isActive),
      attributes: attributes && typeof attributes === 'object' ? attributes : undefined,
    };

    if (!data.name) {
      return badRequest('INVALID_SKU_NAME', {
        message: 'SKU 名称无效，请填写有效的 SKU 名称。',
      });
    }

    // 解析分类 ID（优先使用 categoryId，其次使用 category.connect.id）
    // 如果同时存在 categoryId 和 category.connect，优先使用 categoryId
    const resolvedCategoryId =
      typeof categoryId === 'string' && categoryId.trim() && categoryId !== '__none__'
        ? categoryId.trim()
        : typeof category?.connect?.id === 'string' && category.connect.id !== '__none__'
          ? category.connect.id
          : undefined;

    console.log('📦 SKU 创建 - 分类信息:', {
      categoryId: typeof categoryId === 'string' ? categoryId : '[not string]',
      categoryName: typeof categoryName === 'string' ? categoryName : '[not string]',
      resolvedCategoryId,
      categoryConnectId: category?.connect?.id,
      category: category ? '[exists]' : '[none]',
    });

    if (resolvedCategoryId) {
      // 验证分类是否存在
      let categoryExists = await prisma.category.findUnique({
        where: { id: resolvedCategoryId },
      });
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('分类查找结果:', { resolvedCategoryId, exists: !!categoryExists });
      }
      
      // 如果分类不存在，尝试自动创建
      if (!categoryExists) {
        const nameToUse = typeof categoryName === 'string' && categoryName.trim() 
          ? categoryName.trim() 
          : null;
        
        if (nameToUse) {
          // 尝试根据名称查找是否已存在同名分类（一级分类，parentId 为 null）
          // 注意：Category 有 @@unique([name, parentId]) 约束
          const existingByName = await prisma.category.findFirst({
            where: { 
              name: nameToUse, 
              parentId: null, // 明确指定为 null，匹配唯一约束
            },
          });
          
          if (existingByName) {
            // 使用已存在的同名分类
            categoryExists = existingByName;
            console.log(`✅ 使用已存在的分类: ${nameToUse} (${categoryExists.id})`);
          } else {
            // 创建新分类（一级分类，parentId 明确设为 null）
            try {
              categoryExists = await prisma.category.create({
                data: {
                  name: nameToUse,
                  parentId: null, // 明确设置为 null，确保唯一约束正确
                  level: 1,
                  path: nameToUse, // 一级分类的 path 就是名称本身
                  isActive: true,
                },
              });
              console.log(`✅ 自动创建分类: ${nameToUse} (${categoryExists.id})`);
            } catch (createError) {
              console.error('❌ 自动创建分类失败:', createError);
              if (createError instanceof Prisma.PrismaClientKnownRequestError) {
                if (createError.code === 'P2002') {
                  // 唯一约束冲突：可能是并发创建导致的重复，再次查找
                  console.log(`⚠️ 检测到唯一约束冲突，重试查找分类: ${nameToUse}`);
                  const retryFind = await prisma.category.findFirst({
                    where: { 
                      name: nameToUse, 
                      parentId: null,
                    },
                  });
                  if (retryFind) {
                    categoryExists = retryFind;
                    console.log(`✅ 重试找到分类: ${nameToUse} (${categoryExists.id})`);
                  } else {
                    return badRequest('CATEGORY_CREATE_FAILED', {
                      message: `分类 "${nameToUse}" 创建失败：唯一约束冲突，但查找不到已存在的分类。`,
                    });
                  }
                } else {
                  console.error('Prisma 错误代码:', createError.code, '消息:', createError.message);
                  return badRequest('CATEGORY_CREATE_FAILED', {
                    message: `分类创建失败：${createError.message} (代码: ${createError.code})`,
                  });
                }
              } else {
                console.error('非 Prisma 错误:', createError);
                return badRequest('CATEGORY_CREATE_FAILED', {
                  message: `分类不存在且无法自动创建：${createError instanceof Error ? createError.message : '未知错误'}`,
                });
              }
            }
          }
        } else {
          // 没有提供 categoryName，但提供了 categoryId
          // 再次尝试查找（可能是在查找和创建之间被删除了，或者 ID 本身无效）
          const finalCheck = await prisma.category.findUnique({
            where: { id: resolvedCategoryId },
          });
          
          if (finalCheck) {
            // 找到了，使用它
            categoryExists = finalCheck;
            console.log(`✅ 最终找到分类: ${resolvedCategoryId}`);
          } else {
            // 确实不存在，返回错误
            return badRequest('CATEGORY_NOT_FOUND', {
              message: `分类 ID "${resolvedCategoryId}" 不存在，且未提供分类名称。请先在分类管理页面创建分类，或刷新页面后重试。`,
            });
          }
        }
      }
      
      // 使用找到或创建的分类
      if (!categoryExists || !categoryExists.id) {
        console.error('❌ 分类处理异常: categoryExists 为空或没有 id', { categoryExists });
        return badRequest('CATEGORY_PROCESSING_ERROR', {
          message: '分类处理失败，请刷新页面后重试。',
        });
      }
      
      console.log('✅ 准备关联分类:', { categoryId: categoryExists.id, categoryName: categoryExists.name });
      data.category = {
        connect: { id: categoryExists.id },
      };
    }

    try {
      const created = await createSku(data);
      if (user?.id) await logActivity(user.id, 'CREATE_SKU', 'SKU', created.id)
      return ok(created, 201);
    } catch (createError) {
      console.error('SKU_CREATE_FAILED - createSku error:', createError);
      throw createError;
    }
  } catch (e) {
    console.error('SKU_CREATE_FAILED - Full error:', e);
    console.error('SKU_CREATE_FAILED - Error stack:', e instanceof Error ? e.stack : 'No stack');
    
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === 'P2002') {
        return badRequest('SKU_DUPLICATE', {
          meta: e.meta,
          message: '已有同名同品牌的 SKU，请更换名称或品牌。',
        });
      }
      if (e.code === 'P2003') {
        return badRequest('CATEGORY_INVALID', {
          message: '选择的分类无效，请刷新页面后重试。',
        });
      }
      // 其他 Prisma 错误
      console.error('Prisma error code:', e.code, 'meta:', e.meta);
      return badRequest('DATABASE_ERROR', {
        message: `数据库操作失败：${e.message}`,
        code: e.code,
      });
    }
    
    // 如果是我们自定义的错误（已经返回了 badRequest），直接返回
    if (e instanceof Response) {
      return e;
    }
    
    // 其他未处理的错误
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error('未处理的错误类型:', typeof e, '值:', e);
    return serverError(errorMessage || 'SKU_CREATE_FAILED');
  }
}


