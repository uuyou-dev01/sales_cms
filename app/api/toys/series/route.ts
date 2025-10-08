import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { revalidateTag } from 'next/cache';

// 获取所有潮玩系列
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId');

    const where = brandId ? { brandId, isActive: true } : { isActive: true };

    const series = await prisma.toySeries.findMany({
      where,
      include: {
        brand: true,
        characters: {
          where: { isActive: true },
          include: {
            _count: {
              select: { items: true }
            }
          }
        },
        _count: {
          select: { characters: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, series });
  } catch (error) {
    console.error('获取潮玩系列失败:', error);
    return NextResponse.json(
      { error: '获取潮玩系列失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// 创建新的潮玩系列
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { name, brandId, description, image, releaseDate } = data;

    if (!name || !brandId) {
      return NextResponse.json({ error: '系列名称和品牌不能为空' }, { status: 400 });
    }

    // 检查品牌是否存在
    const brand = await prisma.toyBrand.findUnique({
      where: { id: brandId }
    });

    if (!brand) {
      return NextResponse.json({ error: '指定的品牌不存在' }, { status: 400 });
    }

    // 检查同一品牌下系列名是否已存在
    const existingSeries = await prisma.toySeries.findUnique({
      where: {
        brandId_name: {
          brandId,
          name
        }
      }
    });

    if (existingSeries) {
      return NextResponse.json({ error: '该品牌下已存在同名系列' }, { status: 400 });
    }

    const series = await prisma.toySeries.create({
      data: {
        name,
        brandId,
        description,
        image,
        releaseDate: releaseDate ? new Date(releaseDate) : null,
      },
      include: {
        brand: true
      }
    });

    revalidateTag('toy-series');

    return NextResponse.json({ success: true, message: '系列创建成功', series });
  } catch (error) {
    console.error('创建潮玩系列失败:', error);
    return NextResponse.json(
      { error: '创建潮玩系列失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
