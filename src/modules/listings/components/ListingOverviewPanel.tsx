'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useQuery } from '@tanstack/react-query'
import type { ListingFilterValues } from '../types'

interface OverviewResponse {
  summary: {
    templateCount: number
    templateAvailable: number
    templateListed: number
    templateReserved: number
    templateSold: number
    activeListings: number
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
}

function buildQuery(filters: ListingFilterValues) {
  const params = new URLSearchParams()
  if (filters.platformId) params.set('platformId', filters.platformId)
  if (filters.status) params.set('status', filters.status)
  if (filters.sourceType && filters.sourceType !== 'ALL') params.set('sourceType', filters.sourceType)
  return params
}

export function ListingOverviewPanel({ filters }: { filters: ListingFilterValues }) {
  const queryString = buildQuery(filters).toString()
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

  const summary = data?.summary

  return (
    <div className="grid grid-cols-1 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>上架概览</CardTitle>
          <CardDescription>模板库存与当前在架概况</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg border p-4">
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
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>平台分布</CardTitle>
            <CardDescription>当前在架记录数（按平台）</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data?.platformStats?.length ? (
                data.platformStats.map((stat) => (
                  <div key={stat.platformId} className="flex items-center justify-between">
                    <div className="font-medium">{stat.platformName}</div>
                    <div>{stat.count}</div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">暂无数据</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>模式占比</CardTitle>
            <CardDescription>模板 vs 单件上架</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data?.sourceStats?.map((stat) => (
              <div key={stat.sourceType} className="flex items-center justify-between">
                <div>{stat.sourceType === 'TEMPLATE' ? '模板' : '单件'}</div>
                <div>{stat.count}</div>
              </div>
            ))}
            {!data?.sourceStats?.length && <p className="text-sm text-muted-foreground">暂无数据</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>近7天上架趋势</CardTitle>
          <CardDescription>每日创建与结束数量</CardDescription>
        </CardHeader>
        <CardContent className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-muted-foreground">
                <th className="text-left py-2">日期</th>
                <th className="text-left py-2">创建</th>
                <th className="text-left py-2">结束</th>
              </tr>
            </thead>
            <tbody>
              {data?.trend?.map((item) => (
                <tr key={item.date} className="border-t">
                  <td className="py-2">{item.date}</td>
                  <td className="py-2">{item.created}</td>
                  <td className="py-2">{item.closed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}

