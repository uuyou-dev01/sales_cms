import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { getAuthFromRequest, hasPermission } from '@/lib/auth'
import { ok, badRequest, forbidden, serverError } from '@/src/modules/shared/api/response'

function normalizeName(value: unknown) {
  if (typeof value !== 'string') return ''
  return value.trim()
}

export async function GET(req: NextRequest) {
  try {
    const user = getAuthFromRequest(req)
    if (!user || !hasPermission(user, 'USER')) return forbidden()
    const items = await prisma.category.findMany({
      orderBy: [{ level: 'asc' }, { createdAt: 'asc' }],
    })
    return ok({ items })
  } catch (e) {
    console.error('CATEGORY_LIST_FAILED', e)
    return serverError('CATEGORY_LIST_FAILED')
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getAuthFromRequest(req)
    if (!user || !hasPermission(user, 'ADMIN')) return forbidden()
    const body = await req.json()
    const name = normalizeName(body?.name)
    if (!name) return badRequest('MISSING_NAME')

    let parent = null
    if (body?.parentId) {
      parent = await prisma.category.findUnique({ where: { id: body.parentId } })
      if (!parent) return badRequest('PARENT_NOT_FOUND')
    }

    const level = parent ? parent.level + 1 : 1
    const path = parent ? `${parent.path || parent.id}/${name}` : name

    try {
      const created = await prisma.category.create({
        data: {
          name,
          code: body?.code ?? null,
          parentId: parent?.id ?? null,
          level,
          path,
          isActive: body?.isActive ?? true,
        },
      })
      return ok(created, 201)
    } catch (createError) {
      // 处理唯一约束冲突
      if (createError instanceof Prisma.PrismaClientKnownRequestError) {
        if (createError.code === 'P2002') {
          // 唯一约束冲突：同名同 parentId 的分类已存在
          const existingCategory = await prisma.category.findFirst({
            where: {
              name,
              parentId: parent?.id ?? null,
            },
          })
          
          if (existingCategory) {
            return badRequest('CATEGORY_DUPLICATE', {
              message: `分类 "${name}" 已存在${parent ? `（父级：${parent.name}）` : ''}，请使用不同的名称。`,
              categoryId: existingCategory.id,
            })
          } else {
            // 理论上不应该到这里，但以防万一
            return badRequest('CATEGORY_DUPLICATE', {
              message: `分类 "${name}" 创建失败：唯一约束冲突。`,
            })
          }
        }
        // 其他 Prisma 错误
        console.error('Prisma error code:', createError.code, 'meta:', createError.meta)
        return badRequest('DATABASE_ERROR', {
          message: `数据库操作失败：${createError.message} (代码: ${createError.code})`,
        })
      }
      
      // 重新抛出非 Prisma 错误
      throw createError
    }
  } catch (e) {
    console.error('CATEGORY_CREATE_FAILED', e)
    console.error('Error stack:', e instanceof Error ? e.stack : 'No stack')
    return serverError(e instanceof Error ? e.message : 'CATEGORY_CREATE_FAILED')
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = getAuthFromRequest(req)
    if (!user || !hasPermission(user, 'ADMIN')) return forbidden()
    const body = await req.json()
    if (!body?.id) return badRequest('MISSING_ID')

    const updateData: Prisma.CategoryUpdateInput = {}
    const name = body?.name ? normalizeName(body.name) : undefined
    if (name) updateData.name = name
    if (body?.code !== undefined) updateData.code = body.code
    if (body?.isActive !== undefined) updateData.isActive = !!body.isActive

    if (body?.parentId !== undefined) {
      if (body.parentId === null || body.parentId === '') {
        updateData.parent = { disconnect: true }
        updateData.level = 1
        updateData.path = name || undefined
      } else {
        const parent = await prisma.category.findUnique({ where: { id: body.parentId } })
        if (!parent) return badRequest('PARENT_NOT_FOUND')
        updateData.parent = { connect: { id: parent.id } }
        updateData.level = parent.level + 1
        updateData.path = `${parent.path || parent.id}/${name || parent.id}`
      }
    }

    const updated = await prisma.category.update({
      where: { id: body.id },
      data: updateData,
    })
    return ok(updated)
  } catch (e) {
    console.error('CATEGORY_UPDATE_FAILED', e)
    return serverError('CATEGORY_UPDATE_FAILED')
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = getAuthFromRequest(req)
    if (!user || !hasPermission(user, 'ADMIN')) return forbidden()
    const body = await req.json()
    if (!body?.id) return badRequest('MISSING_ID')

    const childCount = await prisma.category.count({ where: { parentId: body.id } })
    if (childCount > 0) return badRequest('CATEGORY_HAS_CHILDREN')

    const skuCount = await prisma.sKU.count({ where: { categoryId: body.id } })
    if (skuCount > 0) return badRequest('CATEGORY_IN_USE')

    await prisma.category.delete({ where: { id: body.id } })
    return ok({ success: true })
  } catch (e) {
    console.error('CATEGORY_DELETE_FAILED', e)
    return serverError('CATEGORY_DELETE_FAILED')
  }
}
