'use client'

import React from 'react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { useQuery } from '@tanstack/react-query'

type AvailableItem = {
  itemId: string
  itemName: string
  itemSize?: string | null
  itemCondition?: string | null
  skuId?: string | null
  sku?: {
    id: string
    name: string
  } | null
  listings?: Array<{ id: string }>
}

type PlatformOption = {
  id: string
  name: string
}

async function fetchAvailableItems(): Promise<AvailableItem[]> {
  const res = await fetch('/api/sales/available-items?limit=50', { cache: 'no-store' })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json?.error || '获取可售 Item 失败')
  }
  const items: AvailableItem[] = json?.data || json || []
  return Array.isArray(items) ? items : []
}

async function fetchPlatforms(): Promise<PlatformOption[]> {
  const res = await fetch('/api/platforms')
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json?.error || '获取平台失败')
  const items = json?.data?.items || json?.data || []
  return Array.isArray(items) ? items : []
}

interface NewItemListingDialogProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function NewItemListingDialog({ open, onClose, onSuccess }: NewItemListingDialogProps) {
  const { toast } = useToast()
  const [platformId, setPlatformId] = React.useState('')
  const [status, setStatus] = React.useState('LISTED')
  const [selected, setSelected] = React.useState<Record<string, boolean>>({})
  const [price, setPrice] = React.useState('')
  const [currency, setCurrency] = React.useState('JPY')
  const [loading, setLoading] = React.useState(false)

  const { data: platforms = [] } = useQuery<PlatformOption[]>({
    queryKey: ['platforms'],
    queryFn: fetchPlatforms,
    enabled: open,
  })

  const { data: items = [], isLoading, refetch } = useQuery({
    queryKey: ['listings', 'item-candidates'],
    queryFn: fetchAvailableItems,
    enabled: open,
  })

  const candidateItems = React.useMemo(
    () => items.filter((item) => !item.listings || item.listings.length === 0),
    [items]
  )

  React.useEffect(() => {
    if (!open) {
      setSelected({})
      setPlatformId('')
      setStatus('LISTED')
      setPrice('')
      setCurrency('JPY')
    }
  }, [open])

  const toggleItem = (itemId: string, value: boolean) => {
    setSelected((prev) => ({
      ...prev,
      [itemId]: value,
    }))
  }

  const handleSubmit = async () => {
    const itemIds = Object.entries(selected)
      .filter(([, checked]) => checked)
      .map(([itemId]) => itemId)

    if (itemIds.length === 0) {
      toast({ title: '请选择至少一个 Item', variant: 'destructive' })
      return
    }
    if (!platformId) {
      toast({ title: '请选择平台', variant: 'destructive' })
      return
    }

    setLoading(true)
    try {
      for (const itemId of itemIds) {
        const res = await fetch('/api/listings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourceType: 'ITEM',
            itemId,
            platformId,
            status,
            listingPrice: price ? Number(price) : undefined,
            listingCurrency: currency,
          }),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(json?.error || json?.message || '创建上架失败')
        }
      }

      toast({ title: `成功创建 ${itemIds.length} 个上架记录` })
      onSuccess?.()
      onClose()
      refetch()
    } catch (error) {
      toast({
        title: '上架失败',
        description: error instanceof Error ? error.message : '请稍后再试',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !loading && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>单件上架</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>销售平台</Label>
              <Select value={platformId} onValueChange={setPlatformId} disabled={loading}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="选择平台" />
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
            <div>
              <Label>上架价格</Label>
              <Input
                type="number"
                min={0}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="mt-2"
                disabled={loading}
              />
              <div className="mt-2">
                <Select value={currency} onValueChange={setCurrency} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue placeholder="货币" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="JPY">JPY</SelectItem>
                    <SelectItem value="CNY">CNY</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="border rounded-lg p-4 space-y-3 max-h-96 overflow-auto">
            <div className="text-sm text-muted-foreground">
              仅展示前 50 个尚未上架的在库 Item，可通过 SKU 详情页查看更多
            </div>
            {isLoading && <div className="text-sm text-muted-foreground">加载可选 Item...</div>}
            {!isLoading && candidateItems.length === 0 && (
              <div className="text-sm text-muted-foreground">暂无可上架的 Item</div>
            )}
            {!isLoading &&
              candidateItems.map((item) => (
                <div key={item.itemId} className="flex items-center gap-3 rounded border p-2">
                  <Checkbox
                    checked={!!selected[item.itemId]}
                    onCheckedChange={(checked) => toggleItem(item.itemId, Boolean(checked))}
                    disabled={loading}
                  />
                  <div className="flex-1">
                    <div className="font-medium text-sm">{item.itemName}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.itemSize || '均码'} · {item.itemCondition || 'NEW'}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">{item.sku?.name || '-'}</div>
                </div>
              ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? '提交中...' : '创建上架'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

