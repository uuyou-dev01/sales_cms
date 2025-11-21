import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../lib/auth';

const prisma = new PrismaClient();

async function main() {
  console.log('开始创建 admin 用户...');

  try {
    // 1. 检查或创建默认店铺
    let store = await prisma.store.findFirst({
      where: { name: 'store_a' }
    });

    if (!store) {
      // 如果不存在店铺，创建一个默认店铺
      store = await prisma.store.create({
        data: {
          id: `store_${Date.now()}`,
          name: 'store_a',
          displayName: '默认店铺',
          description: '默认店铺',
          isActive: true,
          updatedAt: new Date(),
        },
      });
      console.log('✅ 默认店铺创建成功:', store.name);
    } else {
      console.log('✅ 默认店铺已存在:', store.name);
    }

    // 2. 检查 admin 用户是否存在
    const existingUser = await prisma.user.findUnique({
      where: { username: 'admin' }
    });

    if (existingUser) {
      // 如果用户已存在，更新密码
      await prisma.user.update({
        where: { username: 'admin' },
        data: {
          password: hashPassword('admin123'),
          isActive: true,
          storeId: store.id,
          role: 'ADMIN',
          updatedAt: new Date(),
        },
      });
      console.log('✅ admin 用户密码已更新');
    } else {
      // 如果用户不存在，创建新用户
      const adminUser = await prisma.user.create({
        data: {
          id: `user_${Date.now()}`,
          username: 'admin',
          email: 'admin@example.com',
          password: hashPassword('admin123'),
          name: '管理员',
          role: 'ADMIN',
          storeId: store.id,
          isActive: true,
          level: 1,
          updatedAt: new Date(),
        },
      });
      console.log('✅ admin 用户创建成功:', adminUser.username);
    }

    console.log('\n🎉 admin 用户创建/更新完成！');
    console.log('\n📋 账户信息：');
    console.log('  - 用户名：admin');
    console.log('  - 密码：admin123');
    console.log('  - 角色：ADMIN');
    console.log('  - 店铺：', store.displayName);

  } catch (error) {
    console.error('❌ 创建 admin 用户失败:', error);
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

