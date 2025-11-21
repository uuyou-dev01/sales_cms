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
import { BulkListingDialog } from './BulkListingDialog'
import { useToast } from '@/hooks/use-toast'
import { ColumnFilter } from '../../../components/data-table/ColumnFilter'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { fetchTemplateItems, type TemplateItemCandidate } from '../api/template-items'
const ACTIVE_LISTING_STATUSES = new Set(['LISTED', 'PENDING', 'DRAFT'])

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
  const [dialogTemplate, setDialogTemplate] = React.useState<TemplateListingSummary | null>(null)
  const [dialogPreselectedItems, setDialogPreselectedItems] = React.useState<string[]>([])
  const [detailTemplate, setDetailTemplate] = React.useState<TemplateListingSummary | null>(null)
  const [selected, setSelected] = React.useState<Record<string, boolean>>({})
  const templates = data ?? []
  const [columnFilters, setColumnFilters] = React.useState<{
    skuNames: string[]
    brands: string[]
    conditions: string[]
  }>({ skuNames: [], brands: [], conditions: [] })

  const skuOptions = React.useMemo(() => Array.from(new Set(templates.map((tpl) => tpl.sku?.name || '未填写'))), [templates])
  const brandOptions = React.useMemo(() => Array.from(new Set(templates.map((tpl) => tpl.sku?.brand || '未填写'))), [templates])
  const conditionOptions = React.useMemo(
    () => Array.from(new Set(templates.map((tpl) => tpl.itemCondition || '未标注'))),
    [templates]
  )

  const filteredTemplates = React.useMemo(() => {
    return templates.filter((tpl) => {
      const skuName = tpl.sku?.name || '未填写'
      const brand = tpl.sku?.brand || '未填写'
      const condition = tpl.itemCondition || '未标注'
      if (columnFilters.skuNames.length > 0 && !columnFilters.skuNames.includes(skuName)) {
        return false
      }
      if (columnFilters.brands.length > 0 && !columnFilters.brands.includes(brand)) {
        return false
      }
      if (columnFilters.conditions.length > 0 && !columnFilters.conditions.includes(condition)) {
        return false
      }
      return true
    })
  }, [templates, columnFilters])

  const selectedTemplates = React.useMemo(() => templates.filter((tpl) => selected[tpl.id]), [templates, selected])

  const hasFilterApplied = React.useMemo(
    () => Object.values(columnFilters).some((values) => values.length > 0),
    [columnFilters]
  )

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
    const rows = filteredTemplates.map((tpl) => ({
      模板: tpl.itemName,
      SKU: tpl.sku?.name || '',
      品牌: tpl.sku?.brand || '',
      可售: tpl.stats.available,
      已上架: tpl.stats.listed,
      已售: tpl.stats.sold,
      预留: tpl.stats.reserved,
    }))
    const csv = ['模板,SKU,品牌,可售,已上架,已售,预留']
      .concat(rows.map((row) => `${row.模板},${row.SKU},${row.品牌},${row.可售},${row.已上架},${row.已售},${row.预留}`))
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
    <>
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
                  <TableHead>
                    <div className="flex items-center justify-between">
                      <span>模板信息</span>
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
                  <TableHead>
                    <div className="flex items-center justify-between">
                      <span>品牌</span>
                      <ColumnFilter
                        label="品牌"
                        options={brandOptions}
                        selectedValues={columnFilters.brands}
                        onChange={(values) => setColumnFilters((prev) => ({ ...prev, brands: values }))}
                      />
                    </div>
                  </TableHead>
                  <TableHead>可售库存</TableHead>
                  <TableHead>已上架</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTemplates.map((template) => (
                  <TableRow
                    key={template.id}
                    className="cursor-pointer hover:bg-muted/40"
                    onClick={() => setDetailTemplate(template)}
                  >
                    <TableCell>
                      <div onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={!!selected[template.id]}
                          onCheckedChange={(checked) => toggleSelection(template.id, Boolean(checked))}
                        />
                      </div>
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
                      <div className="text-xs text-muted-foreground">SKU ID: {template.sku?.id || '-'}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{template.sku?.brand || '未填写'}</div>
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
                      {(() => {
                        const activeListings = template.listings.filter((listing) =>
                          ACTIVE_LISTING_STATUSES.has((listing.status || '').toUpperCase())
                        )
                        if (activeListings.length === 0) {
                          return <Badge variant="secondary">未上架</Badge>
                        }
                        return (
                          <div className="flex flex-wrap gap-1">
                            {activeListings.map((listing) => (
                              <Badge key={listing.id} variant="outline">
                                {listing.platform.name}
                              </Badge>
                            ))}
                          </div>
                        )
                      })()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDialogPreselectedItems([])
                          setDialogTemplate(template)
                        }}
                        disabled={template.stats.available <= 0}
                      >
                        创建上架
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredTemplates.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {templates.length === 0 && !hasFilterApplied ? '暂无子 SKU 模板，请在 SKU 详情页创建模板' : '无匹配结果，请调整筛选条件'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <BulkListingDialog
              open={!!dialogTemplate}
              mode="TEMPLATE"
              templateId={dialogTemplate?.id}
              templateName={dialogTemplate?.itemName}
              preselectedItemIds={dialogPreselectedItems}
              onClose={() => {
                setDialogTemplate(null)
                setDialogPreselectedItems([])
              }}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['listings', 'templates'] })
                queryClient.invalidateQueries({ queryKey: ['listings', 'items'] })
              }}
            />
          </>
        )}
      </CardContent>
    </Card>

    <TemplateDetailSheet
      template={detailTemplate}
      onClose={() => setDetailTemplate(null)}
      onOpenListing={(itemIds) => {
        if (detailTemplate) {
          setDialogPreselectedItems(itemIds ?? [])
          setDialogTemplate(detailTemplate)
        }
      }}
    />
    </>
  )
}

interface TemplateDetailSheetProps {
  template: TemplateListingSummary | null
  onClose: () => void
  onOpenListing: (selectedItemIds?: string[]) => void
}

function TemplateDetailSheet({ template, onClose, onOpenListing }: TemplateDetailSheetProps) {
  const templateId = template?.id
  const {
    data: items = [],
    isLoading,
    refetch,
  } = useQuery<TemplateItemCandidate[]>({
    queryKey: ['template-items', templateId, 'detail'],
    queryFn: () => fetchTemplateItems(templateId!, 200),
    enabled: !!templateId,
  })
  const [selectedMap, setSelectedMap] = React.useState<Record<string, boolean>>({})

  React.useEffect(() => {
    setSelectedMap({})
  }, [templateId])

  React.useEffect(() => {
    setSelectedMap((prev) => {
      if (!items || items.length === 0) return {}
      const allow = new Set(items.map((item) => item.itemId))
      const next: Record<string, boolean> = {}
      Object.entries(prev).forEach(([id, checked]) => {
        if (checked && allow.has(id)) {
          next[id] = true
        }
      })
      return next
    })
  }, [items])

  const selectedIds = React.useMemo(() => Object.entries(selectedMap).filter(([, checked]) => checked).map(([id]) => id), [selectedMap])
  const selectedCount = selectedIds.length

  const toggleSelect = (itemId: string, value: boolean) => {
    setSelectedMap((prev) => ({ ...prev, [itemId]: value }))
  }

  const handleQuickPick = () => {
    if (items.length === 0) return
    const limit = Math.min(10, items.length)
    const next: Record<string, boolean> = {}
    items.slice(0, limit).forEach((item) => {
      next[item.itemId] = true
    })
    setSelectedMap(next)
  }

  return (
    <Sheet open={!!template} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-xl">
        {template && (
          <>
            <SheetHeader>
              <SheetTitle>{template.itemName}</SheetTitle>
              <SheetDescription>SKU：{template.sku?.name || '未填写'}</SheetDescription>
            </SheetHeader>
            <div className="py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">可售库存</p>
                  <p className="text-xl font-semibold">{template.stats.available}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">已上架</p>
                  <p className="text-xl font-semibold">{template.stats.listed}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">已售出</p>
                  <p className="text-xl font-semibold">{template.stats.sold}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">预留</p>
                  <p className="text-xl font-semibold">{template.stats.reserved}</p>
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">
                    待上架实物（{items.length}）{selectedCount > 0 && <span className="ml-1 text-primary text-xs">已选 {selectedCount}</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    仅展示前 200 个 FIFO 顺位，可在 SKU 页面查看更多。
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={handleQuickPick} disabled={items.length === 0}>
                    FIFO 选前 10
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setSelectedMap({})} disabled={selectedCount === 0}>
                    清空
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => refetch()}>
                    刷新
                  </Button>
                </div>
              </div>
              <ScrollArea className="h-72 rounded-md border">
                <div className="divide-y">
                  {isLoading && (
                    <div className="p-4 space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-5 w-1/2" />
                    </div>
                  )}
                  {!isLoading && items.length === 0 && (
                    <div className="p-4 text-sm text-muted-foreground text-center">暂无可用库存</div>
                  )}
                  {!isLoading &&
                    items.map((item) => (
                      <div key={item.itemId} className="p-3 text-sm flex gap-3 items-start">
                        <Checkbox checked={!!selectedMap[item.itemId]} onCheckedChange={(checked) => toggleSelect(item.itemId, Boolean(checked))} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium truncate">{item.itemName}</span>
                            <Badge variant="secondary">{item.itemCondition || 'NEW'}</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground flex flex-wrap gap-3 mt-1">
                            <span>ID: {item.itemId}</span>
                            <span>入库：{new Date(item.createdAt).toLocaleDateString()}</span>
                            <span>规格：{item.itemSize || '均码'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </ScrollArea>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => {
                    onOpenListing(selectedCount > 0 ? selectedIds : undefined)
                    onClose()
                  }}
                  disabled={template.stats.available <= 0}
                >
                  {selectedCount > 0 ? `上架已选 ${selectedCount} 件` : '按 FIFO 创建'}
                </Button>
                <Button variant="outline" className="flex-1" onClick={onClose}>
                  关闭
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

