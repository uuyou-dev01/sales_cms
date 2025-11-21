'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'

// 动态导入组件
const SmartSkuForm = dynamic(() => import('@/src/modules/sku/components/SmartSkuForm').then(m => m.default || m), { ssr: false })
const SkuStatsPanel = dynamic(() => import('@/src/modules/sku/components/SkuStatsPanel').then(m => m.SkuStatsPanel), { ssr: false })
const SkuGrid = dynamic(() => import('@/src/modules/sku/components/SkuGrid').then(m => m.SkuGrid), { ssr: false })

export default function SkuPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [search, setSearch] = React.useState('')
  const [status, setStatus] = React.useState<string>('all')
  const [categoryFilter, setCategoryFilter] = React.useState<string>('all')
  const [page, setPage] = React.useState(1)
  const [createOpen, setCreateOpen] = React.useState(false)

  const handleCreateSuccess = () => {
    setCreateOpen(false)
    queryClient.invalidateQueries({ queryKey: ['skus'] })
    queryClient.invalidateQueries({ queryKey: ['sku-stats'] })
  }

  const handleSkuClick = (skuId: string) => {
    router.push(`/sku/${skuId}`)
  }

  const handleSkuEdit = (skuId: string) => {
    router.push(`/sku/${skuId}`)
  }

  const handleSkuDelete = async (skuId: string) => {
    if (!confirm('确定要删除这个 SKU 吗？')) return
    
    try {
      const res = await fetch(`/api/sku/${skuId}`, { method: 'DELETE' })
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ['skus'] })
        queryClient.invalidateQueries({ queryKey: ['sku-stats'] })
      }
    } catch (error) {
      console.error('删除失败:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* 顶部工具栏 */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-semibold">SKU 管理</h1>
        <div className="flex gap-2 items-center">
          <Input 
            placeholder="搜索 SKU 名称、品牌..." 
            value={search} 
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1) // 重置页码
            }}
            className="w-64" 
          />
          <Select value={status} onValueChange={(value) => {
            setStatus(value)
            setPage(1)
          }}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="live">启用</SelectItem>
              <SelectItem value="draft">禁用</SelectItem>
              <SelectItem value="soldout">已售罄</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={(value) => {
            setCategoryFilter(value)
            setPage(1)
          }}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="品类" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部品类</SelectItem>
              {/* TODO: 从 API 获取分类列表 */}
            </SelectContent>
          </Select>
          <Button onClick={() => setCreateOpen(true)} className="bg-green-500 hover:bg-green-600">
            <Plus className="mr-2 h-4 w-4" />
            新建 SKU
          </Button>
        </div>
      </div>

      {/* 统计面板 */}
      <SkuStatsPanel />

      {/* SKU 网格 */}
      <SkuGrid
        search={search}
        status={status}
        categoryId={categoryFilter === 'all' ? undefined : categoryFilter}
        page={page}
        pageSize={20}
        onSkuClick={handleSkuClick}
        onSkuEdit={handleSkuEdit}
        onSkuDelete={handleSkuDelete}
        onCreateNew={() => setCreateOpen(true)}
      />

      {/* 新建 SKU 对话框 */}
      {createOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setCreateOpen(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-5xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">新建 SKU</h2>
              <Button variant="ghost" size="sm" onClick={() => setCreateOpen(false)}>关闭</Button>
            </div>
            <SmartSkuForm onSuccess={handleCreateSuccess} />
          </div>
        </div>
      )}
    </div>
  )
}
