'use client'

import { useRouter } from 'next/navigation'

/**
 * SKU 导航辅助 Hook
 */
export function useSkuNavigation() {
  const router = useRouter()

  const goToSkuDetail = (skuId: string) => {
    router.push(`/sku/${skuId}`)
  }

  const goToItemDetail = (skuId: string, itemId: string) => {
    router.push(`/sku/${skuId}/items/${itemId}`)
  }

  const goBack = () => {
    router.back()
  }

  const goToSkuList = () => {
    router.push('/sku')
  }

  return {
    goToSkuDetail,
    goToItemDetail,
    goBack,
    goToSkuList,
  }
}

