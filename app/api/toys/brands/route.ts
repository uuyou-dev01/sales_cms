import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { revalidateTag } from 'next/cache';

// 获取所有潮玩品牌
export async function GET() {
  try {
    const brands = await prisma.toyBrand.findMany({
      where: { isActive: true },
      include: {
        series: {
          where: { isActive: true },
          include: {
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
          }
        },
        _count: {
          select: { series: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, brands });
  } catch (error) {
    console.error('获取潮玩品牌失败:', error);
    return NextResponse.json(
      { error: '获取潮玩品牌失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// 创建新的潮玩品牌
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { name, description, logo } = data;

    if (!name) {
      return NextResponse.json({ error: '品牌名称不能为空' }, { status: 400 });
    }

    // 检查品牌名是否已存在
    const existingBrand = await prisma.toyBrand.findUnique({
      where: { name }
    });

    if (existingBrand) {
      return NextResponse.json({ error: '品牌名称已存在' }, { status: 400 });
    }

    const brand = await prisma.toyBrand.create({
      data: {
        name,
        description,
        logo,
      }
    });

    revalidateTag('toy-brands');

    return NextResponse.json({ success: true, message: '品牌创建成功', brand });
  } catch (error) {
    console.error('创建潮玩品牌失败:', error);
    return NextResponse.json(
      { error: '创建潮玩品牌失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
