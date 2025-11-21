'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Package, ShoppingBag, ShoppingCart, TrendingUp, ArrowRight, BarChart3 } from 'lucide-react'
import { useQuickActions } from '@/src/contexts/QuickActionsContext'
import { useSkuStats } from '@/src/modules/sku/hooks/useSkuStats'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'

const WarehouseStats = dynamic(() => import('@/src/modules/inventory/components/WarehouseStats').then(m => m.default || m), { ssr: false })
const FinanceDashboard = dynamic(() => import('@/src/modules/finance/components/FinanceDashboard').then(m => m.default || m), { ssr: false })

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init)
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error || 'Request failed')
  return json.data as T
}

export default function DashboardPage() {
  const { openCreateSku, openCreatePurchase, openCreateSale } = useQuickActions()
  const skuStats = useSkuStats()

  // 获取采购统计
  const { data: purchaseStats } = useQuery({
    queryKey: ['purchase-stats'],
    queryFn: () => fetchJson<any>('/api/purchase/stats'),
  })

  // 获取销售统计（从items/stats）
  const { data: salesStats } = useQuery({
    queryKey: ['items-stats'],
    queryFn: () => fetchJson<any>('/api/items/stats'),
  })

  const purchaseData = purchaseStats || {
    totalAmount: 0,
    totalOrders: 0,
    completedCount: 0,
    pendingCount: 0,
    thisMonthAmount: 0,
    thisMonthOrders: 0,
  }

  const salesData = salesStats || {
    totalSold: 0,
    totalProfit: 0,
    averageProfitRate: 0,
    thisMonthSoldAmount: 0,
    thisMonthSoldCount: 0,
    thisMonthSoldProfit: 0,
  }

  return (
    <div className="space-y-6">
      {/* 页面标题和快速操作 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">总览 Dashboard</h1>
          <p className="text-gray-600 mt-1">系统概览和关键指标</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => openCreateSku()} variant="outline" size="sm">
            <Package className="h-4 w-4 mr-2" />
            创建SKU
          </Button>
          <Button onClick={() => openCreatePurchase()} variant="outline" size="sm">
            <ShoppingBag className="h-4 w-4 mr-2" />
            创建采购单
          </Button>
          <Button onClick={() => openCreateSale()} variant="outline" size="sm">
            <ShoppingCart className="h-4 w-4 mr-2" />
            创建销售
          </Button>
        </div>
      </div>

      {/* 核心指标卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* SKU统计 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4 text-purple-500" />
              SKU总数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{skuStats.totalSkuCount}</div>
            <p className="text-xs text-gray-500 mt-1">
              启用: {skuStats.activeSkuCount} | 库存: {skuStats.totalItems}
            </p>
            <Link href="/sku" className="text-xs text-blue-600 hover:underline mt-2 inline-flex items-center gap-1">
              查看详情 <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        {/* 采购统计 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-blue-500" />
              采购总额
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ¥{Number(purchaseData.totalAmount || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              订单数: {purchaseData.totalOrders} | 本月: ¥{Number(purchaseData.thisMonthAmount || 0).toLocaleString('zh-CN')}
            </p>
            <Link href="/purchase" className="text-xs text-blue-600 hover:underline mt-2 inline-flex items-center gap-1">
              查看详情 <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        {/* 销售统计 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-green-500" />
              销售总额
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ¥{Number(salesData.totalSold || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              净利润: ¥{Number(salesData.totalProfit || 0).toLocaleString('zh-CN')} | 利润率: {Number(salesData.averageProfitRate || 0).toFixed(1)}%
            </p>
            <Link href="/sales" className="text-xs text-blue-600 hover:underline mt-2 inline-flex items-center gap-1">
              查看详情 <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        {/* 本月表现 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-500" />
              本月表现
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ¥{Number(salesData.thisMonthSoldAmount || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              销售: {salesData.thisMonthSoldCount || 0}件 | 利润: ¥{Number(salesData.thisMonthSoldProfit || 0).toLocaleString('zh-CN')}
            </p>
            <Link href="/sales" className="text-xs text-blue-600 hover:underline mt-2 inline-flex items-center gap-1">
              查看详情 <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* 详细统计面板 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 仓储概览 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              仓储概览
            </CardTitle>
          </CardHeader>
          <CardContent>
            <WarehouseStats />
          </CardContent>
        </Card>

        {/* 财务概览 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              财务概览
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FinanceDashboard />
          </CardContent>
        </Card>
      </div>

      {/* 快速链接 */}
      <Card>
        <CardHeader>
          <CardTitle>快速导航</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/sku">
              <Button variant="outline" className="w-full justify-start">
                <Package className="h-4 w-4 mr-2" />
                SKU管理
              </Button>
            </Link>
            <Link href="/purchase">
              <Button variant="outline" className="w-full justify-start">
                <ShoppingBag className="h-4 w-4 mr-2" />
                采购管理
              </Button>
            </Link>
            <Link href="/sales">
              <Button variant="outline" className="w-full justify-start">
                <ShoppingCart className="h-4 w-4 mr-2" />
                销售管理
              </Button>
            </Link>
            <Link href="/inventory">
              <Button variant="outline" className="w-full justify-start">
                <BarChart3 className="h-4 w-4 mr-2" />
                库存管理
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
