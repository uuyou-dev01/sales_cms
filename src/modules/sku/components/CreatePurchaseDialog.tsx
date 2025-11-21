'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
// import { Checkbox } from '@/components/ui/checkbox' // 不再使用Checkbox组件，改用原生input
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, X, Package, Search } from 'lucide-react'
import { format } from 'date-fns'
import { NewSubSkuDialog } from './NewSubSkuDialog'

const SmartSkuForm = dynamic(() => import('./SmartSkuForm'), { ssr: false })
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

function createSafeOrderNumber() {
  const now = new Date()
  const datePart = format(now, 'yyyyMMddHHmmss')
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `PO-${datePart}-${randomPart}`
}

interface CreatePurchaseDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: (result: { id: string; orderNumber: string }) => void
  initialSkuId?: string // 可选的初始SKU ID
  initialSkuName?: string // SKU名称（用于显示）
  navigationMode?: 'detail' | 'list' | 'stay' | 'continue' // 跳转模式
}

interface PurchaseDetail {
  skuId: string
  skuName?: string
  itemIds: string[] // 选择的已有Item ID列表
  quantity: number // 如果创建新Item或使用模板，指定数量
  unitPrice: number
  templateId?: string
  // 创建新Item或使用模板时的规格信息
  itemSize?: string
  itemCondition?: string
  itemColor?: string
  toyCharacterName?: string
  mode: 'USE_TEMPLATE' | 'SELECT_EXISTING' | 'CREATE_NEW'
}

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init)
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error || 'Request failed')
  return json.data as T
}

export function CreatePurchaseDialog({ open, onClose, onSuccess, initialSkuId, initialSkuName, navigationMode = 'list' }: CreatePurchaseDialogProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [orderNumber, setOrderNumber] = React.useState(() => createSafeOrderNumber())
  const [currency, setCurrency] = React.useState('CNY')
  const [purchaseDate, setPurchaseDate] = React.useState(new Date().toISOString().split('T')[0])
  const [platform, setPlatform] = React.useState('')
  const [supplier, setSupplier] = React.useState('')
  const [logisticsTrackingNo, setLogisticsTrackingNo] = React.useState('')
  const [remarks, setRemarks] = React.useState('')
  const [details, setDetails] = React.useState<PurchaseDetail[]>([])
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [searchSkuMap, setSearchSkuMap] = React.useState<Record<number, string>>({}) // 每个明细的SKU搜索关键词
  const [showCreateSku, setShowCreateSku] = React.useState(false)
  const [skuCreationDetailIndex, setSkuCreationDetailIndex] = React.useState<number | null>(null)
  const [showTemplateDialog, setShowTemplateDialog] = React.useState(false)
  const [templateSkuId, setTemplateSkuId] = React.useState<string | null>(null)
  const [templateDetailIndex, setTemplateDetailIndex] = React.useState<number | null>(null)
  const [feedback, setFeedback] = React.useState<{
    type: 'success' | 'error'
    title: string
    description: string
    suggestion?: string
  } | null>(null)
  const [pendingResult, setPendingResult] = React.useState<{ id: string; orderNumber: string } | null>(null)

  // 获取所有SKU列表（用于选择）
  const { data: skusData } = useQuery({
    queryKey: ['skus'],
    queryFn: () => fetchJson<{ total: number; data: any[] }>('/api/sku?pageSize=100'),
    enabled: open,
  })

  const skus = skusData?.data || []
  
  // 为每个明细获取过滤后的SKU列表
  const getFilteredSkus = (detailIndex: number) => {
    const searchSku = searchSkuMap[detailIndex] || ''
    if (!searchSku) return skus
    return skus.filter(sku => 
      sku.name.toLowerCase().includes(searchSku.toLowerCase()) ||
      sku.skuNumber?.toLowerCase().includes(searchSku.toLowerCase())
    )
  }

  // 获取所有明细中使用的SKU的Item列表
  const skuIds = React.useMemo(() => {
    return Array.from(new Set(details.map(d => d.skuId).filter(Boolean)))
  }, [details])

  // 批量获取所有SKU的Item列表（使用一个统一的hook）
  const skuItemsQueries = useQuery({
    queryKey: ['sku-items-batch', skuIds.sort().join(',')], // 使用排序后的ID列表作为key
    queryFn: async () => {
      if (skuIds.length === 0) return {}
      
      const results: Record<string, any[]> = {}
      await Promise.all(
        skuIds.map(async (skuId) => {
          try {
            const data = await fetchJson<any>(`/api/sku/${skuId}`)
            results[skuId] = data?.items || []
          } catch (error) {
            console.error(`Failed to fetch items for SKU ${skuId}:`, error)
            results[skuId] = []
          }
        })
      )
      return results
    },
    enabled: open && skuIds.length > 0,
  })

  const skuItemsMapFinal = skuItemsQueries.data || {}

  // 批量获取所有SKU的子SKU模板
  const skuTemplatesQueries = useQuery({
    queryKey: ['sku-sub-skus-batch', skuIds.sort().join(',')],
    queryFn: async () => {
      if (skuIds.length === 0) return {}
      const results: Record<string, any[]> = {}
      await Promise.all(
        skuIds.map(async (skuId) => {
          try {
            const data = await fetchJson<any[]>(`/api/sku/${skuId}/sub-skus`)
            results[skuId] = data || []
          } catch (error) {
            console.error(`Failed to fetch sub-skus for SKU ${skuId}:`, error)
            results[skuId] = []
          }
        })
      )
      return results
    },
    enabled: open && skuIds.length > 0,
  })

  const skuTemplatesMapFinal = skuTemplatesQueries.data || {}

  // 如果提供了初始SKU，添加第一个明细（只在对话框打开时初始化一次）
  const hasInitializedRef = React.useRef(false)
  
  React.useEffect(() => {
    if (open) {
      setOrderNumber(createSafeOrderNumber())
    }

    // 当对话框打开且提供了初始SKU时，初始化第一个明细
    if (open && initialSkuId && !hasInitializedRef.current) {
      setDetails([{
        skuId: initialSkuId,
        skuName: initialSkuName,
        itemIds: [],
        quantity: 1,
        unitPrice: 0,
        mode: 'USE_TEMPLATE',
      }])
      hasInitializedRef.current = true
    }
    
    // 当对话框关闭时，重置状态
    if (!open) {
      hasInitializedRef.current = false
      // 延迟重置，避免在关闭动画期间触发状态更新
      const timer = setTimeout(() => {
        setDetails([])
        setSearchSkuMap({})
        setOrderNumber(createSafeOrderNumber())
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [open, initialSkuId, initialSkuName]) // 移除 details.length 和 hasInitialized，避免循环

  // 添加采购明细（使用函数式更新，避免闭包问题）
  const addDetail = React.useCallback(() => {
    setDetails(prev => [...prev, {
      skuId: '',
      itemIds: [],
      quantity: 1,
      unitPrice: 0,
      mode: 'USE_TEMPLATE',
    }])
  }, [])

  // 移除采购明细（使用函数式更新，避免闭包问题）
  const removeDetail = React.useCallback((index: number) => {
    setDetails(prev => prev.filter((_, i) => i !== index))
  }, [])

  // 更新采购明细（使用函数式更新，避免闭包问题）
  const updateDetail = React.useCallback((index: number, field: keyof PurchaseDetail, value: any) => {
    setDetails(prev => {
      const updated = [...prev]
      if (field === 'itemIds') {
        updated[index] = {
          ...updated[index],
          itemIds: value,
          quantity: value.length // 自动更新数量
        }
      } else if (field === 'skuId') {
        // 更新SKU名称
        const sku = skus.find(s => s.id === value)
        updated[index] = {
          ...updated[index],
          skuId: value,
          skuName: sku?.name,
          itemIds: [], // 清空Item选择
          quantity: 0, // 重置数量
          templateId: undefined,
          itemSize: undefined,
          itemCondition: undefined,
          itemColor: undefined,
          toyCharacterName: undefined,
        }
      } else if (field === 'mode') {
        let nextState: Partial<PurchaseDetail> = {}
        if (value === 'SELECT_EXISTING') {
          nextState = {
            itemIds: updated[index].itemIds || [],
            quantity: updated[index].itemIds?.length || 0,
            templateId: undefined,
          }
        } else {
          nextState = {
            itemIds: [],
            quantity: updated[index].quantity > 0 ? updated[index].quantity : 1,
          }
          if (value !== 'USE_TEMPLATE') {
            nextState.templateId = undefined
          }
        }

        updated[index] = {
          ...updated[index],
          mode: value,
          ...nextState,
        }
      } else {
        updated[index] = { ...updated[index], [field]: value }
      }
      return updated
    })
  }, [skus])

  // 切换Item选择（使用函数式更新，避免闭包问题）
  const toggleItemSelection = React.useCallback((detailIndex: number, itemId: string) => {
    setDetails(prev => {
      const updated = [...prev]
      const detail = updated[detailIndex]
      if (!detail) return prev
      
      const currentItemIds = detail.itemIds || []
      const isSelected = currentItemIds.includes(itemId)
      
      let newItemIds: string[]
      if (isSelected) {
        newItemIds = currentItemIds.filter(id => id !== itemId)
      } else {
        newItemIds = [...currentItemIds, itemId]
      }
      
      updated[detailIndex] = {
        ...detail,
        itemIds: newItemIds,
        quantity: newItemIds.length // 自动更新数量
      }
      
      return updated
    })
  }, [])

  const applyTemplateToDetail = React.useCallback((detailIndex: number, template: any) => {
    setDetails(prev => {
      const updated = [...prev]
      const detail = updated[detailIndex]
      if (!detail) return prev

      updated[detailIndex] = {
        ...detail,
        templateId: template.id,
        itemSize: template.itemSize || '',
        itemCondition: template.itemCondition || 'NEW',
        itemColor: template.itemColor || '',
        toyCharacterName: template.toyCharacterName || '',
        quantity: detail.quantity > 0 ? detail.quantity : 1,
      }

      return updated
    })
  }, [])

  // 计算总金额（使用useMemo，避免每次渲染都重新计算）
  const totalAmount = React.useMemo(() => {
    return details.reduce((sum, detail) => {
      const qty = detail.itemIds.length > 0 ? detail.itemIds.length : detail.quantity
      return sum + (qty * detail.unitPrice)
    }, 0)
  }, [details])

  // 创建采购单
  const createPurchaseMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/purchase/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || '创建失败')
      return json.data
    },
    onSuccess: (data) => {
      toast({ title: '采购单创建成功', description: `采购单号: ${data.orderNumber}` })
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      queryClient.invalidateQueries({ queryKey: ['skus'] })
      queryClient.invalidateQueries({ queryKey: ['sku-items-batch'] })
      queryClient.invalidateQueries({ queryKey: ['sku-sub-skus-batch'] })

      if (navigationMode === 'continue') {
        setDetails([])
        setSearchSkuMap({})
        hasInitializedRef.current = false
        setOrderNumber(createSafeOrderNumber())
        return
      }

      setPendingResult({ id: data.id, orderNumber: data.orderNumber })
      setFeedback({
        type: 'success',
        title: '采购单创建成功',
        description: `采购单 ${data.orderNumber} 已成功创建，点击“返回上一页”即可查看详情。`,
      })
    },
    onError: (error: Error) => {
      toast({ title: '创建失败', description: error.message, variant: 'destructive' })
      setFeedback({
        type: 'error',
        title: '采购单创建失败',
        description: error.message || '发生未知错误',
        suggestion: '请刷新页面后重试，或稍后再次尝试。',
      })
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (details.length === 0) {
      toast({ title: '请至少添加一个采购明细', variant: 'destructive' })
      return
    }

    // 验证每个明细
    for (const detail of details) {
      if (!detail.skuId) {
        toast({ title: '请选择SKU', variant: 'destructive' })
        return
      }
      if (detail.mode === 'SELECT_EXISTING' && detail.itemIds.length === 0) {
        toast({ title: '请选择已有Item或切换到其他模式', variant: 'destructive' })
        return
      }
      if ((detail.mode === 'CREATE_NEW' || detail.mode === 'USE_TEMPLATE') && detail.quantity <= 0) {
        toast({ title: '请填写数量', variant: 'destructive' })
        return
      }
      if (detail.mode === 'USE_TEMPLATE' && !detail.templateId) {
        toast({ title: '请选择子SKU模板', variant: 'destructive' })
        return
      }
      if (detail.unitPrice <= 0) {
        toast({ title: '请填写单价', variant: 'destructive' })
        return
      }
    }

    setIsSubmitting(true)

    try {
      await createPurchaseMutation.mutateAsync({
        orderNumber,
        currency,
        purchaseDate: new Date(purchaseDate).toISOString(),
        platform: platform || undefined,
        supplier: supplier || undefined,
        logisticsTrackingNo: logisticsTrackingNo || undefined,
        status: 'PENDING',
        remarks: remarks || undefined,
        details: details.map(detail => {
          const isTemplateMode = detail.mode === 'USE_TEMPLATE'
          const isCreateMode = detail.mode === 'CREATE_NEW'
          const quantity = detail.itemIds.length > 0 ? detail.itemIds.length : detail.quantity
          const shouldAttachSpecs = isTemplateMode || isCreateMode
          return {
            skuId: detail.skuId,
            quantity,
            unitPrice: detail.unitPrice,
            itemIds: detail.itemIds.length > 0 ? detail.itemIds : undefined,
            templateId: isTemplateMode ? detail.templateId : undefined,
            itemSize: shouldAttachSpecs ? detail.itemSize : undefined,
            itemCondition: shouldAttachSpecs ? detail.itemCondition : undefined,
            itemColor: shouldAttachSpecs ? detail.itemColor : undefined,
            toyCharacterName: shouldAttachSpecs ? detail.toyCharacterName : undefined,
          }
        }),
        autoSyncInventory: true, // 立即入库
      })
    } catch (error) {
      // Error handled in mutation
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSkuCreationSuccess = React.useCallback(
    (result?: { id: string; name?: string }) => {
      setShowCreateSku(false)
      if (result?.id != null && skuCreationDetailIndex !== null) {
        setDetails(prev => {
          const updated = [...prev]
          const target = updated[skuCreationDetailIndex]
          if (!target) return prev
          updated[skuCreationDetailIndex] = {
            ...target,
            skuId: result.id,
            skuName: result.name || target.skuName,
            itemIds: [],
            quantity: 0,
            templateId: undefined,
            itemSize: undefined,
            itemCondition: undefined,
            itemColor: undefined,
            toyCharacterName: undefined,
          }
          return updated
        })
        setSearchSkuMap(prev => {
          const next = { ...prev }
          next[skuCreationDetailIndex] = ''
          return next
        })
      }
      setSkuCreationDetailIndex(null)
      queryClient.invalidateQueries({ queryKey: ['skus'] })
    },
    [queryClient, skuCreationDetailIndex]
  )

  const handleTemplateCreated = React.useCallback(() => {
    setShowTemplateDialog(false)
    queryClient.invalidateQueries({ queryKey: ['sku-sub-skus-batch'] })
    if (templateSkuId) {
      queryClient.invalidateQueries({ queryKey: ['sku', templateSkuId] })
    }
    setTemplateDetailIndex(null)
  }, [queryClient, templateSkuId])

  const handleFeedbackConfirm = () => {
    if (feedback?.type === 'success') {
      const result = pendingResult
      setFeedback(null)
      setPendingResult(null)
      hasInitializedRef.current = false
      if (result) {
        onSuccess(result)
      } else {
        onClose()
      }
      onClose()
      return
    }
    setFeedback(null)
  }

  if (!open && !showCreateSku && !showTemplateDialog) return null

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>创建采购单{initialSkuName ? ` - ${initialSkuName}` : ''}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 基本信息 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>采购单号 *</Label>
              <div className="flex gap-2">
                <Input
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  className="whitespace-nowrap"
                  onClick={() => setOrderNumber(createSafeOrderNumber())}
                >
                  重新生成
                </Button>
              </div>
            </div>
            <div>
              <Label>货币 *</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CNY">CNY (人民币)</SelectItem>
                  <SelectItem value="JPY">JPY (日元)</SelectItem>
                  <SelectItem value="USD">USD (美元)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>采购日期 *</Label>
              <Input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>平台</Label>
              <Input
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                placeholder="采购平台"
              />
            </div>
            <div>
              <Label>供应商</Label>
              <Input
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="供应商名称"
              />
            </div>
            <div>
              <Label>物流单号</Label>
              <Input
                value={logisticsTrackingNo}
                onChange={(e) => setLogisticsTrackingNo(e.target.value)}
                placeholder="物流跟踪号"
              />
            </div>
          </div>

          <div>
            <Label>备注</Label>
            <Input
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="备注信息"
            />
          </div>

          {/* 采购明细 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>采购明细</Label>
              <Button type="button" variant="outline" size="sm" onClick={addDetail}>
                <Plus className="h-4 w-4 mr-2" />
                添加明细
              </Button>
            </div>

            {details.map((detail, detailIndex) => {
              const skuItems = detail.skuId ? (skuItemsMapFinal[detail.skuId] || []) : []
              const availableItems = skuItems.filter((item: any) => item.status !== 'SOLD')
              const skuTemplates = detail.skuId ? (skuTemplatesMapFinal[detail.skuId] || []) : []
              
              // 计算每个Item的采购成本
              const itemsWithCost = availableItems.map((item: any) => {
                const purchaseDetail = item.purchaseDetail
                const purchaseCost = purchaseDetail?.unitPrice
                  ? Number(purchaseDetail.unitPrice)
                  : 0
                return {
                  ...item,
                  purchaseCost,
                  status: item.status || 'IN_STOCK',
                }
              })

              return (
                <Card key={detailIndex}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">明细 #{detailIndex + 1}</CardTitle>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDetail(detailIndex)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* SKU选择 */}
                    <div>
                      <Label>SKU *</Label>
                      <div className="space-y-2">
                        <div className="relative">
                          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                          <Input
                            value={searchSkuMap[detailIndex] || ''}
                            onChange={(e) => {
                              // 使用函数式更新，避免闭包问题
                              setSearchSkuMap(prev => ({
                                ...prev,
                                [detailIndex]: e.target.value
                              }))
                            }}
                            placeholder="搜索SKU..."
                            className="pl-8"
                          />
                        </div>
                        <Select
                          value={detail.skuId || ''}
                          onValueChange={(value) => {
                            // 使用函数式更新，避免闭包问题
                            setSearchSkuMap(prev => {
                              const updated = { ...prev }
                              updated[detailIndex] = ''
                              return updated
                            })
                            updateDetail(detailIndex, 'skuId', value)
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="选择SKU" />
                          </SelectTrigger>
                          <SelectContent>
                            {getFilteredSkus(detailIndex).map(sku => (
                              <SelectItem key={sku.id} value={sku.id}>
                                {sku.name} {sku.skuNumber && `(${sku.skuNumber})`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {detail.skuId && (
                          <p className="text-xs text-gray-500">
                            已选择: {skus.find(s => s.id === detail.skuId)?.name}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 pt-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSkuCreationDetailIndex(detailIndex)
                              setShowCreateSku(true)
                            }}
                          >
                            新建 SKU
                          </Button>
                          {detail.skuId && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setTemplateSkuId(detail.skuId)
                                setTemplateDetailIndex(detailIndex)
                                setShowTemplateDialog(true)
                              }}
                            >
                              新建子SKU模板
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 模式选择：选择已有Item或创建新Item */}
                    {detail.skuId && (
                      <div>
                        <Label>模式</Label>
                        <Select
                          value={detail.mode}
                          onValueChange={(value: 'USE_TEMPLATE' | 'SELECT_EXISTING' | 'CREATE_NEW') => updateDetail(detailIndex, 'mode', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USE_TEMPLATE">基于子SKU模板创建</SelectItem>
                            <SelectItem value="SELECT_EXISTING">选择已有Item</SelectItem>
                            <SelectItem value="CREATE_NEW">创建新Item</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* 单价和数量 */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>单价 *</Label>
                        <Input
                          type="number"
                          value={detail.unitPrice}
                          onChange={(e) => updateDetail(detailIndex, 'unitPrice', Number(e.target.value))}
                          required
                        />
                      </div>
                      <div>
                        <Label>数量</Label>
                        {detail.mode === 'SELECT_EXISTING' ? (
                          <div>
                            <Input
                              type="number"
                              value={detail.itemIds.length || 0}
                              disabled
                              className="bg-gray-50"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              {detail.itemIds.length > 0 
                                ? `已选择 ${detail.itemIds.length} 个Item，数量自动计算` 
                                : '请先选择Item'}
                            </p>
                          </div>
                        ) : (
                          <Input
                            type="number"
                            min="1"
                            value={detail.quantity || 1}
                            onChange={(e) => updateDetail(detailIndex, 'quantity', Math.max(1, Number(e.target.value) || 1))}
                            placeholder="数量"
                            required
                          />
                        )}
                      </div>
                    </div>

                    {/* 选择模板 */}
                    {detail.skuId && detail.mode === 'USE_TEMPLATE' && (
                      <div>
                        <Label>选择子SKU模板</Label>
                        <Card className="mt-2">
                          <CardContent className="p-3 space-y-2 max-h-60 overflow-y-auto">
                            {skuTemplates.length > 0 ? (
                              skuTemplates.map((template: any) => {
                                const isSelected = detail.templateId === template.id
                                const stats = template.stats || {}
                                const photo = template.photos?.[0]
                                return (
                                  <div
                                    key={template.id}
                                    className={`flex items-center gap-3 p-2 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                                      isSelected ? 'border-blue-500 bg-blue-50' : ''
                                    }`}
                                    onClick={() => applyTemplateToDetail(detailIndex, template)}
                                  >
                                    {photo ? (
                                      <img src={photo} alt={template.itemName} className="w-10 h-10 rounded object-cover border" />
                                    ) : (
                                      <div className="w-10 h-10 rounded border bg-gray-100 flex items-center justify-center">
                                        <Package className="h-4 w-4 text-gray-400" />
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <div className="font-medium truncate">{template.itemName}</div>
                                        <Badge variant="outline" className="text-[10px]">
                                          在库 {stats.inStock ?? 0}
                                        </Badge>
                                      </div>
                                      <div className="text-xs text-gray-500 truncate">
                                        {template.itemSize && <span>{template.itemSize}</span>}
                                        {template.itemCondition && <span className="ml-2">{template.itemCondition}</span>}
                                        {template.toyCharacterName && <span className="ml-2">{template.toyCharacterName}</span>}
                                      </div>
                                    </div>
                                  </div>
                                )
                              })
                            ) : (
                              <div className="text-center py-4 text-sm text-gray-500 space-y-3">
                                <div>{skuTemplatesQueries.isLoading ? '加载模板...' : '该SKU暂无模板，可以立即创建'}</div>
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => {
                                    setTemplateSkuId(detail.skuId)
                                    setTemplateDetailIndex(detailIndex)
                                    setShowTemplateDialog(true)
                                  }}
                                >
                                  新建子SKU模板
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    {/* 选择已有Item */}
                    {detail.skuId && detail.mode === 'SELECT_EXISTING' && (
                      <div>
                        <Label>选择已有Item</Label>
                        <Card className="mt-2">
                          <CardContent className="p-3">
                            {itemsWithCost.length > 0 ? (
                              <div className="space-y-2 max-h-48 overflow-y-auto">
                                {itemsWithCost.map((item: any) => {
                                  const isSelected = detail.itemIds.includes(item.itemId)
                                  
                                  return (
                                    <div
                                      key={item.itemId}
                                      className={`flex items-center gap-3 p-2 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                                        isSelected ? 'bg-blue-50 border-blue-300' : ''
                                      }`}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        toggleItemSelection(detailIndex, item.itemId)
                                      }}
                                    >
                                      <div
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          toggleItemSelection(detailIndex, item.itemId)
                                        }}
                                        className="flex items-center"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={(e) => {
                                            e.stopPropagation()
                                            toggleItemSelection(detailIndex, item.itemId)
                                          }}
                                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                      </div>
                                      <div 
                                        className="flex-1"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          toggleItemSelection(detailIndex, item.itemId)
                                        }}
                                      >
                                        <div className="font-medium">{item.itemName}</div>
                                        <div className="text-sm text-gray-500">
                                          {item.itemSize && <span>尺码: {item.itemSize}</span>}
                                          {item.itemCondition && <span className="ml-2">成色: {item.itemCondition}</span>}
                                          {item.toyCharacterName && <span className="ml-2">角色: {item.toyCharacterName}</span>}
                                          {item.batchNumber && <span className="ml-2">批次: {item.batchNumber}</span>}
                                        </div>
                                        <div className="text-xs text-gray-400 mt-1">
                                          成本: ¥{(item.purchaseCost || 0).toFixed(2)} | 入库时间: {item.createdAt ? format(new Date(item.createdAt), 'yyyy-MM-dd') : 'N/A'}
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            ) : detail.skuId ? (
                              <div className="text-center py-4 text-sm text-gray-500">
                                {skuItemsQueries.isLoading ? '加载中...' : '该SKU下暂无未售出的Item'}
                              </div>
                            ) : (
                              <div className="text-center py-4 text-sm text-gray-500">
                                请先选择SKU
                              </div>
                            )}
                            {detail.itemIds.length > 0 && (
                              <div className="mt-2 text-sm text-blue-600">
                                已选择 {detail.itemIds.length} 个Item
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    {/* 创建新Item的规格信息 */}
                    {detail.skuId && detail.mode === 'CREATE_NEW' && (
                      <div className="space-y-4">
                        <Label>Item规格信息（可选）</Label>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>尺码</Label>
                            <Input
                              value={detail.itemSize || ''}
                              onChange={(e) => updateDetail(detailIndex, 'itemSize', e.target.value)}
                              placeholder="如：26cm、XL"
                            />
                          </div>
                          <div>
                            <Label>成色</Label>
                            <Select
                              value={detail.itemCondition || ''}
                              onValueChange={(value) => updateDetail(detailIndex, 'itemCondition', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="选择成色" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="NEW">全新</SelectItem>
                                <SelectItem value="USED_A">中古A</SelectItem>
                                <SelectItem value="USED_B">中古B</SelectItem>
                                <SelectItem value="USED_C">中古C</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>颜色</Label>
                            <Input
                              value={detail.itemColor || ''}
                              onChange={(e) => updateDetail(detailIndex, 'itemColor', e.target.value)}
                              placeholder="颜色"
                            />
                          </div>
                          <div>
                            <Label>角色名称</Label>
                            <Input
                              value={detail.toyCharacterName || ''}
                              onChange={(e) => updateDetail(detailIndex, 'toyCharacterName', e.target.value)}
                              placeholder="如：米奇、米妮"
                            />
                          </div>
                        </div>
                        <p className="text-xs text-gray-500">
                          如果不填写规格信息，系统将创建默认规格的Item
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* 总金额 */}
          {details.length > 0 && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <Label>总金额</Label>
                  <span className="text-2xl font-bold">¥{totalAmount.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" disabled={isSubmitting || details.length === 0}>
              {isSubmitting ? '提交中...' : '创建采购单'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    {showCreateSku && (
      <Dialog
        open={showCreateSku}
        onOpenChange={(next) => {
          if (!next) {
            setShowCreateSku(false)
            setSkuCreationDetailIndex(null)
          }
        }}
      >
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>快速创建 SKU</DialogTitle>
          </DialogHeader>
          <SmartSkuForm onSuccess={handleSkuCreationSuccess} navigationMode="stay" />
        </DialogContent>
      </Dialog>
    )}

    {templateSkuId && (
      <NewSubSkuDialog
        open={showTemplateDialog}
        onClose={() => {
          setShowTemplateDialog(false)
          setTemplateDetailIndex(null)
        }}
        skuId={templateSkuId}
        onCreated={handleTemplateCreated}
      />
    )}
    <AlertDialog open={!!feedback} onOpenChange={(open) => {
      if (!open) {
        setFeedback(null)
      }
    }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{feedback?.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {feedback?.description}
            {feedback?.suggestion && (
              <span className="mt-2 block text-gray-500">{feedback.suggestion}</span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {feedback?.type === 'success' ? (
            <AlertDialogAction onClick={handleFeedbackConfirm}>
              返回上一页
            </AlertDialogAction>
          ) : (
            <>
              <AlertDialogCancel onClick={() => setFeedback(null)}>关闭</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setFeedback(null)
                  if (typeof window !== 'undefined') {
                    window.location.reload()
                  }
                }}
              >
                刷新页面
              </AlertDialogAction>
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}
