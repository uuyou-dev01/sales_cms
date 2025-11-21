'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { ListingFilterValues } from '@/src/modules/listings/types'

// 动态导入组件以避免 SSR 问题
const TemplateListingPanel = dynamic(() => import('@/src/modules/listings/components/TemplateListingPanel').then(m => m.TemplateListingPanel), { ssr: false })
const ItemListingPanel = dynamic(() => import('@/src/modules/listings/components/ItemListingPanel').then(m => m.ItemListingPanel), { ssr: false })
const ListingFilters = dynamic(() => import('@/src/modules/listings/components/ListingFilters').then(m => m.ListingFilters), { ssr: false })
const ListingOverviewPanel = dynamic(() => import('@/src/modules/listings/components/ListingOverviewPanel').then(m => m.ListingOverviewPanel), { ssr: false })
const ListingHistoryPanel = dynamic(() => import('@/src/modules/listings/components/ListingHistoryPanel').then(m => m.ListingHistoryPanel), { ssr: false })
const ListedItemsPanel = dynamic(() => import('@/src/modules/listings/components/ListedItemsPanel').then(m => m.ListedItemsPanel), { ssr: false })
const SoldItemsPanel = dynamic(() => import('@/src/modules/listings/components/SoldItemsPanel').then(m => m.SoldItemsPanel), { ssr: false })

const TAB_VALUES = ['overview', 'template', 'item', 'listed', 'history', 'sold'] as const
type TabValue = (typeof TAB_VALUES)[number]

function isTabValue(value: string | null): value is TabValue {
  if (!value) return false
  return (TAB_VALUES as readonly string[]).includes(value)
}

export default function ListingsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [tab, setTab] = React.useState<TabValue>('overview')
  const [isMounted, setIsMounted] = React.useState(false)
  const searchParamsString = searchParams.toString()

  // 在客户端挂载后同步 tab 状态
  React.useEffect(() => {
    setIsMounted(true)
    const viewParam = searchParams.get('view')
    if (viewParam && isTabValue(viewParam)) {
      setTab(viewParam)
    }
  }, [searchParams])

  const updateParams = React.useCallback(
    (mutator: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParamsString)
      mutator(params)
      const query = params.toString()
      router.replace(query ? `${pathname}?${query}` : pathname)
    },
    [router, pathname, searchParamsString]
  )

  const handleTabChange = (value: string) => {
    const nextTab = isTabValue(value) ? value : 'overview'
    setTab(nextTab)
    updateParams((params) => {
      params.set('view', nextTab)
    })
  }

  const filters: ListingFilterValues = {
    q: searchParams.get('q') || undefined,
    skuId: searchParams.get('skuId') || undefined,
    platformId: searchParams.get('platformId') || undefined,
    status: searchParams.get('status') || undefined,
    sourceType: (searchParams.get('sourceType') as ListingFilterValues['sourceType']) || 'ALL',
  }

  React.useEffect(() => {
    const params = new URLSearchParams(searchParamsString)
    const current = params.get('sourceType') || ''
    if (tab === 'template' && current !== 'TEMPLATE') {
      updateParams((next) => {
        next.set('sourceType', 'TEMPLATE')
        next.set('view', 'template')
      })
    } else if (tab === 'item' && current !== 'ITEM') {
      updateParams((next) => {
        next.set('sourceType', 'ITEM')
        next.set('view', 'item')
      })
    }
  }, [tab, searchParamsString, updateParams])

  const handleFilterChange = (key: keyof ListingFilterValues, value: string | null) => {
    updateParams((params) => {
      if (value === null || value === '') {
        params.delete(key)
      } else {
        params.set(key, value)
      }
      params.set('view', tab)
    })
  }

  const effectiveFilters: ListingFilterValues = {
    ...filters,
    sourceType:
      tab === 'template'
        ? 'TEMPLATE'
        : tab === 'item'
        ? 'ITEM'
        : filters.sourceType === 'ALL'
        ? undefined
        : filters.sourceType,
  }

  // 避免 hydration 不匹配：在客户端挂载前不渲染依赖 URL 的内容
  if (!isMounted) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">上架管理</h1>
          <p className="text-muted-foreground">
            支持标准品模板上架与单件上架两种模式，让运营同事在一个页面完成上架、预留与平台同步。
          </p>
        </div>
        <div className="text-muted-foreground">加载中...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">上架管理</h1>
        <p className="text-muted-foreground">
          支持标准品模板上架与单件上架两种模式，让运营同事在一个页面完成上架、预留与平台同步。
        </p>
      </div>
      <ListingFilters values={filters} onChange={handleFilterChange} />
      <Tabs value={tab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">总览</TabsTrigger>
          <TabsTrigger value="template">模板上架</TabsTrigger>
          <TabsTrigger value="item">单件上架</TabsTrigger>
          <TabsTrigger value="listed">已上架</TabsTrigger>
          <TabsTrigger value="sold">已售出</TabsTrigger>
          <TabsTrigger value="history">上架记录</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <ListingOverviewPanel filters={filters} />
        </TabsContent>
        <TabsContent value="template" className="space-y-4">
          <TemplateListingPanel filters={effectiveFilters} />
        </TabsContent>
        <TabsContent value="item" className="space-y-4">
          <ItemListingPanel filters={effectiveFilters} />
        </TabsContent>
        <TabsContent value="listed" className="space-y-4">
          <ListedItemsPanel filters={filters} />
        </TabsContent>
        <TabsContent value="sold" className="space-y-4">
          <SoldItemsPanel />
        </TabsContent>
        <TabsContent value="history" className="space-y-4">
          <ListingHistoryPanel filters={filters} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

