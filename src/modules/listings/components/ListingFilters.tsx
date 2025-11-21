'use client'

import React from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useQuery } from '@tanstack/react-query'
import type { ListingFilterValues } from '../types'

interface ListingFiltersProps {
  values: ListingFilterValues
  onChange: (key: keyof ListingFilterValues, value: string | null) => void
  isDisabled?: boolean
}

type PlatformOption = { id: string; name: string }

const STATUS_OPTIONS = [
  { label: '全部状态', value: '__all__' },
  { label: '草稿', value: 'DRAFT' },
  { label: '待上架', value: 'PENDING' },
  { label: '已上架', value: 'LISTED' },
  { label: '已结束', value: 'ARCHIVED' },
  { label: '取消', value: 'CANCELLED' },
]

const SOURCE_OPTIONS = [
  { label: '全部模式', value: 'ALL' },
  { label: '模板上架', value: 'TEMPLATE' },
  { label: '单件上架', value: 'ITEM' },
]

async function fetchPlatforms(): Promise<PlatformOption[]> {
  const res = await fetch('/api/platforms')
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json?.error || '获取平台失败')
  const items = json?.data?.items || json?.data || []
  return Array.isArray(items) ? items : []
}

export function ListingFilters({ values, onChange, isDisabled }: ListingFiltersProps) {
  const [search, setSearch] = React.useState(values.q || '')
  const { data: platforms = [] } = useQuery<PlatformOption[]>({
    queryKey: ['platforms'],
    queryFn: fetchPlatforms,
  })

  React.useEffect(() => {
    setSearch(values.q || '')
  }, [values.q])

  React.useEffect(() => {
    const handler = setTimeout(() => {
      if (search !== values.q) {
        onChange('q', search ? search : null)
      }
    }, 400)
    return () => clearTimeout(handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-card border rounded-lg p-4">
      <div className="space-y-2">
        <Label htmlFor="listing-search">搜索</Label>
        <Input
          id="listing-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="按 SKU/模板/平台搜索"
          disabled={isDisabled}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="listing-sku">SKU ID</Label>
        <Input
          id="listing-sku"
          value={values.skuId || ''}
          onChange={(e) => onChange('skuId', e.target.value ? e.target.value : null)}
          placeholder="可选：精确 SKU ID"
          disabled={isDisabled}
        />
      </div>
      <div className="space-y-2">
        <Label>平台</Label>
        <Select
          value={values.platformId || '__all__'}
          onValueChange={(val) => onChange('platformId', val === '__all__' ? null : val)}
          disabled={isDisabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="全部平台" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">全部平台</SelectItem>
            {platforms.map((platform) => (
              <SelectItem key={platform.id} value={platform.id}>
                {platform.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>状态</Label>
        <Select
          value={values.status || '__all__'}
          onValueChange={(val) => onChange('status', val === '__all__' ? null : val)}
          disabled={isDisabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="全部状态" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label>上架模式</Label>
        <Select
          value={values.sourceType || 'ALL'}
          onValueChange={(val) => onChange('sourceType', val === 'ALL' ? null : val)}
          disabled={isDisabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="全部模式" />
          </SelectTrigger>
          <SelectContent>
            {SOURCE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

