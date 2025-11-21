import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest, hasPermission } from '@/lib/auth'
import { ok, forbidden, serverError } from '@/src/modules/shared/api/response'
import { CATEGORY_SEED_DATA, type CategorySeed } from '@/lib/constants/category-defaults'

async function upsertCategory(seed: CategorySeed, parentId: string | null = null) {
  // 明确处理 parentId：null 时查询 null，有值时查询具体值
  const whereClause = parentId === null 
    ? { name: seed.name, parentId: null }
    : { name: seed.name, parentId: parentId };
  
  const existing = await prisma.category.findFirst({
    where: whereClause,
  })

  const parent = parentId ? await prisma.category.findUnique({ where: { id: parentId } }) : null
  const level = parent ? parent.level + 1 : 1
  const path = parent ? `${parent.path || parent.id}/${seed.name}` : seed.name

  let category;
  if (existing) {
    // 更新现有分类，但使用 upsert 确保原子性
    try {
      category = await prisma.category.update({
        where: { id: existing.id },
        data: {
          code: seed.code ?? existing.code,
          isActive: true,
          level,
          path,
        },
      })
    } catch (updateError) {
      // 如果更新失败，尝试重新查找（可能被并发修改）
      const retryFind = await prisma.category.findFirst({ where: whereClause });
      if (retryFind) {
        category = retryFind;
      } else {
        throw updateError;
      }
    }
  } else {
    // 创建新分类，使用 upsert 处理并发冲突
    try {
      category = await prisma.category.create({
        data: {
          name: seed.name,
          code: seed.code ?? null,
          parentId,
          level,
          path,
          isActive: true,
        },
      })
    } catch (createError: any) {
      // 如果是唯一约束冲突（P2002），说明并发创建了，重新查找
      if (createError?.code === 'P2002') {
        const retryFind = await prisma.category.findFirst({ where: whereClause });
        if (retryFind) {
          category = retryFind;
        } else {
          throw createError;
        }
      } else {
        throw createError;
      }
    }
  }

  if (seed.children && seed.children.length > 0) {
    for (const child of seed.children) {
      await upsertCategory(child, category.id)
    }
  }

  return category
}

export async function POST(req: NextRequest) {
  try {
    const user = getAuthFromRequest(req)
    if (!user || !hasPermission(user, 'ADMIN')) return forbidden()

    for (const seed of CATEGORY_SEED_DATA) {
      await upsertCategory(seed, null)
    }

    return ok({ success: true })
  } catch (e) {
    console.error('CATEGORY_SEED_FAILED', e)
    return serverError('CATEGORY_SEED_FAILED')
  }
}

