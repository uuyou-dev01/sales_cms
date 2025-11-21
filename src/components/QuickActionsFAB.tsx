'use client'

import React, { useState } from 'react'
import { Plus, Package, ShoppingCart, ShoppingBag, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useQuickActions } from '@/src/contexts/QuickActionsContext'
import { usePathname } from 'next/navigation'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export function QuickActionsFAB() {
  const { openCreateSku, openCreatePurchase, openCreateSale } = useQuickActions()
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  // 根据当前页面获取上下文
  const getContext = () => {
    if (pathname?.startsWith('/sku/') && !pathname.includes('/items/')) {
      // SKU详情页
      const skuId = pathname.split('/')[2]
      return { skuId }
    } else if (pathname?.startsWith('/sku/') && pathname.includes('/items/')) {
      // Item详情页
      const parts = pathname.split('/')
      const skuId = parts[2]
      const itemId = parts[4]
      return { skuId, itemId }
    }
    return {}
  }

  const context = getContext()

  // 点击外部关闭
  React.useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.quick-actions-fab')) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  return (
    <div className="quick-actions-fab fixed bottom-6 right-6 z-50">
      <TooltipProvider>
        {isOpen && (
          <div className="absolute bottom-20 right-0 flex flex-col gap-3 mb-2 animate-in fade-in slide-in-from-bottom-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="default"
                  size="lg"
                  className="rounded-full shadow-lg h-12 px-4"
                  onClick={() => {
                    openCreateSku(context)
                    setIsOpen(false)
                  }}
                >
                  <Package className="h-4 w-4 mr-2" />
                  创建SKU
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>创建新的SKU</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="default"
                  size="lg"
                  className="rounded-full shadow-lg h-12 px-4"
                  onClick={() => {
                    openCreatePurchase(context)
                    setIsOpen(false)
                  }}
                >
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  创建采购单
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>创建新的采购单</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="default"
                  size="lg"
                  className="rounded-full shadow-lg h-12 px-4"
                  onClick={() => {
                    openCreateSale(context)
                    setIsOpen(false)
                  }}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  创建销售
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>创建新的销售单</p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="default"
              size="lg"
              className="rounded-full w-14 h-14 shadow-lg"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Plus className="h-6 w-6" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>快速操作</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}

