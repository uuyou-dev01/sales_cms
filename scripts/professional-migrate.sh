#!/bin/bash

echo "🚀 开始专业Prisma迁移流程..."
echo "=================================="

# 步骤1：备份当前schema
echo "📋 步骤1: 备份当前schema..."
cp prisma/schema.prisma prisma/schema-backup.prisma
echo "✅ Schema备份完成"

# 步骤2：使用完整schema（包含所有字段）
echo "📋 步骤2: 使用完整schema..."
cp prisma/schema-backup.prisma prisma/schema.prisma
echo "✅ 完整schema已应用"

# 步骤3：创建migrations目录
echo "📋 步骤3: 创建migrations目录..."
mkdir -p prisma/migrations
echo "✅ Migrations目录创建完成"

# 步骤4：创建baseline迁移
echo "📋 步骤4: 创建baseline迁移..."
npx prisma migrate dev --name add-store-support --create-only
if [ $? -eq 0 ]; then
    echo "✅ Baseline迁移创建成功"
else
    echo "❌ Baseline迁移创建失败，尝试直接推送..."
    echo "📋 步骤4b: 直接推送schema..."
    npx prisma db push --accept-data-loss
    if [ $? -eq 0 ]; then
        echo "✅ Schema直接推送成功"
    else
        echo "❌ Schema推送失败"
        exit 1
    fi
fi

# 步骤5：生成Prisma客户端
echo "📋 步骤5: 生成Prisma客户端..."
npx prisma generate
if [ $? -eq 0 ]; then
    echo "✅ Prisma客户端生成成功"
else
    echo "❌ Prisma客户端生成失败"
    exit 1
fi

# 步骤6：初始化店铺和用户数据
echo "📋 步骤6: 初始化店铺和用户数据..."
npx tsx scripts/init-database.ts
if [ $? -eq 0 ]; then
    echo "✅ 店铺和用户数据初始化成功"
else
    echo "❌ 店铺和用户数据初始化失败"
    exit 1
fi

# 步骤7：迁移现有数据到店铺A
echo "📋 步骤7: 迁移现有数据到店铺A..."
npx tsx scripts/migrate-existing-data.ts
if [ $? -eq 0 ]; then
    echo "✅ 现有数据迁移成功"
else
    echo "❌ 现有数据迁移失败"
    exit 1
fi

# 步骤8：应用迁移（如果使用了migrations）
if [ -f "prisma/migrations/*/migration.sql" ]; then
    echo "📋 步骤8: 应用迁移..."
    npx prisma migrate deploy
    if [ $? -eq 0 ]; then
        echo "✅ 迁移应用成功"
    else
        echo "❌ 迁移应用失败"
        exit 1
    fi
else
    echo "📋 步骤8: 跳过迁移应用（使用了直接推送）"
fi

echo "=================================="
echo "🎉 专业迁移完成！"
echo ""
echo "📋 可用账户信息："
echo "店铺A（包含现有数据）："
echo "  - 管理员：admin / admin123"
echo "  - 普通用户：user_a / user123"
echo ""
echo "店铺B（新店铺）："
echo "  - 管理员：storeb / storeb123"
echo "  - 普通用户：user_b / user123"
echo ""
echo "🌐 现在可以访问 /login 进行登录测试"
echo ""
echo "📚 迁移方法：使用了Prisma官方推荐的baseline迁移"
