'use client'

import React from 'react'
import { Package } from 'lucide-react'
import { getSkuMainPhoto, getItemFirstPhoto } from '../../utils/sku.utils'

interface SkuImageProps {
  sku?: {
    attributes?: any
    items?: Array<{ photos?: string[] }>
  }
  item?: {
    photos?: string[]
  }
  alt?: string
  className?: string
  fallbackText?: string
}

/**
 * SKU 图片显示组件
 * 自动处理图片获取和错误回退
 */
export function SkuImage({ sku, item, alt = 'SKU图片', className = '', fallbackText }: SkuImageProps) {
  const [imageError, setImageError] = React.useState(false)
  
  // 获取图片 URL
  const imageUrl = React.useMemo(() => {
    if (sku) {
      return getSkuMainPhoto(sku)
    }
    if (item) {
      return getItemFirstPhoto(item)
    }
    return null
  }, [sku, item])

  const displayText = fallbackText || alt

  if (imageError || !imageUrl) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
        <Package className="h-16 w-16 text-gray-400" />
      </div>
    )
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      className={className}
      onError={(e) => {
        const target = e.target as HTMLImageElement
        if (displayText) {
          target.src = `https://via.placeholder.com/400x400/cccccc/999999?text=${encodeURIComponent(displayText)}`
        } else {
          setImageError(true)
        }
      }}
    />
  )
}

