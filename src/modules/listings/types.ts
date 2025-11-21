export interface TemplateListingSummary {
  id: string
  skuId: string
  sku?: {
    id: string
    name: string
    brand?: string | null
  } | null
  itemName: string
  itemSize?: string | null
  itemCondition?: string | null
  variantLabel?: string | null
  itemColor?: string | null
  photos: string[]
  stats: {
    available: number
    listed: number
    reserved: number
    sold: number
  }
  listings: Array<{
    id: string
    status: string
    quantity: number
    fulfilledQuantity: number
    platform: {
      id: string
      name: string
    }
    updatedAt: string | Date
  }>
  optionalAttributes?: Record<string, unknown> | null
  recommendedPrice?: number | null
  recommendedPriceCurrency?: string | null
}

export interface ItemListingView {
  id: string
  sourceType: 'ITEM' | 'TEMPLATE'
  status: string
  quantity: number
  fulfilledQuantity: number
  listingPrice?: number | null
  listingCurrency?: string | null
  updatedAt: string | Date
  platform: {
    id: string
    name: string
  }
  item?: {
    itemId: string
    itemName: string
    itemSize?: string | null
    itemCondition?: string | null
    skuId?: string | null
    sku?: {
      id: string
      name: string
      brand?: string | null
    } | null
  } | null
  template?: {
    id: string
    itemName: string
    itemSize?: string | null
    itemCondition?: string | null
    variantLabel?: string | null
    sku?: {
      id: string
      name: string
      brand?: string | null
    } | null
  } | null
}

export interface ListingFilterValues {
  q?: string
  skuId?: string
  platformId?: string
  status?: string
  sourceType?: 'ITEM' | 'TEMPLATE' | 'ALL'
}

export interface ListingOverviewData {
  summary: {
    templateCount: number
    templateAvailable: number
    templateListed: number
    templateReserved: number
    templateSold: number
    activeListings: number
  }
  platformStats: Array<{
    platformId: string
    platformName: string
    count: number
  }>
  sourceStats: Array<{
    sourceType: string
    count: number
  }>
  trend: Array<{
    date: string
    created: number
    closed: number
  }>
}

export interface ListingHistoryEntry {
  id: string
  action: string
  timestamp: string | Date
  user?: {
    id: string
    name: string | null
  } | null
  meta?: Record<string, unknown> | null
  listing?: ItemListingView | null
}

