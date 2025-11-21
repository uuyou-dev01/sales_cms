'use client'

import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'

interface BulkLogisticsDialogProps {
  open: boolean
  orderIds: string[]
  onClose: () => void
  onConfirm: (payload: {
    trackingNo: string
    status: string
    fromCountry?: string
    fromNode?: string
    toCountry?: string
    toNode?: string
    cost?: number
    currency?: string
    note?: string
  }) => void
}

const STATUS = [
  { value: 'PENDING', label: '待创建' },
  { value: 'IN_TRANSIT', label: '国内在途' },
  { value: 'AT_FORWARDER', label: '转运仓待发' },
  { value: 'LEAVING_CHINA', label: '已出境' },
  { value: 'AT_WAREHOUSE', label: '日本仓签收' },
  { value: 'DELIVERED', label: '已交付' },
  { value: 'EXCEPTION', label: '异常' },
]

export function BulkLogisticsDialog({ open, orderIds, onClose, onConfirm }: BulkLogisticsDialogProps) {
  const [form, setForm] = React.useState({
    trackingNo: '',
    status: 'IN_TRANSIT',
    fromCountry: '',
    fromNode: '',
    toCountry: '',
    toNode: '',
    cost: '',
    currency: 'JPY',
    note: '',
  })

  React.useEffect(() => {
    if (!open) {
      setForm({
        trackingNo: '',
        status: 'IN_TRANSIT',
        fromCountry: '',
        fromNode: '',
        toCountry: '',
        toNode: '',
        cost: '',
        currency: 'JPY',
        note: '',
      })
    }
  }, [open])

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = () => {
    if (!form.trackingNo.trim()) return
    onConfirm({
      trackingNo: form.trackingNo.trim(),
      status: form.status,
      fromCountry: form.fromCountry.trim() || undefined,
      fromNode: form.fromNode.trim() || undefined,
      toCountry: form.toCountry.trim() || undefined,
      toNode: form.toNode.trim() || undefined,
      cost: form.cost ? Number(form.cost) : undefined,
      currency: form.currency || undefined,
      note: form.note.trim() || undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>创建集运包裹</DialogTitle>
          <p className="text-sm text-muted-foreground">
            将 {orderIds.length} 个采购单合并为一个物流记录，可在物流追踪中查看与成本分摊。
          </p>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-600">物流单号</label>
            <Input className="mt-1" value={form.trackingNo} onChange={(e) => handleChange('trackingNo', e.target.value)} placeholder="必填" />
          </div>
          <div>
            <label className="text-sm text-gray-600">物流状态</label>
            <Select value={form.status} onValueChange={(val) => handleChange('status', val)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-600">出发地</label>
              <Input className="mt-1" placeholder="国家/地区" value={form.fromCountry} onChange={(e) => handleChange('fromCountry', e.target.value)} />
              <Input className="mt-2" placeholder="节点/仓库" value={form.fromNode} onChange={(e) => handleChange('fromNode', e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-gray-600">目的地</label>
              <Input className="mt-1" placeholder="国家/地区" value={form.toCountry} onChange={(e) => handleChange('toCountry', e.target.value)} />
              <Input className="mt-2" placeholder="节点/仓库" value={form.toNode} onChange={(e) => handleChange('toNode', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-600">费用</label>
              <Input className="mt-1" placeholder="金额" value={form.cost} onChange={(e) => handleChange('cost', e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-gray-600">币种</label>
              <Input className="mt-1" placeholder="JPY/CNY" value={form.currency} onChange={(e) => handleChange('currency', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-600">备注</label>
            <Textarea rows={3} className="mt-1" value={form.note} onChange={(e) => handleChange('note', e.target.value)} placeholder="可描述打包信息、重量等" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button onClick={handleSubmit} disabled={!form.trackingNo.trim()}>创建</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


