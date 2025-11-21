'use client'

import { useRouter } from 'next/navigation'

export type NavigationMode = 'detail' | 'list' | 'stay' | 'continue'

export interface NavigationOptions {
  mode?: NavigationMode
  showToast?: boolean
  refresh?: boolean
  closeDialog?: boolean
}

export function useNavigation() {
  const router = useRouter()

  const navigateToSku = (skuId: string, options?: NavigationOptions) => {
    const { mode = 'detail', closeDialog = true } = options || {}
    
    if (mode === 'detail') {
      router.push(`/sku/${skuId}`)
    } else if (mode === 'list') {
      router.push('/sku')
    }
    // 'stay' 和 'continue' 模式不跳转
  }

  const navigateToPurchase = (orderId: string, options?: NavigationOptions) => {
    const { mode = 'list', closeDialog = true } = options || {}
    
    if (mode === 'detail') {
      // 如果将来有详情页，使用这个
      router.push(`/purchase/${orderId}`)
    } else if (mode === 'list') {
      router.push('/purchase')
    }
    // 'stay' 和 'continue' 模式不跳转
  }

  const navigateToSale = (transactionId: string, options?: NavigationOptions) => {
    const { mode = 'list', closeDialog = true } = options || {}
    
    if (mode === 'detail') {
      // 如果将来有详情页，使用这个
      router.push(`/sales/transactions/${transactionId}`)
    } else if (mode === 'list') {
      router.push('/sales')
    }
    // 'stay' 和 'continue' 模式不跳转
  }

  return {
    navigateToSku,
    navigateToPurchase,
    navigateToSale,
  }
}

