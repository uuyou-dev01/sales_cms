'use client'

import React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'

const RELEASED_STATUSES = new Set(['ARCHIVED', 'CANCELLED', 'ENDED', 'INACTIVE'])

type BulkListingItem = {
  itemId: string
  itemName: string
  itemSize?: string | null
  itemCondition?: string | null
  sku?: {
    id: string
    name: string
    brand?: string | null
  } | null
  createdAt?: string
  listings?: Array<{ id: string; status: string }>
  purchaseCostCNY?: number | null
  shippingCostCNY?: number | null
  additionalCostCNY?: number | null
}

type PlatformOption = {
  id: string
  name: string
  baseFeeRate?: number | null
  shippingFee?: number | null
}

async function fetchAvailableItems(): Promise<BulkListingItem[]> {
  const res = await fetch('/api/sales/available-items?limit=120', { cache: 'no-store' })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json?.error || '获取可上架商品失败')
  }
  const items: BulkListingItem[] = json?.data || []
  return Array.isArray(items) ? items : []
}

async function fetchTemplateCandidates(templateId: string, limit = 120): Promise<BulkListingItem[]> {
  const res = await fetch(`/api/listings/template-items?templateId=${templateId}&limit=${limit}`, { cache: 'no-store' })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json?.error || '获取模板可用库存失败')
  }
  const data: BulkListingItem[] = json?.data?.items || []
  return Array.isArray(data) ? data : []
}

async function fetchPlatforms(): Promise<PlatformOption[]> {
  const res = await fetch('/api/platforms', { cache: 'no-store' })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json?.error || '获取平台失败')
  const list = json?.data?.items || json?.data || []
  return Array.isArray(list) ? list : []
}

interface BulkListingDialogProps {
  open: boolean
  mode: 'ITEM' | 'TEMPLATE'
  onClose: () => void
  onSuccess?: () => void
  templateId?: string
  templateName?: string
  preselectedItemIds?: string[]
}

export function BulkListingDialog({
  open,
  mode,
  onClose,
  onSuccess,
  templateId,
  templateName,
  preselectedItemIds = [],
}: BulkListingDialogProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [selected, setSelected] = React.useState<Record<string, boolean>>({})
  const [selectedPlatformIds, setSelectedPlatformIds] = React.useState<string[]>([])
  const [status, setStatus] = React.useState('LISTED')
  const [autoQuantity, setAutoQuantity] = React.useState(1)
  const [note, setNote] = React.useState('')
  const [loading, setLoading] = React.useState(false)

  const { data: platforms = [] } = useQuery<PlatformOption[]>({
    queryKey: ['platforms'],
    queryFn: fetchPlatforms,
    enabled: open,
  })

  const {
    data: rawItems = [],
    isLoading,
    refetch,
    error,
  } = useQuery<BulkListingItem[]>({
    queryKey: ['bulk-listing', mode, templateId],
    queryFn: () => (mode === 'TEMPLATE' ? fetchTemplateCandidates(templateId!) : fetchAvailableItems()),
    enabled: open && (mode === 'ITEM' || Boolean(templateId)),
  })

  const candidateItems = React.useMemo(() => {
    if (!rawItems) return []
    if (mode === 'ITEM') {
      return rawItems.filter(
        (item) =>
          !item.listings ||
          item.listings.every((listing) => RELEASED_STATUSES.has((listing.status || '').toUpperCase()))
      )
    }
    return rawItems
  }, [rawItems, mode])

  const resetState = React.useCallback(() => {
    setSelected({})
    setSelectedPlatformIds([])
    setStatus('LISTED')
    setAutoQuantity(1)
    setNote('')
    setLoading(false)
  }, [])

  React.useEffect(() => {
    if (!open) {
      resetState()
      return
    }
    if (preselectedItemIds.length > 0) {
      setSelected(
        preselectedItemIds.reduce<Record<string, boolean>>((acc, id) => {
          acc[id] = true
          return acc
        }, {})
      )
    } else {
      setSelected({})
    }
  }, [open, preselectedItemIds, resetState])

  const toggleItem = (itemId: string, value: boolean) => {
    setSelected((prev) => ({ ...prev, [itemId]: value }))
  }

  const togglePlatform = (platformId: string, checked: boolean) => {
    setSelectedPlatformIds((prev) => (checked ? Array.from(new Set([...prev, platformId])) : prev.filter((id) => id !== platformId)))
  }

  const selectedIds = React.useMemo(() => Object.entries(selected).filter(([, checked]) => checked).map(([id]) => id), [selected])
  const selectedCount = selectedIds.length

  const totalCostCNY = React.useMemo(() => {
    return candidateItems
      .filter((item) => selected[item.itemId])
      .reduce(
        (sum, item) =>
          sum +
          Number(item.purchaseCostCNY || 0) +
          Number(item.shippingCostCNY || 0) +
          Number(item.additionalCostCNY || 0),
        0
      )
  }, [candidateItems, selected])

  const recommendedPriceCNY = totalCostCNY > 0 ? totalCostCNY * 1.3 : 0
  const expectedProfitCNY = recommendedPriceCNY - totalCostCNY

  const handleAutoSelect = () => {
    if (candidateItems.length === 0) return
    const limit = Math.min(Math.max(1, autoQuantity), candidateItems.length)
    const nextSelection: Record<string, boolean> = {}
    candidateItems.slice(0, limit).forEach((item) => {
      nextSelection[item.itemId] = true
    })
    setSelected(nextSelection)
  }

  const handleSubmit = async () => {
    if (selectedIds.length === 0) {
      toast({ title: '请选择至少一个实物', variant: 'destructive' })
      return
    }
    if (selectedPlatformIds.length === 0) {
      toast({ title: '请选择至少一个平台', variant: 'destructive' })
      return
    }
    if (mode === 'TEMPLATE' && !templateId) {
      toast({ title: '未找到模板', description: '请重新选择模板后再试', variant: 'destructive' })
      return
    }

    setLoading(true)
    try {
      let successCount = 0
      const failures: Array<{ label: string; message: string }> = []

      if (mode === 'ITEM') {
        for (const itemId of selectedIds) {
          for (const platformId of selectedPlatformIds) {
            const res = await fetch('/api/listings', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sourceType: 'ITEM',
                itemId,
                platformId,
                status,
                note: note || undefined,
              }),
            })
            const json = await res.json().catch(() => ({}))
            if (res.ok) {
              successCount++
            } else {
              failures.push({ label: `${itemId} @ ${platformId}`, message: json?.error || json?.message || '未知错误' })
            }
          }
        }
      } else if (mode === 'TEMPLATE' && templateId) {
        for (const platformId of selectedPlatformIds) {
          const res = await fetch('/api/listings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sourceType: 'TEMPLATE',
              templateId,
              platformId,
              status,
              quantity: selectedIds.length,
              itemIds: selectedIds,
              note: note || undefined,
            }),
          })
          const json = await res.json().catch(() => ({}))
          if (res.ok) {
            successCount += selectedIds.length
          } else {
            failures.push({ label: `${templateName || templateId} @ ${platformId}`, message: json?.error || json?.message || '未知错误' })
          }
        }
      }

      if (successCount > 0) {
        toast({
          title: '上架创建成功',
          description: selectedPlatformIds.length > 1 ? `已同步 ${successCount} 条记录至多平台` : `已创建 ${successCount} 条记录`,
        })
        onSuccess?.()
        onClose()
        refetch()
        queryClient.invalidateQueries({ queryKey: ['available-items'] })
        queryClient.invalidateQueries({ queryKey: ['listings', 'templates'] })
        queryClient.invalidateQueries({ queryKey: ['listings', 'items'] })
        queryClient.invalidateQueries({ queryKey: ['listings', 'listed'] })
      }

      if (failures.length > 0) {
        const sample = failures.slice(0, 3).map((f) => `${f.label}: ${f.message}`).join('；')
        toast({
          title: successCount === 0 ? '上架创建失败' : '部分上架失败',
          description: failures.length > 3 ? `${sample} 等 ${failures.length} 条失败` : sample,
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: '上架创建失败',
        description: error instanceof Error ? error.message : '请稍后再试',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const canSubmit = selectedIds.length > 0 && selectedPlatformIds.length > 0 && !(mode === 'TEMPLATE' && !templateId)

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !loading && onClose()}>
      <DialogContent className="sm:max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {mode === 'TEMPLATE' ? `模板批量上架 · ${templateName || ''}` : '多平台批量上架'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 overflow-hidden">
          <div className="flex flex-col space-y-4 h-full overflow-y-auto pr-1">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>1. 选择实物（已选 {selectedCount}）</Label>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Input
                    type="number"
                    min={1}
                    value={autoQuantity}
                    onChange={(e) => setAutoQuantity(Number(e.target.value) || 1)}
                    className="h-8 w-20"
                  />
                  <Button type="button" size="sm" variant="outline" onClick={handleAutoSelect} disabled={candidateItems.length === 0}>
                    FIFO 自动勾选
                  </Button>
                </div>
              </div>
              <div className="border rounded-lg h-56">
                <ScrollArea className="h-full p-2">
                  <div className="space-y-2">
                    {isLoading && <div className="text-sm text-muted-foreground">加载可用库存...</div>}
                    {!isLoading && error && (
                      <div className="text-sm text-destructive">{error instanceof Error ? error.message : '加载失败'}</div>
                    )}
                    {!isLoading && candidateItems.length === 0 && !error && (
                      <div className="text-sm text-muted-foreground">暂无可用库存</div>
                    )}
                    {!isLoading &&
                      candidateItems.map((item) => {
                        const cost = Number(item.purchaseCostCNY || 0) + Number(item.shippingCostCNY || 0) + Number(item.additionalCostCNY || 0)
                        return (
                          <div key={item.itemId} className="flex items-center gap-3 rounded border px-3 py-2 text-sm">
                            <Checkbox checked={!!selected[item.itemId]} onCheckedChange={(checked) => toggleItem(item.itemId, Boolean(checked))} />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{item.itemName}</div>
                              <div className="text-xs text-muted-foreground flex flex-wrap gap-2">
                                <span>{item.itemCondition || 'NEW'}</span>
                                {item.sku?.name && <span>{item.sku?.name}</span>}
                                <span className="text-orange-600">成本 ¥{cost.toFixed(0)}</span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </ScrollArea>
              </div>
            </div>

            <div className="space-y-2">
              <Label>2. 选择平台（已选 {selectedPlatformIds.length}）</Label>
              <div className="border rounded-lg p-3 max-h-40 overflow-y-auto">
                {platforms.length === 0 && <div className="text-xs text-muted-foreground">暂无可用平台，请先维护平台信息</div>}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {platforms.map((platform) => (
                    <label key={platform.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={selectedPlatformIds.includes(platform.id)}
                        onCheckedChange={(checked) => togglePlatform(platform.id, Boolean(checked))}
                      />
                      <span>
                        {platform.name}
                        {platform.baseFeeRate !== undefined && platform.baseFeeRate !== null && (
                          <span className="text-xs text-muted-foreground"> · {(platform.baseFeeRate * 100).toFixed(1)}%</span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>状态</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LISTED">直接上架</SelectItem>
                    <SelectItem value="DRAFT">草稿</SelectItem>
                    <SelectItem value="PENDING">待上架</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>备注（可选）</Label>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="记录平台要求、补充信息" className="mt-2 h-24" />
              </div>
            </div>
          </div>

          <div className="flex flex-col h-full bg-muted/30 rounded-lg p-4 border">
            <Card className="shadow-sm mb-4">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">选中实物</span>
                  <Badge variant="secondary">{selectedCount} 件</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">总成本（CNY）</span>
                  <span className="text-lg font-semibold">¥{totalCostCNY.toFixed(0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">推荐售价（成本×1.3）</span>
                  <span className="text-lg font-semibold text-primary">¥{recommendedPriceCNY.toFixed(0)}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  默认建议利润率 30%，如需更细定价请在平台端操作。
                </div>
              </CardContent>
            </Card>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>· 上架阶段仅同步真实库存，不再记录平台价格。</p>
              <p>· 模板上架会使用所选实物 FIFO 占用库存，并在售出后按平台回传利润。</p>
              <p>· 如某平台提交失败，不影响其它平台，可在 Toast 中查看原因。</p>
            </div>
            <div className="mt-auto pt-4">
              <Button className="w-full" disabled={!canSubmit || loading || isLoading || (mode === 'TEMPLATE' && !templateId)} onClick={handleSubmit}>
                {loading ? '提交中...' : `确认创建（${selectedPlatformIds.length * selectedCount} 条）`}
              </Button>
              <Button variant="ghost" className="w-full mt-2" disabled={loading} onClick={onClose}>
                取消
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="hidden" />
      </DialogContent>
    </Dialog>
  )
}
