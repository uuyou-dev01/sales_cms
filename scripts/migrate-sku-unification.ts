import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('开始 SKU 系统统一迁移...');

  try {
    // 1. 为所有没有 skuId 的 Item 创建默认 SKU
    console.log('\n步骤 1: 处理没有 skuId 的 Item...');
    const itemsWithoutSku = await prisma.item.findMany({
      where: { skuId: null },
      take: 1000, // 限制一次处理的数量
    });

    if (itemsWithoutSku.length > 0) {
      console.log(`发现 ${itemsWithoutSku.length} 个没有 skuId 的 Item`);

      // 按 itemType 和 itemBrand 分组，为每组创建一个默认 SKU
      const groupedItems = new Map<string, typeof itemsWithoutSku>();
      
      for (const item of itemsWithoutSku) {
        const key = `${item.itemType || '其他'}_${item.itemBrand || '未知品牌'}`;
        if (!groupedItems.has(key)) {
          groupedItems.set(key, []);
        }
        groupedItems.get(key)!.push(item);
      }

      for (const [key, items] of groupedItems.entries()) {
        const [itemType, brand] = key.split('_');
        
        // 创建默认 SKU
        const defaultSku = await prisma.sKU.create({
          data: {
            name: `${brand} ${itemType}（默认）`,
            brand: brand === '未知品牌' ? null : brand,
            categoryId: null,
            isActive: true,
            attributes: {
              migrated: true,
              originalType: itemType,
            },
          },
        });

        // 更新这些 Item 的 skuId
        await prisma.item.updateMany({
          where: {
            itemId: { in: items.map(i => i.itemId) },
          },
          data: {
            skuId: defaultSku.id,
          },
        });

        console.log(`  为 ${items.length} 个 Item 创建了默认 SKU: ${defaultSku.name}`);
      }
    } else {
      console.log('  所有 Item 都已有关联的 SKU');
    }

    console.log('\n步骤 2: SKU 层不再维护成色 conditionTag，相关数据如仍需要请手动迁移到 Item.itemCondition。');

    // 3. 将 toyCharacterId 转换为 toyCharacterName（如果存在）
    console.log('\n步骤 3: 迁移 toyCharacterId 到 toyCharacterName...');
    const itemsWithToyCharacter = await prisma.item.findMany({
      where: { toyCharacterId: { not: null } },
      include: { toyCharacter: true },
    });

    if (itemsWithToyCharacter.length > 0) {
      console.log(`  发现 ${itemsWithToyCharacter.length} 个 Item 有 toyCharacterId`);

      for (const item of itemsWithToyCharacter) {
        if (item.toyCharacter && !item.toyCharacterName) {
          await prisma.item.update({
            where: { itemId: item.itemId },
            data: {
              toyCharacterName: item.toyCharacter.name,
            },
          });
        }
      }

      console.log(`  已迁移 ${itemsWithToyCharacter.length} 个 Item 的角色名称`);
    } else {
      console.log('  没有需要迁移的 toyCharacterId');
    }

    // 4. 验证迁移结果
    console.log('\n步骤 4: 验证迁移结果...');
    const itemsStillWithoutSku = await prisma.item.count({
      where: { skuId: null },
    });

    if (itemsStillWithoutSku > 0) {
      console.log(`  ⚠️  警告: 仍有 ${itemsStillWithoutSku} 个 Item 没有 skuId`);
    } else {
      console.log('  ✅ 所有 Item 都已关联 SKU');
    }

    console.log('\n🎉 SKU 系统统一迁移完成！');
    console.log('\n📋 下一步:');
    console.log('  1. 运行: npx prisma migrate dev --name unify-sku-system');
    console.log('  2. 运行: npx prisma generate');
    console.log('  3. 检查并更新相关代码以适配新的 Schema');

  } catch (error) {
    console.error('❌ 迁移失败:', error);
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

