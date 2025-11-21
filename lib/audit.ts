import { prisma } from '@/lib/prisma'

export async function logActivity(
  userId: string,
  action: string,
  entityType?: string,
  entityId?: string,
  meta?: Record<string, unknown>,
) {
  try {
    await prisma.userActivity.create({
      data: { userId, action, entityType, entityId, meta },
    })
  } catch {
    // 忽略审计失败，避免影响主流程
  }
}


