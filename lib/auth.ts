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

// 从请求头获取认证信息
export function getAuthFromRequest(request: NextRequest): AuthUser | null {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return null;
    
    const token = authHeader.substring(7);
    const payload = verifyJWT(token);
    
    if (!payload?.user) return null;
    return payload.user;
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

// 生成随机密码
export function generateRandomPassword(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
