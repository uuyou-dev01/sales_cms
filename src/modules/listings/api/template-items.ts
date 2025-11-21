export type TemplateItemCandidate = {
  itemId: string
  itemName: string
  itemSize?: string | null
  itemCondition?: string | null
  createdAt: string
  sku?: {
    id: string
    name: string
    brand?: string | null
  } | null
}

export async function fetchTemplateItems(templateId: string, limit = 200): Promise<TemplateItemCandidate[]> {
  const params = new URLSearchParams({ templateId, limit: String(limit) })
  const res = await fetch(`/api/listings/template-items?${params.toString()}`, { cache: 'no-store' })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json?.error || json?.message || '获取模板库存失败')
  }
  const items = json?.data?.items || json?.items || []
  return Array.isArray(items) ? items : []
}


