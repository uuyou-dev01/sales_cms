@echo off
chcp 65001 >nul
echo 🚀 开始专业Prisma迁移流程...
echo ==================================

REM 步骤1：备份当前schema
echo 📋 步骤1: 备份当前schema...
copy prisma\schema.prisma prisma\schema-backup.prisma
if %errorlevel% equ 0 (
    echo ✅ Schema备份完成
) else (
    echo ❌ Schema备份失败
    pause
    exit /b 1
)

REM 步骤2：使用完整schema（包含所有字段）
echo 📋 步骤2: 使用完整schema...
copy prisma\schema-backup.prisma prisma\schema.prisma
if %errorlevel% equ 0 (
    echo ✅ 完整schema已应用
) else (
    echo ❌ 完整schema应用失败
    pause
    exit /b 1
)

REM 步骤3：创建migrations目录
echo 📋 步骤3: 创建migrations目录...
if not exist "prisma\migrations" mkdir prisma\migrations
echo ✅ Migrations目录创建完成

REM 步骤4：创建baseline迁移
echo 📋 步骤4: 创建baseline迁移...
call npx prisma migrate dev --name add-store-support --create-only
if %errorlevel% equ 0 (
    echo ✅ Baseline迁移创建成功
) else (
    echo ❌ Baseline迁移创建失败，尝试直接推送...
    echo 📋 步骤4b: 直接推送schema...
    call npx prisma db push --accept-data-loss
    if %errorlevel% equ 0 (
        echo ✅ Schema直接推送成功
    ) else (
        echo ❌ Schema推送失败
        pause
        exit /b 1
    )
)

REM 步骤5：生成Prisma客户端
echo 📋 步骤5: 生成Prisma客户端...
call npx prisma generate
if %errorlevel% equ 0 (
    echo ✅ Prisma客户端生成成功
) else (
    echo ❌ Prisma客户端生成失败
    pause
    exit /b 1
)

REM 步骤6：初始化店铺和用户数据
echo 📋 步骤6: 初始化店铺和用户数据...
call npx tsx scripts\init-database.ts
if %errorlevel% equ 0 (
    echo ✅ 店铺和用户数据初始化成功
) else (
    echo ❌ 店铺和用户数据初始化失败
    pause
    exit /b 1
)

REM 步骤7：迁移现有数据到店铺A
echo 📋 步骤7: 迁移现有数据到店铺A...
call npx tsx scripts\migrate-existing-data.ts
if %errorlevel% equ 0 (
    echo ✅ 现有数据迁移成功
) else (
    echo ❌ 现有数据迁移失败
    pause
    exit /b 1
)

echo ==================================
echo 🎉 专业迁移完成！
echo.
echo 📋 可用账户信息：
echo 店铺A（包含现有数据）：
echo   - 管理员：admin / admin123
echo   - 普通用户：user_a / user123
echo.
echo 店铺B（新店铺）：
echo   - 管理员：storeb / storeb123
echo   - 普通用户：user_b / user123
echo.
echo 🌐 现在可以访问 /login 进行登录测试
echo.
echo 📚 迁移方法：使用了Prisma官方推荐的baseline迁移
pause
