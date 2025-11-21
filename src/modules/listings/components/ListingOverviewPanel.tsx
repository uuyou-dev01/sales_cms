'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useQuery } from '@tanstack/react-query'
import type { ListingFilterValues } from '../types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { AlertCircle, Clock } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'

interface OverviewResponse {
  summary: {
    templateCount: number
    templateAvailable: number
    templateListed: number
    templateReserved: number
    templateSold: number
    activeListings: number
    avgListingHours: number | null
    avgSellThroughHours: number | null
  }
  platformStats: Array<{
    platformId: string
    platformName: string
    count: number
  }>
  sourceStats: Array<{
    sourceType: string
    count: number
  }>
  trend: Array<{
    date: string
    created: number
    closed: number
  }>
  readyToList: Array<{
    itemId: string
    itemName: string
    skuId?: string | null
    skuName?: string | null
    purchaseCostCNY?: number | null
    createdAt: string
    daysInStock: number
  }>
  readyToListTotal: number
  staleListings: Array<{
    id: string
    itemId?: string | null
    itemName: string
    skuId?: string | null
    skuName?: string | null
    platformId?: string | null
    platformName?: string | null
    listedAt: string
    daysListed: number
    purchaseCostCNY?: number | null
  }>
  staleListingsTotal: number
}

const STALE_THRESHOLD_DAYS = 14

function buildQuery(filters: ListingFilterValues) {
  const params = new URLSearchParams()
  if (filters.platformId) params.set('platformId', filters.platformId)
  if (filters.status) params.set('status', filters.status)
  if (filters.sourceType && filters.sourceType !== 'ALL') params.set('sourceType', filters.sourceType)
  return params
}

export function ListingOverviewPanel({ filters }: { filters: ListingFilterValues }) {
  const queryString = buildQuery(filters).toString()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const { data, isLoading, error } = useQuery<OverviewResponse>({
    queryKey: ['listings', 'overview', queryString],
    queryFn: async () => {
      const res = await fetch(`/api/listings?mode=overview${queryString ? `&${queryString}` : ''}`, {
        cache: 'no-store',
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || '获取上架概览失败')
      return json.data ?? json
    },
  })

  const navigateToTab = React.useCallback(
    (view: string, extra?: Record<string, string | undefined | null>) => {
      if (!pathname) return
      const params = new URLSearchParams(searchParams.toString())
      params.set('view', view)
      if (extra) {
        Object.entries(extra).forEach(([key, value]) => {
          if (value) params.set(key, value)
          else params.delete(key)
        })
      }
      router.push(`${pathname}?${params.toString()}`)
    },
    [pathname, router, searchParams]
  )

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>上架概览</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>上架概览</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive text-sm">{error instanceof Error ? error.message : '加载失败'}</p>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>上架概览</CardTitle>
          <CardDescription>暂无概览数据，请稍后刷新。</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">可能是后台统计尚未完成或数据量不足。</p>
        </CardContent>
      </Card>
    )
  }

  const summary = data.summary

  const formatDuration = (hours?: number | null) => {
    if (!hours || Number.isNaN(hours)) return '—'
    if (hours >= 24) {
      return `${(hours / 24).toFixed(1)} 天`
    }
    return `${hours.toFixed(1)} 小时`
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>上架概览</CardTitle>
          <CardDescription>模板库存与当前在架概况</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-lg border p-4 bg-muted/30">
            <p className="text-sm text-muted-foreground">模板数量</p>
            <p className="text-3xl font-semibold mt-2">{summary?.templateCount ?? 0}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">可售库存</p>
            <p className="text-3xl font-semibold mt-2">{summary?.templateAvailable ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">已上架：{summary?.templateListed ?? 0}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">在架记录</p>
            <p className="text-3xl font-semibold mt-2">{summary?.activeListings ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">预留：{summary?.templateReserved ?? 0}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">累计售出</p>
            <p className="text-3xl font-semibold mt-2">{summary?.templateSold ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">以模板为单位统计</p>
          </div>
          <div className="rounded-lg border p-4 col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              上架效率
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <p className="text-xs text-muted-foreground">平均上架用时</p>
                <p className="text-xl font-semibold mt-1">{formatDuration(summary?.avgListingHours)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">平均售出用时</p>
                <p className="text-xl font-semibold mt-1">{formatDuration(summary?.avgSellThroughHours)}</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border p-4 col-span-1 md:col-span-2 bg-muted/40">
            <p className="text-sm text-muted-foreground">可上架未操作</p>
            <div className="flex items-baseline justify-between mt-2">
              <p className="text-3xl font-semibold">{data?.readyToListTotal ?? 0}</p>
              <Button variant="outline" size="sm" onClick={() => navigateToTab('item')}>
                查看全部
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              当前库存中尚未创建上架记录的 Item 数量
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>滞销预警</CardTitle>
              <CardDescription>上架超过 {STALE_THRESHOLD_COPY} 仍未售出的商品</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigateToTab('listed')}>
              查看已上架
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {data?.staleListings?.length ? (
              data.staleListings.map((listing) => (
                <div
                  key={listing.id}
                  className="rounded-md border p-3 flex flex-col gap-1 hover:bg-muted/40 transition-colors cursor-pointer"
                  onClick={() => navigateToTab('listed', { q: listing.itemName })}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{listing.itemName}</div>
                    {listing.platformName && <Badge variant="outline">{listing.platformName}</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-3">
                    <span>SKU: {listing.skuName || '—'}</span>
                    <span>已挂 {listing.daysListed} 天</span>
                    {listing.purchaseCostCNY !== null && listing.purchaseCostCNY !== undefined ? (
                      <span>成本 ¥{listing.purchaseCostCNY.toFixed(0)}</span>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>暂无滞销商品</AlertTitle>
                <AlertDescription>最近的上架都在合理周期内售出。</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>可上架未操作</CardTitle>
              <CardDescription>库存中尚未建立 Listing 的商品</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigateToTab('item')}>
              去单件上架
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {data?.readyToList?.length ? (
              data.readyToList.map((item) => (
                <div
                  key={item.itemId}
                  className="rounded-md border p-3 flex flex-col gap-1 hover:bg-muted/40 transition-colors cursor-pointer"
                  onClick={() => navigateToTab('item', { skuId: item.skuId ?? undefined, q: item.itemName })}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{item.itemName}</div>
                    {item.skuName && <Badge variant="secondary">{item.skuName}</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-3">
                    <span>在库 {item.daysInStock} 天</span>
                    {item.purchaseCostCNY !== null && item.purchaseCostCNY !== undefined ? (
                      <span>成本 ¥{item.purchaseCostCNY.toFixed(0)}</span>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>暂无待上架库存</AlertTitle>
                <AlertDescription>当前所有库存均已安排上架。</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>平台分布</CardTitle>
          <CardDescription>当前活跃 Listing 在各平台的数量</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data?.platformStats?.length ? (
            data.platformStats.map((stat) => (
              <div key={stat.platformId} className="flex items-center justify-between text-sm">
                <span>{stat.platformName}</span>
                <Badge variant="outline">{stat.count}</Badge>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">暂无数据</p>
          )}
          <Separator className="my-2" />
          <p className="text-xs text-muted-foreground">
            数据实时来源于 `itemListing`，仅统计未结束状态。
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

const STALE_THRESHOLD_COPY = `${STALE_THRESHOLD_DAYS} 天`

