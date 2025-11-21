'use client'

import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Package, TrendingUp, DollarSign } from 'lucide-react'
import { calculateBundledSaleProfit, type BundledSaleParams } from '@/lib/profit-calculator'
import { format } from 'date-fns'

interface CreateSaleDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: (result?: { id: string }) => void
  initialSkuId?: string // 如果从SKU页面打开，预填充SKU
  initialItemId?: string // 如果从Item页面打开，预填充Item
  initialPlatformId?: string
  initialPlatformName?: string
  navigationMode?: 'detail' | 'list' | 'stay' | 'continue' // 跳转模式
}

interface SelectedItem {
  itemId: string
  itemName: string
  itemSize?: string
  itemCondition?: string
  purchaseCost: number
  batchNumber?: string
  quantity?: number
  manualPrice?: number
  listings?: Array<{
    id: string
    platformId: string
    status: string
    listingPrice?: string | number | null
    listingCurrency?: string | null
  }>
}

type PlatformOption = {
  id: string
  name: string
  baseFeeRate: number
  shippingFee?: number | null
  tierRules?: Record<string, unknown> | null
  region?: string | null
  market?: string | null
  currency?: string | null
  feeSchema?: Record<string, unknown> | null
  shippingTemplates?: Record<string, unknown> | null
  config?: Record<string, any> | null
  isActive?: boolean
}

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init)
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error || 'Request failed')
  return json.data as T
}

export function CreateSaleDialog({
  open,
  onClose,
  onSuccess,
  initialSkuId,
  initialItemId,
  initialPlatformId,
  initialPlatformName,
  navigationMode = 'list',
}: CreateSaleDialogProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [selectedItems, setSelectedItems] = React.useState<SelectedItem[]>([])
  const [skuId, setSkuId] = React.useState(initialSkuId || '')
  const [itemSize, setItemSize] = React.useState('')
  const [itemCondition, setItemCondition] = React.useState('')
  const [itemColor, setItemColor] = React.useState('')
  const [toyCharacterName, setToyCharacterName] = React.useState('')
  const [listingFilterMode, setListingFilterMode] = React.useState<'ALL' | 'LISTED_ONLY'>('ALL')
  const [showAdvancedFilters, setShowAdvancedFilters] = React.useState(false)
  const [totalSoldPrice, setTotalSoldPrice] = React.useState('')
  const [soldPriceCurrency, setSoldPriceCurrency] = React.useState('JPY')
  const [soldPriceExchangeRate, setSoldPriceExchangeRate] = React.useState('0.05')
  const [platformId, setPlatformId] = React.useState(initialPlatformId || '')
  const [soldPlatform, setSoldPlatform] = React.useState(initialPlatformName || '')
  const [soldDate, setSoldDate] = React.useState(new Date().toISOString().split('T')[0])
  const [domesticShipping, setDomesticShipping] = React.useState('')
  const [internationalShipping, setInternationalShipping] = React.useState('')
  const [priceAllocationMethod, setPriceAllocationMethod] = React.useState<'BY_COST' | 'BY_QUANTITY' | 'MANUAL'>('BY_COST')
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // 如果提供了initialItemId，需要先获取Item信息以获取skuId
  const { data: initialItemData } = useQuery({
    queryKey: ['item-detail', initialItemId],
    queryFn: () => fetchJson<any>(`/api/items/${initialItemId}/detail`),
    enabled: open && !!initialItemId && !initialSkuId, // 只有在没有initialSkuId时才查询
  })

  // 如果从initialItemData获取到skuId，自动设置
  React.useEffect(() => {
    if (initialItemData?.item?.skuId && !skuId) {
      setSkuId(initialItemData.item.skuId)
    }
  }, [initialItemData, skuId])

  React.useEffect(() => {
    if (open && initialPlatformId) {
      setPlatformId(initialPlatformId)
      if (initialPlatformName) {
        setSoldPlatform(initialPlatformName)
      }
    }
  }, [open, initialPlatformId, initialPlatformName])

  // 获取SKU列表
  const { data: skusData } = useQuery({
    queryKey: ['skus'],
    queryFn: () => fetchJson<{ total: number; data: any[] }>('/api/sku?pageSize=100'),
    enabled: open,
  })

  // 获取平台列表
  const { data: platformsData } = useQuery({
    queryKey: ['platforms'],
    queryFn: async () => {
      const res = await fetch('/api/platforms')
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Request failed')
      // API 返回的是 { items: [...] }，需要提取 items 字段
      const data = json.data?.items || json.data || []
      return Array.isArray(data) ? data : []
    },
    enabled: open,
  })
  
  // 确保 platformsData 是数组
  const platforms: PlatformOption[] = Array.isArray(platformsData) ? platformsData as PlatformOption[] : []

  // 获取可售Item列表
  const { data: availableItems } = useQuery({
    queryKey: ['available-items', skuId, itemSize, itemCondition, itemColor, toyCharacterName, platformId, listingFilterMode],
    queryFn: () => {
      const params = new URLSearchParams()
      if (skuId) params.append('skuId', skuId)
      if (itemSize) params.append('itemSize', itemSize)
      if (itemCondition && itemCondition !== '_ALL_') params.append('itemCondition', itemCondition)
      if (itemColor) params.append('itemColor', itemColor)
      if (toyCharacterName) params.append('toyCharacterName', toyCharacterName)
      if (platformId && platformId !== '_ALL_' && platformId !== '_NONE_') params.append('platformId', platformId)
      if (listingFilterMode === 'LISTED_ONLY') {
        params.append('requiresListing', 'true')
        params.append('listingStatus', 'LISTED')
      }
      return fetchJson<any[]>(`/api/sales/available-items?${params.toString()}`)
    },
    enabled: open && !!skuId,
  })

  // 如果从Item页面打开，自动选择该Item
  React.useEffect(() => {
    if (open && initialItemId) {
      // 方式1: 从availableItems中选择
      if (availableItems && availableItems.length > 0) {
        const item = availableItems.find((item: any) => item.itemId === initialItemId)
        if (item && item.status === 'IN_STOCK') {
          setSelectedItems(prev => {
            const isAlreadySelected = prev.some(selected => selected.itemId === item.itemId)
            if (!isAlreadySelected) {
              return [{
                itemId: item.itemId,
                itemName: item.itemName,
                itemSize: item.itemSize,
                itemCondition: item.itemCondition,
                purchaseCost: item.purchaseCost || 0,
                batchNumber: item.batchNumber,
                quantity: 1,
                listings: item.listings || [],
              }]
            }
            return prev
          })
        }
      }
      // 方式2: 从initialItemData直接获取（如果availableItems还没有加载）
      else if (initialItemData?.item && initialItemData.item.status === 'IN_STOCK') {
        const item = initialItemData.item
        // 获取采购成本
        const purchaseCost = initialItemData.purchase?.detail?.unitPrice
          ? Number(initialItemData.purchase.detail.unitPrice)
          : 0
        
        setSelectedItems(prev => {
          const isAlreadySelected = prev.some(selected => selected.itemId === item.itemId)
            if (!isAlreadySelected) {
              return [{
                itemId: item.itemId,
                itemName: item.itemName,
                itemSize: item.itemSize,
                itemCondition: item.itemCondition,
                purchaseCost,
                batchNumber: item.batchNumber,
                quantity: 1,
                listings: [],
              }]
            }
          return prev
        })
      }
    }
  }, [open, initialItemId, availableItems, initialItemData])

  // 获取平台配置（用于利润计算）
  const selectedPlatform = React.useMemo(
    () => platforms.find((p) => p.id === platformId && platformId !== '_ALL_' && platformId !== '_NONE_'),
    [platforms, platformId]
  )
  const previousPlatformRef = React.useRef<string | null>(null)

  React.useEffect(() => {
    if (!platformId || platformId === '_ALL_' || platformId === '_NONE_') {
      previousPlatformRef.current = null
      return
    }
    if (platformId !== previousPlatformRef.current) {
      previousPlatformRef.current = platformId
      if (selectedPlatform?.currency && selectedPlatform.currency !== soldPriceCurrency) {
        setSoldPriceCurrency(selectedPlatform.currency)
      }
      const defaultRate =
        typeof (selectedPlatform?.config as any)?.defaultExchangeRate === 'number'
          ? String((selectedPlatform?.config as any)?.defaultExchangeRate)
          : undefined
      if (defaultRate) {
        setSoldPriceExchangeRate(defaultRate)
      }
    }
  }, [platformId, selectedPlatform, soldPriceCurrency])

  React.useEffect(() => {
    if (selectedPlatform && !soldPlatform) {
      setSoldPlatform(selectedPlatform.name)
    }
  }, [selectedPlatform, soldPlatform])
  const platformConfig = selectedPlatform ? {
    baseFeeRate: selectedPlatform.baseFeeRate,
    shippingFee: selectedPlatform.shippingFee ? Number(selectedPlatform.shippingFee) : null,
    tierRules: selectedPlatform.tierRules,
  } : undefined

  // 计算利润预览
  const profitPreview = React.useMemo(() => {
    if (selectedItems.length === 0 || !totalSoldPrice || !soldPriceExchangeRate) return null

    try {
      const params: BundledSaleParams = {
        items: selectedItems.map(item => ({
          itemId: item.itemId,
          purchaseCost: item.purchaseCost,
          quantity: item.quantity || 1,
          manualPrice: item.manualPrice,
        })),
        totalSoldPrice: Number(totalSoldPrice),
        soldPriceCurrency,
        soldPriceExchangeRate: Number(soldPriceExchangeRate),
        platformConfig,
        shippingCost: (Number(domesticShipping) || 0) + (Number(internationalShipping) || 0),
        otherFees: [],
        priceAllocationMethod,
      }

      return calculateBundledSaleProfit(params)
    } catch (error) {
      console.error('Profit calculation error:', error)
      return null
    }
  }, [selectedItems, totalSoldPrice, soldPriceCurrency, soldPriceExchangeRate, platformConfig, domesticShipping, internationalShipping, priceAllocationMethod])

  const selectionTotals = React.useMemo(() => {
    const purchaseTotal = selectedItems.reduce(
      (sum, item) => sum + item.purchaseCost * (item.quantity || 1),
      0
    )
    const sold = Number(totalSoldPrice) || 0
    const platformFeeRate = selectedPlatform?.baseFeeRate ?? 0
    const platformFee = sold * platformFeeRate
    const shippingTotal = (Number(domesticShipping) || 0) + (Number(internationalShipping) || 0)
    const estimatedNet = sold - platformFee - shippingTotal - purchaseTotal
    return { purchaseTotal, platformFee, platformFeeRate, shippingTotal, sold, estimatedNet }
  }, [selectedItems, totalSoldPrice, selectedPlatform, domesticShipping, internationalShipping])

  // 切换Item选择
  const toggleItemSelection = React.useCallback(
    (item: any) => {
      setSelectedItems(prev => {
        const isSelected = prev.some(selected => selected.itemId === item.itemId)
        if (isSelected) {
          return prev.filter(selected => selected.itemId !== item.itemId)
        }
        return [
          ...prev,
          {
            itemId: item.itemId,
            itemName: item.itemName,
            itemSize: item.itemSize,
            itemCondition: item.itemCondition,
            purchaseCost: item.purchaseCost || 0,
            batchNumber: item.batchNumber,
            quantity: 1,
            listings: item.listings || [],
          },
        ]
      })
    },
    [setSelectedItems]
  )

  // 更新手动售价（仅当MANUAL模式时）
  const updateManualPrice = React.useCallback((itemId: string, price: number) => {
    setSelectedItems(prev =>
      prev.map(item =>
        item.itemId === itemId ? { ...item, manualPrice: price } : item
      )
    )
  }, [])

  // 创建销售单
  const createSaleMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/sales/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || '创建失败')
      return json.data
    },
    onSuccess: (data) => {
      toast({ title: '销售单创建成功' })
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['skus'] })
      queryClient.invalidateQueries({ queryKey: ['available-items'] })
      
      // 调用 onSuccess 回调，传递创建结果
      const transactionId = data?.transaction?.id || data?.id
      onSuccess(transactionId ? { id: transactionId } : undefined)
      
      // 如果是 'continue' 模式，不关闭对话框
      if (navigationMode === 'continue') {
        // 重置表单，准备创建下一个
        setSelectedItems([])
        setTotalSoldPrice('')
        setSkuId(initialSkuId || '')
        return
      }
      
      // 其他模式关闭对话框
      onClose()
      // 重置表单
      setSelectedItems([])
      setTotalSoldPrice('')
      setSkuId(initialSkuId || '')
    },
    onError: (error: Error) => {
      toast({ title: '创建失败', description: error.message, variant: 'destructive' })
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (selectedItems.length === 0) {
      toast({ title: '请至少选择一个商品', variant: 'destructive' })
      return
    }

    if (!totalSoldPrice || !soldPriceCurrency || !soldPriceExchangeRate || !soldDate) {
      toast({ title: '请填写完整的销售信息', variant: 'destructive' })
      return
    }

    // 验证手动售价（如果使用MANUAL模式）
    if (priceAllocationMethod === 'MANUAL') {
      const totalManualPrice = selectedItems.reduce((sum, item) => sum + (item.manualPrice || 0), 0)
      if (Math.abs(totalManualPrice - Number(totalSoldPrice)) > 0.01) {
        toast({ title: '手动售价总和必须等于总售价', variant: 'destructive' })
        return
      }
    }

    setIsSubmitting(true)

    try {
      await createSaleMutation.mutateAsync({
        items: selectedItems.map(item => ({
          itemId: item.itemId,
          quantity: item.quantity || 1,
          manualPrice: item.manualPrice,
        })),
        totalSoldPrice: Number(totalSoldPrice),
        soldPriceCurrency,
        soldPriceExchangeRate: Number(soldPriceExchangeRate),
        platformId: platformId && platformId !== '_ALL_' && platformId !== '_NONE_' ? platformId : undefined,
        soldPlatform: soldPlatform || undefined,
        soldDate: new Date(soldDate).toISOString(),
        domesticShipping: domesticShipping ? Number(domesticShipping) : 0,
        internationalShipping: internationalShipping ? Number(internationalShipping) : 0,
        priceAllocationMethod,
        orderStatus: '已完成',
      })
    } catch (error) {
      // Error handled in mutation
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!open) return null

  const skus = skusData?.data || []

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>创建销售单</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs defaultValue="items" className="w-full">
            <TabsList>
              <TabsTrigger value="items">
                <Package className="h-4 w-4 mr-2" />
                选择商品
              </TabsTrigger>
              <TabsTrigger value="sale-info">
                <DollarSign className="h-4 w-4 mr-2" />
                销售信息
              </TabsTrigger>
              <TabsTrigger value="profit">
                <TrendingUp className="h-4 w-4 mr-2" />
                利润预览
              </TabsTrigger>
            </TabsList>

            {/* 商品选择标签页 */}
            <TabsContent value="items" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label>SKU</Label>
                  <Select value={skuId} onValueChange={setSkuId}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择SKU" />
                    </SelectTrigger>
                    <SelectContent>
                      {skus.map((sku) => (
                        <SelectItem key={sku.id} value={sku.id}>
                          {sku.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>售出平台</Label>
                  <Select value={platformId} onValueChange={setPlatformId}>
                    <SelectTrigger>
                      <SelectValue placeholder="全部平台" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_ALL_">全部平台</SelectItem>
                      {platforms.map((platform) => (
                        <SelectItem key={platform.id} value={platform.id}>
                          {platform.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>规格 / 属性</Label>
                  <Input
                    value={itemSize}
                    onChange={(e) => setItemSize(e.target.value)}
                    placeholder="如：尺码、型号、版本"
                  />
                </div>
                <div>
                  <Label>成色</Label>
                  <Select value={itemCondition} onValueChange={setItemCondition}>
                    <SelectTrigger>
                      <SelectValue placeholder="全部成色" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_ALL_">全部成色</SelectItem>
                      <SelectItem value="NEW">全新</SelectItem>
                      <SelectItem value="USED_A">中古 A</SelectItem>
                      <SelectItem value="USED_B">中古 B</SelectItem>
                      <SelectItem value="USED_C">中古 C</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="text-xs"
                  onClick={() => setShowAdvancedFilters((prev) => !prev)}
                >
                  {showAdvancedFilters ? '收起高级筛选' : '展开高级筛选'}
                </Button>
                {selectedPlatform && (
                  <div className="text-xs text-gray-500">
                    当前平台：{selectedPlatform.name} · 手续费 {((selectedPlatform.baseFeeRate ?? 0) * 100).toFixed(2)}%
                  </div>
                )}
              </div>
              {showAdvancedFilters && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>颜色 / 特征</Label>
                    <Input
                      value={itemColor}
                      onChange={(e) => setItemColor(e.target.value)}
                      placeholder="如：黑红、限定配色"
                    />
                  </div>
                  <div>
                    <Label>角色 / 主题</Label>
                    <Input
                      value={toyCharacterName}
                      onChange={(e) => setToyCharacterName(e.target.value)}
                      placeholder="如：米奇、EVA 初号机"
                    />
                  </div>
                  <div>
                    <Label>上架筛选</Label>
                    <Select
                      value={listingFilterMode}
                      onValueChange={(value) => setListingFilterMode(value as 'ALL' | 'LISTED_ONLY')}
                      disabled={!platformId}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">全部库存</SelectItem>
                        <SelectItem value="LISTED_ONLY" disabled={!platformId}>
                          仅显示当前平台已上架
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {!platformId && (
                      <p className="text-xs text-gray-400 mt-1">请选择平台后可筛选上架状态</p>
                    )}
                  </div>
                </div>
              )}

              {/* 可售Item列表 */}
              {availableItems && availableItems.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">可售商品（FIFO排序）</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {availableItems.map((item: any) => {
                        const isSelected = selectedItems.some(selected => selected.itemId === item.itemId)
                        const listingForPlatform = platformId
                          ? (item.listings || []).find((listing: any) => listing.platformId === platformId)
                          : (item.listings || [])[0]
                        return (
                          <div
                            key={item.itemId}
                            className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                              isSelected ? 'bg-blue-50 border-blue-300' : ''
                            }`}
                            onClick={() => toggleItemSelection(item)}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              readOnly
                              className="h-4 w-4 accent-blue-600"
                            />
                            <div className="flex-1">
                              <div className="font-medium flex items-center justify-between gap-2">
                                <span>{item.itemName}</span>
                                {listingForPlatform ? (
                                  <Badge variant="outline" className="text-[10px]">
                                    {listingForPlatform.status}
                                    {listingForPlatform.listingPrice
                                      ? ` · ${listingForPlatform.listingPrice} ${listingForPlatform.listingCurrency || ''}`
                                      : ''}
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-[10px]">未上架</Badge>
                                )}
                              </div>
                              <div className="text-sm text-gray-500 flex flex-wrap gap-2">
                                {item.itemSize && <span>规格: {item.itemSize}</span>}
                                {item.itemCondition && <span>成色: {item.itemCondition}</span>}
                                {item.batchNumber && <span>批次: {item.batchNumber}</span>}
                              </div>
                              <div className="text-xs text-gray-400">
                                成本: ¥{item.purchaseCost?.toFixed(2) || '0.00'} | 入库时间: {format(new Date(item.createdAt), 'yyyy-MM-dd')}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              ) : skuId ? (
                <div className="text-center py-8 text-gray-500">暂无可售商品</div>
              ) : (
                <div className="text-center py-8 text-gray-500">请先选择SKU</div>
              )}

              {/* 已选商品列表 */}
              {selectedItems.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">已选商品 ({selectedItems.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs text-gray-500">
                            <th className="py-2">商品</th>
                            <th className="py-2">规格 / 成色</th>
                            <th className="py-2 text-right">采购成本</th>
                            <th className="py-2 text-right">数量</th>
                            <th className="py-2 text-right">平台状态</th>
                            <th className="py-2 text-right">操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedItems.map((item, index) => {
                            const listingForPlatform = platformId
                              ? item.listings?.find((listing) => listing.platformId === platformId)
                              : item.listings?.[0]
                            return (
                              <tr key={item.itemId} className="border-t">
                                <td className="py-2">
                                  <div className="font-medium">{item.itemName}</div>
                                  {item.batchNumber && (
                                    <div className="text-xs text-gray-400">批次: {item.batchNumber}</div>
                                  )}
                                </td>
                                <td className="py-2 text-gray-500">
                                  {item.itemSize && <div>规格: {item.itemSize}</div>}
                                  {item.itemCondition && <div>成色: {item.itemCondition}</div>}
                                </td>
                                <td className="py-2 text-right">¥{item.purchaseCost.toFixed(2)}</td>
                                <td className="py-2 text-right">{item.quantity || 1}</td>
                                <td className="py-2 text-right">
                                  {listingForPlatform ? (
                                    <Badge variant="outline" className="text-[10px]">
                                      {listingForPlatform.status}
                                    </Badge>
                                  ) : (
                                    <span className="text-xs text-gray-400">未上架</span>
                                  )}
                                </td>
                                <td className="py-2 text-right">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      setSelectedItems((prev) => prev.filter((_, i) => i !== index))
                                    }
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                      <span>采购总成本</span>
                      <span className="font-semibold">¥{selectionTotals.purchaseTotal.toFixed(2)}</span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* 销售信息标签页 */}
            <TabsContent value="sale-info" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>总售价 *</Label>
                  <Input
                    type="number"
                    value={totalSoldPrice}
                    onChange={(e) => setTotalSoldPrice(e.target.value)}
                    placeholder="输入总售价"
                    required
                  />
                </div>
                <div>
                  <Label>货币</Label>
                  <Select value={soldPriceCurrency} onValueChange={setSoldPriceCurrency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="JPY">JPY (日元)</SelectItem>
                      <SelectItem value="CNY">CNY (人民币)</SelectItem>
                      <SelectItem value="USD">USD (美元)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>汇率 *</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={soldPriceExchangeRate}
                    onChange={(e) => setSoldPriceExchangeRate(e.target.value)}
                    placeholder="汇率"
                    required
                  />
                </div>
                <div>
                  <Label>售出日期 *</Label>
                  <Input
                    type="date"
                    value={soldDate}
                    onChange={(e) => setSoldDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label>销售平台</Label>
                  <Select value={platformId} onValueChange={setPlatformId}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择平台" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_NONE_">无</SelectItem>
                      {platforms.map(platform => (
                        <SelectItem key={platform.id} value={platform.id}>
                          {platform.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>平台名称</Label>
                  <Input
                    value={soldPlatform}
                    onChange={(e) => setSoldPlatform(e.target.value)}
                    placeholder="如：Mercari"
                  />
                </div>
                <div>
                  <Label>国内运费</Label>
                  <Input
                    type="number"
                    value={domesticShipping}
                    onChange={(e) => setDomesticShipping(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label>国际运费</Label>
                  <Input
                    type="number"
                    value={internationalShipping}
                    onChange={(e) => setInternationalShipping(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>

              {selectedPlatform && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">平台信息</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-gray-500 text-xs">所在市场</div>
                        <div className="font-medium">{selectedPlatform.market || selectedPlatform.region || '未填写'}</div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-xs">结算币种</div>
                        <div className="font-medium">{selectedPlatform.currency || 'JPY'}</div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-xs">基础手续费</div>
                        <div className="font-medium">
                          {((selectedPlatform.baseFeeRate ?? 0) * 100).toFixed(2)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-xs">默认邮费</div>
                        <div className="font-medium">
                          {selectedPlatform.shippingFee ? `¥${selectedPlatform.shippingFee}` : '未设置'}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {selectedItems.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">金额与利润预估</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-gray-500 text-xs">采购总成本</div>
                        <div className="font-semibold">¥{selectionTotals.purchaseTotal.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-xs">预计平台费</div>
                        <div className="font-semibold">
                          ¥{selectionTotals.platformFee.toFixed(2)}{' '}
                          {selectedPlatform && `(费率 ${(selectionTotals.platformFeeRate * 100).toFixed(2)}%)`}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-xs">运费合计</div>
                        <div className="font-semibold">¥{selectionTotals.shippingTotal.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-xs">预计净收益</div>
                        <div className={`font-semibold ${selectionTotals.estimatedNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ¥{selectionTotals.estimatedNet.toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-3">
                      上述为实时估算，最终利润以采购单/物流分摊及实际订单费用为准。
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* 售价分摊方式 */}
              <div>
                <Label>售价分摊方式</Label>
                <Select value={priceAllocationMethod} onValueChange={(v: any) => setPriceAllocationMethod(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BY_COST">按成本比例分摊（默认）</SelectItem>
                    <SelectItem value="BY_QUANTITY">按数量平均分摊</SelectItem>
                    <SelectItem value="MANUAL">手动指定</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  {priceAllocationMethod === 'BY_COST' && '高成本商品承担更多售价，利润分配更合理'}
                  {priceAllocationMethod === 'BY_QUANTITY' && '每个商品平均分配售价，简单直观'}
                  {priceAllocationMethod === 'MANUAL' && '手动指定每个商品的售价，最灵活'}
                </p>
              </div>

              {/* 手动指定售价（仅当MANUAL模式时） */}
              {priceAllocationMethod === 'MANUAL' && selectedItems.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">手动指定售价</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {selectedItems.map((item) => (
                        <div key={item.itemId} className="flex items-center gap-3">
                          <div className="flex-1">
                            <Label className="text-xs">{item.itemName}</Label>
                          </div>
                          <Input
                            type="number"
                            value={item.manualPrice || ''}
                            onChange={(e) => updateManualPrice(item.itemId, Number(e.target.value))}
                            placeholder="售价"
                            className="w-32"
                          />
                          <span className="text-sm text-gray-500">{soldPriceCurrency}</span>
                        </div>
                      ))}
                      <div className="text-xs text-gray-500 mt-2">
                        总售价: {selectedItems.reduce((sum, item) => sum + (item.manualPrice || 0), 0).toFixed(2)} {soldPriceCurrency}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* 利润预览标签页 */}
            <TabsContent value="profit" className="space-y-4">
              {profitPreview ? (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">利润摘要</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-gray-500">总成本</Label>
                          <p className="text-2xl font-bold">¥{profitPreview.totalCost.toFixed(2)}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">总售价（人民币）</Label>
                          <p className="text-2xl font-bold text-green-600">¥{profitPreview.totalSoldPriceCNY.toFixed(2)}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">平台费用</Label>
                          <p className="text-xl font-semibold">¥{profitPreview.platformFee.toFixed(2)}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">物流费用</Label>
                          <p className="text-xl font-semibold">¥{profitPreview.shippingCost.toFixed(2)}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">总利润</Label>
                          <p className="text-2xl font-bold text-blue-600">¥{profitPreview.totalProfit.toFixed(2)}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">利润率</Label>
                          <p className="text-2xl font-bold text-blue-600">{profitPreview.totalProfitRate.toFixed(2)}%</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">商品明细</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {profitPreview.itemDetails.map((detail) => {
                          const item = selectedItems.find(i => i.itemId === detail.itemId)
                          return (
                            <div key={detail.itemId} className="flex items-center justify-between p-3 border rounded-lg">
                              <div>
                                <div className="font-medium">{item?.itemName || detail.itemId}</div>
                                <div className="text-xs text-gray-500">
                                  成本: ¥{detail.purchaseCost.toFixed(2)} × {detail.quantity}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-medium">售价: ¥{detail.allocatedSoldPrice.toFixed(2)}</div>
                                <div className={`text-sm ${detail.allocatedProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  利润: ¥{detail.allocatedProfit.toFixed(2)} ({detail.profitRate.toFixed(2)}%)
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  请先选择商品并填写销售信息
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" disabled={isSubmitting || selectedItems.length === 0}>
              {isSubmitting ? '提交中...' : '创建销售单'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

