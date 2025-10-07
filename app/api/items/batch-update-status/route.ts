import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { clearItemsCache } from '@/lib/cache';

export async function POST(request: NextRequest) {
  try {
    const { itemIds, newStatus } = await request.json();

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json(
        { error: '请提供要更新的商品ID列表' },
        { status: 400 }
      );
    }

    if (!newStatus) {
      return NextResponse.json(
        { error: '请提供新的状态' },
        { status: 400 }
      );
    }

    // 批量更新商品状态
    const updateResult = await prisma.item.updateMany({
      where: {
        itemId: {
          in: itemIds
        }
      },
      data: {
        transactionStatues: newStatus
      }
    });

    // 同时更新对应的交易记录状态
    await prisma.transaction.updateMany({
      where: {
        itemId: {
          in: itemIds
        }
      },
      data: {
        orderStatus: newStatus
      }
    });

    // 清除缓存
    await clearItemsCache();

    return NextResponse.json({
      success: true,
      updatedCount: updateResult.count,
      message: `成功更新 ${updateResult.count} 个商品的状态`
    });

  } catch (error) {
    console.error('批量更新状态失败:', error);
    return NextResponse.json(
      { error: '批量更新状态失败' },
      { status: 500 }
    );
  }
}