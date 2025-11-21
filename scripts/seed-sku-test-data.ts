/**
 * 种子脚本：创建 3 条测试 SKU 数据
 * 运行方式：npx tsx scripts/seed-sku-test-data.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('开始创建测试 SKU 数据...')

  // 1. 创建或获取分类
  const categories = [
    { name: '盲盒玩具', code: 'BLIND_BOX' },
    { name: '模型手办', code: 'MODEL' },
    { name: '运动鞋', code: 'SNEAKERS' },
  ]

  const createdCategories = await Promise.all(
    categories.map(async (cat) => {
      const existing = await prisma.category.findFirst({
        where: { name: cat.name, parentId: null },
      })
      if (existing) {
        console.log(`分类 "${cat.name}" 已存在，使用现有分类`)
        return existing
      }
      const created = await prisma.category.create({
        data: {
          name: cat.name,
          code: cat.code,
          level: 1,
          isActive: true,
        },
      })
      console.log(`创建分类: ${cat.name}`)
      return created
    })
  )

  // 2. 创建 3 条测试 SKU
  const testSkus = [
    {
      name: 'POP MART 盲盒 - 小黄人系列',
      brand: 'POP MART',
      categoryId: createdCategories[0].id, // 盲盒玩具
      unit: '盒',
      isComposite: false,
      isActive: true,
      attributes: {
        photos: [
          'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop',
          'https://images.unsplash.com/photo-1596464716127-f2a82984de30?w=400&h=400&fit=crop',
        ],
        description: 'POP MART 小黄人系列盲盒，包含多个隐藏款',
      },
    },
    {
      name: '万代高达模型 RG系列',
      brand: '万代',
      categoryId: createdCategories[1].id, // 模型手办
      unit: '盒',
      isComposite: false,
      isActive: true,
      attributes: {
        photos: [
          'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop',
        ],
        description: '万代 RG 系列高达模型，精细制作，适合收藏',
      },
    },
    {
      name: 'Nike Air Max 97',
      brand: 'Nike',
      categoryId: createdCategories[2].id, // 运动鞋
      unit: '双',
      isComposite: false,
      isActive: true,
      attributes: {
        photos: [
          'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop',
          'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=400&h=400&fit=crop',
        ],
        description: 'Nike Air Max 97 经典运动鞋，舒适透气',
        sizes: ['40', '41', '42', '43', '44'],
      },
    },
  ]

  // 检查是否已存在相同的 SKU
  for (const skuData of testSkus) {
    const existing = await prisma.sKU.findFirst({
      where: {
        name: skuData.name,
        brand: skuData.brand,
      },
    })

    if (existing) {
      console.log(`SKU "${skuData.name}" 已存在，跳过创建`)
      continue
    }

    const created = await prisma.sKU.create({
      data: {
        name: skuData.name,
        brand: skuData.brand,
        categoryId: skuData.categoryId,
        unit: skuData.unit,
        isComposite: skuData.isComposite,
        isActive: skuData.isActive,
        attributes: skuData.attributes,
      },
      include: {
        category: true,
      },
    })

    console.log(`✅ 创建 SKU: ${created.name} (ID: ${created.id})`)
  }

  console.log('\n✅ 测试 SKU 数据创建完成！')
}

main()
  .catch((e) => {
    console.error('❌ 创建失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

