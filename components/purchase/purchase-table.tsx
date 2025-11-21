'use client'

import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { BulkStatusDialog } from './bulk-status-dialog'
import { BulkLogisticsDialog } from './bulk-logistics-dialog'
import dynamic from 'next/dynamic'

const STATUS_TEXT: Record<string, string> = {
  PENDING: '待采购',
  IN_TRANSIT: '在途',
  AT_FORWARDER: '转运仓待发',
  LEAVING_CHINA: '已出境',
  AT_WAREHOUSE: '日本仓签收',
  DELIVERED: '已交付',
  COMPLETED: '已完成',
  EXCEPTION: '异常',
}

const PurchaseDetailDialog = dynamic(() => import('./purchase-detail-dialog').then(m => m.default || m), { ssr: false })

interface PurchaseTableProps {
  search?: string
  status?: string
  platform?: string
}

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init)
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error || 'Request failed')
  return json.data as T
}

const parseRemarks = (remarks?: string | null) => {
  if (!remarks) return { status: 'PENDING', platform: null, supplier: null }
  try {
    return JSON.parse(remarks)
  } catch {
    return { status: 'PENDING', platform: null, supplier: null }
  }
}

const parseDetailSpecs = (detail: any) => {
  if (!detail?.allocationMethod) return null
  try {
    const parsed = JSON.parse(detail.allocationMethod)
    return parsed?.specs || null
  } catch {
    return null
  }
}

const summarizeTemplates = (detail: any) => {
  const map = new Map<string, number>()
  if (detail.items && detail.items.length > 0) {
    detail.items.forEach((item: any) => {
      const label =
        item.template?.variantLabel ||
        item.template?.itemName ||
        item.itemName ||
        item.template?.itemSize ||
        '子SKU'
      map.set(label, (map.get(label) || 0) + 1)
    })
  } else {
    const specs = parseDetailSpecs(detail)
    const label = specs?.variantLabel || specs?.toyCharacterName || specs?.itemSize || detail.sku?.name || 'SKU'
    map.set(label, detail.quantity || 0)
  }
  return Array.from(map.entries()).map(([label, count]) => `${label} ×${count}`)
}

export default function PurchaseTable({ search, status, platform }: PurchaseTableProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [page, setPage] = React.useState(1)
  const [selectedOrder, setSelectedOrder] = React.useState<any>(null)
  const [selected, setSelected] = React.useState<Record<string, boolean>>({})
  const [showStatusDialog, setShowStatusDialog] = React.useState(false)
  const [showLogisticsDialog, setShowLogisticsDialog] = React.useState(false)

  const deleteMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await fetch(`/api/purchase/orders/${orderId}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || '删除失败')
      return json.data
    },
    onSuccess: () => {
      toast({ title: '删除成功', description: '采购单已删除' })
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      setSelectedOrder(null)
    },
    onError: (error: Error) => {
      toast({ title: '删除失败', description: error.message, variant: 'destructive' })
    },
  })

  const handleDelete = (order: any) => {
    if (!confirm(`确定要删除采购单 ${order.orderNumber} 吗？`)) return
    deleteMutation.mutate(order.id)
  }

  const qp = new URLSearchParams()
  qp.set('page', String(page))
  qp.set('pageSize', '20')
  if (search) qp.set('search', search)
  if (status) qp.set('status', status)
  if (platform) qp.set('platform', platform)

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-orders', Object.fromEntries(qp)],
    queryFn: () => fetchJson<{ total: number; data: any[] }>(`/api/purchase/orders?${qp.toString()}`),
  })

  const orders = data?.data || []
  const total = data?.total || 0
  const selectedIds = React.useMemo(() => orders.map(o => o.id).filter(id => selected[id]), [orders, selected])
  const selectedCount = selectedIds.length
  const firstSelectedMeta = React.useMemo(() => {
    const first = orders.find(o => selected[o.id])
    return first ? parseRemarks(first.remarks) : { status: 'PENDING' }
  }, [orders, selected])

  const getStatusColor = (status: string) => {
    const statusMap: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      IN_TRANSIT: 'bg-blue-100 text-blue-800',
      AT_WAREHOUSE: 'bg-purple-100 text-purple-800',
      COMPLETED: 'bg-green-100 text-green-800',
      EXCEPTION: 'bg-red-100 text-red-800',
    }
    return statusMap[status] || 'bg-gray-100 text-gray-800'
  }

  const toggleRow = (id: string, checked: boolean) => {
    setSelected(prev => ({ ...prev, [id]: checked }))
  }

  const toggleAll = (checked: boolean) => {
    if (checked) {
      const next: Record<string, boolean> = {}
      orders.forEach(order => {
        next[order.id] = true
      })
      setSelected(next)
    } else {
      setSelected({})
    }
  }

  const handleBulkStatus = async (payload: any) => {
    try {
      const res = await fetch('/api/purchase/orders/bulk-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: selectedIds, ...payload }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || '批量更新失败')
      toast({ title: '状态已更新', description: `成功更新 ${selectedIds.length} 条采购单` })
      setShowStatusDialog(false)
      setSelected({})
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
    } catch (error: any) {
      toast({ title: '批量更新失败', description: error.message, variant: 'destructive' })
    }
  }

  const handleBulkLogistics = async (payload: any) => {
    try {
      if (selectedIds.length === 0) return
      const res = await fetch('/api/logistics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          relatedType: 'PURCHASE_ORDER',
          relatedId: selectedIds[0],
          trackingNo: payload.trackingNo,
          status: payload.status,
          fromCountry: payload.fromCountry,
          fromNode: payload.fromNode,
          toCountry: payload.toCountry,
          toNode: payload.toNode,
          cost: payload.cost,
          currency: payload.currency,
          note: payload.note,
          allocations: selectedIds.map((id) => ({
            purchaseOrderId: id,
            note: payload.note,
          })),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || '创建物流失败')
      toast({ title: '物流记录已创建', description: '可前往物流页面查看详情' })
      setShowLogisticsDialog(false)
      setSelected({})
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
    } catch (error: any) {
      toast({ title: '创建物流失败', description: error.message, variant: 'destructive' })
    }
  }

  const statusLabel = (meta: any) => meta.platform ? `${meta.platform}` : '-'

  if (isLoading) {
    return <div className="text-center py-8">加载中...</div>
  }

  return (
    <div className="space-y-4">
      {selectedCount > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3">
          <div className="text-sm font-medium">已选择 {selectedCount} 个采购单</div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowStatusDialog(true)}>
              批量更新状态
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setShowLogisticsDialog(true)}>
              创建集运包裹
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelected({})}>
              清空
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={orders.length > 0 && selectedIds.length === orders.length}
                  onCheckedChange={(checked) => toggleAll(Boolean(checked))}
                  aria-label="全选"
                />
              </TableHead>
              <TableHead>采购单号</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>子SKU 明细</TableHead>
              <TableHead>总金额</TableHead>
              <TableHead>平台/供应商</TableHead>
              <TableHead>物流单号</TableHead>
              <TableHead>采购员</TableHead>
              <TableHead>采购日期</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order: any) => {
              const meta = parseRemarks(order.remarks)
              const skuCount = order.details?.length || 0
              const totalQty = order.details?.reduce((sum: number, d: any) => sum + (d.quantity || 0), 0) || 0
              return (
                <TableRow key={order.id} className="hover:bg-muted/50">
                  <TableCell>
                    <Checkbox
                      checked={!!selected[order.id]}
                      onCheckedChange={(checked) => toggleRow(order.id, Boolean(checked))}
                    />
                  </TableCell>
                  <TableCell className="font-semibold">{order.orderNumber}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(meta.status || 'PENDING')}>
                      {STATUS_TEXT[meta.status || 'PENDING'] || meta.status || 'PENDING'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <div className="text-sm text-foreground mb-1">共 {totalQty} 件</div>
                    <div className="space-y-1">
                      {order.details?.slice(0, 3).map((detail: any, index: number) => {
                        const lines = summarizeTemplates(detail)
                        return (
                          <div key={index} className="text-[11px] leading-tight">
                            <div className="font-medium text-foreground/80">{detail.sku?.name || 'SKU'}</div>
                            <div className="text-muted-foreground">
                              {lines.slice(0, 2).join('、')}
                              {lines.length > 2 && ' …'}
                            </div>
                          </div>
                        )
                      })}
                      {skuCount > 3 && (
                        <div className="text-[11px] text-muted-foreground">… 等 {skuCount} 个子SKU</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    ¥{Number(order.totalAmount).toLocaleString()} {order.currency}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{meta.platform || '-'}</div>
                    <div className="text-xs text-muted-foreground">{meta.supplier || '-'}</div>
                  </TableCell>
                  <TableCell className="text-xs">{meta.logisticsTrackingNo || '-'}</TableCell>
                  <TableCell className="text-sm">{order.createdBy?.name || '-'}</TableCell>
                  <TableCell className="text-sm">{new Date(order.purchaseDate).toLocaleDateString('zh-CN')}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => setSelectedOrder(order)}>
                      详情
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
            {orders.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  暂无采购单数据
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {total > 20 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
            上一页
          </Button>
          <span className="px-4 py-2 text-sm">
            第 {page} 页，共 {Math.ceil(total / 20)} 页
          </span>
          <Button variant="outline" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>
            下一页
          </Button>
        </div>
      )}

      {selectedOrder && (
        <PurchaseDetailDialog 
          order={selectedOrder} 
          onClose={() => setSelectedOrder(null)}
          onEdit={() => {
            // TODO: 实现编辑功能
            console.log('Edit order', selectedOrder.id)
          }}
          onDelete={() => handleDelete(selectedOrder)}
        />
      )}

      <BulkStatusDialog
        open={showStatusDialog}
        orderCount={selectedCount}
        defaultStatus={firstSelectedMeta?.status || 'PENDING'}
        onClose={() => setShowStatusDialog(false)}
        onConfirm={handleBulkStatus}
      />

      <BulkLogisticsDialog
        open={showLogisticsDialog}
        orderIds={selectedIds}
        onClose={() => setShowLogisticsDialog(false)}
        onConfirm={handleBulkLogistics}
      />
    </div>
  )
}

