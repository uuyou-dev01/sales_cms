'use client'

import { useQuery } from '@tanstack/react-query'

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init)
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error || 'Request failed')
  return json.data as T
}

export interface SkuStats {
  topSku7Days: Array<{ skuId: string; skuName: string; totalRevenue: number; totalQuantity: number; totalProfit: number }>
  topSkuMonth: Array<{ skuId: string; skuName: string; totalRevenue: number; totalQuantity: number; totalProfit: number }>
  totalRevenue7Days: number
  totalRevenue30Days: number
  avgProfitRate: number
  activeSkuCount: number
  totalSkuCount: number
  totalItems: number
  inTransitQuantity: number
}

export function useSkuStats() {
  const { data: top7d } = useQuery({
    queryKey: ['sku-stats', 'top-7d'],
    queryFn: () => fetchJson<any[]>('/api/sku/stats/top?period=7d'),
    staleTime: 60000, // 1分钟缓存
  })

  const { data: top30d } = useQuery({
    queryKey: ['sku-stats', 'top-30d'],
    queryFn: () => fetchJson<any[]>('/api/sku/stats/top?period=30d'),
    staleTime: 60000,
  })

  const { data: overall } = useQuery({
    queryKey: ['sku-stats', 'overall'],
    queryFn: () => fetchJson<{ 
      totalSkus: number
      activeSkus: number
      totalItems: number
      totalRevenue7d: number
      totalRevenue30d: number
      avgProfitRate: number
      inTransitQuantity: number
    }>('/api/sku/stats/overall'),
    staleTime: 60000,
  })

  return {
    topSku7Days: top7d || [],
    topSkuMonth: top30d || [],
    totalRevenue7Days: overall?.totalRevenue7d || 0,
    totalRevenue30Days: overall?.totalRevenue30d || 0,
    avgProfitRate: overall?.avgProfitRate || 0,
    activeSkuCount: overall?.activeSkus || 0,
    totalSkuCount: overall?.totalSkus || 0,
    totalItems: overall?.totalItems || 0,
    inTransitQuantity: overall?.inTransitQuantity || 0,
  }
}

