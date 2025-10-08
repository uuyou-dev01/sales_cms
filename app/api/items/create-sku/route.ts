import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { revalidateTag } from 'next/cache';

export async function POST(request: Request) {
  try {
    const data = await request.json();

    // 验证必填字段
    if (!data.itemId || !data.itemName || !data.itemType) {
      return NextResponse.json(
        { error: '缺少必填字段：itemId, itemName, itemType' },
        { status: 400 }
      );
    }

    // 检查SKU是否已存在
    const existingItem = await prisma.item.findUnique({
      where: { itemId: data.itemId }
    });

    if (existingItem) {
      return NextResponse.json(
        { error: `SKU ${data.itemId} 已存在` },
        { status: 400 }
      );
    }

    // 只创建商品基本信息，不创建交易记录
    const newItem = await prisma.item.create({
      data: {
        itemId: data.itemId,
        itemName: data.itemName,
        itemNumber: data.itemNumber || "",
        itemType: data.itemType,
        itemBrand: data.itemBrand || "",
        itemCondition: data.itemCondition || "全新",
        itemColor: data.itemColor || "",
        itemSize: data.itemSize || "均码",
        itemRemarks: data.itemRemarks || "",
        photos: data.photos || [],
        
        // 潮玩相关字段
        toyCharacterId: data.toyCharacterId || null,
        toyVariant: data.toyVariant || null,
        toyCondition: data.toyCondition || null,
        
        // 仓库位置（如果提供）
        warehousePositionId: data.warehousePositionId || null,
        position: data.position || null,
        accessories: data.accessories || null,
      }
    });

    // 清除缓存
    revalidateTag('items');
    revalidateTag('stats');

    return NextResponse.json({
      success: true,
      message: 'SKU创建成功',
      item: {
        itemId: newItem.itemId,
        itemName: newItem.itemName,
        itemNumber: newItem.itemNumber,
        itemType: newItem.itemType,
      }
    });

  } catch (error) {
    console.error('创建SKU失败:', error);
    return NextResponse.json(
      { 
        error: '创建SKU失败', 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}
