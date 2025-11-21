'use client'

import React from 'react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useQuery } from '@tanstack/react-query'
import type { TemplateListingSummary } from '../types'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'

type PlatformOption = {
  id: string
  name: string
  currency?: string | null
}

type TemplateItemCandidate = {
  itemId: string
  itemName: string
  itemSize?: string | null
  itemCondition?: string | null
  createdAt: string
  sku?: {
    id: string
    name: string
    brand?: string | null
  } | null
}

interface NewTemplateListingDialogProps {
  open: boolean
  template?: TemplateListingSummary | null
  onClose: () => void
  onSuccess?: () => void
}

async function fetchPlatforms(): Promise<PlatformOption[]> {
  const res = await fetch('/api/platforms')
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json?.error || '获取平台失败')
  }
  const items = json?.data?.items || json?.data || []
  return Array.isArray(items) ? items : []
}

async function fetchTemplateItems(templateId: string): Promise<TemplateItemCandidate[]> {
  const res = await fetch(`/api/listings/template-items?templateId=${templateId}`, { cache: 'no-store' })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json?.error || json?.message || '获取模板库存失败')
  }
  const items = json?.data?.items || json?.items || []
  return Array.isArray(items) ? items : []
}

export function NewTemplateListingDialog({ open, template, onClose, onSuccess }: NewTemplateListingDialogProps) {
  const { toast } = useToast()
  const [platformId, setPlatformId] = React.useState('')
  const [quantity, setQuantity] = React.useState(1)
  const [status, setStatus] = React.useState('LISTED')
  const [listingPrice, setListingPrice] = React.useState('')
  const [currency, setCurrency] = React.useState('JPY')
  const [loading, setLoading] = React.useState(false)

  const { data: platforms = [], isLoading: loadingPlatforms } = useQuery({
    queryKey: ['platforms'],
    queryFn: fetchPlatforms,
    enabled: open,
  })

  const { data: templateItems = [], isLoading: loadingTemplateItems, refetch: refetchTemplateItems } = useQuery({
    queryKey: ['template-items', template?.id],
    queryFn: () => fetchTemplateItems(template!.id),
    enabled: open && !!template?.id,
  })

  React.useEffect(() => {
    if (open && template) {
      setQuantity(Math.max(1, Math.min(template.stats?.available ?? 1, 50)))
      setListingPrice(
        template.recommendedPrice !== undefined && template.recommendedPrice !== null
          ? String(template.recommendedPrice)
          : ''
      )
      setCurrency(template.recommendedPriceCurrency || 'JPY')
      setPlatformId('')
      setStatus('LISTED')
      if (template?.id) {
        refetchTemplateItems()
      }
    }
  }, [open, template, refetchTemplateItems])

  const handleQuantityChange = (value: number) => {
    if (!template) return
    const maxAvailable = Math.max(0, template.stats.available ?? 0)
    const next = Math.min(Math.max(1, value), Math.max(1, maxAvailable))
    setQuantity(next)
  }

  const selectedItems = React.useMemo(() => {
    if (!templateItems || templateItems.length === 0) return []
    return templateItems.slice(0, Math.min(quantity, templateItems.length))
  }, [templateItems, quantity])

  const insufficientStock = quantity > selectedItems.length

  const handleSubmit = async () => {
    if (!template) return
    if (!platformId) {
      toast({ title: '请选择平台', variant: 'destructive' })
      return
    }
    if (!quantity || quantity <= 0) {
      toast({ title: '请输入有效的数量', variant: 'destructive' })
      return
    }
    if (insufficientStock) {
      toast({ title: '库存不足', description: '可用库存不足以创建对应数量的上架', variant: 'destructive' })
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceType: 'TEMPLATE',
          templateId: template.id,
          platformId,
          quantity,
          status,
          listingPrice: listingPrice ? Number(listingPrice) : undefined,
          listingCurrency: currency,
          itemIds: selectedItems.map((item) => item.itemId),
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(json?.error || json?.message || '创建上架失败')
      }
      toast({ title: `已创建 ${selectedItems.length} 条上架`, description: '系统已按FIFO分配对应实物库存' })
      onSuccess?.()
      onClose()
    } catch (error) {
      toast({
        title: '创建失败',
        description: error instanceof Error ? error.message : '请稍后重试',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !loading && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>模板上架 - {template?.itemName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>销售平台</Label>
            <Select value={platformId} onValueChange={setPlatformId} disabled={loadingPlatforms || loading}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder={loadingPlatforms ? '加载中...' : '选择平台'} />
              </SelectTrigger>
              <SelectContent>
                {platforms.map((platform) => (
                  <SelectItem key={platform.id} value={platform.id}>
                    {platform.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>上架数量</Label>
              <Input
                type="number"
                min={1}
                max={template ? Math.max(1, template.stats.available) : 999}
                value={quantity}
                onChange={(e) => handleQuantityChange(Number(e.target.value))}
                className="mt-2"
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground mt-1">可用库存：{template?.stats.available ?? 0}</p>
              {insufficientStock && (
                <p className="text-xs text-destructive mt-1">当前可用实物不足，请减少数量或稍后再试</p>
              )}
            </div>
            <div>
              <Label>状态</Label>
              <Select value={status} onValueChange={setStatus} disabled={loading}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="选择状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LISTED">已上架</SelectItem>
                  <SelectItem value="PENDING">待上架</SelectItem>
                  <SelectItem value="DRAFT">草稿</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>上架价格</Label>
              <Input
                type="number"
                min={0}
                value={listingPrice}
                onChange={(e) => setListingPrice(e.target.value)}
                className="mt-2"
                disabled={loading}
              />
            </div>
            <div>
              <Label>货币</Label>
              <Select value={currency} onValueChange={setCurrency} disabled={loading}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="选择货币" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="JPY">JPY</SelectItem>
                  <SelectItem value="CNY">CNY</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="border rounded-lg p-3 bg-muted/30">
            <div className="flex items-center justify-between text-sm">
              <div className="font-medium">即将上架的实物（FIFO）</div>
              {loadingTemplateItems && <span className="text-xs text-muted-foreground">加载中...</span>}
            </div>
            {templateItems.length === 0 && !loadingTemplateItems ? (
              <p className="text-sm text-muted-foreground mt-2">暂无可用库存，无法按模板上架。</p>
            ) : (
              <ScrollArea className="max-h-48 mt-2">
                <div className="space-y-2 pr-2">
                  {selectedItems.map((item, index) => (
                    <div key={item.itemId} className="rounded-md border px-3 py-2 bg-background flex flex-col gap-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">
                          {index + 1}. {item.itemName}
                        </span>
                        <Badge variant="secondary">{item.itemCondition || 'NEW'}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.itemSize || '均码'} · {item.sku?.name || '-'} · 入库{' '}
                        {new Date(item.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                  {selectedItems.length === 0 && (
                    <p className="text-xs text-muted-foreground">加载可用库存中...</p>
                  )}
                </div>
              </ScrollArea>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              系统将按照先进先出的顺序自动分配实物 Item，确保模板上架与真实库存一一对应。
            </p>
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !template || insufficientStock}>
            {loading ? '提交中...' : '创建上架'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

