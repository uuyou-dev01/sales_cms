'use client'

import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface BulkStatusDialogProps {
  open: boolean
  orderCount: number
  defaultStatus?: string
  onClose: () => void
  onConfirm: (payload: {
    status?: string
    platform?: string
    supplier?: string
    logisticsTrackingNo?: string
    notes?: string
  }) => void
}

const STATUS_OPTIONS = [
  { value: 'PENDING', label: '待采购' },
  { value: 'IN_TRANSIT', label: '在途' },
  { value: 'COMPLETED', label: '已完成' },
  { value: 'EXCEPTION', label: '异常' },
]

export function BulkStatusDialog({ open, orderCount, defaultStatus = 'PENDING', onClose, onConfirm }: BulkStatusDialogProps) {
  const [status, setStatus] = React.useState(defaultStatus)
  const [platform, setPlatform] = React.useState('')
  const [supplier, setSupplier] = React.useState('')
  const [tracking, setTracking] = React.useState('')
  const [notes, setNotes] = React.useState('')

  React.useEffect(() => {
    setStatus(defaultStatus)
  }, [defaultStatus, open])

  const handleSubmit = () => {
    onConfirm({
      status,
      platform: platform.trim() || undefined,
      supplier: supplier.trim() || undefined,
      logisticsTrackingNo: tracking.trim() || undefined,
      notes: notes.trim() || undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>批量更新状态</DialogTitle>
          <p className="text-sm text-muted-foreground">
            正在更新 {orderCount} 个采购单，可同时填写平台、供应商及物流单号。
          </p>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-600">采购状态</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600">采购平台</label>
              <Input className="mt-1" value={platform} onChange={(e) => setPlatform(e.target.value)} placeholder="如 Mercari / 淘宝" />
            </div>
            <div>
              <label className="text-sm text-gray-600">供应商</label>
              <Input className="mt-1" value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="供应商名称" />
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-600">物流单号</label>
            <Input className="mt-1" value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="可选" />
          </div>
          <div>
            <label className="text-sm text-gray-600">备注</label>
            <Textarea rows={3} className="mt-1" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="需要同步的说明" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button onClick={handleSubmit}>确认更新</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


