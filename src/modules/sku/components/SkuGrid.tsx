'use client'

import React from 'react'
import { SkuCard } from './SkuCard'
import { useSkus } from '@/src/modules/sku/hooks/useSkus'
import { Package } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface SkuGridProps {
  search?: string
  status?: string
  categoryId?: string
  page?: number
  pageSize?: number
  onSkuClick?: (skuId: string) => void
  onSkuEdit?: (skuId: string) => void
  onSkuDelete?: (skuId: string) => void
  onCreateNew?: () => void
}

export function SkuGrid({
  search,
  status,
  categoryId,
  page = 1,
  pageSize = 20,
  onSkuClick,
  onSkuEdit,
  onSkuDelete,
  onCreateNew,
}: SkuGridProps) {
  const { data, isLoading, error } = useSkus({
    search,
    status: status === 'all' ? undefined : status,
    categoryId: categoryId === 'all' ? undefined : categoryId,
    page,
    pageSize,
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-64 bg-gray-100 animate-pulse rounded-lg" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-500">
        <p>加载失败，请重试</p>
      </div>
    )
  }

  const skus = data?.data || []
  const total = data?.total || 0

  if (skus.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="mb-4">没有找到匹配的 SKU</p>
        {onCreateNew && (
          <Button onClick={onCreateNew} className="bg-green-500 hover:bg-green-600">
            创建第一个 SKU
          </Button>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {skus.map((sku) => (
          <SkuCard
            key={sku.id}
            sku={sku}
            onClick={onSkuClick}
            onEdit={onSkuEdit}
            onDelete={onSkuDelete}
          />
        ))}
      </div>
      
      {/* 分页信息 */}
      {total > pageSize && (
        <div className="mt-6 text-center text-sm text-gray-500">
          显示 {((page - 1) * pageSize + 1)} - {Math.min(page * pageSize, total)} / 共 {total} 个 SKU
        </div>
      )}
    </>
  )
}

