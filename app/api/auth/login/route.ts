import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { hashPassword, verifyPassword, createJWT, setAuthCookie } from '@/lib/auth';
import { ApiResponse, AuthUser, Session } from '@/lib/types';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json<ApiResponse>({
        success: false,
        message: '用户名和密码不能为空'
      }, { status: 400 });
    }

    // 先仅查用户
    const user = await prisma.user.findUnique({
      where: { username }
    });

    if (!user) {
      return NextResponse.json<ApiResponse>({
        success: false,
        message: '用户名或密码错误'
      }, { status: 401 });
    }

    if (!user.isActive) {
      return NextResponse.json<ApiResponse>({
        success: false,
        message: '账户已被禁用'
      }, { status: 401 });
    }

    // 验证密码
    if (!verifyPassword(password, user.password)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        message: '用户名或密码错误'
      }, { status: 401 });
    }

    // 再查店铺（避免依赖关系字段命名）
    const store = await prisma.store.findUnique({
      where: { id: user.storeId }
    });

    if (!store) {
      return NextResponse.json<ApiResponse>({
        success: false,
        message: '店铺不存在或已被删除'
      }, { status: 401 });
    }

    if (!store.isActive) {
      return NextResponse.json<ApiResponse>({
        success: false,
        message: '店铺已被禁用'
      }, { status: 401 });
    }

    // 创建用户会话数据
    const authUser: AuthUser = {
      id: user.id,
      username: user.username,
      email: user.email ?? undefined,
      name: user.name,
      role: user.role as any,
      storeId: user.storeId,
      store: {
        id: store.id,
        name: store.name,
        displayName: store.displayName,
      }
    };

    // 创建会话
    const expires = new Date();
    expires.setDate(expires.getDate() + 7); // 7天后过期

    const session: Session = {
      user: authUser,
      expires: expires.toISOString()
    };

    // 设置认证Cookie
    setAuthCookie(session);

    // 创建JWT token（用于API调用）
    const token = createJWT({ user: authUser, exp: Math.floor(expires.getTime() / 1000) });

    return NextResponse.json<ApiResponse<{ user: AuthUser; token: string }>>({
      success: true,
      data: {
        user: authUser,
        token
      },
      message: '登录成功'
    });

  } catch (error) {
    console.error('登录错误:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      message: '服务器内部错误'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
