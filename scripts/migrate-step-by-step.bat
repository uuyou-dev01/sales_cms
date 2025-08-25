@echo off
chcp 65001 >nul
echo 🚀 开始分步骤数据库迁移...
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

REM 步骤2：使用临时schema
echo 📋 步骤2: 使用临时schema（只添加Store和User）...
copy prisma\schema-step1.prisma prisma\schema.prisma
if %errorlevel% equ 0 (
    echo ✅ 临时schema已应用
) else (
    echo ❌ 临时schema应用失败
    pause
    exit /b 1
)

REM 步骤3：推送第一步schema
echo 📋 步骤3: 推送第一步schema...
call npx prisma db push
if %errorlevel% equ 0 (
    echo ✅ 第一步schema推送成功
) else (
    echo ❌ 第一步schema推送失败
    pause
    exit /b 1
)

REM 步骤4：生成Prisma客户端
echo 📋 步骤4: 生成Prisma客户端...
call npx prisma generate
if %errorlevel% equ 0 (
    echo ✅ Prisma客户端生成成功
) else (
    echo ❌ Prisma客户端生成失败
    pause
    exit /b 1
)

REM 步骤5：初始化店铺和用户数据
echo 📋 步骤5: 初始化店铺和用户数据...
call npx tsx scripts\init-database.ts
if %errorlevel% equ 0 (
    echo ✅ 店铺和用户数据初始化成功
) else (
    echo ❌ 店铺和用户数据初始化失败
    pause
    exit /b 1
)

REM 步骤6：迁移现有数据到店铺A
echo 📋 步骤6: 迁移现有数据到店铺A...
call npx tsx scripts\migrate-existing-data.ts
if %errorlevel% equ 0 (
    echo ✅ 现有数据迁移成功
) else (
    echo ❌ 现有数据迁移失败
    pause
    exit /b 1
)

REM 步骤7：恢复完整schema
echo 📋 步骤7: 恢复完整schema...
copy prisma\schema-backup.prisma prisma\schema.prisma
if %errorlevel% equ 0 (
    echo ✅ 完整schema已恢复
) else (
    echo ❌ 完整schema恢复失败
    pause
    exit /b 1
)

REM 步骤8：推送完整schema
echo 📋 步骤8: 推送完整schema...
call npx prisma db push
if %errorlevel% equ 0 (
    echo ✅ 完整schema推送成功
) else (
    echo ❌ 完整schema推送失败
    pause
    exit /b 1
)

REM 步骤9：重新生成客户端
echo 📋 步骤9: 重新生成Prisma客户端...
call npx prisma generate
if %errorlevel% equ 0 (
    echo ✅ Prisma客户端重新生成成功
) else (
    echo ❌ Prisma客户端重新生成失败
    pause
    exit /b 1
)

echo ==================================
echo 🎉 分步骤迁移完成！
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
pause
