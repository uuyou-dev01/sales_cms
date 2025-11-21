'use client'

import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useQuery } from '@tanstack/react-query'
import { generateItemName } from '@/src/modules/sku/utils/item-name-generator'
import { useToast } from '@/hooks/use-toast'

interface Props {
  open: boolean
  onClose: () => void
  skuId: string
  defaultBrand?: string | null
  defaultCategoryName?: string | null
  onCreated?: () => void
}

const CONDITION_OPTIONS: Array<{ value: string; label: string; hint?: string }> = [
  { value: 'NEW', label: '全新 (NEW)' },
  { value: 'USED_A', label: '中古 A', hint: '几乎全新，包装轻微磨损' },
  { value: 'USED_B', label: '中古 B', hint: '有轻微使用痕迹' },
  { value: 'USED_C', label: '中古 C', hint: '明显使用痕迹' },
]

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init)
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error || 'Request failed')
  return json.data as T
}

export function NewSubSkuDialog({ open, onClose, skuId, defaultBrand, defaultCategoryName, onCreated }: Props) {
  const { toast } = useToast()
  const [itemSize, setItemSize] = React.useState('')
  const [condition, setCondition] = React.useState<string>('NEW')
  const [itemNumber, setItemNumber] = React.useState('')
  const [itemColor, setItemColor] = React.useState('')
  const [variantLabel, setVariantLabel] = React.useState('') // 变体标签（通用，替代toyCharacterName）
  const [remarks, setRemarks] = React.useState('')
  const [photos, setPhotos] = React.useState<string[]>([])
  const [imageUrl, setImageUrl] = React.useState('')
  const [recommendedPrice, setRecommendedPrice] = React.useState('')
  const [recommendedPriceCurrency, setRecommendedPriceCurrency] = React.useState('JPY')
  const [saving, setSaving] = React.useState(false)

  // 获取SKU信息
  const { data: sku } = useQuery({
    queryKey: ['sku', skuId],
    queryFn: () => fetchJson<any>(`/api/sku/${skuId}`),
    enabled: open && !!skuId,
  })

  // 生成Item名称预览
  const itemNamePreview = React.useMemo(() => {
    if (!sku?.name) return ''
    return generateItemName({
      skuName: sku.name,
      itemSize: itemSize || '均码',
      itemCondition: condition,
      variantLabel: variantLabel || null,
    })
  }, [sku?.name, itemSize, condition, variantLabel])

  const resetForm = () => {
    setItemSize('')
    setCondition('NEW')
    setItemNumber('')
    setItemColor('')
    setVariantLabel('')
    setRemarks('')
    setPhotos([])
    setImageUrl('')
    setRecommendedPrice('')
    setRecommendedPriceCurrency('JPY')
  }

  React.useEffect(() => {
    if (!open) {
      resetForm()
    }
  }, [open])

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const form = new FormData()
    Array.from(files).forEach(f => form.append('file', f))
    const res = await fetch('/api/upload', { method: 'POST', body: form })
    const json = await res.json()
    if (res.ok) {
      const urls: string[] = json.urls || (json.url ? [json.url] : [])
      setPhotos(prev => [...prev, ...urls])
    }
  }

  const addImageUrl = () => {
    if (!imageUrl.trim()) return
    setPhotos(prev => [...prev, imageUrl.trim()])
    setImageUrl('')
  }

  const onSubmit = async () => {
    if (!sku?.name) {
      toast({
        title: '错误',
        description: 'SKU信息加载失败，请重试',
        variant: 'destructive',
      })
      return
    }
    
    setSaving(true)
    try {
      // 调用新的模板 API
      const res = await fetch(`/api/sku/${skuId}/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemSize: itemSize.trim() || '均码',
          itemCondition: condition,
          variantLabel: variantLabel.trim() || undefined,
          itemColor: itemColor.trim() || undefined,
          itemRemarks: remarks.trim() || undefined,
          photos,
          recommendedPrice: recommendedPrice ? Number(recommendedPrice) : undefined,
          recommendedPriceCurrency: recommendedPriceCurrency || 'JPY',
        }),
      })
      
      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        throw new Error(error?.message || error?.error || '创建失败')
      }
      
      toast({
        title: '创建成功',
        description: `子SKU模板 "${itemNamePreview}" 已创建`,
      })
      
      onCreated?.()
      onClose()
      resetForm()
    } catch (error) {
      toast({
        title: '创建失败',
        description: error instanceof Error ? error.message : '未知错误',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[70vw] max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>新增子SKU</DialogTitle>
          <p className="text-sm text-muted-foreground">
            通过模板快速定义常用的尺码、变体及建议售价，后续创建采购单时可直接引用。
          </p>
        </DialogHeader>
        <div className="space-y-6">
          {/* Item名称预览 */}
          {itemNamePreview && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <Label className="text-xs text-gray-500 mb-1">Item名称（自动生成）</Label>
              <p className="font-medium text-blue-900">{itemNamePreview}</p>
              <p className="text-xs text-gray-500 mt-1">名称将根据SKU名称、尺码、成色和变体自动生成</p>
            </div>
          )}

          <section className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold">基础规格</h4>
              <p className="text-xs text-muted-foreground">用于自动生成名称并区分不同子 SKU。</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>尺码 / 变体 *</Label>
                <Input 
                  value={itemSize} 
                  onChange={e => setItemSize(e.target.value)} 
                  placeholder="如：27cm、XL、米奇" 
                  required
                />
                <p className="text-xs text-gray-500 mt-1">鞋服类填写尺码，玩具类填写角色名称</p>
              </div>
              <div>
                <Label>成色 *</Label>
                <Select value={condition} onValueChange={setCondition}>
                  <SelectTrigger>
                    <SelectValue placeholder="请选择成色" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDITION_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex flex-col">
                          <span>{opt.label}</span>
                          {opt.hint && <span className="text-[11px] text-gray-500">{opt.hint}</span>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>变体标签（可选）</Label>
                <Input 
                  value={variantLabel} 
                  onChange={e => setVariantLabel(e.target.value)} 
                  placeholder="如：限定款、特殊配色" 
                />
                <p className="text-xs text-gray-500 mt-1">用于标识特殊版本或赠品组合。</p>
              </div>
              <div>
                <Label>颜色 / 特征（可选）</Label>
                <Input value={itemColor} onChange={e => setItemColor(e.target.value)} placeholder="如：黑红配色" />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold">定价与备注</h4>
              <p className="text-xs text-muted-foreground">供销售、采购参考，可按需填写。</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>推荐售价（可选）</Label>
                <Input 
                  type="number"
                  value={recommendedPrice} 
                  onChange={e => setRecommendedPrice(e.target.value)} 
                  placeholder="如：5000"
                  step="0.01"
                />
                <p className="text-xs text-gray-500 mt-1">建议的销售价格</p>
              </div>
              <div>
                <Label>货币</Label>
                <Select value={recommendedPriceCurrency} onValueChange={setRecommendedPriceCurrency}>
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
            </div>
            <div>
              <Label>内部备注</Label>
              <Textarea value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="例如：含原包装 / 缺配件说明…" rows={3} />
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold">图片与资源</h4>
              <p className="text-xs text-muted-foreground">上传或粘贴 URL，作为默认展示图。</p>
            </div>
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <Input type="file" multiple accept="image/*" onChange={(e) => handleUpload(e.target.files)} className="md:w-56" />
              <div className="flex flex-1 gap-2">
                <Input type="url" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." />
                <Button type="button" variant="outline" onClick={addImageUrl}>添加链接</Button>
              </div>
            </div>
            {photos.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {photos.map((p, i) => (
                  <img key={i} src={p} alt="" className="w-16 h-16 object-cover rounded border" />
                ))}
              </div>
            )}
          </section>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { onClose(); resetForm(); }}>取消</Button>
            <Button onClick={onSubmit} disabled={saving || !itemSize.trim() || !sku?.name}>
              {saving ? '保存中...' : '保存'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default NewSubSkuDialog




