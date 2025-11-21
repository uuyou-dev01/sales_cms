'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useQuery } from '@tanstack/react-query'
import { Plus, X, Trash2 } from 'lucide-react'

interface PurchaseCreateDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

interface SkuDetail {
  skuId: string
  quantity: number
  unitPrice: number
  variant?: string
  itemCondition?: string
}

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init)
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error || 'Request failed')
  return json.data as T
}

export default function PurchaseCreateDialog({ open, onClose, onSuccess }: PurchaseCreateDialogProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [orderNumber, setOrderNumber] = React.useState(`PO-${Date.now()}`)
  const [currency, setCurrency] = React.useState('CNY')
  const [purchaseDate, setPurchaseDate] = React.useState(new Date().toISOString().split('T')[0])
  const [platform, setPlatform] = React.useState('')
  const [supplier, setSupplier] = React.useState('')
  const [logisticsTrackingNo, setLogisticsTrackingNo] = React.useState('')
  const [remarks, setRemarks] = React.useState('')
  const [skuDetails, setSkuDetails] = React.useState<SkuDetail[]>([])

  // 获取 SKU 列表
  const { data: skusData } = useQuery({
    queryKey: ['skus'],
    queryFn: () => fetchJson<{ total: number; data: any[] }>('/api/sku?pageSize=100'),
  })

  const skus = skusData?.data || []

  const addSkuDetail = () => {
    setSkuDetails([...skuDetails, { skuId: '', quantity: 1, unitPrice: 0 }])
  }

  const removeSkuDetail = (index: number) => {
    setSkuDetails(skuDetails.filter((_, i) => i !== index))
  }

  const updateSkuDetail = (index: number, field: keyof SkuDetail, value: any) => {
    const updated = [...skuDetails]
    updated[index] = { ...updated[index], [field]: value }
    setSkuDetails(updated)
  }

  const calculateTotal = () => {
    return skuDetails.reduce((sum, detail) => sum + (detail.quantity * detail.unitPrice), 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (skuDetails.length === 0) {
      toast({ title: '请至少添加一个SKU', variant: 'destructive' })
      return
    }

    if (skuDetails.some(d => !d.skuId || d.quantity <= 0 || d.unitPrice <= 0)) {
      toast({ title: '请完善所有SKU信息', variant: 'destructive' })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/purchase/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderNumber,
          currency,
          purchaseDate: new Date(purchaseDate).toISOString(),
          platform: platform || undefined,
          supplier: supplier || undefined,
          logisticsTrackingNo: logisticsTrackingNo || undefined,
          status: 'PENDING',
          remarks: remarks || undefined,
          details: skuDetails,
        }),
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || '创建失败')
      }

      toast({ title: '采购单创建成功', description: `采购单号: ${orderNumber}` })
      onSuccess()
    } catch (error) {
      toast({ 
        title: '创建失败', 
        description: error instanceof Error ? error.message : '未知错误',
        variant: 'destructive' 
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 w-full max-w-5xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">新建采购单</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>关闭</Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>采购单号 *</Label>
              <Input value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>货币 *</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CNY">CNY</SelectItem>
                  <SelectItem value="JPY">JPY</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>采购日期 *</Label>
              <Input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>采购平台</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger><SelectValue placeholder="选择平台" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mercari">Mercari</SelectItem>
                  <SelectItem value="Yahoo">Yahoo</SelectItem>
                  <SelectItem value="淘宝">淘宝</SelectItem>
                  <SelectItem value="闲鱼">闲鱼</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>供应商</Label>
              <Input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="供应商名称" />
            </div>
            <div className="space-y-2">
              <Label>物流单号</Label>
              <Input value={logisticsTrackingNo} onChange={(e) => setLogisticsTrackingNo(e.target.value)} placeholder="物流追踪单号（可选）" />
            </div>
            <div className="space-y-2">
              <Label>备注</Label>
              <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="备注信息" />
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-4">
              <Label className="text-lg">SKU 明细 *</Label>
              <Button type="button" size="sm" onClick={addSkuDetail}>
                <Plus className="w-4 h-4 mr-2" />
                添加SKU
              </Button>
            </div>

            <div className="space-y-3">
              {skuDetails.map((detail, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">SKU #{index + 1}</span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeSkuDetail(index)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <Label>SKU *</Label>
                      <Select value={detail.skuId} onValueChange={(v) => updateSkuDetail(index, 'skuId', v)}>
                        <SelectTrigger><SelectValue placeholder="选择SKU" /></SelectTrigger>
                        <SelectContent>
                          {skus.map((sku: any) => (
                            <SelectItem key={sku.id} value={sku.id}>{sku.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>数量 *</Label>
                      <Input 
                        type="number" 
                        value={detail.quantity} 
                        onChange={(e) => updateSkuDetail(index, 'quantity', parseInt(e.target.value) || 0)}
                        min="1"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>单价 *</Label>
                      <Input 
                        type="number" 
                        value={detail.unitPrice} 
                        onChange={(e) => updateSkuDetail(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>变体/尺寸</Label>
                      <Input 
                        value={detail.variant || ''} 
                        onChange={(e) => updateSkuDetail(index, 'variant', e.target.value)}
                        placeholder="如：26cm"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>小计: ¥{(detail.quantity * detail.unitPrice).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>

            {skuDetails.length === 0 && (
              <div className="text-center py-8 text-gray-500 border border-dashed rounded">
                点击「添加SKU」开始添加采购明细
              </div>
            )}

            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-semibold">总金额:</span>
                <span className="text-xl font-bold">¥{calculateTotal().toLocaleString()} {currency}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>取消</Button>
            <Button type="submit" disabled={isSubmitting} className="bg-green-500 hover:bg-green-600">
              {isSubmitting ? '创建中...' : '创建采购单'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

