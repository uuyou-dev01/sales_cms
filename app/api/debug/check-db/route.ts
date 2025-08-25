import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // 检查数据库连接
    await prisma.$connect();
    
    // 检查各个表的数据量
    const storeCount = await prisma.store.count();
    const userCount = await prisma.user.count();
    const itemCount = await prisma.item.count();
    const transactionCount = await prisma.transaction.count();
    
    // 检查用户表结构
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        storeId: true,
        isActive: true,
        store: {
          select: {
            id: true,
            name: true,
            displayName: true,
            isActive: true
          }
        }
      }
    });
    
    return NextResponse.json({
      success: true,
      data: {
        connection: 'OK',
        tables: {
          store: storeCount,
          user: userCount,
          item: itemCount,
          transaction: transactionCount
        },
        users: users
      }
    });
    
  } catch (error) {
    console.error('数据库检查错误:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
