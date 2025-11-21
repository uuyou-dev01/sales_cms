'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useQuery } from '@tanstack/react-query'
import { EmojiIcons } from '@/components/emoji-icons'

const PurchaseTable = dynamic(() => import('@/components/purchase/purchase-table').then(m => m.default || m), { ssr: false })
const PurchaseCreateDialog = dynamic(() => import('@/components/purchase/purchase-create-dialog').then(m => m.default || m), { ssr: false })

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init)
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error || 'Request failed')
  return json.data as T
}

export default function PurchasePage() {
  const [search, setSearch] = React.useState('')
  const [status, setStatus] = React.useState<string>('all')
  const [platform, setPlatform] = React.useState<string>('all')
  const [createOpen, setCreateOpen] = React.useState(false)

  // 获取统计数据
  const { data: stats } = useQuery({
    queryKey: ['purchase-stats'],
    queryFn: () => fetchJson<any>('/api/purchase/stats'),
  })

  const statsData = stats || {
    totalAmount: 0,
    totalOrders: 0,
    completedCount: 0,
    pendingCount: 0,
    inTransitCount: 0,
    atWarehouseCount: 0,
    exceptionCount: 0,
    thisMonthAmount: 0,
    thisMonthOrders: 0,
    totalSkus: 0,
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-semibold">采购管理</h1>
        <div className="flex gap-2 items-center">
          <Input 
            placeholder="搜索采购单号、SKU、采购员..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="w-64" 
          />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="PENDING">待确认</SelectItem>
              <SelectItem value="IN_TRANSIT">运输中</SelectItem>
              <SelectItem value="AT_WAREHOUSE">到达转运仓</SelectItem>
              <SelectItem value="COMPLETED">入库完成</SelectItem>
              <SelectItem value="EXCEPTION">异常</SelectItem>
            </SelectContent>
          </Select>
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="平台" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部平台</SelectItem>
              <SelectItem value="Mercari">Mercari</SelectItem>
              <SelectItem value="Yahoo">Yahoo</SelectItem>
              <SelectItem value="淘宝">淘宝</SelectItem>
              <SelectItem value="闲鱼">闲鱼</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setCreateOpen(true)} className="bg-green-500 hover:bg-green-600">
            ＋ 新建采购单
          </Button>
        </div>
      </div>

      {/* 统计仪表板 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">采购数据概览</h2>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="text-lg">{EmojiIcons.Calendar}</span>
            数据更新于 {new Date().toLocaleDateString('zh-CN')}
          </div>
        </div>
        
        {/* 核心KPI指标 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 mb-1">
              ¥{statsData.totalAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-gray-600">总采购金额</div>
            <div className="text-xs text-blue-600 mt-1">📈 累计投资</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 mb-1">
              {statsData.totalOrders}
            </div>
            <div className="text-xs text-gray-600">总订单数</div>
            <div className="text-xs text-green-600 mt-1">📦 采购订单</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 mb-1">
              {statsData.completedCount}
            </div>
            <div className="text-xs text-gray-600">已入库订单</div>
            <div className="text-xs text-purple-600 mt-1">✅ 完成订单</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-indigo-600 mb-1">
              {statsData.totalSkus}
            </div>
            <div className="text-xs text-gray-600">采购SKU数</div>
            <div className="text-xs text-indigo-600 mt-1">📊 SKU种类</div>
          </div>
        </div>

        {/* 状态分布和本月统计 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 订单状态分布 */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span className="text-lg">{EmojiIcons.Package}</span>
              订单状态分布
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">待确认</span>
                <div className="text-sm font-semibold text-yellow-600">{statsData.pendingCount}</div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">运输中</span>
                <div className="text-sm font-semibold text-blue-600">{statsData.inTransitCount}</div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">到达转运仓</span>
                <div className="text-sm font-semibold text-purple-600">{statsData.atWarehouseCount}</div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">入库完成</span>
                <div className="text-sm font-semibold text-green-600">{statsData.completedCount}</div>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-blue-200">
                <span className="text-xs text-gray-600">异常</span>
                <div className="text-sm font-bold text-red-600">{statsData.exceptionCount}</div>
              </div>
            </div>
          </div>

          {/* 本月统计 */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span className="text-lg">{EmojiIcons.Calendar}</span>
              本月采购统计
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">本月订单</span>
                <div className="text-right">
                  <div className="text-sm font-semibold text-green-600">{statsData.thisMonthOrders} 单</div>
                </div>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-green-200">
                <span className="text-xs text-gray-600">本月采购金额</span>
                <div className="text-sm font-bold text-green-600">
                  ¥{statsData.thisMonthAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 采购订单表格 */}
      <PurchaseTable 
        search={search} 
        status={status === 'all' ? undefined : status}
        platform={platform === 'all' ? undefined : platform}
      />

      {createOpen && (
        <PurchaseCreateDialog 
          open={createOpen} 
          onClose={() => setCreateOpen(false)}
          onSuccess={() => {
            setCreateOpen(false)
            // 刷新表格
            window.location.reload()
          }}
        />
      )}
    </div>
  )
}
