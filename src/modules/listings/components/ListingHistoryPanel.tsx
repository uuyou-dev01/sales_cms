'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { useQuery } from '@tanstack/react-query'
import type { ListingFilterValues } from '../types'

interface ListingHistoryRecord {
  id: string
  action: string
  timestamp: string | Date
  operator?: { id: string; name: string | null } | null
  status?: string | null
  quantity?: number | null
  sourceType: string
  platform: { id: string; name: string }
  listing?: {
    id: string
    status: string
    platform: { id: string; name: string }
    item?: { itemName: string; sku?: { name: string | null } }
    template?: { itemName: string; sku?: { name: string | null } }
  } | null
}

interface HistoryResponse {
  items: ListingHistoryRecord[]
  total: number
  page: number
  pageSize: number
}

export function ListingHistoryPanel({ filters }: { filters: ListingFilterValues }) {
  const [page, setPage] = React.useState(1)
  const filterKey = JSON.stringify({ ...filters, page })

  React.useEffect(() => {
    setPage(1)
  }, [filters.platformId, filters.status, filters.sourceType])

  const { data, isLoading, error } = useQuery<HistoryResponse>({
    queryKey: ['listings', 'history', filterKey],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('mode', 'history')
      params.set('page', String(page))
      params.set('pageSize', '20')
      if (filters.platformId) params.set('platformId', filters.platformId)
      if (filters.status) params.set('status', filters.status)
      if (filters.sourceType && filters.sourceType !== 'ALL') params.set('sourceType', filters.sourceType)
      const res = await fetch(`/api/listings?${params.toString()}`, { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || '获取历史记录失败')
      return json.data ?? json
    },
  })

  const maxPage = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1

  return (
    <Card>
      <CardHeader>
        <CardTitle>上架记录</CardTitle>
        <CardDescription>追踪上架/下架/修改动作</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && <p className="text-sm text-muted-foreground">加载中...</p>}
        {error && (
          <p className="text-sm text-destructive">
            {error instanceof Error ? error.message : '加载失败'}
          </p>
        )}
        {!isLoading && !error && (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>时间</TableHead>
                  <TableHead>操作</TableHead>
                  <TableHead>平台</TableHead>
                  <TableHead>对象</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>数量</TableHead>
                  <TableHead>操作人</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.items?.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(record.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell>{record.action}</TableCell>
                    <TableCell>{record.platform.name}</TableCell>
                    <TableCell>
                      {record.listing?.item?.itemName ||
                        record.listing?.template?.itemName ||
                        record.templateId ||
                        record.itemId ||
                        '—'}
                    </TableCell>
                    <TableCell>{record.status || record.listing?.status || '—'}</TableCell>
                    <TableCell>{record.quantity ?? record.listing?.quantity ?? '—'}</TableCell>
                    <TableCell>{record.operator?.name || '系统'}</TableCell>
                  </TableRow>
                ))}
                {(!data || data.items.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-6">
                      暂无历史记录
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <div className="flex items-center justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                上一页
              </Button>
              <span className="text-sm text-muted-foreground">
                第 {data?.page ?? page} 页 / 共 {maxPage} 页
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= maxPage}
                onClick={() => setPage((p) => p + 1)}
              >
                下一页
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

