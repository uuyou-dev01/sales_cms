'use client'

import React from 'react'
import { Card } from '@/components/ui/card'

export default function SkuDetailCard({ sku }: { sku: any }) {
  return (
    <Card className="p-4 space-y-1">
      <div className="text-lg font-semibold">{sku?.name || '-'}</div>
      <div className="text-sm text-gray-600">品牌：{sku?.brand || '-'}</div>
      <div className="text-sm text-gray-600">分类：{sku?.category?.name || '-'}</div>
      <div className="text-sm text-gray-600">属性：{sku?.attributes ? JSON.stringify(sku.attributes) : '-'}</div>
    </Card>
  )
}


