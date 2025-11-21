'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'
import { CreatePurchaseDialog } from '@/src/modules/sku/components/CreatePurchaseDialog'
import { CreateSaleDialog } from '@/src/modules/sales/components/CreateSaleDialog'
import { SmartSKUForm } from '@/components/smart-sku-form'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { NavigationMode } from '@/src/modules/navigation/services/navigation.service'

interface QuickActionsContextType {
  openCreateSku: (options?: {
    skuId?: string
    categoryId?: string
    navigationMode?: NavigationMode
  }) => void
  openCreatePurchase: (options?: {
    skuId?: string
    skuName?: string
    navigationMode?: NavigationMode
  }) => void
  openCreateSale: (options?: {
    skuId?: string
    itemId?: string
    navigationMode?: NavigationMode
  }) => void
  closeAll: () => void
}

const QuickActionsContext = createContext<QuickActionsContextType | undefined>(undefined)

export function QuickActionsProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  
  const [createSkuOpen, setCreateSkuOpen] = useState(false)
  const [createPurchaseOpen, setCreatePurchaseOpen] = useState(false)
  const [createSaleOpen, setCreateSaleOpen] = useState(false)
  
  const [createSkuOptions, setCreateSkuOptions] = useState<{
    skuId?: string
    categoryId?: string
    navigationMode?: NavigationMode
  }>({ navigationMode: 'detail' })
  
  const [createPurchaseOptions, setCreatePurchaseOptions] = useState<{
    skuId?: string
    skuName?: string
    navigationMode?: NavigationMode
  }>({ navigationMode: 'list' })
  
  const [createSaleOptions, setCreateSaleOptions] = useState<{
    skuId?: string
    itemId?: string
    navigationMode?: NavigationMode
  }>({ navigationMode: 'list' })

  // 处理SKU创建成功
  const handleSkuSuccess = useCallback((result?: { id: string }) => {
    queryClient.invalidateQueries({ queryKey: ['skus'] })
    queryClient.invalidateQueries({ queryKey: ['sku-stats'] })
    
    const { navigationMode = 'detail' } = createSkuOptions
    
    if (result?.id) {
      if (navigationMode === 'detail') {
        router.push(`/sku/${result.id}`)
        setCreateSkuOpen(false)
      } else if (navigationMode === 'list') {
        router.push('/sku')
        setCreateSkuOpen(false)
      } else if (navigationMode === 'continue') {
        // 继续创建，不关闭对话框，只刷新数据
        toast({ title: 'SKU创建成功', description: '可以继续创建下一个SKU' })
      } else {
        // 'stay' 模式不跳转，只刷新数据
        setCreateSkuOpen(false)
      }
    } else {
      // 如果没有返回ID，只刷新数据
      setCreateSkuOpen(false)
    }
  }, [createSkuOptions, router, queryClient, toast])

  // 处理采购单创建成功
  const handlePurchaseSuccess = useCallback((result: { id: string; orderNumber: string }) => {
    queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
    queryClient.invalidateQueries({ queryKey: ['skus'] })
    queryClient.invalidateQueries({ queryKey: ['sku-items-batch'] })
    
    const { navigationMode = 'list' } = createPurchaseOptions
    
    if (navigationMode === 'detail') {
      // 如果将来有详情页，使用这个
      router.push(`/purchase/${result.id}`)
      setCreatePurchaseOpen(false)
    } else if (navigationMode === 'list') {
      router.push('/purchase')
      setCreatePurchaseOpen(false)
    } else if (navigationMode === 'continue') {
      // 继续创建，不关闭对话框
      toast({ title: '采购单创建成功', description: `采购单号: ${result.orderNumber}，可以继续创建下一个` })
    } else {
      // 'stay' 模式不跳转，只刷新数据
      setCreatePurchaseOpen(false)
    }
  }, [createPurchaseOptions, router, queryClient, toast])

  // 处理销售单创建成功
  const handleSaleSuccess = useCallback((result?: { id: string }) => {
    queryClient.invalidateQueries({ queryKey: ['sales'] })
    queryClient.invalidateQueries({ queryKey: ['skus'] })
    queryClient.invalidateQueries({ queryKey: ['available-items'] })
    
    const { navigationMode = 'list' } = createSaleOptions
    
    if (result?.id) {
      if (navigationMode === 'detail') {
        // 如果将来有详情页，使用这个
        router.push(`/sales/transactions/${result.id}`)
        setCreateSaleOpen(false)
      } else if (navigationMode === 'list') {
        router.push('/sales')
        setCreateSaleOpen(false)
      } else if (navigationMode === 'continue') {
        // 继续创建，不关闭对话框
        toast({ title: '销售单创建成功', description: '可以继续创建下一个销售单' })
      } else {
        // 'stay' 模式不跳转，只刷新数据
        setCreateSaleOpen(false)
      }
    } else {
      // 如果没有返回ID，只刷新数据
      setCreateSaleOpen(false)
    }
  }, [createSaleOptions, router, queryClient, toast])

  const openCreateSku = useCallback((options = {}) => {
    setCreateSkuOptions({ navigationMode: 'detail', ...options })
    setCreateSkuOpen(true)
  }, [])

  const openCreatePurchase = useCallback((options = {}) => {
    setCreatePurchaseOptions({ navigationMode: 'list', ...options })
    setCreatePurchaseOpen(true)
  }, [])

  const openCreateSale = useCallback((options = {}) => {
    setCreateSaleOptions({ navigationMode: 'list', ...options })
    setCreateSaleOpen(true)
  }, [])

  const closeAll = useCallback(() => {
    setCreateSkuOpen(false)
    setCreatePurchaseOpen(false)
    setCreateSaleOpen(false)
  }, [])

  return (
    <QuickActionsContext.Provider
      value={{
        openCreateSku,
        openCreatePurchase,
        openCreateSale,
        closeAll,
      }}
    >
      {children}
      
      {/* 全局对话框 */}
      <Dialog open={createSkuOpen} onOpenChange={setCreateSkuOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>创建SKU</DialogTitle>
          </DialogHeader>
          <SmartSKUForm 
            onSuccess={(result) => {
              handleSkuSuccess(result)
            }}
            initialData={createSkuOptions.categoryId ? { categoryId: createSkuOptions.categoryId } : undefined}
            navigationMode={createSkuOptions.navigationMode}
          />
        </DialogContent>
      </Dialog>
      
      <CreatePurchaseDialog
        open={createPurchaseOpen}
        onClose={() => setCreatePurchaseOpen(false)}
        onSuccess={handlePurchaseSuccess}
        initialSkuId={createPurchaseOptions.skuId}
        initialSkuName={createPurchaseOptions.skuName}
        navigationMode={createPurchaseOptions.navigationMode}
      />
      
      <CreateSaleDialog
        open={createSaleOpen}
        onClose={() => setCreateSaleOpen(false)}
        onSuccess={handleSaleSuccess}
        initialSkuId={createSaleOptions.skuId}
        initialItemId={createSaleOptions.itemId}
        navigationMode={createSaleOptions.navigationMode}
      />
    </QuickActionsContext.Provider>
  )
}

export function useQuickActions() {
  const context = useContext(QuickActionsContext)
  if (!context) {
    throw new Error('useQuickActions must be used within QuickActionsProvider')
  }
  return context
}

