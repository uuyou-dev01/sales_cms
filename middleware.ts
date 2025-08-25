import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 需要认证的路由
const protectedRoutes = [
  '/sales',
  '/warehouse',
  '/test',
  '/test-dialog',
  '/test-fix',
  '/test-form',
  '/test-import',
  '/test-clear-db',
  '/item',
  '/api/items',
  '/api/warehouses',
  '/api/csv',
  '/api/debug'
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 检查是否是受保护的路由
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  );
  
  // 如果是受保护的路由，检查认证
  if (isProtectedRoute) {
    const authCookie = request.cookies.get('auth-session');
    
    if (!authCookie?.value) {
      // 没有认证Cookie，重定向到登录页
      return NextResponse.redirect(new URL('/login', request.url));
    }
    
    try {
      const session = JSON.parse(authCookie.value);
      const expires = new Date(session.expires);
      
      if (expires < new Date()) {
        // 会话已过期，重定向到登录页
        return NextResponse.redirect(new URL('/login', request.url));
      }
    } catch {
      // Cookie解析失败，重定向到登录页
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }
  
  // 如果已登录用户访问登录页，重定向到销售页
  if (pathname === '/login') {
    const authCookie = request.cookies.get('auth-session');
    
    if (authCookie?.value) {
      try {
        const session = JSON.parse(authCookie.value);
        const expires = new Date(session.expires);
        
        if (expires > new Date()) {
          // 会话有效，重定向到销售页
          return NextResponse.redirect(new URL('/sales', request.url));
        }
      } catch {
        // Cookie解析失败，继续显示登录页
      }
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * 匹配所有请求路径，除了以下开头的：
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
