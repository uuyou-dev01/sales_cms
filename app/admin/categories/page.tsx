'use client'

import React from 'react'
import { Plus, RefreshCw } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'

interface Category {
  id: string
  name: string
  parentId: string | null
  code?: string | null
  level: number
  isActive: boolean
}

const ROOT_PARENT_VALUE = '__root__'

export default function CategoriesPage() {
  const { toast } = useToast()
  const [mounted, setMounted] = React.useState(false)
  const [categories, setCategories] = React.useState<Category[]>([])
  const [loading, setLoading] = React.useState(false)
  const [seedLoading, setSeedLoading] = React.useState(false)
  const [form, setForm] = React.useState<{ name: string; parentId: string; code: string }>({
    name: '',
    parentId: ROOT_PARENT_VALUE,
    code: '',
  })
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const fetchCategories = React.useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    try {
      const res = await fetch('/api/categories', { signal })
      if (signal?.aborted) return
      const json = await res.json()
      const items = json?.data?.items || json?.items || []
      setCategories(items)
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return
      console.error('获取分类失败', error)
      toast({
        title: '加载失败',
        description: '无法获取分类列表，请稍后再试',
        variant: 'destructive',
      })
    } finally {
      if (!signal?.aborted) {
        setLoading(false)
      }
    }
  }, [toast])

  React.useEffect(() => {
    if (!mounted) return
    const controller = new AbortController()
    fetchCategories(controller.signal)
    return () => {
      controller.abort()
    }
  }, [mounted, fetchCategories])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      toast({ title: '请输入分类名称', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          parentId: form.parentId === ROOT_PARENT_VALUE ? null : form.parentId || null,
          code: form.code || undefined,
        }),
      })
      if (!res.ok) throw new Error('创建失败')
      setForm({ name: '', parentId: ROOT_PARENT_VALUE, code: '' })
      toast({ title: '分类已创建' })
      await fetchCategories()
    } catch (error) {
      toast({ title: '创建失败', description: '请稍后再试', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleSeedDefaults = async () => {
    setSeedLoading(true)
    try {
      const res = await fetch('/api/categories/seed-defaults', { method: 'POST' })
      if (!res.ok) throw new Error('seed failed')
      toast({ title: '基础分类已生成' })
      await fetchCategories()
    } catch (error) {
      toast({ title: '生成失败', description: '请稍后再试', variant: 'destructive' })
    } finally {
      setSeedLoading(false)
    }
  }

  const parentOptions = React.useMemo(() => categories.filter((cat) => cat.level === 1), [categories])

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
          <p className="text-sm text-muted-foreground">管理商品分类，支持多级结构与快速初始化。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => fetchCategories()} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            刷新
          </Button>
          <Button onClick={handleSeedDefaults} disabled={seedLoading}>
            <Plus className="mr-2 h-4 w-4" />
            {seedLoading ? '生成中...' : '生成基础类别'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>新增分类</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label>名称 *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="例如：潮玩 / 上衣"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>父级分类</Label>
                <Select value={form.parentId} onValueChange={(value) => setForm((prev) => ({ ...prev, parentId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="默认作为一级分类" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ROOT_PARENT_VALUE}>一级分类</SelectItem>
                    {parentOptions.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">仅支持选择一级分类作为父级，更多层级可在创建后继续添加。</p>
              </div>
              <div className="space-y-2">
                <Label>分类编码（可选）</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
                  placeholder="例如：TOYS / CLOTHING"
                />
              </div>
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? '保存中...' : '保存分类'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader>
            <CardTitle>分类列表</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {loading && <p className="text-sm text-muted-foreground">加载中...</p>}
              {!loading && categories.length === 0 && (
                <p className="text-sm text-muted-foreground">暂无分类，点击右上角「生成基础类别」。</p>
              )}
              {!loading &&
                categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between rounded border bg-white/50 px-3 py-2 text-sm"
                    style={{ paddingLeft: `${(cat.level - 1) * 16 + 12}px` }}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{cat.name}</span>
                        {!cat.isActive && <Badge variant="secondary">停用</Badge>}
                      </div>
                      {cat.code && <div className="text-xs text-muted-foreground">编码: {cat.code}</div>}
                    </div>
                    <Badge variant="outline">Lv.{cat.level}</Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
