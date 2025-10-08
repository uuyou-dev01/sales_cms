import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { revalidateTag } from 'next/cache';

// 获取所有潮玩角色
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const seriesId = searchParams.get('seriesId');
    const brandId = searchParams.get('brandId');

    let where: any = { isActive: true };

    if (seriesId) {
      where.seriesId = seriesId;
    } else if (brandId) {
      where.series = { brandId };
    }

    const characters = await prisma.toyCharacter.findMany({
      where,
      include: {
        series: {
          include: {
            brand: true
          }
        },
        _count: {
          select: { items: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, characters });
  } catch (error) {
    console.error('获取潮玩角色失败:', error);
    return NextResponse.json(
      { error: '获取潮玩角色失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// 创建新的潮玩角色
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { name, seriesId, description, image, rarity } = data;

    if (!name || !seriesId) {
      return NextResponse.json({ error: '角色名称和系列不能为空' }, { status: 400 });
    }

    // 检查系列是否存在
    const series = await prisma.toySeries.findUnique({
      where: { id: seriesId },
      include: { brand: true }
    });

    if (!series) {
      return NextResponse.json({ error: '指定的系列不存在' }, { status: 400 });
    }

    // 检查同一系列下角色名是否已存在
    const existingCharacter = await prisma.toyCharacter.findUnique({
      where: {
        seriesId_name: {
          seriesId,
          name
        }
      }
    });

    if (existingCharacter) {
      return NextResponse.json({ error: '该系列下已存在同名角色' }, { status: 400 });
    }

    const character = await prisma.toyCharacter.create({
      data: {
        name,
        seriesId,
        description,
        image,
        rarity,
      },
      include: {
        series: {
          include: {
            brand: true
          }
        }
      }
    });

    revalidateTag('toy-characters');

    return NextResponse.json({ success: true, message: '角色创建成功', character });
  } catch (error) {
    console.error('创建潮玩角色失败:', error);
    return NextResponse.json(
      { error: '创建潮玩角色失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
