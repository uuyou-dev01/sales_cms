import { NextResponse } from 'next/server';
import { clearAuthCookie } from '@/lib/auth';
import { ApiResponse } from '@/lib/types';

export async function POST() {
  try {
    // 清除认证Cookie
    await clearAuthCookie();

    return NextResponse.json<ApiResponse>({
      success: true,
      message: '登出成功'
    });

  } catch (error) {
    console.error('登出错误:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      message: '服务器内部错误'
    }, { status: 500 });
  }
}
