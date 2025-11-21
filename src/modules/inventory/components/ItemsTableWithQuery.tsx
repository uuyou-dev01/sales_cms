'use client'

import * as React from 'react'
import { ItemsTable } from '@/components/items-table'
import { useItems } from '@/src/modules/inventory/hooks/useItems'

export default function ItemsTableWithQuery() {
  const { data, isLoading } = useItems()
  const items = Array.isArray(data) ? data : []

  const [page, setPage] = React.useState(1)
  const [pageSize] = React.useState(20)
  const total = items.length
  const [dateSort, setDateSort] = React.useState<"asc" | "desc" | null>(null)
  const [durationSort, setDurationSort] = React.useState<"asc" | "desc" | null>(null)
  const [priceSort, setPriceSort] = React.useState<"asc" | "desc" | null>(null)
  const [sizeFilter, setSizeFilter] = React.useState('all')
  const [platformFilter, setPlatformFilter] = React.useState('all')
  const [searchQuery, setSearchQuery] = React.useState('')

  // 简单分页与筛选在前端处理（后续可迁移到服务端）
  const filtered = React.useMemo(() => {
    let list = items
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter((it: any) =>
        (it.itemName || '').toLowerCase().includes(q) ||
        (it.itemNumber || '').toLowerCase().includes(q) ||
        (it.itemBrand || '').toLowerCase().includes(q)
      )
    }
    if (sizeFilter !== 'all') list = list.filter((it: any) => it.itemSize === sizeFilter)
    if (platformFilter !== 'all') list = list.filter((it: any) => (it.transactions?.[0]?.purchasePlatform || '') === platformFilter)
    // 价格排序基于 purchasePrice
    if (priceSort) list = [...list].sort((a: any, b: any) => (parseFloat(a.transactions?.[0]?.purchasePrice || '0') - parseFloat(b.transactions?.[0]?.purchasePrice || '0')) * (priceSort === 'asc' ? 1 : -1))
    // 日期排序基于 purchaseDate
    if (dateSort) list = [...list].sort((a: any, b: any) => ((new Date(a.transactions?.[0]?.purchaseDate || 0)).getTime() - (new Date(b.transactions?.[0]?.purchaseDate || 0)).getTime()) * (dateSort === 'asc' ? 1 : -1))
    // 在库时长排序
    if (durationSort) list = [...list].sort((a: any, b: any) => {
      const ad = a.transactions?.[0]?.purchaseDate ? (Date.now() - new Date(a.transactions[0].purchaseDate).getTime()) : 0
      const bd = b.transactions?.[0]?.purchaseDate ? (Date.now() - new Date(b.transactions[0].purchaseDate).getTime()) : 0
      return (ad - bd) * (durationSort === 'asc' ? 1 : -1)
    })
    return list
  }, [items, searchQuery, sizeFilter, platformFilter, priceSort, dateSort, durationSort])

  const paged = React.useMemo(() => {
    const start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page, pageSize])

  return (
    <ItemsTable
      items={paged as any}
      loading={isLoading}
      page={page}
      pageSize={pageSize}
      total={filtered.length}
      dateSort={dateSort}
      durationSort={durationSort}
      priceSort={priceSort}
      sizeFilter={sizeFilter}
      platformFilter={platformFilter}
      searchQuery={searchQuery}
      onPageChange={setPage}
      onDateSortChange={setDateSort}
      onDurationSortChange={setDurationSort}
      onPriceSortChange={setPriceSort}
      onSizeFilterChange={setSizeFilter}
      onPlatformFilterChange={setPlatformFilter}
      onSearchQueryChange={setSearchQuery}
      onStatusChange={() => {}}
      onRemarksEdit={() => {}}
      onEditItem={() => {}}
      onCopyItem={() => {}}
      onDeleteItem={() => {}}
    />
  )
}


