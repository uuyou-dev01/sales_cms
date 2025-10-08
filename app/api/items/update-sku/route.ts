import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { revalidateTag } from 'next/cache';

export async function PUT(request: Request) {
  try {
    const data = await request.json();

    // 验证必填字段
    if (!data.itemId) {
      return NextResponse.json(
        { error: '缺少必填字段：itemId' },
        { status: 400 }
      );
    }

    // 检查SKU是否存在
    const existingItem = await prisma.item.findUnique({
      where: { itemId: data.itemId }
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: `SKU ${data.itemId} 不存在` },
        { status: 404 }
      );
    }

    // 更新商品信息
    const updatedItem = await prisma.item.update({
      where: { itemId: data.itemId },
      data: {
        itemName: data.itemName || existingItem.itemName,
        itemNumber: data.itemNumber || existingItem.itemNumber,
        itemType: data.itemType || existingItem.itemType,
        itemBrand: data.itemBrand || existingItem.itemBrand,
        itemCondition: data.itemCondition || existingItem.itemCondition,
        itemColor: data.itemColor || existingItem.itemColor,
        itemSize: data.itemSize || existingItem.itemSize,
        itemRemarks: data.itemRemarks !== undefined ? data.itemRemarks : existingItem.itemRemarks,
        photos: data.photos !== undefined ? data.photos : existingItem.photos,
        
        // 仓库位置信息
        warehousePositionId: data.warehousePositionId !== undefined ? data.warehousePositionId : existingItem.warehousePositionId,
        position: data.position !== undefined ? data.position : existingItem.position,
        accessories: data.accessories !== undefined ? data.accessories : existingItem.accessories,
        
        updatedAt: new Date(),
      }
    });

    // 清除缓存
    revalidateTag('items');
    revalidateTag('stats');

    return NextResponse.json({
      success: true,
      message: 'SKU更新成功',
      item: {
        itemId: updatedItem.itemId,
        itemName: updatedItem.itemName,
        itemNumber: updatedItem.itemNumber,
        itemType: updatedItem.itemType,
      }
    });

  } catch (error) {
    console.error('更新SKU失败:', error);
    return NextResponse.json(
      { 
        error: '更新SKU失败', 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}
