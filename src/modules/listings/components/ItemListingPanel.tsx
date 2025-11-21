'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ColumnFilter } from '../../../components/data-table/ColumnFilter'
import { Toggle } from '@/components/ui/toggle'
import { Filter } from 'lucide-react'
import { BulkListingDialog } from './BulkListingDialog'
import type { AvailableInventoryItem, ListingFilterValues } from '../types'

interface ItemListingPanelProps {
  filters: ListingFilterValues
}

const ACTIVE_STATUSES = new Set(['LISTED', 'PENDING', 'DRAFT'])

export function ItemListingPanel({ filters }: ItemListingPanelProps) {
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [dialogInitialItems, setDialogInitialItems] = React.useState<string[]>([])
  const [includeNewItems, setIncludeNewItems] = React.useState(false)

  const queryString = React.useMemo(() => {
    const params = new URLSearchParams()
    params.set('limit', '200')
    if (filters.skuId) params.set('skuId', filters.skuId)
    if (includeNewItems) params.set('includeNew', 'true')
    return params.toString()
  }, [filters.skuId, includeNewItems])

  const query = useQuery<AvailableInventoryItem[]>({
    queryKey: ['available-items', queryString],
    queryFn: async () => {
      const res = await fetch(`/api/sales/available-items?${queryString}`, { cache: 'no-store' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || '获取可上架库存失败')
      const payload = json?.data ?? json
      return Array.isArray(payload) ? payload : []
    },
  })
  const items = React.useMemo(() => query.data ?? [], [query.data])
  const isLoading = query.isLoading
  const error = query.error
  const refetch = query.refetch

  const [columnFilters, setColumnFilters] = React.useState<{
    skuNames: string[]
    platforms: string[]
    statuses: string[]
    conditions: string[]
  }>({ skuNames: [], platforms: [], statuses: [], conditions: [] })

  const skuOptions = React.useMemo(
    () => Array.from(new Set(items.map((listing) => listing.sku?.name || '未填写'))),
    [items]
  )
  const platformOptions = React.useMemo(
    () =>
      Array.from(
        new Set(
          items.flatMap((listing) =>
            (listing.listings || []).map((entry) => entry.platform?.name || '未知平台')
          )
        )
      ),
    [items]
  )
  const statusOptions = React.useMemo(
    () =>
      Array.from(
        new Set(
          items.flatMap((listing) => (listing.listings || []).map((entry) => entry.status || 'UNKNOWN'))
        )
      ),
    [items]
  )
  const conditionOptions = React.useMemo(
    () => Array.from(new Set(items.map((listing) => listing.itemCondition || '未标注'))),
    [items]
  )

  const searchTerm = filters.q?.toLowerCase().trim()

  const filteredItems = React.useMemo(() => {
    return items.filter((listing) => {
      if (searchTerm) {
        const haystack = `${listing.itemName} ${listing.itemId} ${listing.sku?.name ?? ''}`.toLowerCase()
        if (!haystack.includes(searchTerm)) return false
      }
      const skuName = listing.sku?.name || '未填写'
      const condition = listing.itemCondition || '未标注'
      const platformNames = (listing.listings || []).map((entry) => entry.platform?.name || '未知平台')
      const statusValues = (listing.listings || []).map((entry) => entry.status || 'UNKNOWN')

      if (columnFilters.skuNames.length > 0 && !columnFilters.skuNames.includes(skuName)) {
        return false
      }
      if (columnFilters.conditions.length > 0 && !columnFilters.conditions.includes(condition)) {
        return false
      }
      if (
        columnFilters.platforms.length > 0 &&
        !platformNames.some((platform) => columnFilters.platforms.includes(platform))
      ) {
        return false
      }
      if (
        columnFilters.statuses.length > 0 &&
        !statusValues.some((status) => columnFilters.statuses.includes(status))
      ) {
        return false
      }
      return true
    })
  }, [items, columnFilters, searchTerm])

  const hasFilterApplied = React.useMemo(
    () => Object.values(columnFilters).some((values) => values.length > 0),
    [columnFilters]
  )

  const handleQuickListing = (itemId: string) => {
    setDialogInitialItems([itemId])
    setDialogOpen(true)
  }

  return (
    <Card className="border shadow-sm">
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-xl">单件上架</CardTitle>
          <CardDescription>聚焦中古 / 特殊品库存，直接挑选实物进行上架。</CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Toggle
            pressed={includeNewItems}
            onPressedChange={setIncludeNewItems}
            aria-label="切换是否显示全新库存"
          >
            <Filter className="h-4 w-4 mr-2" />
            {includeNewItems ? '显示全部库存' : '仅显示非全新'}
          </Toggle>
          <Button variant="outline" onClick={() => refetch()}>
            刷新
          </Button>
          <Button
            onClick={() => {
              setDialogInitialItems([])
              setDialogOpen(true)
            }}
          >
            批量上架
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
          <div className="text-sm text-destructive">{error instanceof Error ? error.message : '加载失败'}</div>
        )}
        {!isLoading && !error && (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <div className="flex items-center justify-between">
                      <span>商品</span>
                      <ColumnFilter
                        label="成色"
                        options={conditionOptions}
                        selectedValues={columnFilters.conditions}
                        onChange={(values) => setColumnFilters((prev) => ({ ...prev, conditions: values }))}
                      />
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center justify-between">
                      <span>SKU</span>
                      <ColumnFilter
                        label="SKU"
                        options={skuOptions}
                        selectedValues={columnFilters.skuNames}
                        onChange={(values) => setColumnFilters((prev) => ({ ...prev, skuNames: values }))}
                      />
                    </div>
                  </TableHead>
                  <TableHead>成本</TableHead>
                  <TableHead>
                    <div className="flex items-center justify-between">
                      <span>当前上架</span>
                      <ColumnFilter
                        label="平台"
                        options={platformOptions}
                        selectedValues={columnFilters.platforms}
                        onChange={(values) => setColumnFilters((prev) => ({ ...prev, platforms: values }))}
                      />
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center justify-between">
                      <span>平台状态</span>
                      <ColumnFilter
                        label="状态"
                        options={statusOptions}
                        selectedValues={columnFilters.statuses}
                        onChange={(values) => setColumnFilters((prev) => ({ ...prev, statuses: values }))}
                      />
                    </div>
                  </TableHead>
                  <TableHead>入库信息</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => {
                  const activeListings = (item.listings || []).filter((listing) =>
                    ACTIVE_STATUSES.has((listing.status || '').toUpperCase())
                  )
                  return (
                    <TableRow key={item.itemId}>
                      <TableCell>
                        <div className="text-sm font-medium">{item.itemName}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.itemSize || '均码'} · {item.itemCondition || '未标注'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{item.sku?.name || '-'}</div>
                        <div className="text-xs text-muted-foreground">{item.sku?.brand || ''}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">¥{(item.purchaseCostCNY ?? item.purchaseCost ?? 0).toFixed(0)}</div>
                        <div className="text-xs text-muted-foreground">
                          原币：{item.purchaseCost ? `${item.purchaseCost}` : '—'}
                        </div>
                      </TableCell>
                      <TableCell>
                        {activeListings.length === 0 ? (
                          <Badge variant="secondary">未上架</Badge>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {activeListings.map((listing) => (
                              <Badge key={listing.id} variant="outline">
                                {listing.platform?.name || '平台'} · {listing.status}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-muted-foreground space-y-1">
                          {(item.listings || []).length === 0 && '—'}
                          {(item.listings || []).map((listing) => (
                            <div key={listing.id}>
                              {listing.platform?.name || '平台'} · {listing.status}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{new Date(item.createdAt).toLocaleDateString()}</div>
                        <div className="text-xs text-muted-foreground">批次：{item.batchNumber || '-'}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleQuickListing(item.itemId)}
                          disabled={activeListings.length > 0}
                        >
                          {activeListings.length > 0 ? '已上架' : '一键上架'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {filteredItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {items.length === 0 && !hasFilterApplied && !searchTerm
                        ? '暂无满足条件的库存'
                        : '无匹配结果，请调整筛选条件'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <BulkListingDialog
              open={dialogOpen}
              mode="ITEM"
              preselectedItemIds={dialogInitialItems}
              onClose={() => setDialogOpen(false)}
              onSuccess={() => {
                refetch()
              }}
            />
          </>
        )}
      </CardContent>
    </Card>
  )
}
