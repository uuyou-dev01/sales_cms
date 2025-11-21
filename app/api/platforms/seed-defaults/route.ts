import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromRequest, hasPermission } from '@/lib/auth'
import { ok, forbidden, serverError } from '@/src/modules/shared/api/response'

const DEFAULT_PLATFORMS = [
  {
    name: 'Mercari',
    baseFeeRate: 0.10, // 10%
    shippingFee: 800, // JPY
    currency: 'JPY',
    region: 'JP',
    market: 'JP',
    isActive: true,
  },
  {
    name: 'Yahoo Auctions',
    baseFeeRate: 0.08, // 8%
    shippingFee: 600, // JPY
    currency: 'JPY',
    region: 'JP',
    market: 'JP',
    isActive: true,
  },
  {
    name: 'Rakuten',
    baseFeeRate: 0.06, // 6%
    shippingFee: 700, // JPY
    currency: 'JPY',
    region: 'JP',
    market: 'JP',
    isActive: true,
  },
  {
    name: '淘宝',
    baseFeeRate: 0.06, // 6%
    shippingFee: 15, // CNY
    currency: 'CNY',
    region: 'CN',
    market: 'CN',
    isActive: true,
  },
  {
    name: '闲鱼',
    baseFeeRate: 0.00, // 0%
    shippingFee: 10, // CNY
    currency: 'CNY',
    region: 'CN',
    market: 'CN',
    isActive: true,
  },
]

export async function POST(req: NextRequest) {
  try {
    const user = getAuthFromRequest(req)
    if (!user || !hasPermission(user, 'ADMIN')) return forbidden()

    // 检查是否已有平台数据
    const existingCount = await prisma.platform.count()
    if (existingCount > 0) {
      return ok({ message: '平台数据已存在，跳过初始化', count: existingCount })
    }

    // 创建默认平台
    const created = await prisma.platform.createMany({
      data: DEFAULT_PLATFORMS,
      skipDuplicates: true,
    })

    return ok({ message: '默认平台已创建', count: created.count })
  } catch (e) {
    console.error('PLATFORM_SEED_FAILED', e)
    return serverError('PLATFORM_SEED_FAILED')
  }
}

