'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format, subDays } from 'date-fns'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

async function fetchPlatforms() {
  const res = await fetch('/api/platforms')
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json?.error || '加载平台失败')
  const items = json?.data?.items || json?.data || []
  return Array.isArray(items) ? items : []
}

export function SoldItemsPanel() {
  const [platformFilter, setPlatformFilter] = React.useState('all')
  const [rangeFilter, setRangeFilter] = React.useState('30')
  const { data: platforms = [] } = useQuery({
    queryKey: ['platforms'],
    queryFn: fetchPlatforms,
  })

  const queryString = React.useMemo(() => {
    const params = new URLSearchParams()
    if (platformFilter !== 'all') params.set('platformId', platformFilter)
    if (rangeFilter !== 'all') {
      const days = Number(rangeFilter)
      const startDate = subDays(new Date(), days)
      params.set('startDate', startDate.toISOString())
    }
    return params.toString()
  }, [platformFilter, rangeFilter])

  const { data: transactions, isLoading, error } = useQuery({
    queryKey: ['sales', 'transactions', queryString],
    queryFn: async () => {
      const url = queryString ? `/api/sales/transactions?${queryString}` : '/api/sales/transactions'
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch transactions')
      const json = await res.json()
      return json.data
    }
  })

  if (isLoading) return <Skeleton className="h-48 w-full" />
  if (error) return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>加载销售记录失败</AlertDescription>
    </Alert>
  )

  return (
    <Card className="border shadow-sm">
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>已售出商品</CardTitle>
          <CardDescription>按平台与时间范围查看销售记录。</CardDescription>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="全部平台" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部平台</SelectItem>
              {platforms.map((platform: any) => (
                <SelectItem key={platform.id} value={platform.id}>
                  {platform.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={rangeFilter} onValueChange={setRangeFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="时间范围" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">最近 7 天</SelectItem>
              <SelectItem value="30">最近 30 天</SelectItem>
              <SelectItem value="90">最近 90 天</SelectItem>
              <SelectItem value="all">全部</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>销售时间</TableHead>
              <TableHead>商品信息</TableHead>
              <TableHead>平台</TableHead>
              <TableHead className="text-right">售价</TableHead>
              <TableHead className="text-right">状态</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions?.map((tx: any) => {
              // 确定主商品名称
              let mainItemName = '未知商品'
              let otherCount = 0
              
              if (tx.details && tx.details.length > 0) {
                mainItemName = tx.details[0].item?.itemName || '未知商品'
                otherCount = tx.details.length - 1
              } else if (tx.item) {
                mainItemName = tx.item.itemName
              }

              return (
                <TableRow key={tx.id}>
                  <TableCell>{format(new Date(tx.soldDate || tx.createdAt), 'yyyy-MM-dd HH:mm')}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {mainItemName}
                      </span>
                      {otherCount > 0 && (
                        <span className="text-xs text-muted-foreground">
                          及其他 {otherCount} 件商品
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        ID: {tx.id.slice(-8)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{tx.platform?.name || tx.soldPlatform || '未知平台'}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="font-medium">
                      {Number(tx.totalSoldPrice || tx.soldPrice || 0).toFixed(2)} {tx.soldPriceCurrency}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      汇率: {tx.soldPriceExchangeRate}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={tx.orderStatus === '已完成' ? 'default' : 'secondary'}>
                      {tx.orderStatus || '已完成'}
                    </Badge>
                  </TableCell>
                </TableRow>
              )
            })}
            {transactions?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  暂无销售记录
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

