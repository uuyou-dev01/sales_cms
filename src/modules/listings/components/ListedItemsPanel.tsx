'use client'

import React from 'react'
import dynamic from 'next/dynamic'
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
import type { ItemListingView, ListingFilterValues } from '../types'

const CreateSaleDialog = dynamic(
  () => import('@/src/modules/sales/components/CreateSaleDialog').then((m) => m.CreateSaleDialog),
  { ssr: false }
)

interface ListedItemsPanelProps {
  filters: ListingFilterValues
}

export function ListedItemsPanel({ filters }: ListedItemsPanelProps) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [detailListing, setDetailListing] = React.useState<ItemListingView | null>(null)
  const [saleContext, setSaleContext] = React.useState<{
    itemId: string
    platformId?: string
    platformName?: string
  } | null>(null)
  const [saleDialogOpen, setSaleDialogOpen] = React.useState(false)

  const queryString = React.useMemo(() => {
    const params = new URLSearchParams()
    params.set('mode', 'item')
    // 不限制 sourceType，显示所有已上架的商品（包括模板上架和单件上架）
    // 只过滤掉已结束的状态
    if (filters.platformId) params.set('platformId', filters.platformId)
    if (filters.q) params.set('q', filters.q)
    if (filters.skuId) params.set('skuId', filters.skuId)
    // 不传 status，让后端返回所有非结束状态的上架
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

  const handleSell = (listing: ItemListingView) => {
    const itemId = listing.item?.itemId
    if (!itemId) {
      toast({ title: '无法售出该上架', description: '缺少对应的 Item 信息', variant: 'destructive' })
      return
    }
    setSaleContext({
      itemId,
      platformId: listing.platform.id,
      platformName: listing.platform.name,
    })
    setSaleDialogOpen(true)
  }

  const handleSaleSuccess = () => {
    toast({ title: '售出已记录', description: '该商品已移出“已上架”列表' })
    setSaleDialogOpen(false)
    setSaleContext(null)
    setDetailListing(null)
    queryClient.invalidateQueries({ queryKey: ['listings', 'listed'] })
    queryClient.invalidateQueries({ queryKey: ['listings', 'items'] })
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
      queryClient.invalidateQueries({ queryKey: ['listings', 'items'] })
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
        <div className="flex gap-2">
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
                  <TableHead>商品</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>平台</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>价格</TableHead>
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
                      {listing.listingPrice ? `${listing.listingPrice} ${listing.listingCurrency || ''}` : '—'}
                    </TableCell>
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

      {saleContext?.itemId && (
        <CreateSaleDialog
          open={saleDialogOpen}
          onClose={() => {
            setSaleDialogOpen(false)
            setSaleContext(null)
          }}
          onSuccess={handleSaleSuccess}
          initialItemId={saleContext.itemId}
          initialPlatformId={saleContext.platformId}
          initialPlatformName={saleContext.platformName}
          navigationMode="list"
        />
      )}
    </Card>
  )
}


