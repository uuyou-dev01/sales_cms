'use client'

import { useQuery } from '@tanstack/react-query'

async function fetchItems() {
  const res = await fetch('/api/inventory/items', { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to load items')
  const json = await res.json()
  return json.data ?? json
}

export function useItems() {
  return useQuery({ queryKey: ['inventory','items'], queryFn: fetchItems })
}


