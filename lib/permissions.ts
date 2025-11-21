import { prisma } from "./prisma";

export async function requirePermission(userId: string, perm: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { roles: { include: { role: true } } } });
  if (!user) return false;
  // 兼容旧枚举：ADMIN 全通行
  if ((user as any).role === 'ADMIN') return true;
  const permissions: string[] = [];
  for (const link of (user.roles || [])) {
    const rolePerms = (link.role?.permissions as any) || [];
    if (Array.isArray(rolePerms)) permissions.push(...rolePerms);
  }
  return permissions.includes(perm);
}










