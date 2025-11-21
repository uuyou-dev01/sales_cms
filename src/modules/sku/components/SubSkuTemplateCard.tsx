'use client'

import React from 'react'
import Image from 'next/image'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface TemplateStats {
  total?: number
  inStock?: number
  sold?: number
  inTransit?: number
}

export interface SubSkuTemplateLite {
  id: string
  itemName: string
  itemSize?: string | null
  itemCondition?: string | null
  variantLabel?: string | null
  itemColor?: string | null
  photos?: string[]
  recommendedPrice?: number | null
  recommendedPriceCurrency?: string | null
  itemRemarks?: string | null
  stats?: TemplateStats
  isActive?: boolean
}

interface Props {
  template: SubSkuTemplateLite
  onEdit?: () => void
  onToggleActive?: () => void
  disableActions?: boolean
}

export function SubSkuTemplateCard({ template, onEdit, onToggleActive, disableActions }: Props) {
  const stats = template.stats || {}
  const photo = template.photos?.[0]

  return (
    <Card className="p-4 rounded-xl border hover:bg-muted/30 transition-colors">
      <div className="flex gap-4">
        <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden border">
          {photo ? (
            <Image src={photo} alt={template.itemName} width={64} height={64} className="object-cover w-full h-full" />
          ) : (
            <span className="text-xs text-muted-foreground">无图</span>
          )}
        </div>
        <div className="flex-1 space-y-2 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-semibold truncate">{template.itemName}</h4>
            <Badge variant={template.isActive === false ? 'secondary' : 'default'}>
              {template.isActive === false ? '停用' : '启用'}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground space-x-1">
            <span>{template.itemSize || '均码'}</span>
            <span>·</span>
            <span>{template.itemCondition || '全新'}</span>
            {template.variantLabel && (
              <>
                <span>·</span>
                <span>{template.variantLabel}</span>
              </>
            )}
            {template.itemColor && (
              <>
                <span>·</span>
                <span>{template.itemColor}</span>
              </>
            )}
          </div>
          {template.itemRemarks && (
            <p className="text-xs text-muted-foreground line-clamp-2">{template.itemRemarks}</p>
          )}
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span>在库：{stats.inStock ?? 0}</span>
            <span>在途：{stats.inTransit ?? 0}</span>
            <span>已售：{stats.sold ?? 0}</span>
          </div>
          {template.recommendedPrice && (
            <div className="text-sm text-foreground">
              推荐售价：¥{Number(template.recommendedPrice).toLocaleString('zh-CN')}
              {template.recommendedPriceCurrency ? ` ${template.recommendedPriceCurrency}` : ''}
            </div>
          )}
        </div>
        {!disableActions && (
          <div className="flex flex-col gap-2">
            {onEdit && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                编辑
              </Button>
            )}
            {onToggleActive && (
              <Button variant="ghost" size="sm" onClick={onToggleActive}>
                {template.isActive === false ? '启用' : '停用'}
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}

export default SubSkuTemplateCard


