'use client'

import React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { ItemListingView, ListingFilterValues } from '../types'

interface ListedItemsPanelProps {
  filters: ListingFilterValues
}

export function ListedItemsPanel({ filters }: ListedItemsPanelProps) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [detailListing, setDetailListing] = React.useState<ItemListingView | null>(null)
  const [sellListing, setSellListing] = React.useState<ItemListingView | null>(null)
  
  // Bulk Selection State
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [isBatchProcessing, setIsBatchProcessing] = React.useState(false)
  const [batchEditOpen, setBatchEditOpen] = React.useState(false)
  const [batchPriceMode, setBatchPriceMode] = React.useState<'FIXED' | 'ADJUST_FIXED' | 'ADJUST_PERCENT'>('FIXED')
  const [batchPriceValue, setBatchPriceValue] = React.useState('')

  const queryString = React.useMemo(() => {
    const params = new URLSearchParams()
    params.set('mode', 'item')
    if (filters.platformId) params.set('platformId', filters.platformId)
    if (filters.q) params.set('q', filters.q)
    if (filters.skuId) params.set('skuId', filters.skuId)
    return params.toString()
  }, [filters.platformId, filters.q, filters.skuId])

  const { data, isLoading, error, refetch } = useQuery<{ items: ItemListingView[] }>({
    queryKey: ['listings', 'listed', queryString],
    queryFn: async () => {
      const res = await fetch(`/api/listings?${queryString}`, { cache: 'no-store' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || '获取已上架列表失败')
      return json?.data || json
    },
    keepPreviousData: true,
  })

  const listings = data?.items ?? []

  // Selection Handlers
  const toggleSelection = (id: string, checked: boolean) => {
    const next = new Set(selectedIds)
    if (checked) next.add(id)
    else next.delete(id)
    setSelectedIds(next)
  }

  const toggleAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(listings.map(l => l.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  // Batch Actions
  const handleBatchAction = async (action: 'UPDATE_PRICE' | 'DELIST' | 'RELIST', data?: any) => {
    if (selectedIds.size === 0) return
    if (!confirm(`确认对选中的 ${selectedIds.size} 个记录执行操作吗？`)) return

    setIsBatchProcessing(true)
    try {
      const res = await fetch('/api/listings/batch', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          action,
          data
        })
      })
      
      if (!res.ok) throw new Error('批量操作失败')
      const result = await res.json()
      
      toast({ title: '操作成功', description: `已更新 ${result.updatedCount || 0} 条记录` })
      setSelectedIds(new Set())
      setBatchEditOpen(false)
      queryClient.invalidateQueries({ queryKey: ['listings', 'listed'] })
      queryClient.invalidateQueries({ queryKey: ['available-items'] })
      refetch()
    } catch (error) {
      toast({ title: '操作失败', variant: 'destructive' })
    } finally {
      setIsBatchProcessing(false)
    }
  }

  // Existing Handlers
  const handleSell = (listing: ItemListingView) => {
    const itemId = listing.item?.itemId
    if (!itemId) {
      toast({ title: '无法售出该上架', description: '缺少对应的 Item 信息', variant: 'destructive' })
      return
    }
    setSellListing(listing)
  }

  const handleSaleSuccess = () => {
    toast({ title: '售出已记录', description: '该商品已移出“已上架”列表' })
    setDetailListing(null)
    setSellListing(null)
      queryClient.invalidateQueries({ queryKey: ['listings', 'listed'] })
      queryClient.invalidateQueries({ queryKey: ['available-items'] })
      queryClient.invalidateQueries({ queryKey: ['inventory', 'items'] })
    refetch()
  }

  const handleEndListing = async (listing: ItemListingView) => {
    if (!confirm('确认结束该上架记录吗？')) return
    try {
      const res = await fetch(`/api/listings/${listing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ENDED' }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json?.error || '结束上架失败')
      }
      toast({ title: '已结束上架', description: '列表已更新' })
      queryClient.invalidateQueries({ queryKey: ['listings', 'listed'] })
      queryClient.invalidateQueries({ queryKey: ['available-items'] })
      refetch()
    } catch (err) {
      toast({
        title: '操作失败',
        description: err instanceof Error ? err.message : '请稍后再试',
        variant: 'destructive',
      })
    }
  }

  const renderStatusBadge = (listing: ItemListingView) => {
    if (listing.status === 'LISTED') {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          已上架
        </Badge>
      )
    }
    return <Badge variant="outline">{listing.status}</Badge>
  }

  return (
    <Card className="border shadow-sm">
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-xl">已上架商品</CardTitle>
          <CardDescription>查看当前处于上架状态的商品，可直接在此售出或下架。</CardDescription>
        </div>
        <div className="flex gap-2 items-center">
          {selectedIds.size > 0 && (
            <div className="flex gap-2 mr-4 animate-in fade-in slide-in-from-right-4">
              <Badge variant="secondary" className="h-9 px-3 text-sm font-normal">
                已选 {selectedIds.size} 项
              </Badge>
              <Button size="sm" variant="outline" onClick={() => setBatchEditOpen(true)} disabled={isBatchProcessing}>
                批量改价
              </Button>
              <Button size="sm" variant="destructive" onClick={() => handleBatchAction('DELIST')} disabled={isBatchProcessing}>
                批量下架
              </Button>
            </div>
          )}
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
            刷新
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}
        {!isLoading && error && (
          <div className="text-sm text-destructive">
            {error instanceof Error ? error.message : '加载失败'}
          </div>
        )}
        {!isLoading && !error && (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox 
                      checked={listings.length > 0 && selectedIds.size === listings.length}
                      onCheckedChange={(c) => toggleAll(!!c)}
                    />
                  </TableHead>
                  <TableHead>商品</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>平台</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>上架时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listings.map((listing) => {
                  const displayName = listing.item?.itemName || listing.template?.itemName || '未命名'
                  const displaySize =
                    listing.item?.itemSize || listing.template?.itemSize || listing.template?.variantLabel || '-'
                  const displayCondition = listing.item?.itemCondition || listing.template?.itemCondition || '-'
                  const displaySku = listing.item?.sku?.name || listing.template?.sku?.name || '-'
                  const displayBrand = listing.item?.sku?.brand || listing.template?.sku?.brand || ''
                  return (
                    <TableRow
                      key={listing.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setDetailListing(listing)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox 
                          checked={selectedIds.has(listing.id)}
                          onCheckedChange={(c) => toggleSelection(listing.id, !!c)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{displayName}</div>
                        <div className="text-xs text-muted-foreground">
                          {displaySize} · {displayCondition}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{displaySku}</div>
                        <div className="text-xs text-muted-foreground">{displayBrand}</div>
                      </TableCell>
                    <TableCell>
                      <Badge variant="outline">{listing.platform.name}</Badge>
                    </TableCell>
                    <TableCell>{renderStatusBadge(listing)}</TableCell>
                    <TableCell>
                      {listing.updatedAt ? format(new Date(listing.updatedAt), 'yyyy-MM-dd HH:mm') : '—'}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSell(listing)
                        }}
                      >
                        售出
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEndListing(listing)
                        }}
                      >
                        下架
                      </Button>
                    </TableCell>
                  </TableRow>
                  )
                })}
                {listings.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      暂无已上架商品
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </>
        )}
      </CardContent>

      <Sheet open={!!detailListing} onOpenChange={(open) => !open && setDetailListing(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>上架详情</SheetTitle>
            <SheetDescription>查看商品信息、平台配置，并可直接售出或下架。</SheetDescription>
          </SheetHeader>
          {detailListing && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">商品信息</div>
                <div className="text-lg font-semibold">
                  {detailListing.item?.itemName || detailListing.template?.itemName || '未命名'}
                </div>
                <div className="text-sm text-muted-foreground">
                  {(detailListing.item?.itemSize ||
                    detailListing.template?.itemSize ||
                    detailListing.template?.variantLabel ||
                    '-')}{' '}
                  · {detailListing.item?.itemCondition || detailListing.template?.itemCondition || '-'}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">平台</div>
                  <div className="font-medium">{detailListing.platform.name}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">状态</div>
                  {renderStatusBadge(detailListing)}
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">价格</div>
                  <div className="font-medium">
                    {detailListing.listingPrice
                      ? `${detailListing.listingPrice} ${detailListing.listingCurrency || ''}`
                      : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">上架时间</div>
                  <div className="font-medium">
                    {detailListing.updatedAt ? format(new Date(detailListing.updatedAt), 'yyyy-MM-dd HH:mm') : '—'}
                  </div>
                </div>
              </div>
              <Separator />
              <div className="flex gap-2">
                <Button onClick={() => handleSell(detailListing)} className="flex-1">
                  售出
                </Button>
                <Button variant="outline" onClick={() => handleEndListing(detailListing)} className="flex-1">
                  下架
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <QuickSellDialog open={!!sellListing} listing={sellListing} onClose={() => setSellListing(null)} onSuccess={handleSaleSuccess} />

      <Dialog open={batchEditOpen} onOpenChange={setBatchEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>批量修改价格</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">模式</Label>
              <Select value={batchPriceMode} onValueChange={(v: any) => setBatchPriceMode(v)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FIXED">统一设定为</SelectItem>
                  <SelectItem value="ADJUST_FIXED">固定金额调整 (+/-)</SelectItem>
                  <SelectItem value="ADJUST_PERCENT">百分比调整 (+/- %)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">数值</Label>
              <Input
                type="number"
                className="col-span-3"
                value={batchPriceValue}
                onChange={(e) => setBatchPriceValue(e.target.value)}
                placeholder={batchPriceMode === 'FIXED' ? '例如: 1000' : '例如: 100 或 -100'}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchEditOpen(false)}>取消</Button>
            <Button onClick={() => handleBatchAction('UPDATE_PRICE', { mode: batchPriceMode, value: batchPriceValue })} disabled={isBatchProcessing}>
              确认修改
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

interface QuickSellDialogProps {
  open: boolean
  listing: ItemListingView | null
  onClose: () => void
  onSuccess: () => void
}

function QuickSellDialog({ open, listing, onClose, onSuccess }: QuickSellDialogProps) {
  const { toast } = useToast()
  const [salePrice, setSalePrice] = React.useState('')
  const [shippingCost, setShippingCost] = React.useState('')
  const [feeRate, setFeeRate] = React.useState(0.05)
  const [exchangeRate, setExchangeRate] = React.useState(0.05)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (listing) {
      setSalePrice(listing.listingPrice ? String(listing.listingPrice) : '')
      setShippingCost('')
      setFeeRate(
        listing.platform?.baseFeeRate !== undefined && listing.platform?.baseFeeRate !== null
          ? Number(listing.platform.baseFeeRate)
          : 0.05
      )
      setExchangeRate(listing.listingCurrency === 'CNY' ? 1 : 0.05)
    } else {
      setSalePrice('')
      setShippingCost('')
      setFeeRate(0.05)
      setExchangeRate(0.05)
    }
  }, [listing])

  const currency = listing?.listingCurrency || 'JPY'
  const saleValue = Number(salePrice) || 0
  const feeAmount = saleValue * feeRate
  const shippingAmount = Number(shippingCost) || 0
  const purchaseCostCNY =
    Number(listing?.item?.purchaseCostCNY ?? listing?.item?.purchaseCost ?? 0)
  const shippingCostCNY =
    Number(listing?.item?.shippingCostCNY ?? listing?.item?.shippingCost ?? 0)
  const additionalCostCNY =
    Number(listing?.item?.additionalCostCNY ?? listing?.item?.additionalCost ?? 0)
  const costCNY = purchaseCostCNY + shippingCostCNY + additionalCostCNY
  const costInCurrency = exchangeRate > 0 ? costCNY / exchangeRate : costCNY
  const profit = saleValue - feeAmount - shippingAmount - costInCurrency
  const costSnapshot = [
    { label: '购入成本', value: purchaseCostCNY },
    { label: '物流成本', value: shippingCostCNY },
    { label: '附加成本', value: additionalCostCNY },
  ].filter((row) => row.value && row.value !== 0)

  const handleSubmit = async () => {
    if (!listing?.item?.itemId) {
      toast({ title: '无法售出', description: '缺少关联库存信息', variant: 'destructive' })
      return
    }
    if (!salePrice) {
      toast({ title: '请填写销售价格', variant: 'destructive' })
      return
    }
    if (!exchangeRate || exchangeRate <= 0) {
      toast({ title: '请填写有效汇率', variant: 'destructive' })
      return
    }
    setIsSubmitting(true)
    try {
      const rate = Number(exchangeRate) || 1
      const shippingCNY = currency === 'CNY' ? shippingAmount : shippingAmount * rate
      const res = await fetch('/api/sales/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ itemId: listing.item.itemId, manualPrice: Number(salePrice) }],
          totalSoldPrice: Number(salePrice),
          soldPriceCurrency: currency,
          soldPriceExchangeRate: rate,
          platformId: listing.platform.id,
          soldPlatform: listing.platform.name,
          soldDate: new Date().toISOString(),
          domesticShipping: shippingCNY,
          priceAllocationMethod: 'MANUAL',
          platformFeeRateOverride: feeRate,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(json?.error || '记录售出失败')
      }
      toast({ title: '售出成功', description: '已生成销售记录' })
      onSuccess()
      onClose()
    } catch (error) {
      toast({
        title: '售出记录失败',
        description: error instanceof Error ? error.message : '请稍后再试',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !isSubmitting && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>快速售出</DialogTitle>
        </DialogHeader>
        {listing && (
          <div className="space-y-4">
            <div className="rounded-lg border p-3 bg-muted/30 text-sm">
              <div className="font-medium">{listing.item?.itemName || '未命名'}</div>
              <div className="text-xs text-muted-foreground">
                平台：{listing.platform.name} · 状态：{listing.status}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>销售价格</Label>
                <Input
                  type="number"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  placeholder="例如：4880"
                  className="mt-2"
                />
              </div>
              <div>
                <Label>币种</Label>
                <Select value={currency} onValueChange={() => {}}>
                  <SelectTrigger className="mt-2" disabled>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={currency}>{currency}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>平台费率 (%)</Label>
                <Input
                  type="number"
                  value={(feeRate * 100).toString()}
                  onChange={(e) => setFeeRate(Number(e.target.value) / 100)}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>运费</Label>
                <Input
                  type="number"
                  value={shippingCost}
                  onChange={(e) => setShippingCost(e.target.value)}
                  placeholder="0"
                  className="mt-2"
                />
              </div>
              <div>
                <Label>汇率 (1 {currency} = ? CNY)</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={exchangeRate.toString()}
                  onChange={(e) => setExchangeRate(Number(e.target.value))}
                  className="mt-2"
                />
              </div>
            </div>
            <div className="space-y-3">
              <div className="rounded-lg border bg-background p-3 text-xs space-y-1">
                <div className="flex justify-between font-semibold text-sm">
                  <span>成本拆分（CNY）</span>
                  <span>¥{costCNY.toFixed(2)}</span>
                </div>
                {costSnapshot.length === 0 && (
                  <div className="text-muted-foreground">暂无成本记录</div>
                )}
                {costSnapshot.map((row) => (
                  <div key={row.label} className="flex justify-between">
                    <span>{row.label}</span>
                    <span>¥{row.value.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="rounded-lg border bg-muted/40 p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span>平台费用</span>
                  <span>-{feeAmount.toFixed(2)} {currency}</span>
                </div>
                <div className="flex justify-between">
                  <span>运费</span>
                  <span>-{shippingAmount.toFixed(2)} {currency}</span>
                </div>
                <div className="flex justify-between">
                  <span>成本 (折算)</span>
                  <span>-{costInCurrency.toFixed(2)} {currency}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between font-semibold">
                  <span>预估利润</span>
                  <span className={profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {profit.toFixed(2)} {currency}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !listing}>
            {isSubmitting ? '保存中...' : '确认售出'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
