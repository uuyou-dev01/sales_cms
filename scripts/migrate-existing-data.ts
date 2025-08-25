import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateExistingData() {
  console.log('开始迁移现有数据到店铺A...');

  try {
    // 获取店铺A
    const storeA = await prisma.store.findUnique({
      where: { name: 'store_a' }
    });

    if (!storeA) {
      console.error('❌ 店铺A不存在，请先运行数据库初始化脚本');
      return;
    }

    console.log('✅ 找到店铺A:', storeA.displayName);

    // 迁移现有商品数据
    const itemsToUpdate = await prisma.item.findMany({
      where: {
        storeId: null
      }
    });

    if (itemsToUpdate.length > 0) {
      console.log(`📦 发现 ${itemsToUpdate.length} 个商品需要迁移`);
      
      await prisma.item.updateMany({
        where: {
          storeId: null
        },
        data: {
          storeId: storeA.id
        }
      });
      
      console.log('✅ 商品数据迁移完成');
    } else {
      console.log('ℹ️ 没有需要迁移的商品数据');
    }

    // 迁移现有交易数据
    const transactionsToUpdate = await prisma.transaction.findMany({
      where: {
        storeId: null
      }
    });

    if (transactionsToUpdate.length > 0) {
      console.log(`💰 发现 ${transactionsToUpdate.length} 个交易需要迁移`);
      
      await prisma.transaction.updateMany({
        where: {
          storeId: null
        },
        data: {
          storeId: storeA.id
        }
      });
      
      console.log('✅ 交易数据迁移完成');
    } else {
      console.log('ℹ️ 没有需要迁移的交易数据');
    }

    // 迁移现有仓库数据
    const warehousesToUpdate = await prisma.warehouse.findMany({
      where: {
        storeId: null
      }
    });

    if (warehousesToUpdate.length > 0) {
      console.log(`🏭 发现 ${warehousesToUpdate.length} 个仓库需要迁移`);
      
      await prisma.warehouse.updateMany({
        where: {
          storeId: null
        },
        data: {
          storeId: storeA.id
        }
      });
      
      console.log('✅ 仓库数据迁移完成');
    } else {
      console.log('ℹ️ 没有需要迁移的仓库数据');
    }

    // 迁移现有仓库位置数据
    const positionsToUpdate = await prisma.warehousePosition.findMany({
      where: {
        storeId: null
      }
    });

    if (positionsToUpdate.length > 0) {
      console.log(`📍 发现 ${positionsToUpdate.length} 个仓库位置需要迁移`);
      
      await prisma.warehousePosition.updateMany({
        where: {
          storeId: null
        },
        data: {
          storeId: storeA.id
        }
      });
      
      console.log('✅ 仓库位置数据迁移完成');
    } else {
      console.log('ℹ️ 没有需要迁移的仓库位置数据');
    }

    // 迁移现有参考价格数据
    const refPricesToUpdate = await prisma.productRefPrice.findMany({
      where: {
        storeId: null
      }
    });

    if (refPricesToUpdate.length > 0) {
      console.log(`💵 发现 ${refPricesToUpdate.length} 个参考价格需要迁移`);
      
      await prisma.productRefPrice.updateMany({
        where: {
          storeId: null
        },
        data: {
          storeId: storeA.id
        }
      });
      
      console.log('✅ 参考价格数据迁移完成');
    } else {
      console.log('ℹ️ 没有需要迁移的参考价格数据');
    }

    console.log('\n🎉 数据迁移完成！');
    console.log(`📊 所有现有数据已成功迁移到店铺A (${storeA.displayName})`);

  } catch (error) {
    console.error('❌ 数据迁移失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrateExistingData()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
