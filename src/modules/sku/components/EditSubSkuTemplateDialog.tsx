'use client'

import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { generateItemName } from '@/src/modules/sku/utils/item-name-generator'

const CONDITION_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'NEW', label: '全新 (NEW)' },
  { value: 'USED_A', label: '中古 A' },
  { value: 'USED_B', label: '中古 B' },
  { value: 'USED_C', label: '中古 C' },
]

interface EditSubSkuTemplateDialogProps {
  open: boolean
  onClose: () => void
  template: {
    id: string
    skuId: string
    skuName: string
    itemName: string
    itemSize?: string | null
    itemCondition?: string | null
    variantLabel?: string | null
    itemColor?: string | null
    itemRemarks?: string | null
    recommendedPrice?: number | null
    recommendedPriceCurrency?: string | null
    photos?: string[]
    isActive?: boolean
  } | null
  onUpdated?: () => void
}

export function EditSubSkuTemplateDialog({ open, onClose, template, onUpdated }: EditSubSkuTemplateDialogProps) {
  const { toast } = useToast()
  const [itemSize, setItemSize] = React.useState('')
  const [condition, setCondition] = React.useState('NEW')
  const [variantLabel, setVariantLabel] = React.useState('')
  const [itemColor, setItemColor] = React.useState('')
  const [remarks, setRemarks] = React.useState('')
  const [recommendedPrice, setRecommendedPrice] = React.useState('')
  const [recommendedPriceCurrency, setRecommendedPriceCurrency] = React.useState('JPY')
  const [photosInput, setPhotosInput] = React.useState('')
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (template && open) {
      setItemSize(template.itemSize || '')
      setCondition(template.itemCondition || 'NEW')
      setVariantLabel(template.variantLabel || '')
      setItemColor(template.itemColor || '')
      setRemarks(template.itemRemarks || '')
      setRecommendedPrice(template.recommendedPrice ? String(template.recommendedPrice) : '')
      setRecommendedPriceCurrency(template.recommendedPriceCurrency || 'JPY')
      setPhotosInput((template.photos || []).join('\n'))
    }
  }, [template, open])

  const itemNamePreview = React.useMemo(() => {
    if (!template?.skuName) return ''
    return generateItemName({
      skuName: template.skuName,
      itemSize: itemSize || '均码',
      itemCondition: condition,
      variantLabel: variantLabel || null,
    })
  }, [template?.skuName, itemSize, condition, variantLabel])

  const handleSubmit = async () => {
    if (!template) return
    setSaving(true)
    try {
      const body: Record<string, any> = {
        itemSize: itemSize.trim() || '均码',
        itemCondition: condition,
        variantLabel: variantLabel.trim() || undefined,
        itemColor: itemColor.trim() || undefined,
        itemRemarks: remarks.trim() || undefined,
        recommendedPrice: recommendedPrice ? Number(recommendedPrice) : null,
        recommendedPriceCurrency: recommendedPriceCurrency || 'JPY',
        photos: photosInput
          ? photosInput
              .split('\n')
              .map((line) => line.trim())
              .filter(Boolean)
          : [],
      }
      const res = await fetch(`/api/sku/templates/${template.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(json?.message || json?.error || '保存失败')
      }
      toast({ title: '模板已保存' })
      onUpdated?.()
      onClose()
    } catch (error: any) {
      toast({ title: '保存失败', description: error.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async () => {
    if (!template) return
    try {
      const res = await fetch(`/api/sku/templates/${template.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !template.isActive }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.message || json?.error || '操作失败')
      toast({ title: template.isActive ? '模板已停用' : '模板已启用' })
      onUpdated?.()
      onClose()
    } catch (error: any) {
      toast({ title: '操作失败', description: error.message, variant: 'destructive' })
    }
  }

  if (!template) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[70vw] max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>编辑子SKU模板</DialogTitle>
          <p className="text-sm text-muted-foreground">
            调整规格、价格或图片信息，保存后可在采购、销售流程中立即使用。
          </p>
        </DialogHeader>
        <div className="space-y-5">
          {itemNamePreview && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <Label className="text-xs text-gray-500 mb-1">自动生成的 Item 名称</Label>
              <p className="font-medium text-blue-900">{itemNamePreview}</p>
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>尺码 / 变体 *</Label>
              <Input value={itemSize} onChange={(e) => setItemSize(e.target.value)} placeholder="如：27cm、米奇" />
            </div>
            <div>
              <Label>成色 *</Label>
              <Select value={condition} onValueChange={setCondition}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONDITION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>变体标签</Label>
              <Input value={variantLabel} onChange={(e) => setVariantLabel(e.target.value)} placeholder="如：米奇、限定版" />
            </div>
            <div>
              <Label>颜色</Label>
              <Input value={itemColor} onChange={(e) => setItemColor(e.target.value)} placeholder="如：红/黑" />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>推荐售价</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={recommendedPrice}
                  onChange={(e) => setRecommendedPrice(e.target.value)}
                  placeholder="3000"
                />
                <Input
                  className="w-24"
                  value={recommendedPriceCurrency}
                  onChange={(e) => setRecommendedPriceCurrency(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label>备注</Label>
              <Textarea rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="可选说明" />
            </div>
          </div>
          <div>
            <Label>图片链接（每行一条）</Label>
            <Textarea
              rows={4}
              value={photosInput}
              onChange={(e) => setPhotosInput(e.target.value)}
              placeholder="https://example.com/a.jpg"
            />
          </div>
        </div>
        <DialogFooter className="flex flex-wrap items-center gap-2 justify-between">
          <Button variant="ghost" type="button" onClick={handleToggleActive}>
            {template.isActive ? '停用模板' : '启用模板'}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>取消</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? '保存中...' : '保存'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default EditSubSkuTemplateDialog


