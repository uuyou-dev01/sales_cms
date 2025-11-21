'use client'

import React from 'react'
import dynamic from 'next/dynamic'

const PriceCalculator = dynamic(() => import('@/src/modules/finance/components/PriceCalculator').then(m => m.default || m), { ssr: false })
const PricePredictionPanel = dynamic(() => import('@/src/modules/finance/components/PricePredictionPanel').then(m => m.default || m), { ssr: false })

export default function FinancePage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">财务中心</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4">
          <h2 className="text-lg font-medium mb-4">价格计算器</h2>
          <PriceCalculator />
        </div>
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4">
          <h2 className="text-lg font-medium mb-4">价格预测</h2>
          <PricePredictionPanel />
        </div>
      </div>
    </div>
  )
}

 



