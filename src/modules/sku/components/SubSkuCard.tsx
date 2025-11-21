'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Package } from 'lucide-react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'

type TxDetailLite = { transaction?: { soldDate?: string | Date | null }, unitPrice?: number | string }

type SubSkuStats = {
  total?: number
  inStock?: number
  sold?: number
  inTransit?: number
}

export interface SubSkuItemLite {
  itemId: string
  itemName: string
  itemNumber?: string
  itemSize?: string
  itemCondition?: string
  photos?: string[]
  toyCharacterName?: string | null
  itemColor?: string | null
  itemRemarks?: string | null
  transactionDetails?: TxDetailLite[]
  representativeItemId?: string
  stats?: SubSkuStats
  status?: string
}

export function SubSkuCard({ item, onOpenDetail, editMode, onUpload }: {
  item: SubSkuItemLite
  onOpenDetail: () => void
  editMode?: boolean
  onUpload?: (files: FileList) => void
}) {
  const inventoryStats = item.stats || {}
  const inStockCount = inventoryStats.inStock ?? (item.status === 'IN_STOCK' ? 1 : 0)
  const soldCount = inventoryStats.sold ?? (item.status === 'SOLD' ? 1 : 0)
  const hasInventory = (inStockCount ?? 0) > 0
  const sold = !hasInventory && (soldCount ?? 0) > 0
  const firstPhoto = item.photos?.[0]
  const recentSales = (item.transactionDetails || [])
    .filter((d) => d.transaction?.soldDate)
    .slice(0, 3)

  return (
    <Card className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50">
      {firstPhoto ? (
        <img 
          src={firstPhoto} 
          alt={item.itemName}
          className="w-10 h-10 object-cover rounded border flex-shrink-0"
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.src = `https://via.placeholder.com/40x40/cccccc/999999?text=${encodeURIComponent(item.itemName.substring(0, 2) || 'Item')}`
          }}
        />
      ) : (
        <div className="w-10 h-10 bg-gray-100 rounded border flex items-center justify-center flex-shrink-0">
          <Package className="h-4 w-4 text-gray-400" />
        </div>
      )}
        <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <p className="font-medium truncate">{item.itemName}</p>
            <Badge variant={hasInventory ? 'default' : 'secondary'} className="text-[10px]">
              {hasInventory ? '在库' : '缺货'}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {editMode && (
              <>
                <input type="file" multiple accept="image/*" className="hidden" id={`upload-${item.itemId}`} onChange={(e) => e.target.files && onUpload?.(e.target.files)} />
                <Button variant="outline" size="sm" onClick={(e) => {
                  e.stopPropagation();
                  document.getElementById(`upload-${item.itemId}`)?.click()
                }}>上传图片</Button>
              </>
            )}
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onOpenDetail(); }}>详情</Button>
          </div>
        </div>
        <div className="text-xs text-gray-500 mt-1 space-y-1">
          <div className="truncate">
            {item.toyCharacterName ? <span>{item.toyCharacterName} · </span> : null}
            <span>{item.itemSize || '均码'}</span>
            <span className="mx-1">·</span>
            <span>{item.itemCondition || '全新'}</span>
            {item.itemColor ? <span className="ml-1 text-gray-400">({item.itemColor})</span> : null}
          </div>
          {item.itemNumber && (
            <div className="truncate text-gray-400">编号：{item.itemNumber}</div>
          )}
        </div>
        {item.itemRemarks && (
          <div className="mt-2 text-[11px] text-gray-500 line-clamp-2">
            {item.itemRemarks}
          </div>
        )}
        <div className="mt-2 text-[11px] text-gray-500 flex flex-wrap gap-3">
          <span>在库：{inStockCount ?? 0}</span>
          <span>已售：{soldCount ?? 0}</span>
          {typeof inventoryStats.inTransit === 'number' && (
            <span>在途：{inventoryStats.inTransit}</span>
          )}
        </div>
        {recentSales.length > 0 && (
          <div className="mt-2 text-[11px] text-gray-600 space-y-1">
            {recentSales.map((d, idx) => (
              <div key={idx} className="truncate">
                {d.transaction?.soldDate ? format(new Date(d.transaction.soldDate), 'yyyy-MM-dd', { locale: zhCN }) : ''}
                {d.unitPrice ? ` ¥${Number(d.unitPrice).toLocaleString('zh-CN')}` : ''}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}

export default SubSkuCard


