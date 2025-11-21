import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init)
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error || 'Request failed')
  return json.data as T
}

export function useItemDetail(itemId?: string | null) {
  return useQuery({
    enabled: !!itemId,
    queryKey: ['item-detail', itemId],
    queryFn: () => fetchJson<any>(`/api/items/${itemId}/detail`),
  })
}

export function useItemStockAdjustment(itemId?: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { mode: 'set' | 'add' | 'subtract'; quantity: number; reason?: string; remarks?: string }) =>
      fetchJson<any>(`/api/items/${itemId}/stock-adjustments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      if (itemId) {
        qc.invalidateQueries({ queryKey: ['item-detail', itemId] })
      }
    },
  })
}


