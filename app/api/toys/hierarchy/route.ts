import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 获取完整的潮玩层级结构
export async function GET() {
  try {
    const hierarchy = await prisma.toyBrand.findMany({
      where: { isActive: true },
      include: {
        series: {
          where: { isActive: true },
          include: {
            characters: {
              where: { isActive: true },
              include: {
                items: {
                  where: { 
                    deleted: false,
                    itemType: '潮玩类'
                  },
                  include: {
                    transactions: {
                      orderBy: { createdAt: 'desc' },
                      take: 1
                    }
                  }
                },
                _count: {
                  select: { 
                    items: {
                      where: { 
                        deleted: false,
                        itemType: '潮玩类'
                      }
                    }
                  }
                }
              }
            },
            _count: {
              select: { 
                characters: {
                  where: { isActive: true }
                }
              }
            }
          }
        },
        _count: {
          select: { 
            series: {
              where: { isActive: true }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // 计算统计信息
    const stats = {
      totalBrands: hierarchy.length,
      totalSeries: hierarchy.reduce((sum, brand) => sum + brand._count.series, 0),
      totalCharacters: hierarchy.reduce((sum, brand) => 
        sum + brand.series.reduce((seriesSum, series) => seriesSum + series._count.characters, 0), 0
      ),
      totalItems: hierarchy.reduce((sum, brand) => 
        sum + brand.series.reduce((seriesSum, series) => 
          seriesSum + series.characters.reduce((charSum, char) => charSum + char._count.items, 0), 0
        ), 0
      )
    };

    return NextResponse.json({ success: true, hierarchy, stats });
  } catch (error) {
    console.error('获取潮玩层级结构失败:', error);
    return NextResponse.json(
      { error: '获取潮玩层级结构失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// 根据品牌和系列获取角色选项（用于表单选择器）
export async function POST(request: Request) {
  try {
    const { brandId, seriesId } = await request.json();

    if (!brandId) {
      return NextResponse.json({ error: '品牌ID不能为空' }, { status: 400 });
    }

    let result: any = {};

    // 获取品牌信息
    const brand = await prisma.toyBrand.findUnique({
      where: { id: brandId },
      include: {
        series: {
          where: { isActive: true },
          orderBy: { name: 'asc' }
        }
      }
    });

    if (!brand) {
      return NextResponse.json({ error: '品牌不存在' }, { status: 404 });
    }

    result.brand = brand;

    // 如果指定了系列，获取该系列下的角色
    if (seriesId) {
      const characters = await prisma.toyCharacter.findMany({
        where: { 
          seriesId,
          isActive: true 
        },
        orderBy: { name: 'asc' }
      });

      result.characters = characters;
    }

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('获取潮玩选项失败:', error);
    return NextResponse.json(
      { error: '获取潮玩选项失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
