import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('正在删除 ItemListing 表的 (templateId, platformId) 唯一约束...')
    
    // 使用原始SQL查询删除约束
    await prisma.$executeRawUnsafe(`
      DROP INDEX IF EXISTS "ItemListing_templateId_platformId_key";
    `)
    
    console.log('✅ 唯一约束已成功删除')
  } catch (error) {
    console.error('❌ 删除约束失败:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => {
    console.log('脚本执行完成')
    process.exit(0)
  })
  .catch((error) => {
    console.error('脚本执行失败:', error)
    process.exit(1)
  })

