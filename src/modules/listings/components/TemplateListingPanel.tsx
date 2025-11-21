'use client'

import React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import type { ListingFilterValues, TemplateListingSummary } from '../types'
import { NewTemplateListingDialog } from './NewTemplateListingDialog'
import { useToast } from '@/hooks/use-toast'

interface TemplateListingPanelProps {
  filters: ListingFilterValues
}

export function TemplateListingPanel({ filters }: TemplateListingPanelProps) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const queryString = React.useMemo(() => {
    const params = new URLSearchParams()
    params.set('mode', 'template')
    if (filters.platformId) params.set('platformId', filters.platformId)
    if (filters.status) params.set('status', filters.status)
    if (filters.q) params.set('q', filters.q)
    if (filters.skuId) params.set('skuId', filters.skuId)
    return params.toString()
  }, [filters.platformId, filters.status, filters.q, filters.skuId])

  const { data, isLoading, error } = useQuery<TemplateListingSummary[]>({
    queryKey: ['listings', 'templates', queryString],
    queryFn: async () => {
      const res = await fetch(`/api/listings?${queryString}`, { cache: 'no-store' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || '获取模板上架数据失败')
      return json?.data?.items || json?.items || []
    },
  })
  const [selectedTemplate, setSelectedTemplate] = React.useState<TemplateListingSummary | null>(null)
  const [selected, setSelected] = React.useState<Record<string, boolean>>({})
  const templates = data ?? []
  const selectedTemplates = React.useMemo(() => templates.filter((tpl) => selected[tpl.id]), [templates, selected])

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['listings', 'templates'] })
  }

  const toggleSelection = (id: string, value: boolean) => {
    setSelected((prev) => ({ ...prev, [id]: value }))
  }

  const handleBulkArchive = async () => {
    if (selectedTemplates.length === 0) return
    try {
      await Promise.all(
        selectedTemplates.flatMap((template) =>
          template.listings.map((listing) =>
            fetch(`/api/listings/${listing.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'ARCHIVED' }),
            })
          )
        )
      )
      toast({ title: '批量结束完成' })
      setSelected({})
      queryClient.invalidateQueries({ queryKey: ['listings', 'templates'] })
      queryClient.invalidateQueries({ queryKey: ['listings', 'items'] })
    } catch (err) {
      toast({
        title: '批量结束失败',
        description: err instanceof Error ? err.message : '请稍后重试',
        variant: 'destructive',
      })
    }
  }

  const handleExport = () => {
    const rows = templates.map((tpl) => ({
      模板: tpl.itemName,
      SKU: tpl.sku?.name || '',
      可售: tpl.stats.available,
      已上架: tpl.stats.listed,
      已售: tpl.stats.sold,
      预留: tpl.stats.reserved,
    }))
    const csv = ['模板,SKU,可售,已上架,已售,预留']
      .concat(rows.map((row) => `${row.模板},${row.SKU},${row.可售},${row.已上架},${row.已售},${row.预留}`))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'template-listings.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Card className="shadow-sm border">
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-xl">模板上架</CardTitle>
          <CardDescription>适用于标准品（FIFO）的大批量上架场景</CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleExport}>
            导出 CSV
          </Button>
          <Button variant="secondary" onClick={handleRefresh}>
            重新加载
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {selectedTemplates.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-4 py-2 text-sm">
            <span>已选择 {selectedTemplates.length} 个模板</span>
            <Button size="sm" onClick={handleBulkArchive}>
              批量结束
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelected({})}>
              清空
            </Button>
          </div>
        )}
        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}
        {!isLoading && error && (
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertCircle className="w-4 h-4" />
            {error instanceof Error ? error.message : '加载失败'}
          </div>
        )}
        {!isLoading && !error && (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">选择</TableHead>
                  <TableHead>模板信息</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>可售库存</TableHead>
                  <TableHead>已上架</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell>
                      <Checkbox checked={!!selected[template.id]} onCheckedChange={(checked) => toggleSelection(template.id, Boolean(checked))} />
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{template.itemName}</div>
                        <div className="text-xs text-muted-foreground">
                          {template.itemSize || '均码'} · {template.itemCondition || 'NEW'}
                          {template.variantLabel ? ` · ${template.variantLabel}` : ''}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{template.sku?.name || '未知 SKU'}</div>
                      <div className="text-xs text-muted-foreground">{template.sku?.brand || '-'}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                        {template.stats.available}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-xs">
                        <span>已上架：{template.stats.listed}</span>
                        <span>已售：{template.stats.sold}</span>
                        <span>预留：{template.stats.reserved}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {template.listings.length === 0 ? (
                        <Badge variant="secondary">未上架</Badge>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {template.listings.slice(0, 2).map((listing) => (
                            <Badge key={listing.id} variant="outline">
                              {listing.platform.name} · {listing.status}
                            </Badge>
                          ))}
                          {template.listings.length > 2 && (
                            <Badge variant="outline">+{template.listings.length - 2}</Badge>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" onClick={() => setSelectedTemplate(template)} disabled={template.stats.available <= 0}>
                        创建上架
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {templates.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      暂无子 SKU 模板，请在 SKU 详情页创建模板
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <NewTemplateListingDialog
              open={!!selectedTemplate}
              template={selectedTemplate}
              onClose={() => setSelectedTemplate(null)}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['listings', 'templates'] })
                queryClient.invalidateQueries({ queryKey: ['listings', 'items'] })
              }}
            />
          </>
        )}
      </CardContent>
    </Card>
  )
}

