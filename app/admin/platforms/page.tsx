'use client'

import React from 'react'
import { Plus, RefreshCw, Edit2, Trash2, Settings } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface ShippingMethod {
  name: string
  fee: number
}

interface Platform {
  id: string
  name: string
  baseFeeRate: number
  shippingFee?: number | null // 保留向后兼容
  shippingTemplates?: { shippingMethods?: ShippingMethod[] } | null
  currency: string
  region?: string | null
  market?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export default function PlatformsPage() {
  const { toast } = useToast()
  const [mounted, setMounted] = React.useState(false)
  const [items, setItems] = React.useState<Platform[]>([])
  const [loading, setLoading] = React.useState(false)
  const [seedLoading, setSeedLoading] = React.useState(false)
  const [open, setOpen] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [form, setForm] = React.useState({
    name: '',
    baseFeeRate: '0.10',
    shippingFee: '', // 保留向后兼容
    shippingMethods: [] as ShippingMethod[],
    currency: 'JPY',
    region: '',
    market: '',
    isActive: true,
  })
  const [editingShippingIndex, setEditingShippingIndex] = React.useState<number | null>(null)
  const [shippingForm, setShippingForm] = React.useState({ name: '', fee: '' })

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const fetchData = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/platforms')
      const json = await res.json()
      if (res.ok) {
        setItems(json.data?.items || json?.items || [])
      } else {
        throw new Error(json?.error || '获取失败')
      }
    } catch (error: any) {
      toast({
        title: '加载失败',
        description: error?.message || '无法获取平台列表',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  React.useEffect(() => {
    if (mounted) {
      fetchData()
    }
  }, [mounted, fetchData])

  const handleSeedDefaults = async () => {
    setSeedLoading(true)
    try {
      const res = await fetch('/api/platforms/seed-defaults', { method: 'POST' })
      const json = await res.json()
      if (res.ok) {
        toast({ title: '默认平台已生成', description: `已创建 ${json.data?.count || 0} 个平台` })
        await fetchData()
      } else {
        throw new Error(json?.error || '生成失败')
      }
    } catch (error: any) {
      toast({
        title: '生成失败',
        description: error?.message || '请稍后再试',
        variant: 'destructive',
      })
    } finally {
      setSeedLoading(false)
    }
  }

  const handleOpenDialog = (item?: Platform) => {
    if (item) {
      setEditingId(item.id)
      const shippingMethods: ShippingMethod[] = 
        (item.shippingTemplates as any)?.shippingMethods || []
      setForm({
        name: item.name,
        baseFeeRate: item.baseFeeRate.toString(),
        shippingFee: item.shippingFee?.toString() || '',
        shippingMethods,
        currency: item.currency || 'JPY',
        region: item.region || '',
        market: item.market || '',
        isActive: item.isActive,
      })
    } else {
      setEditingId(null)
      setForm({
        name: '',
        baseFeeRate: '0.10',
        shippingFee: '',
        shippingMethods: [],
        currency: 'JPY',
        region: '',
        market: '',
        isActive: true,
      })
    }
    setShippingForm({ name: '', fee: '' })
    setEditingShippingIndex(null)
    setOpen(true)
  }

  const handleCloseDialog = () => {
    setOpen(false)
    setEditingId(null)
    setEditingShippingIndex(null)
    setShippingForm({ name: '', fee: '' })
    setForm({
      name: '',
      baseFeeRate: '0.10',
      shippingFee: '',
      shippingMethods: [],
      currency: 'JPY',
      region: '',
      market: '',
      isActive: true,
    })
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast({ title: '请输入平台名称', variant: 'destructive' })
      return
    }

    try {
      const body: any = {
        name: form.name.trim(),
        baseFeeRate: Number(form.baseFeeRate || 0),
        shippingFee: form.shippingFee ? Number(form.shippingFee) : undefined,
        shippingTemplates: form.shippingMethods.length > 0 
          ? { shippingMethods: form.shippingMethods }
          : undefined,
        currency: form.currency || 'JPY',
        region: form.region || undefined,
        market: form.market || undefined,
        isActive: form.isActive,
      }

      if (editingId) {
        body.id = editingId
        const res = await fetch('/api/platforms', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const json = await res.json()
        if (res.ok) {
          toast({ title: '平台已更新' })
          handleCloseDialog()
          await fetchData()
        } else {
          throw new Error(json?.error || '更新失败')
        }
      } else {
        const res = await fetch('/api/platforms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const json = await res.json()
        if (res.ok) {
          toast({ title: '平台已创建' })
          handleCloseDialog()
          await fetchData()
        } else {
          throw new Error(json?.error || '创建失败')
        }
      }
    } catch (error: any) {
      toast({
        title: editingId ? '更新失败' : '创建失败',
        description: error?.message || '请稍后再试',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定要删除平台 "${name}" 吗？`)) return

    try {
      const res = await fetch('/api/platforms', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const json = await res.json()
      if (res.ok) {
        toast({ title: '平台已删除' })
        await fetchData()
      } else {
        throw new Error(json?.error || '删除失败')
      }
    } catch (error: any) {
      toast({
        title: '删除失败',
        description: error?.message || '请稍后再试',
        variant: 'destructive',
      })
    }
  }

  if (!mounted) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-muted-foreground">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">销售平台管理</h1>
          <p className="text-sm text-muted-foreground mt-1">
            管理销售平台信息，包括费率、货币等配置。创建上架记录时会使用这些平台信息。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          <Button variant="outline" onClick={handleSeedDefaults} disabled={seedLoading || items.length > 0}>
            <Plus className="mr-2 h-4 w-4" />
            {seedLoading ? '生成中...' : '生成默认平台'}
          </Button>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            新增平台
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">平台列表</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && items.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">加载中...</div>
          ) : items.length === 0 ? (
            <div className="py-8 text-center space-y-4">
              <p className="text-sm text-muted-foreground">暂无平台数据</p>
              <Button onClick={handleSeedDefaults} disabled={seedLoading}>
                <Plus className="mr-2 h-4 w-4" />
                {seedLoading ? '生成中...' : '生成默认平台'}
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>平台名称</TableHead>
                  <TableHead>基础费率</TableHead>
                  <TableHead>邮费方式</TableHead>
                  <TableHead>货币</TableHead>
                  <TableHead>地区/市场</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{(item.baseFeeRate * 100).toFixed(2)}%</TableCell>
                    <TableCell>
                      {(item.shippingTemplates as any)?.shippingMethods?.length > 0 ? (
                        <div className="text-xs space-y-1">
                          {(item.shippingTemplates as any).shippingMethods
                            .slice(0, 2)
                            .map((m: ShippingMethod, i: number) => (
                              <div key={i}>
                                {m.name}: {m.fee.toLocaleString('zh-CN')} {item.currency}
                              </div>
                            ))}
                          {(item.shippingTemplates as any).shippingMethods.length > 2 && (
                            <div className="text-muted-foreground">
                              +{(item.shippingTemplates as any).shippingMethods.length - 2} 种方式
                            </div>
                          )}
                        </div>
                      ) : item.shippingFee != null ? (
                        <span className="text-xs">
                          {item.shippingFee.toLocaleString('zh-CN')} {item.currency}
                        </span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>{item.currency}</TableCell>
                    <TableCell>
                      {item.region || item.market ? (
                        <div className="text-xs">
                          {item.region && <div>{item.region}</div>}
                          {item.market && <div className="text-muted-foreground">{item.market}</div>}
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.isActive ? 'default' : 'secondary'}>
                        {item.isActive ? '启用' : '禁用'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(item)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(item.id, item.name)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={handleCloseDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? '编辑平台' : '新增平台'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>平台名称 *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="例如：Mercari / 淘宝"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>基础费率 *</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.001"
                    min="0"
                    max="1"
                    value={form.baseFeeRate}
                    onChange={(e) => setForm({ ...form, baseFeeRate: e.target.value })}
                    placeholder="0.10"
                    required
                  />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    ({(Number(form.baseFeeRate || 0) * 100).toFixed(2)}%)
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>货币 *</Label>
                <Select value={form.currency} onValueChange={(val) => setForm({ ...form, currency: val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="JPY">JPY</SelectItem>
                    <SelectItem value="CNY">CNY</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>平均邮费（可选，用于向后兼容）</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.shippingFee}
                  onChange={(e) => setForm({ ...form, shippingFee: e.target.value })}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground">
                  建议使用下方的"发货方式"管理邮费
                </p>
              </div>
              <div className="space-y-2">
                <Label>状态</Label>
                <Select
                  value={form.isActive ? 'true' : 'false'}
                  onValueChange={(val) => setForm({ ...form, isActive: val === 'true' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">启用</SelectItem>
                    <SelectItem value="false">禁用</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* 发货方式管理 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>发货方式及邮费</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingShippingIndex(null)
                    setShippingForm({ name: '', fee: '' })
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  添加
                </Button>
              </div>
              <div className="border rounded-md p-3 space-y-2 max-h-48 overflow-y-auto">
                {form.shippingMethods.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    暂无发货方式，点击"添加"按钮添加
                  </p>
                ) : (
                  form.shippingMethods.map((method, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 bg-muted rounded-md"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-sm">{method.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {method.fee.toLocaleString('zh-CN')} {form.currency}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingShippingIndex(index)
                          setShippingForm({ name: method.name, fee: method.fee.toString() })
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setForm({
                            ...form,
                            shippingMethods: form.shippingMethods.filter((_, i) => i !== index),
                          })
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
              
              {/* 添加/编辑发货方式表单 */}
              {(editingShippingIndex !== null || shippingForm.name || shippingForm.fee) && (
                <div className="border rounded-md p-3 space-y-2 bg-accent/50">
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="发货方式名称，如：邮局 packet mini"
                      value={shippingForm.name}
                      onChange={(e) => setShippingForm({ ...shippingForm, name: e.target.value })}
                    />
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="邮费"
                        value={shippingForm.fee}
                        onChange={(e) => setShippingForm({ ...shippingForm, fee: e.target.value })}
                        className="flex-1"
                      />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {form.currency}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (!shippingForm.name.trim() || !shippingForm.fee) {
                          toast({ title: '请填写完整的发货方式和邮费', variant: 'destructive' })
                          return
                        }
                        const newMethod: ShippingMethod = {
                          name: shippingForm.name.trim(),
                          fee: Number(shippingForm.fee),
                        }
                        if (editingShippingIndex !== null) {
                          // 编辑现有方式
                          const updated = [...form.shippingMethods]
                          updated[editingShippingIndex] = newMethod
                          setForm({ ...form, shippingMethods: updated })
                          setEditingShippingIndex(null)
                        } else {
                          // 添加新方式
                          setForm({
                            ...form,
                            shippingMethods: [...form.shippingMethods, newMethod],
                          })
                        }
                        setShippingForm({ name: '', fee: '' })
                      }}
                    >
                      {editingShippingIndex !== null ? '保存' : '添加'}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingShippingIndex(null)
                        setShippingForm({ name: '', fee: '' })
                      }}
                    >
                      取消
                    </Button>
                  </div>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>地区（可选）</Label>
                <Input
                  value={form.region}
                  onChange={(e) => setForm({ ...form, region: e.target.value })}
                  placeholder="例如：JP / CN"
                />
              </div>
              <div className="space-y-2">
                <Label>市场（可选）</Label>
                <Input
                  value={form.market}
                  onChange={(e) => setForm({ ...form, market: e.target.value })}
                  placeholder="例如：JP / CN"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              取消
            </Button>
            <Button onClick={handleSubmit}>
              {editingId ? '保存' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
