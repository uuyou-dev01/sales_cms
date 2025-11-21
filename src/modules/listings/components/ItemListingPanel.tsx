'use client'

import React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { NewItemListingDialog } from './NewItemListingDialog'
import type { ItemListingView, ListingFilterValues } from '../types'
import { Checkbox } from '@/components/ui/checkbox'

interface ItemListingPanelProps {
  filters: ListingFilterValues
}

export function ItemListingPanel({ filters }: ItemListingPanelProps) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const queryString = React.useMemo(() => {
    const params = new URLSearchParams()
    params.set('mode', 'item')
    if (filters.platformId) params.set('platformId', filters.platformId)
    if (filters.status) params.set('status', filters.status)
    if (filters.sourceType) params.set('sourceType', filters.sourceType)
    if (filters.q) params.set('q', filters.q)
    if (filters.skuId) params.set('skuId', filters.skuId)
    return params.toString()
  }, [filters.platformId, filters.status, filters.sourceType, filters.q, filters.skuId])

  const { data, isLoading, error } = useQuery<{ items: ItemListingView[] }>({
    queryKey: ['listings', 'items', queryString],
    queryFn: async () => {
      const res = await fetch(`/api/listings?${queryString}`, { cache: 'no-store' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || '获取上架列表失败')
      return json?.data || json
    },
    keepPreviousData: true,
  })

  const items = data?.items ?? []
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [selected, setSelected] = React.useState<Record<string, boolean>>({})
  const selectedIds = items.filter((item) => selected[item.id])

  const handleDelete = async (ids: string[]) => {
    if (ids.length === 0) return
    if (!confirm(`确定要删除 ${ids.length} 条上架记录吗？`)) return
    try {
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/listings/${id}`, {
            method: 'DELETE',
          })
        )
      )
      toast({ title: `删除成功 ${ids.length} 条` })
      setSelected({})
      queryClient.invalidateQueries({ queryKey: ['listings', 'items'] })
      queryClient.invalidateQueries({ queryKey: ['listings', 'templates'] })
    } catch (err) {
      toast({
        title: '删除失败',
        description: err instanceof Error ? err.message : '请稍后重试',
        variant: 'destructive',
      })
    }
  }

  const handleBulkArchive = async () => {
    if (selectedIds.length === 0) return
    try {
      await Promise.all(
        selectedIds.map((listing) =>
          fetch(`/api/listings/${listing.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'ARCHIVED' }),
          })
        )
      )
      toast({ title: '批量更新成功' })
      setSelected({})
      queryClient.invalidateQueries({ queryKey: ['listings', 'items'] })
      queryClient.invalidateQueries({ queryKey: ['listings', 'templates'] })
    } catch (error) {
      toast({
        title: '批量更新失败',
        description: error instanceof Error ? error.message : '请稍后重试',
        variant: 'destructive',
      })
    }
  }

  const toggleSelection = (id: string, value: boolean) => {
    setSelected((prev) => ({ ...prev, [id]: value }))
  }

  return (
    <Card className="border shadow-sm">
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-xl">单件上架</CardTitle>
          <CardDescription>适用于拆袋/二手等需要逐件管理的上架流程</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleDelete(Object.keys(selected).filter((key) => selected[key]))} disabled={selectedIds.length === 0}>
            批量删除
          </Button>
          <Button onClick={() => setDialogOpen(true)}>批量创建</Button>
        </div>
      </CardHeader>
      <CardContent>
        {selectedIds.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4 rounded-lg border border-dashed border-amber-300 bg-amber-50 px-4 py-2 text-sm">
            <span>已选择 {selectedIds.length} 条上架</span>
            <Button size="sm" onClick={handleBulkArchive}>
              批量结束
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelected({})}>
              清空
            </Button>
          </div>
        )}
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
                  <TableHead className="w-10">选择</TableHead>
                  <TableHead>商品</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>平台</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>价格</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((listing) => (
                  <TableRow key={listing.id}>
                    <TableCell>
                      <Checkbox checked={!!selected[listing.id]} onCheckedChange={(checked) => toggleSelection(listing.id, Boolean(checked))} />
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">
                        {listing.item?.itemName || listing.template?.itemName || '未命名'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {listing.item?.itemSize || '-'} · {listing.item?.itemCondition || '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{listing.item?.sku?.name || listing.template?.sku?.name || '-'}</div>
                      <div className="text-xs text-muted-foreground">
                        {listing.item?.sku?.brand || listing.template?.sku?.brand || ''}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{listing.platform.name}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{listing.status}</Badge>
                      {listing.sourceType === 'TEMPLATE' && (
                        <div className="text-[11px] text-muted-foreground">
                          模板 {listing.quantity - listing.fulfilledQuantity} 件
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {listing.listingPrice ? `${listing.listingPrice} ${listing.listingCurrency || ''}` : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleDelete([listing.id])}>
                        删除
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      暂无上架记录
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <NewItemListingDialog
              open={dialogOpen}
              onClose={() => setDialogOpen(false)}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['listings', 'items'] })
              }}
            />
          </>
        )}
      </CardContent>
    </Card>
  )
}

