import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('开始创建默认分类...');

  try {
    // 创建一级分类
    const categories = [
      { name: '服装', code: 'CLOTHING' },
      { name: '鞋子', code: 'SHOES' },
      { name: '包包', code: 'BAGS' },
      { name: '配饰', code: 'ACCESSORIES' },
      { name: '3C&配件', code: 'ELECTRONICS' },
      { name: '潮玩类', code: 'TOYS' },
      { name: '其他', code: 'OTHER' },
    ];

    for (const cat of categories) {
      const existing = await prisma.category.findFirst({
        where: { name: cat.name },
      });

      if (!existing) {
        const created = await prisma.category.create({
          data: {
            name: cat.name,
            code: cat.code,
            level: 1,
            isActive: true,
          },
        });
        console.log(`✅ 创建分类: ${created.name} (${created.id})`);
      } else {
        console.log(`⏭️  分类已存在: ${cat.name}`);
      }
    }

    // 创建一些二级分类示例（可选）
    const clothing = await prisma.category.findFirst({ where: { name: '服装' } });
    if (clothing) {
      const subCategories = [
        { name: '上衣', parentId: clothing.id },
        { name: '下装', parentId: clothing.id },
        { name: '外套', parentId: clothing.id },
      ];

      for (const subCat of subCategories) {
        const existing = await prisma.category.findFirst({
          where: { name: subCat.name, parentId: subCat.parentId },
        });

        if (!existing) {
          const created = await prisma.category.create({
            data: {
              name: subCat.name,
              parentId: subCat.parentId,
              level: 2,
              isActive: true,
            },
          });
          console.log(`✅ 创建子分类: ${created.name} (${created.id})`);
        }
      }
    }

    // 为潮玩类创建子分类
    const toys = await prisma.category.findFirst({ where: { name: '潮玩类' } });
    if (toys) {
      const toySubCategories = [
        { name: '手办', parentId: toys.id },
        { name: '盲盒', parentId: toys.id },
        { name: '模型', parentId: toys.id },
      ];

      for (const subCat of toySubCategories) {
        const existing = await prisma.category.findFirst({
          where: { name: subCat.name, parentId: subCat.parentId },
        });

        if (!existing) {
          const created = await prisma.category.create({
            data: {
              name: subCat.name,
              parentId: subCat.parentId,
              level: 2,
              isActive: true,
            },
          });
          console.log(`✅ 创建子分类: ${created.name} (${created.id})`);
        }
      }
    }

    console.log('\n🎉 默认分类创建完成！');
    console.log('\n📋 已创建的分类：');
    const allCategories = await prisma.category.findMany({
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
    });
    allCategories.forEach(cat => {
      const indent = cat.level === 1 ? '' : '  └─ ';
      console.log(`${indent}${cat.name} (${cat.id})`);
    });

  } catch (error) {
    console.error('❌ 创建分类失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

