import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../lib/auth';

const prisma = new PrismaClient();

async function main() {
  console.log('开始初始化数据库...');

  try {
    // 创建店铺A
    const storeA = await prisma.store.upsert({
      where: { name: 'store_a' },
      update: {},
      create: {
        name: 'store_a',
        displayName: '店铺A',
        description: '这是店铺A，包含现有的所有数据',
        isActive: true,
      },
    });

    console.log('✅ 店铺A创建成功:', storeA.name);

    // 创建店铺B
    const storeB = await prisma.store.upsert({
      where: { name: 'store_b' },
      update: {},
      create: {
        name: 'store_b',
        displayName: '店铺B',
        description: '这是店铺B，新的店铺',
        isActive: true,
      },
    });

    console.log('✅ 店铺B创建成功:', storeB.name);

    // 创建店铺A的管理员用户
    const adminUser = await prisma.user.upsert({
      where: { username: 'admin' },
      update: {},
      create: {
        username: 'admin',
        email: 'admin@storea.com',
        password: hashPassword('admin123'),
        name: '店铺A管理员',
        role: 'ADMIN',
        storeId: storeA.id,
        isActive: true,
      },
    });

    console.log('✅ 店铺A管理员用户创建成功:', adminUser.username);

    // 创建店铺B的管理员用户
    const storeBAdmin = await prisma.user.upsert({
      where: { username: 'storeb' },
      update: {},
      create: {
        username: 'storeb',
        email: 'admin@storeb.com',
        password: hashPassword('storeb123'),
        name: '店铺B管理员',
        role: 'ADMIN',
        storeId: storeB.id,
        isActive: true,
      },
    });

    console.log('✅ 店铺B管理员用户创建成功:', storeBAdmin.username);

    // 创建店铺A的普通用户
    const storeAUser = await prisma.user.upsert({
      where: { username: 'user_a' },
      update: {},
      create: {
        username: 'user_a',
        email: 'user@storea.com',
        password: hashPassword('user123'),
        name: '店铺A用户',
        role: 'USER',
        storeId: storeA.id,
        isActive: true,
      },
    });

    console.log('✅ 店铺A普通用户创建成功:', storeAUser.username);

    // 创建店铺B的普通用户
    const storeBUser = await prisma.user.upsert({
      where: { username: 'user_b' },
      update: {},
      create: {
        username: 'user_b',
        email: 'user@storeb.com',
        password: hashPassword('user123'),
        name: '店铺B用户',
        role: 'USER',
        storeId: storeB.id,
        isActive: true,
      },
    });

    console.log('✅ 店铺B普通用户创建成功:', storeBUser.username);

    console.log('\n🎉 数据库初始化完成！');
    console.log('\n📋 可用账户信息：');
    console.log('店铺A：');
    console.log('  - 管理员：admin / admin123');
    console.log('  - 普通用户：user_a / user123');
    console.log('\n店铺B：');
    console.log('  - 管理员：storeb / storeb123');
    console.log('  - 普通用户：user_b / user123');
    console.log('\n⚠️  注意：仓库创建已跳过，将在后续步骤中处理');

  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
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
