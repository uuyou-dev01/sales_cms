'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Package, Edit, Trash2, ChevronDown, ChevronUp, Truck, Archive, PackageCheck } from 'lucide-react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { getSkuMainPhoto } from '../utils/sku.utils'

export interface SkuCardProps {
  sku: {
    id: string
    name: string
    brand?: string | null
    category?: { name: string } | null
    isActive: boolean
    isComposite: boolean
    unit?: string | null
    createdAt: Date | string
    attributes?: any // JSON 字段，可能包含 mainPhoto
    items?: Array<{
      itemId: string
      itemName: string
      itemSize?: string
      itemCondition?: string
      status?: string
      photos?: string[]
      transactionDetails?: Array<{
        transaction?: {
          soldDate?: Date | string | null
        }
      }>
    }>
    subSkuTemplates?: Array<{
      id: string
      itemName: string
      itemSize?: string | null
      itemCondition?: string | null
      toyCharacterName?: string | null
      itemColor?: string | null
      stats?: {
        total: number
        inStock: number
        sold: number
        inTransit: number
      }
    }>
    inventorySnapshot?: {
      totalItems: number
      inStockCount: number
      soldCount: number
      inTransitCount: number
      reservedCount: number
      damagedCount: number
    }
    // 统计信息（可选）
    stats?: {
      sales?: {
        totalRevenue: number
        profitRate: number
      }
      inventory?: {
        inStockCount: number
        totalItems: number
      }
    }
  }
  onClick?: (skuId: string) => void
  onEdit?: (skuId: string) => void
  onDelete?: (skuId: string) => void
}

export function SkuCard({ sku, onClick, onEdit, onDelete }: SkuCardProps) {
  const [showActions, setShowActions] = React.useState(false)
  const [showAllTemplates, setShowAllTemplates] = React.useState(false)
  
  // 获取第一张图片：优先读取 SKU 主图（attributes.mainPhoto），再回退到 items
  const firstPhoto = React.useMemo(() => {
    return getSkuMainPhoto(sku)
  }, [sku.items, sku.attributes])

  type TemplatePreview = NonNullable<SkuCardProps['sku']['subSkuTemplates']>[number] & {
    label?: string
  }

  const derivedTemplates = React.useMemo<TemplatePreview[]>(() => {
    if (sku.subSkuTemplates && sku.subSkuTemplates.length > 0) {
      return sku.subSkuTemplates.map((tpl) => ({
        ...tpl,
        label: tpl.itemName || sku.name,
      }))
    }

    if (!sku.items || sku.items.length === 0) return []
    const map = new Map<string, TemplatePreview>()

    sku.items.forEach((item) => {
      const key = [
        item.itemName || '',
        item.itemSize || '',
        item.itemCondition || '',
        item.status || '',
      ].join('|')

      if (!map.has(key)) {
        map.set(key, {
          id: key || item.itemId,
          itemName: item.itemName,
          itemSize: item.itemSize,
          itemCondition: item.itemCondition,
          stats: {
            total: 0,
            inStock: 0,
            sold: 0,
            inTransit: 0,
          },
        })
      }

      const entry = map.get(key)!
      entry.stats!.total += 1
      if (item.status === 'IN_TRANSIT') entry.stats!.inTransit += 1
      else if (item.status === 'SOLD') entry.stats!.sold += 1
      else entry.stats!.inStock += 1
    })

    return Array.from(map.values()).map((tpl) => ({
      ...tpl,
      label: tpl.itemName || sku.name,
    }))
  }, [sku.subSkuTemplates, sku.items, sku.name])

  const templatesToDisplay = React.useMemo(() => {
    const list = derivedTemplates
    return showAllTemplates ? list : list.slice(0, 4)
  }, [derivedTemplates, showAllTemplates])

  const hasMoreTemplates = derivedTemplates.length > 4

  const inventorySnapshot = React.useMemo(() => {
    if (sku.inventorySnapshot) return sku.inventorySnapshot
    const fallback = {
      totalItems: 0,
      inStockCount: 0,
      soldCount: 0,
      inTransitCount: 0,
      reservedCount: 0,
      damagedCount: 0,
    }

    if (!sku.items) return fallback
    sku.items.forEach((item) => {
      fallback.totalItems += 1
      switch (item.status) {
        case 'IN_TRANSIT':
          fallback.inTransitCount += 1
          break
        case 'RESERVED':
          fallback.reservedCount += 1
          fallback.inStockCount += 1
          break
        case 'SOLD':
          fallback.soldCount += 1
          break
        case 'DAMAGED':
          fallback.damagedCount += 1
          break
        case 'IN_STOCK':
        default:
          fallback.inStockCount += 1
          break
      }
    })
    return fallback
  }, [sku.inventorySnapshot, sku.items])

  // 销售额和利润率
  const revenue = sku.stats?.sales?.totalRevenue ?? 0
  const profitRate = sku.stats?.sales?.profitRate ?? 0

  const statusChips = [
    {
      label: '在库',
      value: inventorySnapshot.inStockCount || 0,
      tone: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      Icon: PackageCheck,
    },
    {
      label: '在途',
      value: inventorySnapshot.inTransitCount || 0,
      tone: 'bg-blue-50 text-blue-700 border-blue-100',
      Icon: Truck,
    },
    {
      label: '预留',
      value: inventorySnapshot.reservedCount || 0,
      tone: 'bg-amber-50 text-amber-700 border-amber-100',
      Icon: Archive,
    },
    {
      label: '已售',
      value: inventorySnapshot.soldCount || 0,
      tone: 'bg-slate-50 text-slate-700 border-slate-100',
      Icon: Package,
    },
  ]

  return (
    <Card
      className="p-4 hover:shadow-lg transition-all cursor-pointer group relative flex flex-col h-full"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      onClick={() => onClick?.(sku.id)}
    >
      {/* 图片 */}
      <div className="w-full h-48 bg-gray-100 rounded-lg mb-3 overflow-hidden flex items-center justify-center flex-shrink-0">
        {firstPhoto ? (
          <img
            src={firstPhoto}
            alt={sku.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.src = `https://via.placeholder.com/400x400/cccccc/999999?text=${encodeURIComponent(sku.name)}`
            }}
          />
        ) : (
          <Package className="h-16 w-16 text-gray-400" />
        )}
      </div>

      {/* 操作按钮（悬停显示） */}
      {showActions && (
        <div className="absolute top-2 right-2 flex gap-1 z-10">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 bg-white/90 hover:bg-white shadow-sm"
            onClick={(e) => {
              e.stopPropagation()
              onEdit?.(sku.id)
            }}
            title="编辑"
          >
            <Edit className="h-4 w-4" />
          </Button>
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 bg-white/90 hover:bg-white shadow-sm"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(sku.id)
              }}
              title="删除"
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          )}
        </div>
      )}

      {/* 标题 */}
      <h3 className="font-semibold text-lg mb-1 line-clamp-2 flex-shrink-0">{sku.name}</h3>

      {/* 品牌和分类 */}
      <div className="flex items-center gap-2 text-sm text-gray-600 mb-2 flex-shrink-0">
        {sku.brand && <span>{sku.brand}</span>}
        {sku.brand && sku.category && <span>·</span>}
        {sku.category && <span>{sku.category.name}</span>}
      </div>

      {/* 状态标签 */}
      <div className="flex flex-wrap gap-2 mb-3 flex-shrink-0">
        <Badge variant={sku.isActive ? "default" : "secondary"}>
          {sku.isActive ? '启用' : '禁用'}
        </Badge>
        {sku.isComposite && (
          <Badge variant="outline" className="bg-purple-50 text-purple-700">
            组合SKU
          </Badge>
        )}
        {sku.unit && (
          <Badge variant="outline">
            {sku.unit}
          </Badge>
        )}
      </div>

      {/* 子SKU模板摘要 */}
      {templatesToDisplay.length > 0 ? (
        <div className="mb-3 flex-1 min-h-0">
          <div className="text-xs font-medium text-gray-700 mb-2">模板概览 ({derivedTemplates.length})</div>
          <div className="space-y-1 max-h-36 overflow-y-auto">
            {templatesToDisplay.map((template) => (
              <div
                key={template.id}
                className="flex items-center justify-between text-xs py-1.5 px-2 bg-gray-50 rounded hover:bg-gray-100"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">{template.itemName || sku.name}</div>
                  <div className="text-gray-500 text-[10px]">
                    {[template.itemSize || '均码', template.itemCondition || '全新', template.toyCharacterName]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                </div>
                <div className="ml-2 flex items-center gap-1 flex-wrap justify-end">
                  <Badge variant="outline" className="text-[10px] px-1 py-0 border-blue-200 text-blue-700 bg-blue-50">
                    在库 {template.stats?.inStock ?? 0}
                  </Badge>
                  {template.stats?.inTransit ? (
                    <Badge variant="outline" className="text-[10px] px-1 py-0 border-sky-200 text-sky-700 bg-sky-50">
                      在途 {template.stats.inTransit}
                    </Badge>
                  ) : null}
                  {template.stats?.sold ? (
                    <Badge variant="outline" className="text-[10px] px-1 py-0 border-slate-200 text-slate-700 bg-slate-50">
                      已售 {template.stats.sold}
                    </Badge>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
          {hasMoreTemplates && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2 text-xs h-6"
              onClick={(e) => {
                e.stopPropagation()
                setShowAllTemplates(!showAllTemplates)
              }}
            >
              {showAllTemplates ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  收起
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  查看更多 ({derivedTemplates.length - 4} 个)
                </>
              )}
            </Button>
          )}
        </div>
      ) : (
        <div className="mb-3 text-xs text-gray-500 bg-gray-50 rounded-md py-2 px-3">
          尚未生成子SKU模板
        </div>
      )}

      {/* 库存状态概览 */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {statusChips.map(({ label, value, tone, Icon }) => (
          <div key={label} className={`rounded-lg border text-xs px-3 py-2 flex items-center justify-between ${tone}`}>
            <div className="flex items-center gap-1">
              <Icon className="h-3.5 w-3.5" />
              <span>{label}</span>
            </div>
            <span className="font-semibold">{value ?? 0}</span>
          </div>
        ))}
      </div>

      {/* 底部统计信息 */}
      <div className="flex items-center justify-between text-sm pt-3 border-t mt-auto flex-shrink-0">
        <div className="flex items-center gap-1 text-gray-600">
          <Package className="h-4 w-4" />
          <div className="text-xs">
            <div>在库: <strong className="text-gray-900">{inventorySnapshot.inStockCount || 0}</strong></div>
            {inventorySnapshot.inTransitCount > 0 && (
              <div className="text-gray-500">在途: {inventorySnapshot.inTransitCount}</div>
            )}
          </div>
        </div>
        {revenue > 0 && (
          <div className="text-right">
            <div className="text-gray-900 font-medium text-sm">
              ¥{revenue.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}
            </div>
            {profitRate > 0 && (
              <div className="text-xs text-green-600">利润率 {profitRate.toFixed(1)}%</div>
            )}
          </div>
        )}
      </div>

      {/* 创建时间 */}
      <div className="text-xs text-gray-500 mt-2 flex-shrink-0">
        {format(new Date(sku.createdAt), 'yyyy-MM-dd', { locale: zhCN })}
      </div>
    </Card>
  )
}

