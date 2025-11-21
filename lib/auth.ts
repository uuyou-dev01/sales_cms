import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { AuthUser, Session } from './types';

// 简单的密码加密（生产环境建议使用bcrypt）
export function hashPassword(password: string): string {
  // 这里使用简单的哈希，生产环境请使用bcrypt
  return Buffer.from(password).toString('base64');
}

export function verifyPassword(password: string, hashedPassword: string): boolean {
  return hashPassword(password) === hashedPassword;
}

// JWT相关（简化版本，生产环境建议使用jose库）
export function createJWT(payload: any): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  
  // 简化签名，生产环境请使用proper JWT库
  const signature = Buffer.from(`${encodedHeader}.${encodedPayload}`).toString('base64url');
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function verifyJWT(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const [encodedHeader, encodedPayload, signature] = parts;
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString());
    
    // 简化验证，生产环境请使用proper JWT库
    return payload;
  } catch (error) {
    return null;
  }
}

// Cookie相关
export async function setAuthCookie(session: Session): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set('auth-session', JSON.stringify(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7天
    path: '/',
  });
}

export async function getAuthCookie(): Promise<Session | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('auth-session');
    if (!sessionCookie?.value) return null;
    
    const session = JSON.parse(sessionCookie.value) as Session;
    if (new Date(session.expires) < new Date()) {
      return null;
    }
    
    return session;
  } catch (error) {
    return null;
  }
}

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('auth-session');
}

// 从请求头或Cookie获取认证信息
export function getAuthFromRequest(request: NextRequest): AuthUser | null {
  try {
    // 首先尝试从 Authorization header 获取
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = verifyJWT(token);
      if (payload?.user) return payload.user;
    }
    
    // 如果 header 没有，尝试从 Cookie 获取
    const authCookie = request.cookies.get('auth-session');
    if (authCookie?.value) {
      try {
        const session = JSON.parse(authCookie.value) as { user?: AuthUser; expires: string };
        if (session.user && new Date(session.expires) > new Date()) {
          return session.user;
        }
      } catch {
        // Cookie 解析失败，继续返回 null
      }
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

// 检查用户权限
export function hasPermission(user: AuthUser, requiredRole: 'ADMIN' | 'USER' | 'VIEWER'): boolean {
  const roleHierarchy = {
    'ADMIN': 3,
    'USER': 2,
    'VIEWER': 1
  };
  
  return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
}

// 细粒度 JSON 权限点检查（从角色聚合 permissions JSON 判断）
// 注意：为避免在路由中引入 await，提供可选的异步方法，按需使用
import { prisma } from '@/lib/prisma';
export async function hasPermissionAction(user: AuthUser, action: string): Promise<boolean> {
  try {
    // 系统管理员直接放行
    if (user.role === 'ADMIN') return true;
    const links = await prisma.userRoleLink.findMany({
      where: { userId: user.id },
      include: { role: true },
    }) as Array<{ role: { permissions: any } }>;
    const permissions = links.flatMap((link) => {
      try { return Array.isArray(link.role.permissions) ? link.role.permissions : []; } catch { return []; }
    }) as string[];
    return permissions.includes(action);
  } catch {
    return false;
  }
}

// 生成随机密码
export function generateRandomPassword(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
