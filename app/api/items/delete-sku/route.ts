import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { revalidateTag } from 'next/cache';

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');

    if (!itemId) {
      return NextResponse.json(
        { error: '缺少必填参数：itemId' },
        { status: 400 }
      );
    }

    // 检查SKU是否存在
    const existingItem = await prisma.item.findUnique({
      where: { itemId },
      include: {
        transactions: true
      }
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: `SKU ${itemId} 不存在` },
        { status: 404 }
      );
    }

    // 检查是否有关联的交易记录
    if (existingItem.transactions && existingItem.transactions.length > 0) {
      return NextResponse.json(
        { error: '该SKU存在交易记录，无法删除。请先删除相关交易记录。' },
        { status: 400 }
      );
    }

    // 删除SKU（软删除）
    await prisma.item.update({
      where: { itemId },
      data: {
        deleted: true,
        updatedAt: new Date(),
      }
    });

    // 清除缓存
    revalidateTag('items');
    revalidateTag('stats');

    return NextResponse.json({
      success: true,
      message: 'SKU删除成功',
      itemId: itemId
    });

  } catch (error) {
    console.error('删除SKU失败:', error);
    return NextResponse.json(
      { 
        error: '删除SKU失败', 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}
