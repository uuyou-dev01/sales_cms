'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useSkuStats } from '@/src/modules/sku/hooks/useSkuStats'
import { TrendingUp, Package, DollarSign, Percent, ShoppingCart, Truck, BarChart3 } from 'lucide-react'

export function SkuStatsPanel() {
  const stats = useSkuStats()
  const displayStats = stats

  return (
    <div className="space-y-4 mb-6">
      {/* 第一行：核心指标 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 总SKU数 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4 text-purple-500" />
              总SKU数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {displayStats.totalSkuCount}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              启用: {displayStats.activeSkuCount} | 禁用: {displayStats.totalSkuCount - displayStats.activeSkuCount}
            </p>
          </CardContent>
        </Card>

        {/* 总库存数 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-blue-500" />
              总库存数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {displayStats.totalItems}
            </div>
            <p className="text-xs text-gray-500 mt-1">所有Item总数</p>
          </CardContent>
        </Card>

        {/* 七日销售额 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              七日销售额
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ¥{displayStats.totalRevenue7Days.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-gray-500 mt-1">近7天总销售额</p>
          </CardContent>
        </Card>

        {/* 平均利润率 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Percent className="h-4 w-4 text-orange-500" />
              平均利润率
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {displayStats.avgProfitRate.toFixed(1)}%
            </div>
            <p className="text-xs text-gray-500 mt-1">所有SKU的平均利润率</p>
          </CardContent>
        </Card>
      </div>

      {/* 第二行：扩展指标 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 三十日销售额 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-indigo-500" />
              三十日销售额
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ¥{displayStats.totalRevenue30Days.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-gray-500 mt-1">近30天总销售额</p>
          </CardContent>
        </Card>

        {/* 在途数量 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Truck className="h-4 w-4 text-yellow-500" />
              在途数量
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {displayStats.inTransitQuantity}
            </div>
            <p className="text-xs text-gray-500 mt-1">近7天采购中的数量</p>
          </CardContent>
        </Card>

        {/* 本月销量Top SKU */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              本月销量Top 3
            </CardTitle>
          </CardHeader>
          <CardContent>
            {displayStats.topSkuMonth.length > 0 ? (
              <div className="space-y-2">
                {displayStats.topSkuMonth.slice(0, 3).map((sku, index) => (
                  <div key={sku.skuId} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Badge variant="outline" className="w-6 h-6 p-0 flex items-center justify-center flex-shrink-0">
                        {index + 1}
                      </Badge>
                      <span className="line-clamp-1 truncate">{sku.skuName}</span>
                    </div>
                    <div className="text-right ml-2 flex-shrink-0">
                      <div className="font-medium">¥{sku.totalRevenue.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}</div>
                      <div className="text-xs text-gray-500">{sku.totalQuantity}件</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">暂无数据</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

