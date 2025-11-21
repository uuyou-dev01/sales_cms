'use client'

import React from 'react'
import dynamic from 'next/dynamic'

const StockManagement = dynamic(() => import('@/src/modules/inventory/components/StockManagement').then(m => m.default || m), { ssr: false })
const WarehouseManagement = dynamic(() => import('@/src/modules/inventory/components/WarehouseManagement').then(m => m.default || m), { ssr: false })
const ItemsTable = dynamic(() => import('@/src/modules/inventory/components/ItemsTableWithQuery').then(m => m.default || m), { ssr: false })

export default function InventoryPage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">库存管理</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4">
          <h2 className="text-lg font-medium mb-4">库存操作</h2>
          <StockManagement />
        </div>
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4">
          <h2 className="text-lg font-medium mb-4">仓储管理</h2>
          <WarehouseManagement />
        </div>
      </div>
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4">
        <h2 className="text-lg font-medium mb-4">商品列表</h2>
        <ItemsTable />
      </div>
    </div>
  )
}


