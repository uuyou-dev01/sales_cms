'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'
import Image from 'next/image'

interface PurchaseDetailDialogProps {
  order: any
  onClose: () => void
  onEdit?: () => void
  onDelete?: () => void
}

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init)
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error || 'Request failed')
  return json.data as T
}

export default function PurchaseDetailDialog({ order, onClose, onEdit, onDelete }: PurchaseDetailDialogProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [metaForm, setMetaForm] = React.useState({
    status: 'PENDING',
    platform: '',
    supplier: '',
    logisticsTrackingNo: '',
    notes: '',
  })
  const [logisticsForm, setLogisticsForm] = React.useState({
    trackingNo: '',
    status: 'IN_TRANSIT',
    fromCountry: '',
    fromNode: '',
    toCountry: '',
    toNode: '',
    cost: '',
    currency: 'JPY',
  })
  
  const { data: orderDetail } = useQuery({
    queryKey: ['purchase-order', order.id],
    queryFn: () => fetchJson<any>(`/api/purchase/orders/${order.id}`),
    enabled: !!order.id,
    initialData: order, // 使用传入的 order 作为初始数据
  })

  // 获取物流信息
  const { data: logisticsData } = useQuery({
    queryKey: ['logistics', order.id],
    queryFn: () => fetchJson<any[]>(`/api/logistics?type=PURCHASE_ORDER&id=${order.id}`),
    enabled: !!order.id,
  })

  const orderData = orderDetail || order
  const logistics = logisticsData && Array.isArray(logisticsData) && logisticsData.length > 0 ? logisticsData[0] : null

  const syncInventoryMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/purchase/orders/${order.id}/sync-inventory`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || '同步失败')
      return json.data
    },
    onSuccess: () => {
      toast({ title: '库存同步成功', description: '采购单已成功同步到库存' })
      queryClient.invalidateQueries({ queryKey: ['purchase-order', order.id] })
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
    },
    onError: (error: Error) => {
      toast({ title: '同步失败', description: error.message, variant: 'destructive' })
    },
  })

  const isSynced = orderData.details?.some((d: any) => d.items?.length > 0)
  const nonInStockItemIds = React.useMemo(() => {
    if (!orderData?.details) return []
    const ids: string[] = []
    orderData.details.forEach((detail: any) => {
      detail.items?.forEach((item: any) => {
        if (item?.itemId && item.status !== 'IN_STOCK') {
          ids.push(item.itemId)
        }
      })
    })
    return ids
  }, [orderData?.details])

  const markItemsInStockMutation = useMutation({
    mutationFn: async (itemIds: string[]) => {
      if (!itemIds.length) return null
      const res = await fetch('/api/inventory/items/batch/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds, newStatus: 'IN_STOCK' }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || json?.message || '标记失败')
      return json.data
    },
    onSuccess: () => {
      toast({ title: '已标记为在库' })
      queryClient.invalidateQueries({ queryKey: ['purchase-order', order.id] })
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      queryClient.invalidateQueries({ queryKey: ['listings', 'item-candidates'] })
    },
    onError: (error: Error) => {
      toast({ title: '更新失败', description: error.message, variant: 'destructive' })
    },
  })

  const parseRemarks = (remarks?: string | null) => {
    if (!remarks) {
      return { status: 'PENDING', platform: null, supplier: null, notes: null, awaitingWarehouse: false }
    }
    try {
      const meta = JSON.parse(remarks)
      return {
        status: meta.status || 'PENDING',
        platform: meta.platform || null,
        supplier: meta.supplier || null,
        logisticsTrackingNo: meta.logisticsTrackingNo || null,
        notes: meta.notes || null,
        awaitingWarehouse: Boolean(meta.awaitingWarehouse),
      }
    } catch {
      return { status: 'PENDING', platform: null, supplier: null, notes: remarks, awaitingWarehouse: false }
    }
  }

  const meta = parseRemarks(orderData.remarks)
  React.useEffect(() => {
    setMetaForm({
      status: meta.status || 'PENDING',
      platform: meta.platform || '',
      supplier: meta.supplier || '',
      logisticsTrackingNo: meta.logisticsTrackingNo || '',
      notes: meta.notes || '',
    })
  }, [orderData.id, orderData.remarks])

  React.useEffect(() => {
    setLogisticsForm({
      trackingNo: logistics?.trackingNo || meta.logisticsTrackingNo || '',
      status: logistics?.status || 'IN_TRANSIT',
      fromCountry: logistics?.fromCountry || '',
      fromNode: logistics?.fromNode || '',
      toCountry: logistics?.toCountry || '',
      toNode: logistics?.toNode || '',
      cost: logistics?.cost ? String(logistics.cost) : '',
      currency: logistics?.currency || 'JPY',
    })
  }, [logistics?.id, meta.logisticsTrackingNo])

  const updateOrderMutation = useMutation({
    mutationFn: async (payload: typeof metaForm) => {
      const res = await fetch(`/api/purchase/orders/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          remarks: JSON.stringify({
            ...meta,
            ...payload,
          }),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || json?.message || '更新失败')
      return json.data
    },
    onSuccess: () => {
      toast({ title: '采购单已更新' })
      queryClient.invalidateQueries({ queryKey: ['purchase-order', order.id] })
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
    },
    onError: (error: Error) => {
      toast({ title: '更新失败', description: error.message, variant: 'destructive' })
    },
  })

  const logisticsMutation = useMutation({
    mutationFn: async (payload: typeof logisticsForm) => {
      const target = logistics ? `/api/logistics/${logistics.id}` : '/api/logistics'
      const method = logistics ? 'PUT' : 'POST'
      const body: Record<string, any> = {
        trackingNo: payload.trackingNo || undefined,
        status: payload.status,
        fromCountry: payload.fromCountry || undefined,
        fromNode: payload.fromNode || undefined,
        toCountry: payload.toCountry || undefined,
        toNode: payload.toNode || undefined,
        cost: payload.cost ? Number(payload.cost) : undefined,
        currency: payload.currency || undefined,
      }
      if (!logistics) {
        body.relatedType = 'PURCHASE_ORDER'
        body.relatedId = order.id
      }
      const res = await fetch(target, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || json?.message || '保存失败')
      return json.data
    },
    onSuccess: () => {
      toast({ title: '物流信息已保存' })
      queryClient.invalidateQueries({ queryKey: ['logistics', order.id] })
    },
    onError: (error: Error) => {
      toast({ title: '物流保存失败', description: error.message, variant: 'destructive' })
    },
  })

  const handleMetaInputChange = (field: keyof typeof metaForm, value: string) => {
    setMetaForm(prev => ({ ...prev, [field]: value }))
  }

  const handleLogisticsInputChange = (field: keyof typeof logisticsForm, value: string) => {
    setLogisticsForm(prev => ({ ...prev, [field]: value }))
  }

  const renderItemCard = (item: any, idx: number) => {
    const photo = item.template?.photos?.[0]
    return (
      <div key={item.itemId || idx} className="flex gap-3 border rounded-lg p-3">
        <div className="w-16 h-16 rounded bg-gray-50 flex items-center justify-center overflow-hidden">
          {photo ? (
            <Image src={photo} alt={item.itemName || 'sub-sku'} width={64} height={64} className="object-cover w-full h-full" />
          ) : (
            <span className="text-xs text-gray-400">暂无图片</span>
          )}
        </div>
        <div className="flex-1 text-sm">
          <div className="font-medium flex items-center gap-2">
            {item.itemName || '子SKU'}
            <Badge variant="outline">{item.status}</Badge>
          </div>
          <div className="text-gray-600">
            尺码: {item.itemSize || item.template?.itemSize || '-'} / 成色: {item.itemCondition || item.template?.itemCondition || '-'}
          </div>
          <div className="text-gray-500">
            模板: {item.template?.variantLabel || item.template?.itemName || '—'}
          </div>
        </div>
      </div>
    )
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

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      PENDING: '待采购',
      IN_TRANSIT: '在途',
      AT_FORWARDER: '转运仓待发',
      LEAVING_CHINA: '已出境',
      AT_WAREHOUSE: '日本仓签收',
      DELIVERED: '已交付',
      COMPLETED: '已完成',
      EXCEPTION: '异常',
    }
    return statusMap[status] || status
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 w-full max-w-5xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">采购单详情</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>关闭</Button>
        </div>

        <div className="space-y-6">
          {/* 基础信息 */}
          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">基础信息</h3>
                <p className="text-xs text-muted-foreground">可直接编辑状态、平台、供应商等信息</p>
              </div>
              <Button
                size="sm"
                onClick={() => updateOrderMutation.mutate(metaForm)}
                disabled={updateOrderMutation.isPending}
              >
                {updateOrderMutation.isPending ? '保存中...' : '保存'}
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-600 text-xs">采购单号</div>
                <div className="font-medium">{orderData.orderNumber}</div>
              </div>
              <div>
                <div className="text-gray-600 text-xs">采购日期</div>
                <div>{new Date(orderData.purchaseDate).toLocaleDateString('zh-CN')}</div>
              </div>
              <div>
                <div className="text-gray-600 text-xs">采购状态</div>
                <Select value={metaForm.status} onValueChange={(val) => handleMetaInputChange('status', val)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">待采购</SelectItem>
                    <SelectItem value="IN_TRANSIT">在途</SelectItem>
                    <SelectItem value="COMPLETED">已完成</SelectItem>
                    <SelectItem value="EXCEPTION">异常</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  采购状态仅用于记录。只有物流状态到达“日本仓签收”时，系统才会自动入库并进入可上架列表。
                </p>
              </div>
              <div>
                <div className="text-gray-600 text-xs">采购平台</div>
                <Input className="mt-1" value={metaForm.platform} onChange={(e) => handleMetaInputChange('platform', e.target.value)} placeholder="如 Mercari" />
              </div>
              <div>
                <div className="text-gray-600 text-xs">供应商</div>
                <Input className="mt-1" value={metaForm.supplier} onChange={(e) => handleMetaInputChange('supplier', e.target.value)} placeholder="供应商名称" />
              </div>
              <div>
                <div className="text-gray-600 text-xs">物流单号</div>
                <Input className="mt-1" value={metaForm.logisticsTrackingNo} onChange={(e) => handleMetaInputChange('logisticsTrackingNo', e.target.value)} placeholder="可选" />
              </div>
              <div>
                <div className="text-gray-600 text-xs">采购员</div>
                <div>{orderData.createdBy?.name || '-'}</div>
              </div>
              <div>
                <div className="text-gray-600 text-xs">总金额</div>
                <div className="text-lg font-bold text-green-600">
                  ¥{Number(orderData.totalAmount).toLocaleString()} {orderData.currency}
                </div>
              </div>
              <div className="md:col-span-2">
                <div className="text-gray-600 text-xs">备注</div>
                <Textarea rows={2} className="mt-1" value={metaForm.notes} onChange={(e) => handleMetaInputChange('notes', e.target.value)} placeholder="补充说明" />
              </div>
            </div>
          </Card>

          {/* 子SKU / Item 明细 */}
          <Card className="p-4">
            <h3 className="font-semibold mb-4">子SKU / Item 明细</h3>
            <div className="space-y-3">
              {orderData.details?.map((detail: any, idx: number) => {
                const specs = parseDetailSpecs(detail)
                const hasItems = detail.items && detail.items.length > 0
                return (
                  <div key={idx} className="p-3 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{detail.sku?.name || '未知SKU'}</div>
                        <div className="text-xs text-gray-500">SKU编号: {detail.skuId}</div>
                      </div>
                      <div className="text-sm text-gray-600">
                        数量 {detail.items?.length || 0}/{detail.quantity}
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="text-sm text-gray-600">
                        <div>单价: ¥{Number(detail.unitPrice || 0).toLocaleString()}</div>
                        <div>小计: ¥{Number(detail.allocatedCost || 0).toLocaleString()}</div>
                      </div>
                      {specs && (
                        <div className="text-sm text-gray-600">
                          <div>尺码/变体: {specs.itemSize || '均码'} / {specs.variantLabel || specs.toyCharacterName || '—'}</div>
                          <div>成色: {specs.itemCondition || 'NEW'} {specs.itemColor ? `颜色: ${specs.itemColor}` : ''}</div>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      {hasItems
                        ? detail.items.map(renderItemCard)
                        : (
                          <div className="text-xs text-gray-500 bg-gray-50 rounded p-3">
                            尚未生成 Item，待物流到货后同步入库。
                            {specs && (
                              <div>
                                计划规格：{specs.itemSize || '均码'} / {specs.itemCondition || 'NEW'} {specs.variantLabel ? `(${specs.variantLabel})` : ''}
                              </div>
                            )}
                          </div>
                        )}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* 物流信息 */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">物流信息</h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => logisticsMutation.mutate(logisticsForm)}
                disabled={logisticsMutation.isPending}
              >
                {logisticsMutation.isPending ? '保存中...' : logistics ? '保存物流' : '创建物流'}
              </Button>
            </div>
            <div className="grid md:grid-cols-2 gap-3 text-sm">
              <div className="space-y-1">
                <span className="text-gray-600 text-xs">物流单号</span>
                <Input value={logisticsForm.trackingNo} onChange={(e) => handleLogisticsInputChange('trackingNo', e.target.value)} placeholder="Tracking No." />
              </div>
              <div className="space-y-1">
                <span className="text-gray-600 text-xs">物流状态</span>
                <Select value={logisticsForm.status} onValueChange={(val) => handleLogisticsInputChange('status', val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">待创建</SelectItem>
                    <SelectItem value="IN_TRANSIT">国内在途</SelectItem>
                    <SelectItem value="AT_FORWARDER">转运仓待发</SelectItem>
                    <SelectItem value="LEAVING_CHINA">已出境</SelectItem>
                    <SelectItem value="AT_WAREHOUSE">日本仓签收</SelectItem>
                    <SelectItem value="DELIVERED">已交付</SelectItem>
                    <SelectItem value="EXCEPTION">异常</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <span className="text-gray-600 text-xs">出发地</span>
                <Input value={logisticsForm.fromCountry} onChange={(e) => handleLogisticsInputChange('fromCountry', e.target.value)} placeholder="国家/地区" />
                <Input value={logisticsForm.fromNode} onChange={(e) => handleLogisticsInputChange('fromNode', e.target.value)} placeholder="节点/仓库" className="mt-2" />
              </div>
              <div className="space-y-1">
                <span className="text-gray-600 text-xs">目的地</span>
                <Input value={logisticsForm.toCountry} onChange={(e) => handleLogisticsInputChange('toCountry', e.target.value)} placeholder="国家/地区" />
                <Input value={logisticsForm.toNode} onChange={(e) => handleLogisticsInputChange('toNode', e.target.value)} placeholder="节点/仓库" className="mt-2" />
              </div>
              <div className="space-y-1">
                <span className="text-gray-600 text-xs">物流费用</span>
                <div className="flex gap-2">
                  <Input value={logisticsForm.cost} onChange={(e) => handleLogisticsInputChange('cost', e.target.value)} placeholder="金额" />
                  <Input value={logisticsForm.currency} onChange={(e) => handleLogisticsInputChange('currency', e.target.value)} className="w-24" />
                </div>
              </div>
              <div className="text-xs text-gray-500 flex items-end">
                {logistics ? `最后更新：${new Date(logistics.updatedAt).toLocaleString('zh-CN')}` : '尚未创建物流记录'}
              </div>
            </div>
          </Card>

          {/* 库存同步状态 */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">库存同步状态</h3>
              {nonInStockItemIds.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => markItemsInStockMutation.mutate(nonInStockItemIds)}
                  disabled={markItemsInStockMutation.isPending}
                >
                  {markItemsInStockMutation.isPending
                    ? '处理中...'
                    : `标记 ${nonInStockItemIds.length} 件为在库`}
                </Button>
              )}
            </div>
            <div className="text-sm">
              {orderData.details?.some((d: any) => d.items?.length > 0) ? (
                <div className="flex items-center gap-2 text-green-600">
                  <span>✓</span>
                  <span>已同步库存</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-yellow-600">
                  <span>⏳</span>
                  <span>待同步库存</span>
                </div>
              )}
              {meta.awaitingWarehouse && (
                <div className="mt-3 text-xs text-yellow-700 flex items-center gap-2">
                  <span>⚠️</span>
                  <span>物流到达日本仓后系统会自动入库，如需提前可使用“标记为在库”。</span>
                </div>
              )}
            </div>
          </Card>

          {/* 操作按钮 */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            {!isSynced && (
              <Button 
                variant="outline" 
                onClick={() => syncInventoryMutation.mutate()}
                disabled={syncInventoryMutation.isPending}
              >
                {syncInventoryMutation.isPending ? '同步中...' : '同步库存'}
              </Button>
            )}
            {onEdit && !isSynced && (
              <Button variant="outline" onClick={onEdit}>编辑</Button>
            )}
            {onDelete && !isSynced && (
              <Button variant="destructive" onClick={onDelete}>删除</Button>
            )}
            <Button onClick={onClose}>关闭</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

